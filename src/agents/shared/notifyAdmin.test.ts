import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMock = vi.fn(async () => ({ data: null, error: null }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('notifyAdmin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sends an email to ADMIN_NOTIFICATION_EMAIL when configured', async () => {
    const { notifyAdmin } = await import('./notifyAdmin');
    await notifyAdmin('Test subject', 'Test body');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@example.com', subject: 'Test subject' })
    );
  });

  it('skips sending when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const { notifyAdmin } = await import('./notifyAdmin');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await notifyAdmin('Test subject', 'Test body');

    expect(sendMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('skips sending when ADMIN_NOTIFICATION_EMAIL is missing', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    const { notifyAdmin } = await import('./notifyAdmin');

    await notifyAdmin('Test subject', 'Test body');

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('never throws when Resend fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('resend down'));
    const { notifyAdmin } = await import('./notifyAdmin');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyAdmin('Test subject', 'Test body')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
