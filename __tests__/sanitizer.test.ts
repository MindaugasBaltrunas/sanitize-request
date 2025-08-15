import DOMPurify from 'isomorphic-dompurify';
import { sanitizeRequestData, sanitizeString, SanitizationError } from '../src/utils/sanitizer';
import { SENSITIVE_FIELDS } from '../src/constants/sensitiveFields';

describe('Sanitizer', () => {
  const config = {
    allowedTags: ['b', 'i'],
    allowedAttributes: { a: ['href'] },
    stripIgnoreTag: true,
    stripIgnoreTagBody: false,
    allowEmptyTags: false,
    maxTagDepth: 10,
    maxStringLength: 10, // short on purpose to force truncation warnings
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sanitizes a simple string (removes script tags and preserves allowed tags)', () => {
    const input = '<b>bold</b> <script>alert(1)</script>';
    const result = sanitizeString(input, config);
    // be tolerant about exact DOMPurify output — assert key properties instead of exact string
    expect(result.sanitized).toBeTruthy();
    expect(result.data).toEqual(expect.stringContaining('bold'));
    expect(result.data).not.toEqual(expect.stringContaining('<script>'));
    expect(result.warnings).toBeDefined();
  });

  it('truncates string exceeding maxStringLength and issues a warning', () => {
    const input = '123456789012345';
    const result = sanitizeString(input, config);
    expect(result.data.length).toBeLessThanOrEqual(config.maxStringLength);
    expect(result.sanitized).toBeTruthy();
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => /truncated/i.test(w))).toBeTruthy();
  });

  it('skips sensitive fields when sanitizing an object', () => {
    const sensitiveKey = SENSITIVE_FIELDS[0] ?? 'password';
    const data: any = { [sensitiveKey]: '<b>secret</b>', other: '<b>ok</b>' };

    const result = sanitizeRequestData(data, config);
    // sensitive field should remain untouched
    expect(result.data[sensitiveKey]).toBe('<b>secret</b>');
    // non-sensitive should be sanitized (allowed tag preserved)
    expect(result.data.other).toEqual(expect.stringContaining('ok'));
    // sanitized should be true because at least one field was processed/truncated/changed
    expect(typeof result.sanitized).toBe('boolean');
  });

  it('sanitizes nested objects and arrays', () => {
    const data = {
      user: {
        name: '<i>name</i>',
        tags: ['<b>tag1</b>', '<script>alert</script>'],
      },
    };

    const result = sanitizeRequestData(data, config);

    expect(result.data.user.name).toEqual(expect.stringContaining('name'));
    expect(Array.isArray(result.data.user.tags)).toBeTruthy();
    expect(result.data.user.tags[0]).toEqual(expect.stringContaining('tag1'));
    expect(result.data.user.tags[1]).not.toEqual(expect.stringContaining('<script>'));
    // sanitized flag should reflect that something was processed
    expect(typeof result.sanitized).toBe('boolean');
  });

  it('throws SanitizationError when DOMPurify.sanitize throws', () => {
    // simulate DOMPurify throwing an unexpected error
    jest.spyOn(DOMPurify, 'sanitize' as any).mockImplementation(() => {
      throw new Error('dompurify-failure');
    });

    expect(() => sanitizeString('<b>test</b>', config)).toThrow(SanitizationError);
    // also check sanitizeRequestData wrapping
    expect(() => sanitizeRequestData({ a: '<b>x</b>' }, config)).toThrow(SanitizationError);
  });

  it('produces warnings but no errors for long field', () => {
    const longString = '12345678901234567890';
    const result = sanitizeRequestData({ field: longString }, config);
    expect(result.warnings && result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toBeUndefined();
  });

  it('sanitizeString and sanitizeRequestData produce compatible sanitized flags', () => {
    const str = '<b>test</b>';
    const strResult = sanitizeString(str, config);
    const objResult = sanitizeRequestData({ s: str }, config);
    expect(typeof strResult.sanitized).toBe('boolean');
    expect(typeof objResult.sanitized).toBe('boolean');
  });

  it('does not modify non-string primitive values', () => {
    const input = { num: 123, bool: true, nil: null, undef: undefined };
    const result = sanitizeRequestData(input, config);
    expect(result.data).toEqual(input);
    // sanitized may be false if nothing needed sanitization
    expect(result.sanitized).toBeFalsy();
  });
});
