import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthDataConsentModal from './HealthDataConsentModal';

describe('HealthDataConsentModal（PIA R-1 单独同意弹窗）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('未勾选同意时"同意并继续"禁用；勾选后可同意', async () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();
    render(<HealthDataConsentModal open onAgree={onAgree} onDecline={onDecline} />);

    expect(screen.getByText('敏感个人信息处理单独同意')).toBeInTheDocument();
    const okBtn = screen.getByRole('button', { name: '同意并继续' });
    expect(okBtn).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));
    expect(okBtn).toBeEnabled();
    await userEvent.click(okBtn);
    expect(onAgree).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('点击"不同意"触发 onDecline，不调用 onAgree', async () => {
    const onAgree = vi.fn();
    const onDecline = vi.fn();
    render(<HealthDataConsentModal open onAgree={onAgree} onDecline={onDecline} />);

    await userEvent.click(screen.getByRole('button', { name: '不同意' }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAgree).not.toHaveBeenCalled();
  });
});
