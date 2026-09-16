import { logger, redactString, sanitizeLogData } from '../logger';

describe('logger and privacy redaction', () => {
  describe('redactString', () => {
    it('redacts email addresses', () => {
      const input = 'User test.user+demo@example.com logged in successfully';
      const output = redactString(input);
      expect(output).not.toContain('test.user+demo@example.com');
      expect(output).toContain('[REDACTED_EMAIL]');
    });

    it('redacts JWT tokens', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = `Auth token received: ${jwt}`;
      const output = redactString(input);
      expect(output).not.toContain(jwt);
      expect(output).toContain('[REDACTED_JWT]');
    });

    it('redacts Bearer authorization headers', () => {
      const input = 'Headers: Authorization: Bearer secret_token_value_abc123';
      const output = redactString(input);
      expect(output).not.toContain('secret_token_value_abc123');
      expect(output).toContain('Bearer [REDACTED_TOKEN]');
    });

    it('redacts base64 images and audio URIs', () => {
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
      const input = `Upload payload preview: ${base64Image}`;
      const output = redactString(input);
      expect(output).not.toContain('/9j/4AAQSkZJRg');
      expect(output).toContain('data:[REDACTED_BASE64]');
    });

    it('redacts sensitive key-value pairs', () => {
      const input = 'Config: apikey=sk-or-v1-abcdef1234567890';
      const output = redactString(input);
      expect(output).not.toContain('sk-or-v1-abcdef1234567890');
      expect(output).toContain('[REDACTED_SECRET]');
    });
  });

  describe('sanitizeLogData', () => {
    it('redacts sensitive object keys completely', () => {
      const sensitiveObj = {
        id: 'user-123',
        password: 'mySecretPassword123!',
        token: 'token_abc',
        access_token: 'access_xyz',
        profile: {
          name: 'Konrad',
          email: 'konrad@example.com',
          secret: 'top_secret',
        },
      };

      interface SanitizedResult {
        password?: string;
        token?: string;
        access_token?: string;
        profile: {
          name?: string;
          email?: string;
          secret?: string;
        };
      }

      const result = sanitizeLogData(sensitiveObj) as SanitizedResult;
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.access_token).toBe('[REDACTED]');
      expect(result.profile.secret).toBe('[REDACTED]');
      expect(result.profile.email).toBe('[REDACTED_EMAIL]');
      expect(result.profile.name).toBe('Konrad');
    });

    it('sanitizes Error instances without leaking secrets from error message', () => {
      const err = new Error('Failed to reach server with token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123xyz');
      const sanitized = sanitizeLogData(err) as { name: string; message: string };
      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).toContain('[REDACTED_JWT]');
      expect(sanitized.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('handles circular references safely', () => {
      const circular: Record<string, unknown> = { name: 'circular' };
      circular.self = circular;
      const result = sanitizeLogData(circular) as Record<string, unknown>;
      expect(result.name).toBe('circular');
      expect(result.self).toBe('[CIRCULAR]');
    });
  });

  describe('logger methods', () => {
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let infoSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it('logger.warn sanitizes arguments before passing to console.warn', () => {
      logger.warn('Token failure', { token: 'super_secret', email: 'athlete@gym.de' });
      expect(warnSpy).toHaveBeenCalledWith('Token failure', {
        token: '[REDACTED]',
        email: '[REDACTED_EMAIL]',
      });
    });

    it('logger.error sanitizes arguments before passing to console.error', () => {
      logger.error('Sync error', new Error('User test@test.com failed'));
      expect(errorSpy).toHaveBeenCalledWith('Sync error', {
        name: 'Error',
        message: 'User [REDACTED_EMAIL] failed',
      });
    });
  });
});
