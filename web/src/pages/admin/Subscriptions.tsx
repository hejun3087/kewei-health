import { useEffect, useState } from 'react';
import { Table, Tag, Space, Typography, Input, Button, Empty, Select, Tabs } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import dayjs from 'dayjs';

// 管理端跨用户订阅/订单列表（docs/rbac-design.md P3，subscription:read / order:read）。
// 对接 GET /admin/subscriptions + GET /admin/orders；仅 SUPER_ADMIN/OPERATOR 可访问（RequireRole 前端守卫 + 后端 RolesGuard）。

const PLAN_LABEL: Record<string, string> = {
  FREE: '免费版',
  STANDARD: '标准版',
  PROFESSIONAL: '专业版',
  FAMILY: '家庭版',
};

const SUB_STATUS_LABEL: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '生效中', color: 'green' },
  EXPIRED: { text: '已过期', color: 'orange' },
  CANCELLED: { text: '已取消', color: 'red' },
  PENDING: { text: '待支付', color: 'blue' },
};

const ORDER_STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待支付', color: 'blue' },
  PAID: { text: '已支付', color: 'green' },
  FAILED: { text: '支付失败', color: 'red' },
  REFUNDED: { text: '已退款', color: 'purple' },
};

interface SubRow {
  id: string;
  userId: string;
  user: { id: string; phone: string; nickname: string | null } | null;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  amount: number;
  paymentMethod: string | null;
  aiUsageCount: number;
  quotaResetAt: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  orderId: string;
  userId: string;
  user: { id: string; phone: string; nickname: string | null } | null;
  plan: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('subscriptions');

  // 订阅状态
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(20);
  const [subPlan, setSubPlan] = useState<string | undefined>();
  const [subStatus, setSubStatus] = useState<string | undefined>();
  const [subUserIdInput, setSubUserIdInput] = useState('');
  const [subUserId, setSubUserId] = useState<string | undefined>();

  // 订单状态
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(20);
  const [orderStatus, setOrderStatus] = useState<string | undefined>();
  const [orderPlan, setOrderPlan] = useState<string | undefined>();
  const [orderUserIdInput, setOrderUserIdInput] = useState('');
  const [orderUserId, setOrderUserId] = useState<string | undefined>();

  const loadSubs = () => {
    setSubLoading(true);
    const params: Record<string, any> = { page: subPage, pageSize: subPageSize };
    if (subPlan) params.plan = subPlan;
    if (subStatus) params.status = subStatus;
    if (subUserId) params.userId = subUserId;
    api
      .get('/admin/subscriptions', { params })
      .then((res) => {
        setSubs(res.data?.items || []);
        setSubTotal(res.data?.total || 0);
      })
      .finally(() => setSubLoading(false));
  };

