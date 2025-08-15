export const SENSITIVE_FIELDS = [
  'password',
  'confirmPassword',
  'passwordConfirm',
  'adminPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'privateKey',
  'jwt',
  'sessionId',
  'csrfToken',
  'authToken',
] as const;

export type SensitiveKey = typeof SENSITIVE_FIELDS[number];
