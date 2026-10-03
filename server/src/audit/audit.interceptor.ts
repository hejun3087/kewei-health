import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService, AuditEntry } from './audit.service';
import { AUDIT_KEY, AuditMeta } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  /** 依据 HTTP 方法推断动作类型 */
  private deriveAction(method: string): string {
    switch ((method || '').toUpperCase()) {
      case 'GET':
        return 'READ';
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return (method || 'UNKNOWN').toUpperCase();
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<AuditMeta | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // 未标记 @Audit 的接口不做审计
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const base: AuditEntry = {
      userId: req.user?.userId ?? null,
      action: meta.action || this.deriveAction(req.method),
      resourceType: meta.resourceType,
      resourceId: req.params?.id ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers?.['user-agent'] ?? null,
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditService.record({ ...base, success: true });
      }),
      catchError((err) => {
        // 失败访问同样留痕（越权/异常可追溯），随后原样抛出
        void this.auditService.record({
          ...base,
          success: false,
          meta: { status: err?.status ?? err?.statusCode ?? null },
        });
        return throwError(() => err);
      }),
    );
  }
}
