import winston from 'winston';
import path from 'path';

const SENSITIVE_KEYS = [
  'aadhaar',
  'aadhaarno',
  'loginid',
  'otp',
  'otpvalue',
  'clientsecret',
  'clientsecretencrypted',
  'password',
  'secret',
  'accesstoken',
  'token',
  'refreshtoken',
  'authorization',
  'x-token',
];

// Helper to recursively redact sensitive fields from log payloads
export function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Check if looks like a 12-digit Aadhaar number
    if (/^\d{12}$/.test(obj.trim())) {
      return 'XXXXXXXX' + obj.trim().slice(-4);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item));
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = maskSensitiveData(value);
      }
    }
    return clean;
  }
  return obj;
}

const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const safeMeta = Object.keys(meta).length ? JSON.stringify(maskSensitiveData(meta)) : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${safeMeta}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    customFormat
  ),
  defaultMeta: { service: 'abdm-m1-connector' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        customFormat
      ),
    }),
  ],
});
