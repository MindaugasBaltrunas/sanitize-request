export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: boolean;
  allowEmptyTags?: boolean;
  maxTagDepth?: number;
  maxStringLength?: number;
}

export interface SanitizationResult<T> {
  data: T;
  sanitized: boolean;
  warnings: string[];
  errors?: string[];
}

export interface SanitizationMetadata {
  sanitized: boolean;
  warnings: string[];
  errors?: string[];
  fieldsModified: string[];
  originalSize?: number;
  finalSize?: number;
}

export type SanitizableValue = string | number | boolean | null | undefined | Date | RegExp;
export type SanitizableObject = Record<string, any>;
export type SanitizableInput = SanitizableValue | SanitizableObject | Array<any>;