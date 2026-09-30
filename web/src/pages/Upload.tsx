import { useEffect, useState } from 'react';
import { Card, Upload, Button, message, Steps, Table, Tag, Select, Space } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import api from '../utils/api';

const { Dragger } = Upload;

export default function UploadPage() {
  const [step, setStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [memberId, setMemberId] = useState<string>();

  useEffect(() => {
    api.get('/family-members').then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.members || [];
      setMembers(list);
      const def = list.find((m: any) => m.isDefault) || list[0];
      if (def) setMemberId(def.id);
    }).catch(() => {});
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setStep(1);

    try {
      // 1. 上传图片
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. 调用AI识别
      const aiRes = await api.post('/ai/recognize', {
        uploadId: uploadRes.data.id,
      });

      setAiResult(aiRes.data);
      setStep(2);
    } catch {
      setAiResult({
        reportType: 'OTHER',
        categoryL1: '',
        categoryL2: '',
        hospital: '',
        reportDate: new Date().toISOString().slice(0, 10),
        confidence: 0,
        items: [],
      });
      setStep(2);
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSave = async () => {
    if (!memberId) {
      message.warning('请选择家庭成员');
      return;
    }
    try {
      await api.post('/reports', {
        memberId,
        reportType: aiResult.reportType || 'OTHER',
        categoryL1: aiResult.categoryL1 || '未分类',
        categoryL2: aiResult.categoryL2,
        hospital: aiResult.hospital,
        department: aiResult.department,
        reportDate: aiResult.reportDate,
        summary: aiResult.summary,
        items: aiResult.items,
      });
      message.success('报告已保存');
      setStep(0);
      setAiResult(null);
    } catch {
      // 拦截器处理
    }
  };

  const titleText =
    aiResult?.confidence > 0
      ? `识别结果（置信度：${(aiResult.confidence * 100).toFixed(0)}%）`
      : aiResult?.items?.length > 0
        ? '识别结果（示例数据，请核对后保存）'
        : '未识别到内容，请手动添加';

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>上传报告</h2>
      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择图片' },
          { title: 'AI识别中' },
          { title: '确认结果' },
        ]}
      />

      {step === 0 && (
        <Dragger
          accept="image/jpeg,image/png,image/heic"
          multiple={false}
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到此处上传</p>
          <p className="ant-upload-hint">
            支持 JPG、PNG、HEIC 格式，单张最大 20MB
            <br />
            支持化验报告、影像报告、处方单、病历等
          </p>
        </Dragger>
      )}

      {step === 1 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <p style={{ fontSize: 18 }}>AI正在识别报告内容...</p>
            <p style={{ color: '#999' }}>请稍候，通常需要5-10秒</p>
          </div>
        </Card>
      )}

      {step === 2 && aiResult && (
        <Card
          title={titleText}
          extra={
            <Space>
              <Select
                placeholder="选择成员"
                style={{ width: 140 }}
                value={memberId}
                onChange={setMemberId}
                options={members.map((m) => ({ value: m.id, label: m.name }))}
              />
              <Button type="primary" onClick={handleSave} loading={uploading}>
                确认保存
              </Button>
            </Space>
          }
        >
          <div style={{ marginBottom: 16 }}>
            {aiResult.categoryL1 && <Tag color="blue">{aiResult.categoryL1}</Tag>}
            {aiResult.categoryL2 && <Tag>{aiResult.categoryL2}</Tag>}
            {aiResult.hospital && <Tag color="green">{aiResult.hospital}</Tag>}
            {aiResult.reportDate && <span style={{ color: '#666', marginLeft: 8 }}>{aiResult.reportDate}</span>}
          </div>
          {aiResult.items?.length > 0 ? (
            <Table
              dataSource={aiResult.items}
              columns={[
                { title: '项目', dataIndex: 'name' },
                { title: '结果', dataIndex: 'value' },
                { title: '单位', dataIndex: 'unit' },
                { title: '参考范围', render: (_: any, r: any) => (r.referenceMin != null ? `${r.referenceMin}-${r.referenceMax}` : '-') },
                {
                  title: '状态', dataIndex: 'abnormal',
                  render: (v: string) => v === 'NORMAL' ? <Tag color="green">正常</Tag> : <Tag color="red">异常</Tag>,
                },
              ]}
              rowKey="name"
              pagination={false}
              size="small"
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
              未识别到检查明细，请前往"检查报告"页手动添加
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
