import { useEffect, useState } from 'react';
import { Table, Tag, Space, Typography, Input, Button, Empty, DatePicker } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import dayjs from 'dayjs';

// 权限变更履历页（docs/rbac-design.md §9.4，RBAC P2）：
// 复用 GET /admin/audit，预置 resourceType=ADMIN + action=ROLE_GRANT,ROLE_REVOKE（后端 queryAll 支持逗号多值）。
// 等保三级要求“权限变更可追溯”——本视图聚焦“谁在何时给谁授予/撤销了什么角色，理由是什么”，
// 数据来源为 admin.service 落审计时的 meta（actorRoles/targetUserId/role/reason）。

const { RangePicker } = DatePicker;

const roleColor: Record<string, string> = {
  SUPER_ADMIN: 'gold',
  OPERATOR: 'blue',
  SUPPORT: 'cyan',
  AUDITOR: 'purple',
};

interface HistoryRow {
  id: string;
  userId: string | null; // 操作者（actor）
  action: string; // ROLE_GRANT | ROLE_REVOKE
  resourceId: string | null;
  ip: string | null;
  success: boolean;
  meta: {
    actorRoles?: string[];
    targetUserId?: string;
    role?: string;
    reason?: string | null;
    revoked?: number;
  } | null;
  createdAt: string;
}

export default function PermissionHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [targetUserInput, setTargetUserInput] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | undefined>();
  const [range, setRange] = useState<[string, string] | undefined>();

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = {
      page,
      pageSize,
      resourceType: 'ADMIN',
      action: 'ROLE_GRANT,ROLE_REVOKE',
    };
    // 后端 queryAll 按 userId（actor）过滤；targetUserId 在 meta 内，只能拉回后前端过滤
    api
      .get('/admin/audit', {
        params: {
          ...params,
          ...(range ? { from: range[0], to: range[1] } : {}),
        },
      })
      .then((res) => {
        const items: HistoryRow[] = res.data?.items || [];
        const filtered = targetUserId
          ? items.filter((r) => r.meta?.targetUserId === targetUserId)
          : items;
        setRows(filtered);
        setTotal(res.data?.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, targetUserId, range]);

  const applyTarget = () => {
    const v = targetUserInput.trim();
    setTargetUserId(v || undefined);
    setPage(1);
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 90,
      render: (v: string) =>
        v === 'ROLE_GRANT' ? <Tag color="green">授予</Tag> : <Tag color="orange">撤销</Tag>,
    },
    {
      title: '角色',
      key: 'role',
      width: 130,
      render: (_: any, r: HistoryRow) =>
        r.meta?.role ? (
          <Tag color={roleColor[r.meta.role] || 'default'}>{r.meta.role}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: '目标用户',
      key: 'targetUserId',
      width: 200,
      ellipsis: true,
      render: (_: any, r: HistoryRow) =>
        r.meta?.targetUserId ? (
          <Typography.Text copyable>{r.meta.targetUserId}</Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: '操作者',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
      render: (v: string | null, r: HistoryRow) => (
        <Space size={4}>
          <Typography.Text copyable={!!v} style={{ maxWidth: 120 }}>
            {v || '—'}
          </Typography.Text>
          {r.meta?.actorRoles?.length ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              ({r.meta.actorRoles.join(',')})
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '理由',
      key: 'reason',
      ellipsis: true,
      render: (_: any, r: HistoryRow) =>
        r.meta?.reason ? (
          <Typography.Text title={r.meta.reason}>{r.meta.reason}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '结果',
      dataIndex: 'success',
      key: 'success',
      width: 90,
      render: (v: boolean) => (v ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (v: string | null) => v || '—',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>权限变更履历（管理端）</h2>
          <Typography.Text type="secondary">
            等保三级“权限可追溯”：仅展示 ROLE_GRANT / ROLE_REVOKE 事件，附操作者角色快照、目标用户与理由（RBAC P2）。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="按目标用户 ID 精确过滤（当前页）"
          style={{ width: 280 }}
          value={targetUserInput}
          onChange={(e) => setTargetUserInput(e.target.value)}
          onPressEnter={applyTarget}
          allowClear
        />
        <Button onClick={applyTarget}>应用</Button>
        <RangePicker
          showTime
          onChange={(v) => {
            if (v && v[0] && v[1]) {
              setRange([v[0].toISOString(), v[1].toISOString()]);
            } else {
              setRange(undefined);
            }
            setPage(1);
          }}
        />
      </Space>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="id"
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
        locale={{ emptyText: <Empty description="暂无权限变更事件（当前筛选条件下）" /> }}
      />
    </div>
  );
}
