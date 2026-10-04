import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Input, Select, DatePicker, Button, Space, Modal, Form, message, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, ShareAltOutlined, CopyOutlined } from '@ant-design/icons';
import api from '../utils/api';
import EmptyGuide from '../components/EmptyGuide';
import dayjs from 'dayjs';

const categoryOptions = [
  { value: 'LAB', label: '化验报告' },
  { value: 'IMAGING', label: '影像检查' },
  { value: 'PRESCRIPTION', label: '处方' },
  { value: 'MEDICAL_RECORD', label: '病历' },
  { value: 'PHYSICAL_EXAM', label: '体检报告' },
  { value: 'VACCINATION', label: '疫苗接种' },
  { value: 'SURGERY', label: '手术记录' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  // 分享（4.3.2 / PIA R-6）：家庭版权益，非家庭版后端返回 402 由拦截器弹升级引导
  // 升级为可撤销分享：生成前先选有效期（1~90 天），创建返回 shareId/expiresAt
  const [shareOpen, setShareOpen] = useState(false);
  const [shareReportId, setShareReportId] = useState<string>('');
  const [shareLink, setShareLink] = useState('');
  const [shareMeta, setShareMeta] = useState<{ shareId: string; expiresAt: string } | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [sharing, setSharing] = useState(false);
  const ttlOptions = [
    { value: 7, label: '7 天' },
    { value: 30, label: '30 天（默认）' },
    { value: 60, label: '60 天' },
    { value: 90, label: '90 天' },
  ];

  const openShare = (reportId: string) => {
    setShareReportId(reportId);
    setShareLink('');
    setShareMeta(null);
    setExpiresInDays(30);
    setShareOpen(true);
  };

  const handleGenerateShare = async () => {
    if (!shareReportId) return;
    setSharing(true);
    try {
      const res = await api.post(`/share/report/${shareReportId}`, { expiresInDays });
      setShareLink(`${window.location.origin}${res.data.path}`);
      setShareMeta({ shareId: res.data.shareId, expiresAt: res.data.expiresAt });
    } catch {
      // 402/错误已由 api 拦截器统一提示
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      message.success('分享链接已复制');
    } catch {
      message.warning('复制失败，请手动选择链接复制');
    }
  };

  const fetchReports = () => {
    setLoading(true);
    // 有关键词走搜索接口（后端 /reports 不处理 keyword）
    if (search) {
      api.get('/reports/search', { params: { keyword: search } })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
          // 搜索接口不支持类型筛选，前端再过滤一次
          setReports(categoryFilter ? list.filter((r: any) => r.reportType === categoryFilter) : list);
        })
        .finally(() => setLoading(false));
      return;
    }
    const params: any = {};
    if (categoryFilter) params.reportType = categoryFilter;
    api.get('/reports', { params }).then((res) => {
      setReports(Array.isArray(res.data) ? res.data : res.data?.items || res.data?.reports || []);
    }).finally(() => setLoading(false));
  };

  const fetchMembers = () => {
    api.get('/family-members').then((res) => {
      setMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    fetchMembers();
  }, []);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除吗？',
      onOk: async () => {
        await api.delete(`/reports/${id}`);
        message.success('已删除');
        fetchReports();
      },
    });
  };

  const handleAdd = async (values: any) => {
    try {
      const payload = {
        ...values,
        reportDate: values.reportDate.format('YYYY-MM-DD'),
      };
      await api.post('/reports', payload);
      message.success('报告已添加');
      setModalOpen(false);
      form.resetFields();
      fetchReports();
    } catch {
      // 拦截器处理
    }
  };

  const getMemberName = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return m?.name || '';
  };

  const columns = [
    { title: '日期', dataIndex: 'reportDate', key: 'reportDate', width: 120, render: (v: string) => v?.slice(0, 10) },
    { title: '类型', dataIndex: 'reportType', key: 'reportType', width: 100, render: (v: string) => {
      const opt = categoryOptions.find((o) => o.value === v);
      return <Tag color="blue">{opt?.label || v}</Tag>;
    }},
    { title: '分类', dataIndex: 'categoryL1', key: 'categoryL1', width: 120 },
    { title: '医院', dataIndex: 'hospital', key: 'hospital', render: (v: string) => v || '-' },
    { title: '摘要', dataIndex: 'summary', key: 'summary', ellipsis: true },
    { title: '成员', dataIndex: 'memberId', key: 'memberId', width: 80, render: (v: string) => getMemberName(v) },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/reports/${record.id}`)}>详情</Button>
          <Button type="link" size="small" icon={<ShareAltOutlined />} onClick={() => openShare(record.id)}>分享</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}><DeleteOutlined /></Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>检查报告</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>手动添加</Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索报告..." style={{ width: 250 }} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={fetchReports} />
        <Select placeholder="类型筛选" style={{ width: 150 }} allowClear options={categoryOptions} value={categoryFilter} onChange={(v) => { setCategoryFilter(v); }} />
        <Button onClick={fetchReports}>搜索</Button>
      </Space>
      <Table dataSource={reports} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} locale={{ emptyText: <EmptyGuide description="还没有检查报告，上传报告图片或手动添加，AI 会自动识别归类" actionText="添加检查报告" onAction={() => setModalOpen(true)} /> }} />

      <Modal title="手动添加报告" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="reportType" label="报告类型" rules={[{ required: true }]}>
            <Select options={categoryOptions} placeholder="选择类型" />
          </Form.Item>
          <Form.Item name="categoryL1" label="一级分类" rules={[{ required: true }]}>
            <Input placeholder="如：血液检查" />
          </Form.Item>
          <Form.Item name="categoryL2" label="二级分类">
            <Input placeholder="如：血常规" />
          </Form.Item>
          <Form.Item name="memberId" label="家庭成员" rules={[{ required: true }]}>
            <Select placeholder="选择成员" options={members.map((m) => ({ value: m.id, label: m.name }))} />
          </Form.Item>
          <Form.Item name="reportDate" label="报告日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hospital" label="医院">
            <Input placeholder="医院名称" />
          </Form.Item>
          <Form.Item name="summary" label="摘要/结论">
            <Input.TextArea rows={3} placeholder="报告结论或摘要" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分享报告"
        open={shareOpen}
        onCancel={() => setShareOpen(false)}
        footer={
          shareLink
            ? [
                <Button key="manage" onClick={() => navigate('/shares')}>管理我的分享</Button>,
                <Button key="close" onClick={() => setShareOpen(false)}>关闭</Button>,
                <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={copyShareLink}>复制链接</Button>,
              ]
            : [
                <Button key="close" onClick={() => setShareOpen(false)}>取消</Button>,
                <Button key="gen" type="primary" loading={sharing} onClick={handleGenerateShare}>生成链接</Button>,
              ]
        }
      >
        {shareLink ? (
          <>
            <Typography.Paragraph type="secondary">
              任何持有此链接的人可只读查看该报告，到期时间 {shareMeta?.expiresAt ? dayjs(shareMeta.expiresAt).format('YYYY-MM-DD HH:mm') : ''}。链接可随时在「我的分享」中撤销。
            </Typography.Paragraph>
            <Input readOnly value={shareLink} onFocus={(e) => e.target.select()} />
          </>
        ) : (
          <>
            <Typography.Paragraph type="secondary">选择链接有效期后生成只读分享链接（家庭版权益）。生成后可在「我的分享」随时撤销。</Typography.Paragraph>
            <Space style={{ marginBottom: 12 }}>
              <span>有效期：</span>
              <Select style={{ width: 160 }} value={expiresInDays} options={ttlOptions} onChange={(v) => setExpiresInDays(v)} />
            </Space>
          </>
        )}
      </Modal>
    </div>
  );
}
