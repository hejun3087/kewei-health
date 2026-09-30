import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 404 页（2.4.3）：访问不存在的路由时给出引导返回 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在或已被移除。"
        extra={
          <>
            <Button type="primary" key="home" onClick={() => navigate('/')}>
              返回首页
            </Button>
            <Button key="back" onClick={() => navigate(-1)}>
              返回上一页
            </Button>
          </>
        }
      />
    </div>
  );
}
