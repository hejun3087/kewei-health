-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'SUPPORT', 'AUDITOR');

-- CreateTable
-- RBAC 用户-角色关联表（docs/rbac-design.md P0）：独立表，不改 User 列，无破坏性迁移。
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRole_userId_role_revokedAt_idx" ON "UserRole"("userId", "role", "revokedAt");

-- CreateIndex
CREATE INDEX "UserRole_role_revokedAt_idx" ON "UserRole"("role", "revokedAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
