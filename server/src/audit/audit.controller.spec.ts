import { AuditController } from './audit.controller';

describe('AuditController.getMyAudit', () => {
  let auditService: any;
  let ctrl: AuditController;

  beforeEach(() => {
    auditService = { queryOwn: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }) };
    ctrl = new AuditController(auditService);
  });

  it('以 req.user.userId 调用 queryOwn（仅查本人），透传 query', async () => {
    const req = { user: { userId: 'u1' } };
    const query = { action: 'LOGIN', page: 2 };
    await ctrl.getMyAudit(req, query);
    expect(auditService.queryOwn).toHaveBeenCalledWith('u1', query);
  });

  it('query 为空对象/null 时归一为 {}', async () => {
    const req = { user: { userId: 'u2' } };
    await ctrl.getMyAudit(req, undefined as any);
    expect(auditService.queryOwn).toHaveBeenCalledWith('u2', {});
  });
});
