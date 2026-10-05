import { useEffect, useState } from 'react';
import { Table, Tag, Space, Typography, Input, Button, Empty, Select, Modal } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

// 管理端跨用户分享管理（docs/rbac-design.md P1，解锁 PIA R-6 尾项）。
// 对接 GET /admin/shares（share:read_all）+ DELETE /admin/shares/:id（share:revoke_all，仅 SUPER_ADMIN）。
// 与本人「我的分享」页不同：含 owner 维度，强制撤销需理由，操作走后端审计（resourceType=ADMIN）。

const reportTypeLabel: Record<string, string> = {
  LAB: '化验',
  IMAGING: '影像',
  PRESCRIPTION: '处方',
  MEDICAL_RECORD: '病历',
  PHYSICAL_EXAM: '体检',
  VACCINATION: '疫苗',
  SURGERY: '手术',
  OTHER: '其他',
};

interface ShareRow {
  shareId: string;
  userId: string;
  reportId: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  active: boolean;
  report: { hospital: string | null; reportType: string; reportDate: string } | null;
}

export default function AllSharesPage() {
  const { user } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user!.roles! : [];
  const canRevoke = userRoles.includes('SUPER_ADMIN'); // share:revoke_all 仅 SUPER_ADMIN

  const [rows, setRows] = useState<ShareRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState<string | undefined>();
  const [active, setActive] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, pageSize };
    if (userId) params.userId = userId;
    if (active) params.active = active;
    api
      .get('/admin/shares', { params })
      .then((res) => {
        setRows(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, userId, active]);

  const applyUserId = () => {
    const v = userIdInput.trim();
    setUserId(v || undefined);
    setPage(1);
  };

  const doRevoke = (row: ShareRow) => {
    let reason = '';
    Modal.confirm({
      title: '强制撤销该分享链接？',
      content: (
        <div>
          <p>此操作会立即使旧 token 失效（应急不良内容/泄露）。将记入管理端审计日志。</p>
          <Input.TextArea
            placeholder="撤销理由（必填，供审计追溯）"
            rows={2}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: '确认撤销',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          // 抛错以阻止 Modal 关闭
          return Promise.reject(new Error('请填写撤销理由'));
        }
        await api.delete(`/admin/shares/${row.shareId}`, { params: { reason: reason.trim() } });
        load();
      },
    });
  };

  const columns = [
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '所有者',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
      render: (v: string) => <Typography.Text copyable>{v}</Typography.Text>,
    },
    {
      title: '报告',
      key: 'report',
      width: 200,
      render: (_: any, row: ShareRow) =>
        row.report ? (
          <span>
            {row.report.hospital || '未命名'}
            <Tag style={{ marginLeft: 6 }}>{reportTypeLabel[row.report.reportType] || row.report.reportType}</Tag>
            <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
              {row.report.reportDate ? dayjs(row.report.reportDate).format('YYYY-MM-DD') : ''}
            </Typography.Text>
          </span>
        ) : (
          <Typography.Text type="secondary">报告已删除（{row.reportId.slice(0, 8)}…）</Typography.Text>
        ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, row: ShareRow) =>
        row.revokedAt ? (
          <Tag color="red">已撤销</Tag>
        ) : row.active ? (
          <Tag color="green">生效中</Tag>
        ) : (
          <Tag>已过期</Tag>
        ),
    },
    { title: '访问次数', dataIndex: 'viewCount', key: 'viewCount', width: 90 },
    {
      title: '到期',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 150,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, row: ShareRow) =>
        canRevoke && row.active ? (
          <Button danger size="small" onClick={() => doRevoke(row)}>
            强制撤销
          </Button>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>分享链接管理（管理端）</h2>
          <Typography.Text type="secondary">
            跨用户查看平台分享链接并在应急时强制撤销（PIA R-6）。强制撤销仅 SUPER_ADMIN 可执行。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="按用户 ID 精确过滤"
          style={{ width: 260 }}
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onPressEnter={applyUserId}
          allowClear
        />
        <Button onClick={applyUserId}>应用</Button>
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 130 }}
          value={active}
          onChange={(v) => {
            setActive(v);
            setPage(1);
          }}
          options={[
            { value: 'true', label: '生效中' },
            { value: 'false', label: '已失效' },
          ]}
        />
      </Space>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="shareId"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        locale={{ emptyText: <Empty description="暂无分享链接（当前筛选条件下）" /> }}
      />
    </div>
  );
}
