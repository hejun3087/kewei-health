import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

const makeCtx = (req: any): any => ({
  getHandler: () => function handler() {},
  getClass: () => class Ctrl {},
  switchToHttp: () => ({ getRequest: () => req }),
});

describe('AuditInterceptor', () => {
  let reflector: any;
  let audit: any;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(reflector, audit);
  });

  it('无 @Audit 元数据：直接透传，不写审计', (done) => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    interceptor
      .intercept(makeCtx({ method: 'GET' }), { handle: () => of('X') } as any)
      .subscribe((v) => {
        expect(v).toBe('X');
        expect(audit.record).not.toHaveBeenCalled();
        done();
      });
  });

  it('GET 成功：推断 action=READ 并记录 success=true，字段取自请求', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'REPORT' });
    const req = {
      method: 'GET',
      user: { userId: 'u1' },
      params: { id: 'r1' },
      ip: '1.1.1.1',
      headers: { 'user-agent': 'UA' },
    };
    interceptor
      .intercept(makeCtx(req), { handle: () => of('data') } as any)
      .subscribe(() => {
        expect(audit.record.mock.calls[0][0]).toMatchObject({
          userId: 'u1',
          action: 'READ',
          resourceType: 'REPORT',
          resourceId: 'r1',
          ip: '1.1.1.1',
          userAgent: 'UA',
          success: true,
        });
        done();
      });
  });

  it('DELETE：按 HTTP 方法推断 action=DELETE', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'USER' });
    const req = { method: 'DELETE', user: { userId: 'u1' }, headers: {} };
    interceptor
      .intercept(makeCtx(req), { handle: () => of({}) } as any)
      .subscribe(() => {
        expect(audit.record.mock.calls[0][0].action).toBe('DELETE');
        done();
      });
  });

  it('元数据带 action 时优先使用（如 EXPORT/SHARE_VIEW）', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'HEALTH_DATA', action: 'EXPORT' });
    const req = { method: 'GET', user: { userId: 'u1' }, headers: {} };
    interceptor
      .intercept(makeCtx(req), { handle: () => of({}) } as any)
      .subscribe(() => {
        expect(audit.record.mock.calls[0][0].action).toBe('EXPORT');
        done();
      });
  });

  it('分享免登录访问：无 req.user 时 userId 记为 null', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'REPORT', action: 'SHARE_VIEW' });
    const req = { method: 'GET', headers: {} };
    interceptor
      .intercept(makeCtx(req), { handle: () => of({}) } as any)
      .subscribe(() => {
        expect(audit.record.mock.calls[0][0].userId).toBeNull();
        done();
      });
  });

  it('业务抛错：仍记录 success=false+status，且错误原样传播', (done) => {
    reflector.getAllAndOverride.mockReturnValue({ resourceType: 'REPORT' });
    const err: any = new Error('boom');
    err.status = 404;
    const req = { method: 'GET', user: { userId: 'u1' }, headers: {} };
    interceptor
      .intercept(makeCtx(req), { handle: () => throwError(() => err) } as any)
      .subscribe({
        error: (e) => {
          expect(e).toBe(err);
          const call = audit.record.mock.calls[0][0];
          expect(call.success).toBe(false);
          expect(call.meta).toEqual({ status: 404 });
          done();
        },
      });
  });
});
