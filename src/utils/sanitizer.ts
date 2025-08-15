import DOMPurify from 'isomorphic-dompurify';
import {
  SanitizationConfig,
  SanitizationResult,
  SanitizationMetadata,
  SanitizableInput
} from '../types/sanitization';
import { SENSITIVE_FIELDS } from '../constants/sensitiveFields';

export class SanitizationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'SanitizationError';
  }
}

const logger = {
  debug: (...args: any[]) =>  console.debug(...args),
  error: (...args: any[]) => console.error(...args),
  info: (...args: any[]) => console.info(...args),
  warn: (...args: any[]) => console.warn(...args),
};

class Sanitizer {
  private config: Required<SanitizationConfig>;
  private metadata: SanitizationMetadata;

  constructor(config: SanitizationConfig) {
    this.config = {
      allowedTags: config.allowedTags || [],
      allowedAttributes: config.allowedAttributes || {},
      stripIgnoreTag: config.stripIgnoreTag ?? true,
      stripIgnoreTagBody: config.stripIgnoreTagBody ?? false,
      allowEmptyTags: config.allowEmptyTags ?? false,
      maxTagDepth: config.maxTagDepth ?? 10,
      maxStringLength: config.maxStringLength ?? 10000,
    };
    
    this.metadata = {
      sanitized: false,
      warnings: [],
      errors: [],
      fieldsModified: [],
    };
  }

  private sanitizeString(input: string, fieldName?: string): string {
    try {
      const originalLength = input.length;
      
      // Check string length
      if (originalLength > this.config.maxStringLength) {
        this.metadata.warnings.push(
          `String in field '${fieldName || 'unknown'}' truncated from ${originalLength} to ${this.config.maxStringLength} characters`
        );
        input = input.substring(0, this.config.maxStringLength);
        this.metadata.sanitized = true;
      }

      // Configure DOMPurify
      const purifyConfig: any = {
        ALLOWED_TAGS: this.config.allowedTags,
        ALLOWED_ATTR: Object.values(this.config.allowedAttributes).flat(),
        KEEP_CONTENT: !this.config.stripIgnoreTagBody,
        ALLOW_EMPTY_TAGS: this.config.allowEmptyTags,
      };

      const sanitized = DOMPurify.sanitize(input, purifyConfig) as unknown as string;;
      
      if (sanitized !== input) {
        this.metadata.sanitized = true;
        if (fieldName) {
          this.metadata.fieldsModified.push(fieldName);
        }
      }

      return sanitized;
    } catch (error) {
      const message = `Failed to sanitize string in field '${fieldName || 'unknown'}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.metadata.errors = this.metadata.errors || [];
      this.metadata.errors.push(message);
      logger.error(message);
      throw new SanitizationError(message, fieldName);
    }
  }

  private sanitizeValue(value: any, fieldName?: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Skip sensitive fields
    if (fieldName && SENSITIVE_FIELDS.includes(fieldName as any)) {
      logger.debug(`Skipping sanitization for sensitive field: ${fieldName}`);
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value, fieldName);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.sanitizeValue(item, fieldName ? `${fieldName}[${index}]` : `[${index}]`)
      );
    }

    if (value && typeof value === 'object') {
      const sanitizedObj: any = {};
      for (const [key, val] of Object.entries(value)) {
        const fullFieldName = fieldName ? `${fieldName}.${key}` : key;
        sanitizedObj[key] = this.sanitizeValue(val, fullFieldName);
      }
      return sanitizedObj;
    }

    return value;
  }

  public sanitize<T extends SanitizableInput>(input: T): SanitizationResult<T> {
    this.metadata = {
      sanitized: false,
      warnings: [],
      errors: [],
      fieldsModified: [],
      originalSize: JSON.stringify(input).length,
    };

    try {
      const sanitizedData = this.sanitizeValue(input) as T;
      this.metadata.finalSize = JSON.stringify(sanitizedData).length;

      return {
        data: sanitizedData,
        sanitized: this.metadata.sanitized,
        warnings: this.metadata.warnings,
        errors: this.metadata.errors?.length ? this.metadata.errors : undefined,
      };
    } catch (error) {
      if (error instanceof SanitizationError) {
        throw error;
      }
      
      const message = `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(message);
      throw new SanitizationError(message);
    }
  }

  public getMetadata(): SanitizationMetadata {
    return { ...this.metadata };
  }
}

export const sanitizeRequestData = <T extends Record<string, any>>(
  data: T,
  config: SanitizationConfig
): SanitizationResult<T> => {
  const sanitizer = new Sanitizer(config);
  return sanitizer.sanitize(data);
};

export const sanitizeString = (
  input: string,
  config: SanitizationConfig
): SanitizationResult<string> => {
  const sanitizer = new Sanitizer(config);
  return sanitizer.sanitize(input);
};
