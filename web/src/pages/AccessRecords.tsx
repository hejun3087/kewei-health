import { useEffect, useState } from 'react';
import { Table, Tag, Select, Space, Typography, DatePicker, Button, Empty } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// 我的数据访问记录（合规 6.1.7 / PIA R-3 尾项，数据主体知情权）。
// 对接 GET /audit/me（仅本人，userId 由后端 req.user 强制注入）→ 分页对象 { total, items, page, pageSize }。
// items 为 AuditLog 行：{ id, action, resourceType, resourceId, ip, userAgent, success, meta, createdAt }。

// action 取值：拦截器按 HTTP 方法推断（GET→READ/POST→CREATE/PUT·PATCH→UPDATE/DELETE→DELETE），
// 另有显式值 LOGIN / EXPORT / SHARE_CREATE / SHARE_LIST / SHARE_REVOKE / SHARE_VIEW。
const actionLabel: Record<string, string> = {
  READ: '查看',
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
  EXPORT: '导出',
  LOGIN: '登录',
  SHARE_CREATE: '创建分享',
  SHARE_LIST: '查看分享列表',
  SHARE_REVOKE: '撤销分享',
  SHARE_VIEW: '分享访问',
};

// resourceType 取值：REPORT / DIAGNOSIS / MEDICATION / FAMILY_MEMBER / UPLOAD / USER / HEALTH_DATA / AUTH。
const resourceLabel: Record<string, string> = {
  REPORT: '检查报告',
  DIAGNOSIS: '就诊记录',
  MEDICATION: '用药记录',
  FAMILY_MEMBER: '家庭成员',
  UPLOAD: '上传文件',
  USER: '个人档案',
  HEALTH_DATA: '健康数据',
  AUTH: '登录认证',
};

const actionOptions = Object.keys(actionLabel).map((k) => ({ value: k, label: actionLabel[k] }));
const resourceOptions = Object.keys(resourceLabel).map((k) => ({ value: k, label: resourceLabel[k] }));
const successOptions = [
  { value: 'true', label: '成功' },
  { value: 'false', label: '失败' },
];

interface AuditRow {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  meta: any;
  createdAt: string;
}

export default function AccessRecordsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string | undefined>();
  const [resourceType, setResourceType] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [range, setRange] = useState<any>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = { page, pageSize };
    if (action) params.action = action;
    if (resourceType) params.resourceType = resourceType;
    if (success) params.success = success;
    if (range && range[0] && range[1]) {
      params.from = range[0].startOf('day').toISOString();
      params.to = range[1].endOf('day').toISOString();
    }
    api
      .get('/audit/me', { params })
      .then((res) => {
        setRows(res.data?.items || []);
        setTotal(res.data?.total || 0);
      })
      .finally(() => setLoading(false));
  };

  // 首次加载 + 任一筛选/分页变化时重新拉取
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, action, resourceType, success, range]);

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
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
          <h2 style={{ margin: 0 }}>访问记录</h2>
          <Typography.Text type="secondary">
            谁在何时查看、修改或分享了你的健康数据，以及登录尝试，都会记录在这里（对应 PIA R-3 数据主体知情权，仅展示与你相关的数据）。
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
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
        <RangePicker
          onChange={(v) => {
            setRange(v);
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
        locale={{ emptyText: <Empty description="暂无数据访问记录，当有人查看、修改或分享你的健康数据时会自动记录在这里" /> }}
      />
    </div>
  );
}
