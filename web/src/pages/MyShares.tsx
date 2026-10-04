import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Modal, message, Typography } from 'antd';
import { StopOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../utils/api';
import EmptyGuide from '../components/EmptyGuide';
import dayjs from 'dayjs';

const typeLabel: Record<string, string> = {
  LAB: '化验报告',
  IMAGING: '影像检查',
  PRESCRIPTION: '处方',
  MEDICAL_RECORD: '病历',
  PHYSICAL_EXAM: '体检报告',
  VACCINATION: '疫苗接种',
  SURGERY: '手术记录',
};

// 分享记录（GET /share/my 返回纯数组，仅含 reportId，报告展示信息需与 /reports join）
interface ShareRow {
  shareId: string;
  reportId: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  active: boolean;
}

export default function MySharesPage() {
  const navigate = useNavigate();
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fmt = (v?: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-');

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/share/my'), api.get('/reports', { params: { pageSize: 100 } })])
      .then(([s, r]) => {
        setShares(Array.isArray(s.data) ? s.data : s.data?.items || []);
        setReports(Array.isArray(r.data) ? r.data : r.data?.items || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const reportDesc = (reportId: string) => {
    const rp = reports.find((x) => x.id === reportId);
    if (!rp) return <span style={{ color: '#999' }}>{`报告 ${reportId.slice(0, 8)}…`}</span>;
    return (
      <Space direction="vertical" size={0}>
        <span>{[rp.hospital, typeLabel[rp.reportType] || rp.reportType].filter(Boolean).join(' · ') || '健康报告'}</span>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {rp.reportDate ? dayjs(rp.reportDate).format('YYYY-MM-DD') : ''}
        </Typography.Text>
      </Space>
    );
  };

  const statusTag = (row: ShareRow) => {
    if (row.revokedAt) return <Tag>已撤销</Tag>;
    if (row.active) return <Tag color="green">生效中</Tag>;
    return <Tag color="orange">已过期</Tag>;
  };

  const handleRevoke = (row: ShareRow) => {
    Modal.confirm({
      title: '撤销该分享链接？',
      content: '撤销后，持有旧链接的人将立即无法查看，此操作不可恢复。',
      okText: '确认撤销',
      okButtonProps: { danger: true },
      onOk: async () => {
        await api.delete(`/share/${row.shareId}`);
        message.success('已撤销，链接立即失效');
        load();
      },
    });
  };

  const columns = [
    { title: '报告', dataIndex: 'reportId', key: 'reportId', render: (v: string) => reportDesc(v) },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 150, render: (v: string) => fmt(v) },
    { title: '有效期至', dataIndex: 'expiresAt', key: 'expiresAt', width: 150, render: (v: string) => fmt(v) },
    { title: '状态', key: 'status', width: 90, render: (_: any, r: ShareRow) => statusTag(r) },
    { title: '访问次数', dataIndex: 'viewCount', key: 'viewCount', width: 90, render: (v: number) => v ?? 0 },
    { title: '最近访问', dataIndex: 'lastViewedAt', key: 'lastViewedAt', width: 150, render: (v: string | null) => fmt(v) },
    {
      title: '操作', key: 'action', width: 110,
      render: (_: any, r: ShareRow) => (
        r.revokedAt ? (
          <span style={{ color: '#bbb' }}>—</span>
        ) : (
          <Button danger size="small" type="link" icon={<StopOutlined />} onClick={() => handleRevoke(r)}>撤销</Button>
        )
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>我的分享</h2>
          <Typography.Text type="secondary">管理已生成的报告只读分享链接，可随时撤销（对应 PIA R-6）。</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
      </div>
      <Table
        dataSource={shares}
        columns={columns}
        rowKey="shareId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <EmptyGuide description="还没有生成过分享链接，可在「检查报告」页对某份报告点击“分享”生成" actionText="去分享报告" onAction={() => navigate('/reports')} /> }}
      />
    </div>
  );
}
