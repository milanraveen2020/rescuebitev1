import { type ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/x' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  beforeAll(() => {
    // Silence the expected 5xx error logging.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('maps a ZodError to 400 validation_error with field details', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'nope' });
    const { host, status, json } = mockHost();

    if (result.success) throw new Error('expected parse to fail');
    filter.catch(result.error, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'validation_error',
        details: { fieldErrors: { email: expect.arrayContaining([expect.any(String)]) } },
      }),
    });
  });

  it('maps a NotFoundException to 404 not_found and preserves its message', () => {
    const { host, status, json } = mockHost();
    filter.catch(new NotFoundException('No such store'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'not_found', message: 'No such store' },
    });
  });

  it('maps Prisma P2025 to 404 not_found', () => {
    const { host, status, json } = mockHost();
    const error = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '5.22.0',
    });
    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'not_found' }),
    });
  });

  it('maps an unknown error to 500 internal_error without leaking details', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('secret stack trace'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0] as { error: { code: string; message: string } };
    expect(body.error.code).toBe('internal_error');
    expect(body.error.message).not.toContain('secret');
  });
});
