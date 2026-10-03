import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import ErrorBoundary from './ErrorBoundary';

function Throwing(): ReactElement {
  throw new Error('渲染炸了');
}

describe('ErrorBoundary 全局错误边界组件', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errSpy: any;

  beforeEach(() => {
    // React 会把被边界捕获的错误也打印到 console.error，测试中静默
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it('子组件正常时原样渲染 children', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
    expect(screen.queryByText('页面出现了一点问题')).not.toBeInTheDocument();
  });

  it('子组件抛错时渲染兜底错误页并展示错误信息', () => {
    render(
      <ErrorBoundary>
        <Throwing />
      </ErrorBoundary>,
    );
    expect(screen.getByText('页面出现了一点问题')).toBeInTheDocument();
    expect(screen.getByText('渲染炸了')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新页面' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回首页' })).toBeInTheDocument();
  });
});
