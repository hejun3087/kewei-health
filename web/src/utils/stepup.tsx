import { Modal, Input, message } from 'antd';
import api from './api';

// 危险操作 step-up 二次验证工具（docs/rbac-design.md §9.2，RBAC P2）。
// 后端：POST /auth/stepup 校验当前密码 → 签发 5min TTL `typ:stepup` 短 token；
// 前端：sessionStorage 缓存 token（提前 30s 视为过期避免边缘），命中免弹窗；
//       未命中弹密码 Modal，成功后写入缓存并 resolve；
//       取消或密码错 → reject（外层 Modal.confirm 的 onOk 收到 rejected Promise 会保持打开，
//       与「理由必填」同一 UX 模式；Popconfirm 场景自行 try/catch）。

const CACHE_KEY = 'stepup:token';
const SAFETY_MS = 30_000;

interface Cached {
  token: string;
  expAtMs: number;
}

function readCache(): string | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    if (!c.token || Date.now() + SAFETY_MS >= c.expAtMs) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return c.token;
  } catch {
    return null;
  }
}

function writeCache(token: string, expiresInSec: number) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ token, expAtMs: Date.now() + expiresInSec * 1000 }),
    );
  } catch {
    /* ignore */
  }
}

/** 登出/切换账号/命中 403 时应调用，避免继续复用陈旧 token */
export function clearStepUpCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 请求 step-up 二次验证 token：
 * - 缓存命中直接返回（5min 窗口内多次危险操作免重复输密码）；
 * - 未命中弹出密码 Modal，POST /auth/stepup 成功后写缓存并 resolve；
 * - 用户取消 / 密码错误 → reject（调用方在 Modal.confirm.onOk 里 `await` 即保持外层 Modal 打开；
 *   Popconfirm 等无返回按钮语义的场景需 try/catch 吞掉 rejection）。
 */
export function requestStepUp(): Promise<string> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);

  return new Promise<string>((resolve, reject) => {
    let password = '';
    let settled = false;
    Modal.confirm({
      title: '二次验证：请输入当前账号密码',
      icon: null,
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            该操作影响其他账号或数据，需重输密码确认。验证通过后 5 分钟内免重复。
          </p>
          <Input.Password
            autoFocus
            placeholder="当前账号密码"
            onChange={(e) => {
              password = e.target.value;
            }}
          />
        </div>
      ),
      okText: '验证',
      cancelText: '取消',
      onOk: async () => {
        if (!password) {
          message.warning('请输入当前密码');
          return Promise.reject(new Error('empty'));
        }
        try {
          const res = await api.post('/auth/stepup', { password });
          const token = res.data?.token as string | undefined;
          const expiresIn = Number(res.data?.expiresIn) || 300;
          if (!token) throw new Error('未获得二次验证令牌');
          writeCache(token, expiresIn);
          settled = true;
          resolve(token);
        } catch (e: any) {
          message.error(e?.response?.data?.message || '二次验证失败');
          return Promise.reject(e); // 保持 Modal 打开让用户重输
        }
      },
      afterClose: () => {
        if (!settled) reject(new Error('已取消二次验证'));
      },
    });
  });
}

/**
 * 便捷封装：先获取 step-up token，再以 `x-stepup-token` header 发一次 API 请求。
 * 用法：`await stepUpRequest(() => api.patch(url, body))`。
 * 取消或密码错误时抛异常（调用方 Modal.confirm.onOk 里 Promise 自动 rejected）。
 */
export async function stepUpRequest<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await requestStepUp();
  try {
    return await fn(token);
  } catch (e: any) {
    // 后端 StepUpGuard 403 时清缓存以便下次重新验证（token 过期/被撤销等边界）
    if (e?.response?.status === 403) clearStepUpCache();
    throw e;
  }
}
