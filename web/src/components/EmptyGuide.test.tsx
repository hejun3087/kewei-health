import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyGuide from './EmptyGuide';

describe('EmptyGuide 列表空态引导组件', () => {
  it('渲染传入的描述文案', () => {
    render(<EmptyGuide description="还没有健康报告" onAction={vi.fn()} />);
    expect(screen.getByText('还没有健康报告')).toBeInTheDocument();
  });

  it('未传 actionText 时按钮默认显示「去添加」', () => {
    render(<EmptyGuide description="空列表" onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /去添加/ })).toBeInTheDocument();
  });

  it('传入 actionText 时按钮显示自定义文案', () => {
    render(
      <EmptyGuide description="空列表" actionText="去上传报告" onAction={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /去上传报告/ })).toBeInTheDocument();
  });

  it('点击按钮触发一次 onAction 回调', () => {
    const onAction = vi.fn();
    render(<EmptyGuide description="空列表" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /去添加/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
