import { Router } from 'express';
import { abhaController } from './abha.controller';
import { authenticateHospitalClient } from '../../middleware/authentication';

const router = Router();

// All ABHA connector endpoints require hospital client authentication
router.use(authenticateHospitalClient);

/**
 * @swagger
 * /api/v1/abha/certificate:
 *   get:
 *     summary: Retrieve ABDM Public Encryption Certificate
 *     description: Fetches current ABDM public key used for RSA OAEP SHA-1 encryption of sensitive payloads.
 *     tags: [ABHA]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     responses:
 *       200:
 *         description: ABDM public key retrieved successfully
 */
router.get('/certificate', (req, res, next) => abhaController.getCertificate(req, res, next));

/**
 * @swagger
 * /api/v1/abha/enrollment/request-otp:
 *   post:
 *     summary: Request OTP for ABHA Enrollment (Aadhaar or Mobile)
 *     description: Initiates ABHA creation by triggering OTP to registered Aadhaar or Mobile.
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loginId
 *             properties:
 *               authMethod:
 *                 type: string
 *                 enum: [aadhaar, mobile]
 *                 default: aadhaar
 *               loginId:
 *                 type: string
 *                 description: 12-digit Aadhaar number or pre-encrypted base64 string
 *                 example: "999999990019"
 *               patientReferenceId:
 *                 type: string
 *                 description: Hospital internal patient ID or MRN
 *                 example: "MRN-10948"
 *     responses:
 *       200:
 *         description: OTP dispatched successfully
 */
