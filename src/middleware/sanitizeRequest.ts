import { Request, Response, NextFunction } from 'express';
import { sanitizeRequestData, SanitizationError } from '../utils/sanitizer';
import { SanitizationConfig } from '../types/sanitization';
import { ConfigName, getConfig } from '../config/sanitizationConfigs';

interface SanitizeRequestOptions {
  config?: SanitizationConfig | ConfigName;
  onSanitized?: (metadata: any) => void;
  onError?: (error: Error, req: Request) => void;
  skipPaths?: string[];
  logWarnings?: boolean;
}

export const sanitizeRequest = (options: SanitizeRequestOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (options.skipPaths?.some(path => req.path.includes(path))) return next();

      const config = options.config
        ? typeof options.config === 'string'
          ? getConfig(options.config)
          : options.config
        : getConfig('base');

      if (req.body && typeof req.body === 'object') {
        const { data, sanitized, warnings, errors } = sanitizeRequestData(req.body, config);
        req.body = data;

        if (sanitized || warnings.length > 0) {
          (req as any)._sanitization = { sanitized, warnings, errors, timestamp: new Date().toISOString() };
          if (options.logWarnings && warnings.length > 0) {
            console.warn(`Sanitization warnings for ${req.method} ${req.path}:`, warnings);
          }
          options.onSanitized?.((req as any)._sanitization);
        }

        if (errors?.length) {
          const error = new Error(`Sanitization errors: ${errors.join(', ')}`);
          options.onError?.(error, req);
          return next(error);
        }
      }

      next();
    } catch (error) {
      const sanitizationError = error instanceof SanitizationError
        ? error
        : new Error(`Request sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      options.onError?.(sanitizationError, req);
      next(sanitizationError);
    }
  };
};
