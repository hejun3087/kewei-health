import { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * 全局错误边界（2.4.3）：捕获子树渲染期异常，
 * 兜底展示可操作的错误页，避免整屏白死。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保留控制台堆栈，便于排查；后续可对接前端监控上报
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="500"
            title="页面出现了一点问题"
            subTitle={this.state.errorMessage || '很抱歉，页面渲染时发生异常。您可以刷新重试或返回首页。'}
            extra={[
              <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                刷新页面
              </Button>,
              <Button key="home" onClick={this.handleReload}>
                返回首页
              </Button>,
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
