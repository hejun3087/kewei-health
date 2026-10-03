import { AppCacheService } from './app-cache.service';

/**
 * 5.2.1 缺口收敛：AppCacheService 此前仅经 report.service 间接测试（17.85%），补自身直测。
 * 用 Map 版内存 FakeCache 替代 cache-manager，聚焦版本失效 / key 指纹 / getOrSet 行为。
 */
class FakeCache {
  private m = new Map<string, any>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.m.get(key) as T | undefined;
  }
  async set(key: string, value: any, _ttl?: number) {
    this.m.set(key, value);
    return value;
  }
  size() {
    return this.m.size;
  }
}

describe('AppCacheService（健康数据缓存封装）', () => {
  let cache: FakeCache;
  let svc: AppCacheService;

  beforeEach(() => {
    cache = new FakeCache();
    svc = new AppCacheService(cache as any);
  });

  describe('version / bump', () => {
    it('未设置版本时默认为 0', async () => {
      expect(await svc.version('u1')).toBe(0);
    });

    it('bump 递增版本（0→1→2）', async () => {
      await svc.bump('u1');
      expect(await svc.version('u1')).toBe(1);
      await svc.bump('u1');
      expect(await svc.version('u1')).toBe(2);
    });

    it('版本按用户隔离', async () => {
      await svc.bump('u1');
      await svc.bump('u1');
      await svc.bump('u2');
      expect(await svc.version('u1')).toBe(2);
      expect(await svc.version('u2')).toBe(1);
    });
  });

  describe('buildKey 参数指纹', () => {
    it('无参数时指纹为下划线', () => {
      expect(svc.buildKey('trend', 'u1', 0)).toBe('trend:u1:v0:_');
    });

    it('参数按键名排序，保证顺序无关的稳定 key', () => {
      const a = svc.buildKey('trend', 'u1', 1, { itemName: 'HGB', memberId: 'm1' });
      const b = svc.buildKey('trend', 'u1', 1, { memberId: 'm1', itemName: 'HGB' });
      expect(a).toBe(b);
      expect(a).toBe('trend:u1:v1:itemName=HGB&memberId=m1');
    });

    it('过滤 undefined / null / 空串参数', () => {
      expect(svc.buildKey('ns', 'u1', 0, { a: 1, b: '', c: undefined, d: null, e: 2 })).toBe(
        'ns:u1:v0:a=1&e=2',
      );
    });
  });

  describe('getOrSet', () => {
    it('未命中执行 loader 并回填，命中则不再调用 loader', async () => {
      const loader = jest.fn().mockResolvedValue('VALUE');
      const r1 = await svc.getOrSet('dash', 'u1', { range: '30d' }, loader);
      expect(r1).toBe('VALUE');
      expect(loader).toHaveBeenCalledTimes(1);

      const r2 = await svc.getOrSet('dash', 'u1', { range: '30d' }, loader);
      expect(r2).toBe('VALUE');
      expect(loader).toHaveBeenCalledTimes(1); // 命中缓存，loader 未再执行
    });

    it('bump 后版本变化 → key 变化 → 缓存失效重新计算', async () => {
      const loader = jest.fn().mockResolvedValue('V0');
      await svc.getOrSet('dash', 'u1', {}, loader);
      expect(loader).toHaveBeenCalledTimes(1);

      await svc.bump('u1'); // 版本失效
      loader.mockResolvedValue('V1');
      const after = await svc.getOrSet('dash', 'u1', {}, loader);
      expect(loader).toHaveBeenCalledTimes(2);
      expect(after).toBe('V1');
    });

    it('不同参数视为不同缓存项', async () => {
      const loader = jest.fn().mockResolvedValue('X');
      await svc.getOrSet('dash', 'u1', { a: 1 }, loader);
      await svc.getOrSet('dash', 'u1', { a: 2 }, loader);
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('get / set 透传', () => {
    it('set 后可 get 回', async () => {
      await svc.set('k', { n: 1 });
      expect(await svc.get('k')).toEqual({ n: 1 });
    });

    it('get 不存在的 key 返回 undefined', async () => {
      expect(await svc.get('missing')).toBeUndefined();
    });
  });
});
