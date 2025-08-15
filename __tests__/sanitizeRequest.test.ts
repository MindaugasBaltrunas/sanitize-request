import { Request, Response, NextFunction } from 'express';

// Mocks
const mockSanitizeRequestData = jest.fn();
class MockSanitizationError extends Error { }

jest.mock('../src/utils/sanitizer', () => ({
  sanitizeRequestData: (...args: any[]) => mockSanitizeRequestData(...args),
  SanitizationError: MockSanitizationError,
}));

const mockGetConfig = jest.fn();
jest.mock('../src/config/sanitizationConfigs', () => ({
  getConfig: (name: string) => mockGetConfig(name),
}));

import { sanitizeRequest } from '../src/middleware/sanitizeRequest';

type MockReq = Partial<Request> & { body?: any; _sanitization?: any };

const createMockRequest = (overrides: Partial<MockReq> = {}): MockReq => ({
  body: {},
  path: '/',
  method: 'GET',
  ...overrides,
});

const createMockResponse = (): Partial<Response> => ({});

describe('sanitizeRequest middleware', () => {
  let req: MockReq;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = jest.fn();
    mockSanitizeRequestData.mockReset();
    mockGetConfig.mockReset();
  });

  const runMiddleware = (options?: Parameters<typeof sanitizeRequest>[0]) =>
    sanitizeRequest(options)(req as Request, res as Response, next);

  it('calls next() when no body exists', () => {
    req.body = undefined;
    runMiddleware();
    expect(next).toHaveBeenCalled();
  });

  it('applies default base config', () => {
    req.body = { content: '<script>alert(1)</script>' };
    mockSanitizeRequestData.mockReturnValue({ data: { content: '' }, sanitized: true, warnings: [], errors: [] });
    mockGetConfig.mockReturnValue({});

    runMiddleware();

    expect(req.body.content).toBe('');
    expect(next).toHaveBeenCalled();
    expect(mockGetConfig).toHaveBeenCalledWith('base');
  });

  it('skips paths in skipPaths option', () => {
    req.url = '/skip';
    req.body = { content: 'bad' };
    runMiddleware({ skipPaths: ['/skip'] });
    expect(req.body.content).toBe('bad');
    expect(next).toHaveBeenCalled();
  });

  it('handles sanitization errors and calls onError', () => {
    const onError = jest.fn();
    req.body = { content: 'bad' };
    mockSanitizeRequestData.mockReturnValue({ data: {}, sanitized: false, warnings: [], errors: ['fail'] });
    mockGetConfig.mockReturnValue({});

    runMiddleware({ onError });

    expect(onError).toHaveBeenCalledWith(expect.any(Error), req);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls onSanitized when sanitization occurs', () => {
    const onSanitized = jest.fn();
    req.body = { content: 'test' };
    mockSanitizeRequestData.mockReturnValue({ data: { content: 'test' }, sanitized: true, warnings: [], errors: [] });
    mockGetConfig.mockReturnValue({});

    runMiddleware({ onSanitized });

    expect(onSanitized).toHaveBeenCalled();
    expect(req._sanitization).toBeDefined();
  });

  it('logs warnings if logWarnings is true', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => { });
    req.body = { content: 'test' };
    req.method = 'POST';
    req.url = '/test';

    mockSanitizeRequestData.mockReturnValue({
      data: { content: 'test' },
      sanitized: false,
      warnings: ['warn'],
      errors: [],
    });
    mockGetConfig.mockReturnValue({});

    runMiddleware({ logWarnings: true });
   
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Sanitization warnings for POST /'),
      ['warn']
    );

    consoleWarn.mockRestore();
  });


});
