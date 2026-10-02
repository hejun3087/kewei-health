import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppCacheService } from './app-cache.service';

/**
 * 全局缓存模块（1.3.6）
 *
 * 前期：内存 store（默认），ttl 单位毫秒。
 * 后期切 Redis：业务代码零修改，仅需在此换成 Redis store，例如
 *   import { redisStore } from 'cache-manager-redis-yet';
 *   CacheModule.register({ store: await redisStore({ url: process.env.REDIS_URL }), ttl: 60000 })
 * 通过环境变量 REDIS_URL 控制即可（docker-compose 已就绪 redis 服务）。
 */
@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000, // 默认 60s（毫秒）
      max: 1000, // 内存 store 最大条目数
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
