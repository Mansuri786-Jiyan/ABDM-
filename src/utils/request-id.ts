import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique UUID v4 for ABDM REQUEST-ID and internal tracing
 */
export function generateRequestId(): string {
  return uuidv4();
}
