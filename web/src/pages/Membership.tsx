import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Progress, Button, Tag, Space, Modal, message, Statistic, Divider, Empty, Table,
} from 'antd';
import { CrownOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../utils/api';

interface Quotas {
  aiPerMonth: number;
  aiUsed: number;
  aiRemaining: number;
  maxMembers: number;
  storageLimit: number;
}
interface Subscription {
  plan: string;
  planName: string;
  status: string;
  endDate: string | null;
  autoRenew: boolean;
  quotas: Quotas;
  features: string[];
}
interface Plan {
  plan: string;
  name: string;
  priceYearly: number;
  aiPerMonth: number;
  maxMembers: number;
  storageLimit: number;
  features: string[];
}

const GB = 1024 * 1024 * 1024;
const fmtGB = (bytes: number) => `${(bytes / GB).toFixed(0)}GB`;
const fmtCount = (n: number) => (n === -1 ? '不限' : `${n}`);

const orderStatusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待支付' },
  PAID: { color: 'success', text: '已支付' },
  FAILED: { color: 'error', text: '支付失败' },
  REFUNDED: { color: 'warning', text: '已退款' },
};
const planNameMap: Record<string, string> = {
  FREE: '免费版', STANDARD: '标准版', PROFESSIONAL: '专业版', FAMILY: '家庭版',
};
const payMethodMap: Record<string, string> = { WECHAT: '微信支付', ALIPAY: '支付宝', MANUAL: '手动/赠送' };

const orderColumns = [
  { title: '订单号', dataIndex: 'orderId', key: 'orderId' },
  { title: '套餐', dataIndex: 'plan', key: 'plan', render: (v: string) => planNameMap[v] || v },
  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `￥${(v / 100).toFixed(2)}` },
  { title: '支付方式', dataIndex: 'paymentMethod', key: 'paymentMethod', render: (v: string) => payMethodMap[v] || v },
  {
    title: '状态', dataIndex: 'status', key: 'status',
    render: (v: string) => {
      const info = orderStatusMap[v];
      return info ? <Tag color={info.color}>{info.text}</Tag> : v;
    },
  },
  { title: '下单时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  { title: '支付时间', dataIndex: 'paidAt', key: 'paidAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
];

export default function MembershipPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadOrders = () => {
    setOrdersLoading(true);
    api.get('/member/orders', { params: { pageSize: 10 } })
      .then((res) => setOrders(res.data?.items || []))
      .finally(() => setOrdersLoading(false));
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/member/subscription'),
      api.get('/member/plans'),
    ])
      .then(([s, p]) => {
        setSub(s.data);
        setPlans(Array.isArray(p.data) ? p.data : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); loadOrders(); }, []);

  const handleUpgrade = (plan: Plan) => {
    Modal.confirm({
      title: `升级到${plan.name}`,
      content: (
        <div>
          <p>套餐权益：</p>
          <ul style={{ paddingLeft: 20 }}>
            {plan.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <p style={{ marginTop: 12 }}>年费：￥{plan.priceYearly}</p>
          <p style={{ color: '#999', fontSize: 12 }}>
            （当前为开发环境，支付网关未接入，确认后将模拟支付成功并直接激活）
          </p>
        </div>
      ),
      okText: '确认升级',
      onOk: async () => {
        setUpgrading(plan.plan);
        try {
          const res = await api.post('/member/upgrade', { plan: plan.plan, paymentMethod: 'WECHAT' });
          message.success(`已成功升级为${plan.name}`);
          setSub(res.data.subscription);
          loadOrders();
        } finally {
          setUpgrading(null);
        }
      },
    });
  };

  if (loading) return <Card loading />;
  if (!sub) return <Empty description="暂无订阅信息" />;

  const aiPercent = sub.quotas.aiPerMonth === -1 ? 0 : Math.round((sub.quotas.aiUsed / sub.quotas.aiPerMonth) * 100);

  return (
    <div>
      {/* 当前订阅 */}
      <Card
        title={<Space><CrownOutlined style={{ color: '#faad14' }} />当前套餐：{sub.planName}</Space>}
        extra={<Tag color={sub.status === 'ACTIVE' ? 'green' : 'default'}>{sub.status === 'ACTIVE' ? '生效中' : sub.status}</Tag>}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="本月AI识别" value={sub.quotas.aiUsed} suffix={`/ ${fmtCount(sub.quotas.aiPerMonth)} 次`} />
            {sub.quotas.aiPerMonth !== -1 && (
              <Progress percent={aiPercent} size="small" status={aiPercent >= 100 ? 'exception' : 'normal'} />
            )}
          </Col>
          <Col span={6}>
            <Statistic title="家庭成员上限" value={sub.quotas.maxMembers} suffix="人" />
          </Col>
          <Col span={6}>
            <Statistic title="存储空间" value={fmtGB(sub.quotas.storageLimit)} />
          </Col>
          <Col span={6}>
            <Statistic title="到期时间" value={sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '长期'} />
          </Col>
        </Row>
      </Card>

      <Divider orientation="left">套餐选择</Divider>

      {/* 套餐对比 */}
      <Row gutter={[16, 16]}>
        {plans.map((p) => {
          const isCurrent = p.plan === sub.plan;
          return (
            <Col xs={24} sm={12} lg={6} key={p.plan}>
              <Card
                title={p.name}
                bordered
                style={isCurrent ? { borderColor: '#1677ff', boxShadow: '0 0 8px rgba(22,119,255,0.3)' } : {}}
                actions={[
                  isCurrent ? (
                    <Button type="primary" disabled icon={<CheckOutlined />}>当前套餐</Button>
                  ) : (
                    <Button
                      type={p.plan === 'FREE' ? 'default' : 'primary'}
                      loading={upgrading === p.plan}
                      disabled={p.plan === 'FREE'}
                      onClick={() => handleUpgrade(p)}
                    >
                      {p.plan === 'FREE' ? '免费' : '升级'}
                    </Button>
                  ),
                ]}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff', marginBottom: 12 }}>
                  ￥{p.priceYearly}<span style={{ fontSize: 13, color: '#999', fontWeight: 400 }}> /年</span>
                </div>
                <ul style={{ paddingLeft: 18, margin: 0, minHeight: 120 }}>
                  {p.features.map((f) => <li key={f} style={{ marginBottom: 6 }}>{f}</li>)}
                </ul>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Divider orientation="left">订单历史</Divider>
      <Card>
        <Table
          dataSource={orders}
          columns={orderColumns}
          rowKey="id"
          loading={ordersLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无订单记录' }}
        />
      </Card>
    </div>
  );
}
