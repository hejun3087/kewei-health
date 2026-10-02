import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * 健康数据缓存封装（1.3.6）
 *
 * 设计要点：
 * - 前期用 @nestjs/cache-manager 的内存 store；后期切 Redis 只需替换 CacheModule
 *   的 store 配置（见 cache.module.ts 注释），业务代码零修改。
 * - 采用「版本号失效」策略：读 key 内嵌用户版本号，写操作只 bump 版本，
 *   旧 key 依靠 TTL 自然过期，避免内存/Redis 无法按 pattern 批量删除的问题。
 */
@Injectable()
export class AppCacheService {
  // 版本号本身保留较长，业务数据缓存默认 60s
  private readonly VER_TTL = 24 * 60 * 60 * 1000; // 24h
  private readonly DATA_TTL = 60 * 1000; // 60s

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  private verKey(userId: string) {
    return `ver:${userId}`;
  }

  // 读取当前用户的数据版本（默认 0）
  async version(userId: string): Promise<number> {
    const v = await this.cache.get<number>(this.verKey(userId));
    return v ?? 0;
  }

  // 写操作后调用：bump 版本，使该用户所有业务缓存 key 立即失效
  async bump(userId: string) {
    const cur = await this.version(userId);
    await this.cache.set(this.verKey(userId), cur + 1, this.VER_TTL);
  }

  // 组装带版本的缓存 key：命名空间 + 用户 + 版本 + 参数指纹
  buildKey(ns: string, userId: string, ver: number, params?: any): string {
    const fp = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '_';
    return `${ns}:${userId}:v${ver}:${fp}`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: any, ttl: number = this.DATA_TTL) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * 读多写少接口的通用包装：命中返回缓存，未命中执行 loader 并回填。
   * @param ns 命名空间（如 'trend' / 'dashboard'）
   * @param userId 归属用户（用于版本失效）
   * @param params 影响结果的查询参数（参与 key 指纹）
   * @param loader 实际计算函数
   */
  async getOrSet<T>(
    ns: string,
    userId: string,
    params: any,
    loader: () => Promise<T>,
    ttl: number = this.DATA_TTL,
  ): Promise<T> {
    const ver = await this.version(userId);
    const key = this.buildKey(ns, userId, ver, params);
    const hit = await this.cache.get<T>(key);
    if (hit !== undefined) return hit;
    const data = await loader();
    await this.cache.set(key, data, ttl);
    return data;
  }
}
