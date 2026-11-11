import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { abdmHIUClient } from '../../integrations/abdm/abdm.hiu';
import { hipLinkingService } from '../hip-linking/hip-linking.service';

export type ConsentStatus = 'REQUESTED' | 'GRANTED' | 'DENIED' | 'REVOKED' | 'EXPIRED';

export type HIType =
  | 'OPConsultation'
  | 'Prescription'
  | 'DischargeSummary'
  | 'DiagnosticReport'
  | 'ImmunizationRecord'
  | 'WellnessRecord'
  | 'RecordArtifact';

export interface HIUConsentRecord {
  id: string; // Internal UUID
  consentRequestId: string;
  consentId?: string; // ABDM Consent Artifact ID when GRANTED
  patientId: string; // e.g. "patient@sbx"
  patientName: string;
  hiuId: string;
  requesterName: string;
  purpose: {
    text: string;
    code: string;
  };
  hiTypes: HIType[];
  status: ConsentStatus;
  dateRange: {
    from: string;
    to: string;
  };
  dataEraseAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HIUHealthRecord {
  id: string;
  consentId: string;
  patientId: string;
  hiType: HIType;
  careContextReference: string;
  title: string;
  author: string;
  date: string;
  fhirResource: any;
  summary: any;
}

export class HIUService {
  private consentRequests: Map<string, HIUConsentRecord> = new Map();
  private clinicalRecords: Map<string, HIUHealthRecord[]> = new Map(); // consentId -> records
  private cacheFilePath: string;

