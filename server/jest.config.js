/** Jest 配置：ts-jest 直接编译 TS，无需预构建 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // 覆盖率统计范围：src 下全部 TS，排除测试/模块装配/入口（这些不承载业务逻辑）
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.e2e.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/scripts/**',
    '!**/node_modules/**',
  ],
  // 覆盖率门禁（5.1.5）：仅在收集覆盖率时生效，锁定后端测试质量基线
  // Stmts/Lines ≥ 80% 达成阶段目标；Funcs/Branch 取当前值下取整留安全余量，避免抖动误报
  coverageThreshold: {
    global: {
      statements: 80,
      lines: 80,
      functions: 75,
      branches: 60,
    },
  },
};
