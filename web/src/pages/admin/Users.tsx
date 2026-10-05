import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Typography,
  Input,
  Button,
  Empty,
  Select,
  Modal,
  Drawer,
  Descriptions,
  Popconfirm,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { stepUpRequest } from '../../utils/stepup';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

// 管理端用户管理（docs/rbac-design.md P1 + P2）。
// GET /admin/users（user:read：SUPER_ADMIN/OPERATOR/AUDITOR，响应脱敏 PII）
// PATCH /admin/users/:id/status + POST/DELETE /admin/users/:id/roles（仅 SUPER_ADMIN，P2 需 step-up）
// 前端按角色控制按钮可见性（体验层），后端 RolesGuard + StepUpGuard 为实际安全边界。

const ROLE_OPTIONS = ['SUPER_ADMIN', 'OPERATOR', 'SUPPORT', 'AUDITOR'];
const roleColor: Record<string, string> = {
  SUPER_ADMIN: 'gold',
  OPERATOR: 'blue',
  SUPPORT: 'cyan',
  AUDITOR: 'purple',
};

interface UserRow {
  id: string;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  roles?: string[];
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user!.roles! : [];
  const canManage = userRoles.includes('SUPER_ADMIN'); // user:disable + role:grant/revoke 仅 SUPER_ADMIN

  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  // 详情抽屉
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, pageSize };
    if (keyword) params.keyword = keyword;
    if (status) params.status = status;
    api
      .get('/admin/users', { params })
      .then((res) => {
        setRows(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, keyword, status]);

  const applyKeyword = () => {
    const v = keywordInput.trim();
    setKeyword(v || undefined);
    setPage(1);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ id } as UserRow);
    try {
      const res = await api.get(`/admin/users/${id}`);
      setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStatus = (row: UserRow) => {
    const next = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    let reason = '';
    Modal.confirm({
      title: `确认${next === 'DISABLED' ? '禁用' : '启用'}该账号？`,
      content: (
        <Input.TextArea
          placeholder="理由（必填，供审计追溯）"
          rows={2}
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      okButtonProps: { danger: next === 'DISABLED' },
      onOk: async () => {
        if (!reason.trim()) return Promise.reject(new Error('请填写理由'));
        // RBAC P2：启停需 step-up 二次验证，requestStepUp 失败会抛 → 外层 Modal 保持打开
        await stepUpRequest((token) =>
          api.patch(
            `/admin/users/${row.id}/status`,
            { status: next, reason: reason.trim() },
            { headers: { 'x-stepup-token': token } },
          ),
        );
        load();
        if (detail?.id === row.id) openDetail(row.id);
      },
    });
  };

  const grantRole = (role: string) => {
    if (!detail) return;
    let reason = '';
    Modal.confirm({
      title: `授予角色 ${role}？`,
      content: (
        <Input.TextArea
          placeholder="理由（必填，供审计追溯）"
          rows={2}
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      onOk: async () => {
        if (!reason.trim()) return Promise.reject(new Error('请填写理由'));
        await stepUpRequest((token) =>
          api.post(
            `/admin/users/${detail.id}/roles`,
            { role, reason: reason.trim() },
            { headers: { 'x-stepup-token': token } },
          ),
        );
        openDetail(detail.id);
      },
    });
  };

  const revokeRole = async (role: string) => {
    if (!detail) return;
    // Popconfirm 无 onOk rejected保持机制：step-up 取消或失败直接 return（api 拦截器已提示）
    try {
      await stepUpRequest((token) =>
        api.delete(`/admin/users/${detail.id}/roles/${role}`, {
          params: { reason: '管理端撤销' },
          headers: { 'x-stepup-token': token },
        }),
      );
      openDetail(detail.id);
    } catch {
      /* requestStepUp 已处理失败提示，不再抛出 */
    }
  };

  const columns = [
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 150, render: (v: string | null) => v || '-' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 140, render: (v: string | null) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) =>
        v === 'ACTIVE' ? <Tag color="green">正常</Tag> : v === 'DISABLED' ? <Tag color="red">已禁用</Tag> : <Tag>已注销</Tag>,
    },
    {
      title: '用户 ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      render: (v: string) => <Typography.Text copyable>{v}</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, row: UserRow) => (
        <Space>
          <Button size="small" onClick={() => openDetail(row.id)}>
            详情
          </Button>
          {canManage && row.status !== 'DELETED' && (
            <Button size="small" danger={row.status === 'ACTIVE'} onClick={() => toggleStatus(row)}>
              {row.status === 'ACTIVE' ? '禁用' : '启用'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>用户管理（管理端）</h2>
          <Typography.Text type="secondary">
            跨用户检索账号（手机号已脱敏）。启用/禁用与角色授予仅 SUPER_ADMIN。健康数据明细不在本页暴露。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="手机号 / 昵称关键词"
          style={{ width: 220 }}
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onPressEnter={applyKeyword}
          allowClear
        />
        <Button onClick={applyKeyword}>搜索</Button>
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 130 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'ACTIVE', label: '正常' },
            { value: 'DISABLED', label: '已禁用' },
            { value: 'DELETED', label: '已注销' },
          ]}
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
        locale={{ emptyText: <Empty description="暂无用户（当前筛选条件下）" /> }}
      />

      <Drawer
        title="用户详情"
        open={!!detail}
        onClose={() => setDetail(null)}
        loading={detailLoading}
        width={480}
      >
        {detail && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="用户 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="昵称">{detail.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="当前角色">
                <Space wrap>
                  {(detail.roles || []).length ? (
                    (detail.roles || []).map((r) => (
                      <Tag key={r} color={roleColor[r] || 'default'}>
                        {r}
                        {canManage && (
                          <Popconfirm title="撤销该角色？" onConfirm={() => revokeRole(r)} okText="撤销" cancelText="取消">
                            <Typography.Link style={{ marginLeft: 4 }}>撤销</Typography.Link>
                          </Popconfirm>
                        )}
                      </Tag>
                    ))
                  ) : (
                    <Typography.Text type="secondary">无管理角色</Typography.Text>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {canManage && (
              <div style={{ marginTop: 16 }}>
                <Typography.Text strong>授予角色：</Typography.Text>
                <Space wrap style={{ marginLeft: 8 }}>
                  {ROLE_OPTIONS.filter((r) => !(detail.roles || []).includes(r)).map((r) => (
                    <Button key={r} size="small" onClick={() => grantRole(r)}>
                      授予 {r}
                    </Button>
                  ))}
                </Space>
              </div>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
