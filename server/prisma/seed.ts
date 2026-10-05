/**
 * RBAC P0 种子脚本（docs/rbac-design.md）：
 * 从 `SUPERADMIN_PHONE` 环境变量引导首位超级管理员，保证系统首次部署即有一个可访问 `/admin/*` 的账号。
 *
 * 用法：`npx prisma db seed`（读 server/.env 的 SUPERADMIN_PHONE）
 * 幂等：重复执行不会创建多条 SUPER_ADMIN 活跃行——先撤销旧行再授予；历史行保留以便追溯。
 * 若 `SUPERADMIN_PHONE` 未设置，脚本静默退出（不阻断首次 migrate deploy）。
 *
 * 合规约束：
 * - 已注销（DELETED）/ 已禁用（DISABLED）账号不得获得管理角色，脚本会拒绝并 warn；
 * - 该账号需已在 User 表存在（推荐用法：先通过正常注册流程建号，再运行 seed 提升权限）；
 *   如不存在，脚本仅创建占位账号（无密码/微信），提示运维完成注册后再运行以获得实际登录能力。
 */
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = process.env.SUPERADMIN_PHONE;
  if (!phone) {
    // eslint-disable-next-line no-console
    console.log('[rbac:seed] SUPERADMIN_PHONE 未设置，跳过种子（首次部署可留待后续配置）');
    return;
  }

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, nickname: `超级管理员${phone.slice(-4)}` },
    });
    // eslint-disable-next-line no-console
    console.log(`[rbac:seed] 已创建占位账号 id=${user.id}（该账号尚无密码/微信，注册后即可登录）`);
  }

  if (user.status !== 'ACTIVE') {
    throw new Error(
      `[rbac:seed] 账号 ${phone} 状态为 ${user.status}，非 ACTIVE 不得授予管理角色（合规 6.1.8）`,
    );
  }

  // 幂等：先软撤销既有 SUPER_ADMIN 活跃行，再新建一条（历史保留以便追溯）
  await prisma.userRole.updateMany({
    where: { userId: user.id, role: Role.SUPER_ADMIN, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.userRole.create({
    data: { userId: user.id, role: Role.SUPER_ADMIN, grantedBy: user.id },
  });

  // eslint-disable-next-line no-console
  console.log(`[rbac:seed] 已授予 SUPER_ADMIN：userId=${user.id}, phone=${phone}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[rbac:seed] 失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
