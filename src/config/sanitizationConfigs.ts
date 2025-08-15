import { SanitizationConfig } from '../types/sanitization';

export const BASE_CONFIG: SanitizationConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href', 'title'] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: false,
  allowEmptyTags: false,
  maxTagDepth: 10,
  maxStringLength: 10000,
};

export const STRICT_CONFIG: SanitizationConfig = {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: true,
  allowEmptyTags: false,
  maxTagDepth: 5,
  maxStringLength: 1000,
};

export const LIBERAL_CONFIG: SanitizationConfig = {
  allowedTags: [
    'h1','h2','h3','h4','h5','h6','p','br','hr',
    'b','i','em','strong','u','s','sub','sup',
    'ul','ol','li','a','img',
    'blockquote','code','pre',
    'table','thead','tbody','tr','th','td',
    'div','span'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    blockquote: ['cite'],
    table: ['class'],
    th: ['scope'],
    td: ['colspan', 'rowspan'],
  },
  allowEmptyTags: true,
  maxTagDepth: 20,
  maxStringLength: 50000,
};

export const BLOG_CONFIG: SanitizationConfig = {
  allowedTags: [
    'h2','h3','h4','h5','h6','p','br',
    'b','i','em','strong','u',
    'ul','ol','li','a','img',
    'blockquote','code','div','span'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    img: ['src', 'alt', 'title'],
    blockquote: ['cite'],
    div: ['class'],
    span: ['class'],
  },
  stripIgnoreTag: true,
  allowEmptyTags: false,
  maxTagDepth: 15,
  maxStringLength: 25000,
};

export const COMMENT_CONFIG: SanitizationConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'br', 'a'],
  allowedAttributes: { a: ['href', 'title'] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: true,
  allowEmptyTags: false,
  maxTagDepth: 3,
  maxStringLength: 2000,
};

export const EMAIL_CONFIG: SanitizationConfig = {
  allowedTags: ['p','br','b','i','em','strong','a'],
  allowedAttributes: { a: ['href', 'title'] },
  stripIgnoreTag: true,
  stripIgnoreTagBody: true,
  allowEmptyTags: false,
  maxTagDepth: 5,
  maxStringLength: 5000,
};

export const ADMIN_CONFIG: SanitizationConfig = {
  allowedTags: [
    'h1','h2','h3','h4','h5','h6','p','br','hr',
    'b','i','em','strong','u','s','sub','sup',
    'ul','ol','li','a','img',
    'blockquote','code','pre',
    'table','thead','tbody','tr','th','td',
    'div','span','section','article',
    'form','input','textarea','select','option',
    'button','label'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'class'],
    blockquote: ['cite'],
    table: ['class'],
    th: ['scope', 'class'],
    td: ['colspan', 'rowspan', 'class'],
    div: ['class', 'id'],
    span: ['class', 'id'],
    form: ['action', 'method'],
    input: ['type', 'name', 'value', 'placeholder', 'required'],
    textarea: ['name', 'placeholder', 'required', 'rows', 'cols'],
    select: ['name', 'required'],
    option: ['value'],
    button: ['type', 'class'],
    label: ['for'],
  },
  allowEmptyTags: true,
  maxTagDepth: 25,
  maxStringLength: 100000,
};

export const SANITIZATION_CONFIGS = {
  base: BASE_CONFIG,
  strict: STRICT_CONFIG,
  liberal: LIBERAL_CONFIG,
  blog: BLOG_CONFIG,
  comment: COMMENT_CONFIG,
  email: EMAIL_CONFIG,
  admin: ADMIN_CONFIG,
} as const;

export type ConfigName = keyof typeof SANITIZATION_CONFIGS;

export const getConfig = (name: ConfigName): SanitizationConfig => {
  const config = SANITIZATION_CONFIGS[name];
  if (!config) throw new Error(`Unknown sanitization config: ${name}`);
  return { ...config };
};

export const createCustomConfig = (
  base: ConfigName | SanitizationConfig,
  overrides: Partial<SanitizationConfig>
): SanitizationConfig => {
  const baseConfig = typeof base === 'string' ? getConfig(base) : { ...base };
  return {
    ...baseConfig,
    ...overrides,
    allowedAttributes: {
      ...baseConfig.allowedAttributes,
      ...overrides.allowedAttributes,
    },
  };
};
