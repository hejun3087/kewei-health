import { useEffect, useState } from 'react';
import { Table, Tag, Select, Space, Typography, Input, Button, Empty, message } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import dayjs from 'dayjs';

// 管理端跨用户审计查询（docs/rbac-design.md P0 首落点，解锁 PIA R-3 尾项）。
// 对接 GET /admin/audit（RolesGuard 已限定 SUPER_ADMIN/AUDITOR + audit:read_all）。
// 与「访问记录」页共享 action/resourceType 中文映射与筛选结构，但多 userId 维度过滤 + 表格 userId 列。

const actionLabel: Record<string, string> = {
  READ: '查看',
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
  EXPORT: '导出',
  LOGIN: '登录',
  STEPUP: '二次验证',
  SHARE_CREATE: '创建分享',
  SHARE_LIST: '查看分享列表',
  SHARE_REVOKE: '撤销分享',
  SHARE_REVOKE_ANY: '强制撤销分享',
  SHARE_VIEW: '分享访问',
  ROLE_GRANT: '授予角色',
  ROLE_REVOKE: '撤销角色',
  USER_DISABLE: '账号启停',
  AUDIT_EXPORT: '导出审计日志',
};

const resourceLabel: Record<string, string> = {
  REPORT: '检查报告',
  DIAGNOSIS: '就诊记录',
  MEDICATION: '用药记录',
  FAMILY_MEMBER: '家庭成员',
  UPLOAD: '上传文件',
  USER: '个人档案',
  HEALTH_DATA: '健康数据',
  AUTH: '登录认证',
  ADMIN: '管理操作',
};

const actionOptions = Object.keys(actionLabel).map((k) => ({ value: k, label: actionLabel[k] }));
const resourceOptions = Object.keys(resourceLabel).map((k) => ({ value: k, label: resourceLabel[k] }));
const successOptions = [
  { value: 'true', label: '成功' },
  { value: 'false', label: '失败' },
];

interface AuditRow {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  meta: any;
  createdAt: string;
}

export default function AllAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string | undefined>();
  const [resourceType, setResourceType] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  // userId 使用文本框 + 显式提交（避免用户输入过程触发频繁请求）
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [userId, setUserId] = useState<string | undefined>();

  /** 当前筛选条件：列表与导出共用，保证「页面上看到的」=「导出的」 */
  const currentFilters = (): Record<string, any> => {
    const params: Record<string, any> = {};
    if (action) params.action = action;
    if (resourceType) params.resourceType = resourceType;
    if (success) params.success = success;
    if (userId) params.userId = userId;
    return params;
  };

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, pageSize, ...currentFilters() };
    api
      .get('/admin/audit', { params })
      .then((res) => {
        setRows(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, action, resourceType, success, userId]);

  const applyUserId = () => {
    const v = userIdInput.trim();
    setUserId(v ? v : undefined);
    setPage(1);
  };

  // 审计导出（RBAC P3，解锁 PIA R-3「审计记录可导出」尾项）：blob 下载，权限不足由 api 拦截器提示
  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    try {
      const res = await api.get('/admin/audit/export', {
        params: { ...currentFilters(), format },
        responseType: 'blob',
      });
      const cd = (res.headers['content-disposition'] as string) || '';
      const match = /filename="?([^";]+)"?/i.exec(cd);
      const filename = match ? match[1] : `kewei-audit-export.${format}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      if (res.headers['x-audit-export-truncated'] === 'true') {
        message.warning('数据量超出上限，仅导出最近 10000 条，请缩小筛选范围后重导');
      } else {
        message.success('审计日志已导出');
      }
    } catch {
      // 权限不足/网络错误已由 api 响应拦截器统一提示
    } finally {
      setExporting(null);
    }
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
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => <Typography.Text copyable={!!v}>{v || '(免登录)'}</Typography.Text>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (v: string) => <Tag>{actionLabel[v] || v}</Tag>,
    },
    {
      title: '数据对象',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
      render: (v: string) => resourceLabel[v] || v,
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
      render: (v: string | null) => v || '-',
    },
    {
      title: '设备',
      dataIndex: 'userAgent',
      key: 'userAgent',
      ellipsis: true,
      render: (v: string | null) => (
        <Typography.Text type="secondary" title={v || ''}>
          {v || '-'}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>全量审计日志（管理端）</h2>
          <Typography.Text type="secondary">
            跨用户查看平台内的健康数据访问、登录尝试与分享操作。仅 SUPER_ADMIN / AUDITOR 角色可访问（对应 PIA R-3 跨用户管理端）。
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            刷新
          </Button>
          <Space.Compact>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting === 'xlsx'}
              disabled={exporting !== null && exporting !== 'xlsx'}
              onClick={() => handleExport('xlsx')}
            >
              导出 Excel
            </Button>
            <Button
              loading={exporting === 'csv'}
              disabled={exporting !== null && exporting !== 'csv'}
              onClick={() => handleExport('csv')}
            >
              导出 CSV
            </Button>
          </Space.Compact>
        </Space>
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
          placeholder="操作类型"
          style={{ width: 150 }}
          options={actionOptions}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="数据对象"
          style={{ width: 150 }}
          options={resourceOptions}
          value={resourceType}
          onChange={(v) => {
            setResourceType(v);
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="结果"
          style={{ width: 120 }}
          options={successOptions}
          value={success}
          onChange={(v) => {
            setSuccess(v);
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
        locale={{ emptyText: <Empty description="暂无审计记录（当前筛选条件下）" /> }}
      />
    </div>
  );
}
