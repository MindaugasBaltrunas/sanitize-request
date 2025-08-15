import { Request, Response, NextFunction } from 'express';
import { sanitizeStrings } from '../src/middleware/sanitizeStrings';
import { SENSITIVE_FIELDS } from '../src/constants/sensitiveFields';

type MockReq = Partial<Request> & { body?: any };

describe('sanitizeStrings middleware', () => {
  let req: MockReq;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  const runMiddleware = (options = {}) => {
    sanitizeStrings(options)(req as Request, res as Response, next);
  };

  it('calls next() if no body exists', () => {
    runMiddleware();
    expect(next).toHaveBeenCalledWith();
  });

  it('skips non-string values', () => {
    req.body = { num: 1, bool: true, arr: [1], obj: { a: 'b' }, nullVal: null };
    runMiddleware();
    expect(req.body).toEqual({ num: 1, bool: true, arr: [1], obj: { a: 'b' }, nullVal: null });
    expect(next).toHaveBeenCalled();
  });

  it('sanitizes strings by default', () => {
    req.body = { text: '  <b>hello</b> & ' };
    runMiddleware();
    expect(req.body.text).toBe('bhello/b');
  });

  it('skips default sensitive fields', () => {
    const key = SENSITIVE_FIELDS[0];
    req.body = { [key]: '<secret>' };
    runMiddleware();
    expect(req.body[key]).toBe('<secret>');
  });

  it('respects custom sensitive fields', () => {
    req.body = { secret: '<secret>', normal: '<b>text</b>' };
    runMiddleware({ customSensitiveFields: ['secret'] });
    expect(req.body).toEqual({ secret: '<secret>', normal: 'btext/b' });
  });

  it('applies custom sanitizer', () => {
    req.body = { text: 'hello' };
    runMiddleware({ customSanitizer: (v: string) => v.toUpperCase() });
    expect(req.body.text).toBe('HELLO');
  });

  it('skips empty strings when skipEmptyStrings is true', () => {
    req.body = { empty: '', spaced: '   ', text: '  hello ' };
    runMiddleware({ skipEmptyStrings: true });
    expect(req.body).toEqual({ empty: '', spaced: '   ', text: 'hello' });
  });

  it('processes empty strings when skipEmptyStrings is false', () => {
    req.body = { empty: '', spaced: '   ' };
    runMiddleware({ skipEmptyStrings: false });
    expect(req.body).toEqual({ empty: '', spaced: '' });
  });

  it('calls next with error if sanitizer throws', () => {
    const error = new Error('Fail');
    req.body = { text: 'ok' };
    runMiddleware({ customSanitizer: () => { throw error; } });
    expect(next).toHaveBeenCalledWith(error);
  });
});
