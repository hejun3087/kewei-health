import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

/**
 * 列表空状态引导（2.4.2）：降低首次使用门槛，
 * 空列表时直接提供"去添加"行动入口，而非仅展示"暂无数据"。
 */
export default function EmptyGuide({
  description,
  actionText = '去添加',
  onAction,
}: {
  description: string;
  actionText?: string;
  onAction: () => void;
}) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={<span style={{ color: '#8c8c8c' }}>{description}</span>}
    >
      <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
        {actionText}
      </Button>
    </Empty>
  );
}
