import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * 403 无权限页（docs/rbac-design.md P0）。
 * 前端路由 RequireRole 守卫在角色不匹配时渲染本组件；后端 RolesGuard 会返回 403 JSON，
 * 两者共同保证"前端隐藏入口 + 后端拒绝请求"的双层防御（前端仅为体验，不作为安全边界）。
 */
export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="抱歉，当前账号没有访问此页面的权限。如需管理员权限，请联系超级管理员分配角色。"
      extra={
        <Button type="primary" onClick={() => navigate('/', { replace: true })}>
          返回首页
        </Button>
      }
    />
  );
}