  const loadOrders = () => {
    setOrderLoading(true);
    const params: Record<string, any> = { page: orderPage, pageSize: orderPageSize };
    if (orderStatus) params.status = orderStatus;
    if (orderPlan) params.plan = orderPlan;
    if (orderUserId) params.userId = orderUserId;
    api
      .get('/admin/orders', { params })
      .then((res) => {
        setOrders(res.data?.items || []);
        setOrderTotal(res.data?.total || 0);
      })
      .finally(() => setOrderLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'subscriptions') loadSubs();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, subPage, subPageSize, subPlan, subStatus, subUserId, orderPage, orderPageSize, orderStatus, orderPlan, orderUserId]);

  const subColumns = [
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_: any, row: SubRow) =>
        row.user ? (
          <span>{row.user.nickname || '未命名'} ({row.user.phone})</span>
        ) : (
          <Typography.Text type="secondary">{row.userId.slice(0, 8)}…</Typography.Text>
        ),
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      width: 100,
      render: (v: string) => <Tag>{PLAN_LABEL[v] || v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const s = SUB_STATUS_LABEL[v] || { text: v, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: 'AI 用量',
      key: 'usage',
      width: 90,
      render: (_: any, row: SubRow) => `${row.aiUsageCount}`,
    },
    {
      title: '到期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '永久'),
    },
    {
      title: '续费',
      dataIndex: 'autoRenew',
      key: 'autoRenew',
      width: 70,
      render: (v: boolean) => (v ? '是' : '否'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 180,
      ellipsis: true,
    },
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_: any, row: OrderRow) =>
        row.user ? (
          <span>{row.user.nickname || '未命名'} ({row.user.phone})</span>
        ) : (
          <Typography.Text type="secondary">{row.userId.slice(0, 8)}…</Typography.Text>
        ),
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      width: 100,
      render: (v: string) => <Tag>{PLAN_LABEL[v] || v}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 90,
      render: (v: number) => `¥${(v / 100).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: string) => {
        const s = ORDER_STATUS_LABEL[v] || { text: v, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 100,
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 160,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const planOptions = Object.entries(PLAN_LABEL).map(([value, label]) => ({ value, label }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>订阅 / 订单管理</h2>
          <Typography.Text type="secondary">
            跨用户查看订阅套餐与支付订单（subscription:read / order:read，仅 SUPER_ADMIN/OPERATOR 可访问）。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={activeTab === 'subscriptions' ? loadSubs : loadOrders}>
          刷新
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'subscriptions',
            label: '订阅列表',
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Select
                    allowClear
                    placeholder="套餐"
                    style={{ width: 130 }}
                    value={subPlan}
                    onChange={(v) => { setSubPlan(v); setSubPage(1); }}
                    options={planOptions}
                  />
                  <Select
                    allowClear
                    placeholder="状态"
                    style={{ width: 130 }}
                    value={subStatus}
                    onChange={(v) => { setSubStatus(v); setSubPage(1); }}
                    options={Object.entries(SUB_STATUS_LABEL).map(([value, { text }]) => ({ value, label: text }))}
                  />
                  <Input
                    placeholder="按用户 ID 过滤"
                    style={{ width: 220 }}
                    value={subUserIdInput}
                    onChange={(e) => setSubUserIdInput(e.target.value)}
                    onPressEnter={() => { setSubUserId(subUserIdInput.trim() || undefined); setSubPage(1); }}
                    allowClear
                  />
                  <Button onClick={() => { setSubUserId(subUserIdInput.trim() || undefined); setSubPage(1); }}>应用</Button>
                </Space>
                <Table
                  dataSource={subs}
                  columns={subColumns}
                  rowKey="id"
                  loading={subLoading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: subPage,
                    pageSize: subPageSize,
                    total: subTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (p, ps) => { setSubPage(p); setSubPageSize(ps); },
                  }}
                  locale={{ emptyText: <Empty description="暂无订阅记录" /> }}
                />
              </>
            ),
          },
          {
            key: 'orders',
            label: '订单列表',
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Select
                    allowClear
                    placeholder="状态"
                    style={{ width: 130 }}
                    value={orderStatus}
                    onChange={(v) => { setOrderStatus(v); setOrderPage(1); }}
                    options={Object.entries(ORDER_STATUS_LABEL).map(([value, { text }]) => ({ value, label: text }))}
                  />
                  <Select
                    allowClear
                    placeholder="套餐"
                    style={{ width: 130 }}
                    value={orderPlan}
                    onChange={(v) => { setOrderPlan(v); setOrderPage(1); }}
                    options={planOptions}
                  />
                  <Input
                    placeholder="按用户 ID 过滤"
                    style={{ width: 220 }}
                    value={orderUserIdInput}
                    onChange={(e) => setOrderUserIdInput(e.target.value)}
                    onPressEnter={() => { setOrderUserId(orderUserIdInput.trim() || undefined); setOrderPage(1); }}
                    allowClear
                  />
                  <Button onClick={() => { setOrderUserId(orderUserIdInput.trim() || undefined); setOrderPage(1); }}>应用</Button>
                </Space>
                <Table
                  dataSource={orders}
                  columns={orderColumns}
                  rowKey="id"
                  loading={orderLoading}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: orderPage,
                    pageSize: orderPageSize,
                    total: orderTotal,
                    showSizeChanger: true,
                    showTotal: (t) => `共 ${t} 条`,
                    onChange: (p, ps) => { setOrderPage(p); setOrderPageSize(ps); },
                  }}
                  locale={{ emptyText: <Empty description="暂无订单记录" /> }}
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
