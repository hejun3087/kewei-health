import { useCallback, useRef, useState } from 'react';
import { Modal, Checkbox, Alert, Typography } from 'antd';
import { hasSensitiveConsent, grantSensitiveConsent } from '../utils/sensitiveConsent';

interface Props {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

/**
 * PIA R-1：处理敏感个人信息（健康数据）前的「单独同意」弹窗。
 * 独立于用户协议/隐私政策的一般同意；未勾选同意时「同意并继续」禁用，可拒绝。
 */
export default function HealthDataConsentModal({ open, onAgree, onDecline }: Props) {
  const [checked, setChecked] = useState(false);

  const handleOk = () => {
    if (!checked) return;
    setChecked(false); // 关闭后复位，下次打开重新要求勾选
    onAgree();
  };
  const handleCancel = () => {
    setChecked(false);
    onDecline();
  };

  return (
    <Modal
      open={open}
      title="敏感个人信息处理单独同意"
      okText="同意并继续"
      cancelText="不同意"
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: !checked }}
      maskClosable={false}
      closable={false}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="您正在录入/处理健康数据，属于《个人信息保护法》下的敏感个人信息"
      />
      <Typography.Paragraph>
        健康医疗信息（检查报告、就诊诊断、用药记录、过敏史/慢性病史等）用于为您建立和展示个人健康档案、
        进行趋势分析与导出。我们仅在境内存储、不对外提供或出境，并采用加密与访问审计保护您的数据。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        您可随时在「个人中心」撤回同意并注销删除数据。撤回不影响撤回前已基于同意进行的处理。
      </Typography.Paragraph>
      <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
        我已阅读并<b>单独同意</b>平台按上述目的处理我的健康敏感个人信息
      </Checkbox>
    </Modal>
  );
}

/** 首次处理健康数据时的一次性同意闸门前置 hook：已同意直接放行，否则弹窗，同意后继续原动作。 */
export function useSensitiveConsentGate() {
  const [open, setOpen] = useState(false);
  const pending = useRef<null | (() => void)>(null);

  const request = useCallback((proceed: () => void) => {
    if (hasSensitiveConsent()) {
      proceed();
      return;
    }
    pending.current = proceed;
    setOpen(true);
  }, []);

  const agree = useCallback(() => {
    grantSensitiveConsent();
    setOpen(false);
    const p = pending.current;
    pending.current = null;
    p?.();
  }, []);

  const decline = useCallback(() => {
    setOpen(false);
    pending.current = null;
  }, []);

  return { open, request, agree, decline };
}
