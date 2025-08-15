import { Request, Response, NextFunction } from 'express';
import { SENSITIVE_FIELDS } from '../constants/sensitiveFields';

interface SanitizeStringsOptions {
  customSensitiveFields?: string[];
  customSanitizer?: (value: string) => string;
  skipEmptyStrings?: boolean;
}

export const sanitizeStrings = (options: SanitizeStringsOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body) return next();

      const sensitiveFields = [...SENSITIVE_FIELDS, ...(options.customSensitiveFields || [])];
      const defaultSanitizer = (value: string) => value.replace(/[<>"'&]/g, '').trim();
      const sanitizer = options.customSanitizer || defaultSanitizer;

      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string' && !sensitiveFields.includes(key)) {
          if (options.skipEmptyStrings && !value.trim()) continue;
          req.body[key] = sanitizer(value);
        }
      }

      next();
    } catch (error) {
      console.error('Error sanitizing string fields:', error);
      next(error);
    }
  };
};