router.post('/enrollment/request-otp', (req, res, next) =>
  abhaController.requestEnrollmentOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/verify-otp:
 *   post:
 *     summary: Verify OTP and Complete ABHA Enrollment
 *     description: Submits OTP to ABDM to create and activate the ABHA number.
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - otp
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP
 *                 example: "123456"
 *               mobile:
 *                 type: string
 *                 description: Optional 10-digit mobile number override
 *     responses:
 *       200:
 *         description: ABHA enrollment completed successfully
 */
router.post('/enrollment/verify-otp', (req, res, next) =>
  abhaController.verifyEnrollmentOtp(req, res, next)
);

// Alias route: POST /api/v1/abha/enrollment/create maps to verify-otp
router.post('/enrollment/create', (req, res, next) =>
  abhaController.verifyEnrollmentOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/address/suggestions:
 *   get:
 *     summary: Get ABHA Address Suggestions
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of suggested ABHA handles
 */
router.get('/address/suggestions', (req, res, next) =>
  abhaController.getAbhaAddressSuggestions(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/address/create:
 *   post:
 *     summary: Create Custom ABHA Address
 *     description: Links a custom PHR username (e.g. user@abdm) to newly created ABHA account.
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - abhaAddress
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               abhaAddress:
 *                 type: string
 *                 example: "john_doe"
 *               preferred:
 *                 type: integer
 *                 enum: [0, 1]
 *                 default: 1
 *     responses:
 *       200:
 *         description: ABHA address assigned successfully
 */
router.post('/address/create', (req, res, next) =>
  abhaController.createAbhaAddress(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/login/request-otp:
 *   post:
 *     summary: Request OTP for Existing ABHA Login
 *     tags: [ABHA Login & Verification]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
router.post('/login/request-otp', (req, res, next) =>
  abhaController.requestLoginOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/login/verify-otp:
 *   post:
 *     summary: Verify OTP for Existing ABHA Login
 *     tags: [ABHA Login & Verification]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
router.post('/login/verify-otp', (req, res, next) =>
  abhaController.verifyLoginOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/profile/{transactionId}:
 *   get:
 *     summary: Retrieve ABHA Profile by Transaction ID
 *     tags: [ABHA Profile]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Profile details retrieved
 */
router.get('/profile/:transactionId', (req, res, next) =>
  abhaController.getProfile(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/address/suggestions/{transactionId}:
 *   get:
 *     summary: Retrieve Suggested ABHA Addresses
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of recommended ABHA addresses
 */
router.get('/address/suggestions/:transactionId', (req, res, next) =>
  abhaController.getAddressSuggestions(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/card/{transactionId}:
 *   get:
 *     summary: Download ABHA Card (PDF)
 *     tags: [ABHA Profile]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Binary PDF of the ABHA card
 */
router.get('/card/:transactionId', (req, res, next) =>
  abhaController.downloadCard(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/mobile/request-otp:
 *   post:
 *     summary: Request OTP to Link/Update Mobile Number during Enrollment
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
router.post('/enrollment/mobile/request-otp', (req, res, next) =>
  abhaController.requestMobileLinkingOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/mobile/verify-otp:
 *   post:
 *     summary: Verify Mobile Number Linking OTP
 *     tags: [ABHA Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 */
router.post('/enrollment/mobile/verify-otp', (req, res, next) =>
  abhaController.verifyMobileLinkingOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/search:
 *   post:
 *     summary: Search ABHA accounts by Mobile Number (Face Auth Verification Flow)
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mobile]
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: List of matched ABHA accounts with index and masked ABHA numbers
 */
router.post('/face-auth/search', (req, res, next) =>
  abhaController.searchAbhaByMobile(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/request:
 *   post:
 *     summary: Request Face Auth for Selected ABHA Index
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [index]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               abdmTxnId:
 *                 type: string
 *               index:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Face auth request dispatched to ABDM
 */
router.post('/face-auth/request', (req, res, next) =>
  abhaController.requestFaceAuthLogin(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/capture-pid:
 *   post:
 *     summary: Trigger Capture PID for Face Auth RD Service
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               abdmTxnId:
 *                 type: string
 *               scopeType:
 *                 type: string
 *                 enum: [login, enrol]
 *                 default: login
 *     responses:
 *       200:
 *         description: Capture PID parameters returned
 */
router.post('/face-auth/capture-pid', (req, res, next) =>
  abhaController.capturePid(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/verify:
 *   post:
 *     summary: Verify Face Auth PID and Authenticate Patient
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [faceAuthPid]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               abdmTxnId:
 *                 type: string
 *               faceAuthPid:
 *                 type: string
 *                 description: UIDAI Face RD Service PID Data (Base64 / XML)
 *     responses:
 *       200:
 *         description: Patient verified and profile returned
 */
router.post('/face-auth/verify', (req, res, next) =>
  abhaController.verifyFaceLogin(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/enroll/init:
 *   post:
 *     summary: Initialize Face Auth ABHA Enrollment Transaction
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientReferenceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction initiated
 */
router.post('/face-auth/enroll/init', (req, res, next) =>
  abhaController.initFaceAuthEnrollment(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/face-auth/enroll/verify:
 *   post:
 *     summary: Complete New ABHA Creation via Face Auth PID & Aadhaar
 *     tags: [ABHA Face Auth]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aadhaar, rdPidData, mobile]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               abdmTxnId:
 *                 type: string
 *               aadhaar:
 *                 type: string
 *                 example: "123456789012"
 *               rdPidData:
 *                 type: string
 *                 description: UIDAI Face RD Service PID Data
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: ABHA account created successfully
 */
router.post('/face-auth/enroll/verify', (req, res, next) =>
  abhaController.enrolByFace(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/qr/scan:
 *   post:
 *     summary: Scan & Decode Patient ABHA Card QR (Type 2 - Card Scanner)
 *     description: Decodes physical or digital ABHA card QR code scanned by hospital reception scanner gun, extracts demographic details, and auto-registers the patient.
 *     tags: [ABHA Registration & Card]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrCode]
 *             properties:
 *               qrCode:
 *                 type: string
 *                 description: Raw scanned string (JSON, Base64-encoded, or URL)
 *                 example: '{"hidn":"91-5685-0627-1606","hid":"mansurijiyan2004@sbx","name":"Mansuri Jiyan","gender":"M","dob":"2004-05-15","mobile":"9408111252","address":"Ahmedabad, Gujarat","state_name":"Gujarat","distname":"Ahmedabad","pincode":"380001"}'
 *               autoRegister:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to auto-register patient in local records
 *               patientReferenceId:
 *                 type: string
 *                 example: "PAT-06271606"
 *               hipId:
 *                 type: string
 *                 example: "LIFELINE_AHD_01"
 *     responses:
 *       200:
 *         description: ABHA card QR decoded and patient details extracted
 */
router.post('/qr/scan', (req, res, next) => abhaController.scanUserAbhaQr(req, res, next));
router.post('/qr/decode', (req, res, next) => abhaController.scanUserAbhaQr(req, res, next));

/**
 * @swagger
 * /api/v1/abha/enrollment/dl/request-otp:
 *   post:
 *     summary: "Step 1 - Request OTP for Driving Licence (DL) Enrollment"
 *     description: Requests OTP via ABDM to registered mobile number for Driving Licence based ABHA creation.
 *     tags: [ABHA Driving Licence Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mobile]
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9408111252"
 *               patientReferenceId:
 *                 type: string
 *                 example: "PAT-DL-001"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/enrollment/dl/request-otp', (req, res, next) =>
  abhaController.requestDlEnrollmentOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/dl/verify-otp:
 *   post:
 *     summary: "Step 2 - Verify OTP for Driving Licence (DL) Enrollment"
 *     description: Submits the 6-digit OTP received by the patient to authorize the DL enrollment transaction.
 *     tags: [ABHA Driving Licence Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, otp]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post('/enrollment/dl/verify-otp', (req, res, next) =>
  abhaController.verifyDlEnrollmentOtp(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/dl/enrol:
 *   post:
 *     summary: "Step 3 - Enrol by Document (Driving Licence)"
 *     description: Submits Driving Licence details and demographics to create a provisional ABHA number.
 *     tags: [ABHA Driving Licence Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, documentNumber, firstName, dob, gender, address, pincode]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               documentType:
 *                 type: string
 *                 default: "DRIVING_LICENCE"
 *               documentNumber:
 *                 type: string
 *                 example: "DL-0420110149633"
 *               firstName:
 *                 type: string
 *                 example: "Jiyan"
 *               middleName:
 *                 type: string
 *                 example: ""
 *               lastName:
 *                 type: string
 *                 example: "Mansuri"
 *               dob:
 *                 type: string
 *                 example: "2004-05-15"
 *               gender:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "M"
 *               address:
 *                 type: string
 *                 example: "Drive-In Road, Ahmedabad"
 *               districtCode:
 *                 type: string
 *                 example: "476"
 *               district:
 *                 type: string
 *                 example: "Ahmedabad"
 *               stateCode:
 *                 type: string
 *                 example: "24"
 *               state:
 *                 type: string
 *                 example: "Gujarat"
 *               pincode:
 *                 type: string
 *                 example: "380001"
 *               mobile:
 *                 type: string
 *                 example: "9408111252"
 *               autoRegister:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Provisional ABHA created successfully
 */
router.post('/enrollment/dl/enrol', (req, res, next) =>
  abhaController.enrolByDocument(req, res, next)
);
router.post('/enrollment/enrol/by-document', (req, res, next) =>
  abhaController.enrolByDocument(req, res, next)
);

/**
 * @swagger
 * /api/v1/abha/enrollment/dl/test-simulate:
 *   post:
 *     summary: "Step 4 - Simulate Complete DL Flow (One-Click Test)"
 *     description: Runs full end-to-end DL enrollment simulation (OTP request, OTP verify, and Document enrolment with photo).
 *     tags: [ABHA Driving Licence Enrollment]
 *     security:
 *       - BearerAuth: []
 *       - ClientCredentials: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *                 example: "9408111252"
 *               documentNumber:
 *                 type: string
 *                 example: "GJ0120200012345"
 *               firstName:
 *                 type: string
 *                 example: "Jiyan"
 *               lastName:
 *                 type: string
 *                 example: "Mansuri"
 *               withPhoto:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Simulation completed successfully
 */
router.post('/enrollment/dl/test-simulate', (req, res, next) =>
  abhaController.simulateDlEnrollment(req, res, next)
);

export const abhaRouter: Router = router;