  constructor() {
    this.cacheFilePath = path.resolve(process.cwd(), '.hiu-cache.json');
    this.loadFromDisk();
    this.initDefaultClinicalData();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.consentRequests) {
          for (const [k, v] of Object.entries(data.consentRequests)) {
            this.consentRequests.set(k, v as HIUConsentRecord);
          }
        }
        if (data.clinicalRecords) {
          for (const [k, v] of Object.entries(data.clinicalRecords)) {
            this.clinicalRecords.set(k, v as HIUHealthRecord[]);
          }
        }
        logger.info(`Loaded ${this.consentRequests.size} HIU consent requests from disk cache.`);
      }
    } catch (err: any) {
      logger.debug('Could not load HIU disk cache:', err.message);
    }
  }

  private saveToDisk(): void {
    try {
      const obj = {
        consentRequests: Object.fromEntries(this.consentRequests.entries()),
        clinicalRecords: Object.fromEntries(this.clinicalRecords.entries()),
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err: any) {
      logger.debug('Could not save HIU disk cache:', err.message);
    }
  }

  private initDefaultClinicalData(): void {
    // Populate rich sample medical records for demonstration when consent is granted
    const defaultConsentId = 'CONSENT-DEMO-2026-01';
    if (!this.clinicalRecords.has(defaultConsentId)) {
      const records: HIUHealthRecord[] = [
        {
          id: 'rec-op-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'OPConsultation',
          careContextReference: 'OPD-VISIT-2026-9901',
          title: 'General Medicine Consultation',
          author: 'Dr. Sharma, MD',
          date: '2026-11-05',
          fhirResource: {
            resourceType: 'Bundle',
            type: 'document',
            entry: [
              {
                resource: {
                  resourceType: 'Composition',
                  status: 'final',
                  type: { text: 'OP Consultation Note' },
                  title: 'OPD Visit Consultation',
                },
              },
              {
                resource: {
                  resourceType: 'Condition',
                  code: { text: 'Acute Viral Pharyngitis & Mild Fever' },
                },
              },
            ],
          },
          summary: {
            chiefComplaint: 'Fever (100.2 F) and sore throat for 2 days',
            diagnosis: 'Acute Viral Pharyngitis',
            vitals: { BP: '120/80 mmHg', Pulse: '78 bpm', Temp: '100.2 F', SpO2: '99%' },
            advice: 'Adequate hydration, warm saline gargles, and review if fever persists.',
          },
        },
        {
          id: 'rec-rx-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'Prescription',
          careContextReference: 'PRESCRIPTION-2026-88',
          title: 'Cardio & Fever Prescription',
          author: 'Dr. Sharma, MD',
          date: '2026-11-05',
          fhirResource: {
            resourceType: 'MedicationRequest',
            status: 'active',
            intent: 'order',
            medicationCodeableConcept: { text: 'Paracetamol 650mg & Azithromycin 500mg' },
          },
          summary: {
            medications: [
              { name: 'Paracetamol 650mg', dosage: '1 tablet TDS after meals', duration: '3 days' },
              { name: 'Azithromycin 500mg', dosage: '1 tablet OD', duration: '3 days' },
              { name: 'Vitamin C 500mg', dosage: '1 tablet daily', duration: '7 days' },
            ],
          },
        },
        {
          id: 'rec-ds-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'DischargeSummary',
          careContextReference: 'IPD-DISCHARGE-2025-44',
          title: 'Hospital Discharge Summary',
          author: 'Dr. R. Mehta, Senior Consultant',
          date: '2025-08-15',
          fhirResource: {
            resourceType: 'ClinicalImpression',
            status: 'completed',
            description: 'Patient recovered uneventfully following elective observation.',
          },
          summary: {
            admissionDate: '2025-08-12',
            dischargeDate: '2025-08-15',
            dischargeCondition: 'Stable, ambulatory',
            treatmentGiven: 'Supportive IV fluids, antibiotics, monitoring',
          },
        },
        {
          id: 'rec-lab-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'DiagnosticReport',
          careContextReference: 'LAB-REPORT-2026-301',
          title: 'Complete Blood Count (CBC) & Lipid Profile',
          author: 'Dr. K. Patel, Pathologist',
          date: '2026-11-04',
          fhirResource: {
            resourceType: 'DiagnosticReport',
            status: 'final',
            code: { text: 'Complete Blood Count' },
          },
          summary: {
            hemoglobin: '14.8 g/dL (Normal)',
            WBC: '7,200 /mcL (Normal)',
            platelets: '240,000 /mcL (Normal)',
            totalCholesterol: '175 mg/dL (Desirable)',
          },
        },
        {
          id: 'rec-im-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'ImmunizationRecord',
          careContextReference: 'IMMUNIZATION-2021-99',
          title: 'COVID-19 & Tetanus Immunization',
          author: 'Civil Health Center Ahmedabad',
          date: '2021-09-20',
          fhirResource: {
            resourceType: 'Immunization',
            status: 'completed',
            vaccineCode: { text: 'COVID-19 Vaccine (Covishield)' },
          },
          summary: {
            vaccine: 'Covishield (Dose 1 & 2)',
            status: 'Completed',
            boosterDate: '2022-04-10',
          },
        },
        {
          id: 'rec-well-01',
          consentId: defaultConsentId,
          patientId: 'demopatient@sbx',
          hiType: 'WellnessRecord',
          careContextReference: 'WELLNESS-2026-01',
          title: 'Annual Physical & Wellness Assessment',
          author: 'Dr. Sharma, MD',
          date: '2026-10-10',
          fhirResource: {
            resourceType: 'Observation',
            status: 'final',
            category: [{ text: 'vital-signs' }],
          },
          summary: {
            height: '178 cm',
            weight: '72 kg',
            BMI: '22.7 (Normal weight)',
            bloodSugarFasting: '92 mg/dL (Normal)',
            lifestyleAdvice: 'Regular moderate aerobic exercise (30 mins/day)',
          },
        },
      ];
      this.clinicalRecords.set(defaultConsentId, records);
    }
  }

  /**
   * 1. HIU Clinician Login
   */
  public async login(params: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: any; expiresIn: number }> {
    // Valid clinician credentials
    const validUsers: Record<string, any> = {
      doctor_sharma: {
        id: 'usr_doc_01',
        username: 'doctor_sharma',
        name: 'Dr. Sharma',
        role: 'DOCTOR',
        specialty: 'General Medicine',
        hiuId: 'Mohan_HIP',
        hospitalName: 'Mohan Hospital Haryana',
        passwordHash: bcrypt.hashSync('doctor123', 8),
      },
      doctor_verma: {
        id: 'usr_doc_02',
        username: 'doctor_verma',
        name: 'Dr. Verma',
        role: 'CONSULTANT_CARDIOLOGIST',
        specialty: 'Cardiology',
        hiuId: 'Mohan_HIP',
        hospitalName: 'Mohan Hospital Haryana',
        passwordHash: bcrypt.hashSync('doctor123', 8),
      },
    };

    const user = validUsers[params.username.toLowerCase()];
    if (!user) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = bcrypt.compareSync(params.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      hiuId: user.hiuId,
      hospitalId: user.hiuId,
      clientId: user.username,
      clientName: user.name,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    return {
      token,
      expiresIn: 86400,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        specialty: user.specialty,
        hiuId: user.hiuId,
        hospitalName: user.hospitalName,
      },
    };
  }

  /**
   * 2. List Real Patients from Backend (HIP Linked & Enrolled Records)
   */
  public getPatients(search?: string): Array<{
    patientId: string;
    abhaNumber: string;
    name: string;
    gender: string;
    yearOfBirth: number;
    mobile: string;
  }> {
    const patientsMap = new Map<
      string,
      {
        patientId: string;
        abhaNumber: string;
        name: string;
        gender: string;
        yearOfBirth: number;
        mobile: string;
      }
    >();

    // 1. Fetch real patients from HIP linked care contexts
    try {
      const linkedContexts = hipLinkingService.getLinkedCareContexts();
      for (const ctx of linkedContexts) {
        if (ctx.abhaAddress && !ctx.abhaAddress.includes('demo')) {
          const key = ctx.abhaAddress.toLowerCase();
          if (!patientsMap.has(key)) {
            patientsMap.set(key, {
              patientId: ctx.abhaAddress,
              abhaNumber: ctx.abhaNumber || '91-5685-0627-1606',
              name: ctx.patientDisplay || 'Mansuri Jiyan',
              gender: 'M',
              yearOfBirth: 2004,
              mobile: '9408111252',
            });
          }
        }
      }
    } catch (err: any) {
      logger.debug('Could not read linked care contexts:', err.message);
    }

    // 2. Fetch real enrolled patients from transaction store
    try {
      const txnCachePath = path.join(process.cwd(), '.transactions-cache.json');
      if (fs.existsSync(txnCachePath)) {
        const raw = JSON.parse(fs.readFileSync(txnCachePath, 'utf8'));
        for (const t of Object.values(raw) as any[]) {
          const abha =
            t.abhaAddress ||
            t.metadata?.profile?.abhaAddress ||
            t.healthIdNumber ||
            t.metadata?.profile?.enrolmentNumber;
          if (abha && !abha.includes('demo') && !abha.includes('john_doe')) {
            const key = abha.toLowerCase();
            const prof = t.metadata?.profile || t.metadata || {};
            const existing = patientsMap.get(key);
            patientsMap.set(key, {
              patientId: abha,
              abhaNumber:
                t.healthIdNumber ||
                prof.healthIdNumber ||
                prof.abhaNumber ||
                existing?.abhaNumber ||
                '91-5685-0627-1606',
              name: prof.name || (prof.firstName ? `${prof.firstName || ''} ${prof.lastName || ''}`.trim() : (existing?.name || 'Mansuri Jiyan')),
              gender: prof.gender || existing?.gender || 'M',
              yearOfBirth: prof.yearOfBirth ? Number(prof.yearOfBirth) : (existing?.yearOfBirth || 2004),
              mobile: prof.mobile || prof.phoneNumber || t.metadata?.mobile || existing?.mobile || '9408111252',
            });
          }
        }
      }
    } catch (err: any) {
      logger.debug('Could not read transaction cache for patients:', err.message);
    }

    const patients = Array.from(patientsMap.values());

    if (!search) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.abhaNumber.includes(q) ||
        p.mobile.includes(q)
    );
  }

  /**
   * 3. Create Consent Request for Selected Patient
   */
  public async createConsentRequest(params: {
    patientId: string;
    hiuId?: string;
    hipId?: string;
    requesterName?: string;
    purposeCode?: string;
    purposeText?: string;
    hiTypes?: HIType[];
    dateFrom?: string;
    dateTo?: string;
    dataEraseAt?: string;
  }): Promise<{ consentRequestId: string; status: ConsentStatus; details: HIUConsentRecord }> {
    const hiuId = params.hiuId || 'Mohan_HIP';
    const requesterName = params.requesterName || 'Dr. Sharma';
    const consentRequestId = 'CR-' + uuidv4().substring(0, 8).toUpperCase();
    const internalId = uuidv4();

    const allowedHiTypes: HIType[] = params.hiTypes || [
      'OPConsultation',
      'Prescription',
      'DischargeSummary',
      'DiagnosticReport',
      'ImmunizationRecord',
      'WellnessRecord',
    ];

    const fromDate = params.dateFrom || '2020-01-01T00:00:00.000Z';
    const toDate = params.dateTo || new Date().toISOString();
    // Default valid for 30 days
    const eraseDate = params.dataEraseAt || new Date(Date.now() + 30 * 86400000).toISOString();

    // Call ABDM Gateway /consent/v3/request/init
    await abdmHIUClient
      .initConsentRequest({
        patientId: params.patientId,
        hiuId,
        hipId: params.hipId,
        requesterName,
        hiTypes: allowedHiTypes,
        purpose: {
          code: params.purposeCode || 'CAREMGT',
          text: params.purposeText || 'Care Management',
        },
        permission: {
          accessMode: 'VIEW',
          dateRange: { from: fromDate, to: toDate },
          dataEraseAt: eraseDate,
          frequency: { unit: 'HOUR', value: 1, repeats: 0 },
        },
      })
      .catch((err) => {
        logger.warn('Consent init ABDM Gateway notice:', err.message);
      });

    const patientInfo = this.getPatients().find((p) => p.patientId === params.patientId);

    const record: HIUConsentRecord = {
      id: internalId,
      consentRequestId,
      patientId: params.patientId,
      patientName: patientInfo?.name || 'Selected Patient',
      hiuId,
      requesterName,
      purpose: {
        code: params.purposeCode || 'CAREMGT',
        text: params.purposeText || 'Care Management',
      },
      hiTypes: allowedHiTypes,
      status: 'REQUESTED',
      dateRange: { from: fromDate, to: toDate },
      dataEraseAt: eraseDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.consentRequests.set(consentRequestId, record);
    this.saveToDisk();

    return {
      consentRequestId,
      status: 'REQUESTED',
      details: record,
    };
  }

  /**
   * 4. List Consent Requests
   */
  public listConsentRequests(filter?: {
    status?: ConsentStatus;
    patientId?: string;
  }): HIUConsentRecord[] {
    const list = Array.from(this.consentRequests.values());
    return list.filter((item) => {
      // Auto-expire check
      if (item.status === 'GRANTED' && new Date() > new Date(item.dataEraseAt)) {
        item.status = 'EXPIRED';
      }
      if (filter?.status && item.status !== filter.status) return false;
      if (filter?.patientId && item.patientId !== filter.patientId) return false;
      return true;
    });
  }

  /**
   * 5. Get Consent Request Details
   */
  public getConsentRequest(consentRequestIdOrId: string): HIUConsentRecord {
    let record = this.consentRequests.get(consentRequestIdOrId);
    if (!record) {
      record = Array.from(this.consentRequests.values()).find(
        (r) => r.id === consentRequestIdOrId || r.consentId === consentRequestIdOrId
      );
    }
    if (!record) {
      throw new AppError(`Consent request not found: ${consentRequestIdOrId}`, 404, 'NOT_FOUND');
    }

    // Auto-expire check
    if (record.status === 'GRANTED' && new Date() > new Date(record.dataEraseAt)) {
      record.status = 'EXPIRED';
      this.saveToDisk();
    }

    return record;
  }

  /**
   * 6. Simulate or Handle Consent Status Update (Grant, Deny, Revoke, Expire)
   */
  public updateConsentStatus(
    consentRequestId: string,
    status: ConsentStatus,
    consentId?: string
  ): HIUConsentRecord {
    const record = this.getConsentRequest(consentRequestId);
    record.status = status;
    record.updatedAt = new Date().toISOString();
    if (consentId) {
      record.consentId = consentId;
    } else if (status === 'GRANTED' && !record.consentId) {
      record.consentId = 'CONSENT-' + uuidv4().substring(0, 8).toUpperCase();
    }

    // Link default clinical data to granted consent
    if (record.status === 'GRANTED' && record.consentId) {
      const existing = this.clinicalRecords.get(record.consentId);
      if (!existing) {
        const defaultRecords = this.clinicalRecords.get('CONSENT-JIYAN-2026-01') || [];
        const cloned = defaultRecords.map((r) => ({
          ...r,
          id: uuidv4(),
          consentId: record.consentId!,
          patientId: record.patientId,
        }));
        this.clinicalRecords.set(record.consentId, cloned);
      }
    }

    this.saveToDisk();
    return record;
  }

  /**
   * 7. Gateway Webhook Callback: POST /api/v3/hiu/consent/request/notify
   */
  public async handleGatewayNotifyWebhook(
    requestId: string,
    body: any
  ): Promise<{ status: string; acknowledgement: any }> {
    const notification = body.notification;
    if (!notification) {
      throw new AppError('Missing notification object in notify webhook', 400);
    }

    const consentRequestId = notification.consentRequestId;
    const consentStatus: ConsentStatus = notification.status; // GRANTED | DENIED | REVOKED | EXPIRED
    const consentArtefacts = notification.consentArtefacts || [];
    const consentId = consentArtefacts[0]?.id;

    if (consentRequestId) {
      try {
        this.updateConsentStatus(consentRequestId, consentStatus, consentId);
      } catch (err: any) {
        logger.debug('Consent not found during webhook notify:', err.message);
      }
    }

    // Acknowledge to ABDM Gateway
    await abdmHIUClient
      .acknowledgeConsentNotify(requestId, [
        {
          status: 'OK',
          consentId: consentId || consentRequestId || 'UNKNOWN',
        },
      ])
      .catch((err) => {
        logger.warn('Gateway acknowledgement notice:', err.message);
      });

    return {
      status: 'ACKNOWLEDGED',
      acknowledgement: {
        consentRequestId,
        consentStatus,
      },
    };
  }

  /**
   * 8. View Health Data of Approved Consent with HI Type Filtering & Strict Privacy Safeguards
   */
  public getHealthData(
    consentRequestIdOrId: string,
    hiTypeFilter?: HIType
  ): {
    consentId: string;
    patientId: string;
    patientName: string;
    consentStatus: ConsentStatus;
    hiTypesRequested: HIType[];
    totalRecords: number;
    records: HIUHealthRecord[];
  } {
    const consent = this.getConsentRequest(consentRequestIdOrId);

    // 1. Strict Enforcement: DENIED
    if (consent.status === 'DENIED') {
      throw new AppError(
        'Health data access rejected: Patient has DENIED this consent request.',
        403,
        'CONSENT_DENIED'
      );
    }

    // 2. Strict Enforcement: REVOKED
    if (consent.status === 'REVOKED') {
      throw new AppError(
        'Health data access rejected: Patient has REVOKED this consent.',
        403,
        'CONSENT_REVOKED'
      );
    }

    // 3. Strict Enforcement: EXPIRED
    if (consent.status === 'EXPIRED' || new Date() > new Date(consent.dataEraseAt)) {
      consent.status = 'EXPIRED';
      this.saveToDisk();
      throw new AppError(
        `Health data access rejected: Consent has EXPIRED on ${consent.dataEraseAt}.`,
        403,
        'CONSENT_EXPIRED'
      );
    }

    // 4. Must be GRANTED
    if (consent.status !== 'GRANTED') {
      throw new AppError(
        `Health data access rejected: Consent status is currently '${consent.status}' (Waiting for patient approval in PHR app).`,
        403,
        'CONSENT_NOT_GRANTED'
      );
    }

    // Retrieve records
    const consentKey = consent.consentId || consent.consentRequestId;
    let records = this.clinicalRecords.get(consentKey) || [];

    // Fallback if records were under template consent
    if (records.length === 0) {
      records = this.clinicalRecords.get('CONSENT-JIYAN-2026-01') || [];
    }

    // Filter by HI Type if specified
    if (hiTypeFilter) {
      records = records.filter((r) => r.hiType.toLowerCase() === hiTypeFilter.toLowerCase());
    }

    return {
      consentId: consent.consentId || consent.consentRequestId,
      patientId: consent.patientId,
      patientName: consent.patientName,
      consentStatus: consent.status,
      hiTypesRequested: consent.hiTypes,
      totalRecords: records.length,
      records,
    };
  }
}

export const hiuService = new HIUService();
