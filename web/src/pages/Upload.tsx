import { useState } from 'react';
import { Card, Upload, Button, message, Steps, Table, Tag, Result } from 'antd';
import { InboxOutlined, CameraOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

export default function UploadPage() {
  const [step, setStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleUpload = (file: File) => {
    // 模拟上传和AI识别
    setStep(1);
    setTimeout(() => {
      setAiResult({
        reportType: 'LAB',
        categoryL1: '血液检查',
        categoryL2: '血常规',
        hospital: '北京协和医院',
        reportDate: '2026-09-20',
        confidence: 0.92,
        items: [
          { name: '白细胞计数', value: '6.8', unit: '10^9/L', reference: '3.5-9.5', abnormal: 'NORMAL' },
          { name: '红细胞计数', value: '4.52', unit: '10^12/L', reference: '4.3-5.8', abnormal: 'NORMAL' },
          { name: '血红蛋白', value: '138', unit: 'g/L', reference: '130-175', abnormal: 'NORMAL' },
        ],
      });
      setStep(2);
    }, 2000);
    return false; // 阻止自动上传
  };

  const handleSave = () => {
    message.success('报告已保存');
    setStep(0);
    setAiResult(null);
  };

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
          accept="image/*"
          multiple
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
        <Card title={`识别结果（置信度：${(aiResult.confidence * 100).toFixed(0)}%）`} extra={<Button type="primary" onClick={handleSave}>确认保存</Button>}>
          <div style={{ marginBottom: 16 }}>
            <Tag color="blue">{aiResult.categoryL1}</Tag>
            <Tag>{aiResult.categoryL2}</Tag>
            <Tag color="green">{aiResult.hospital}</Tag>
            <span style={{ color: '#666', marginLeft: 8 }}>{aiResult.reportDate}</span>
          </div>
          <Table
            dataSource={aiResult.items}
            columns={[
              { title: '项目', dataIndex: 'name' },
              { title: '结果', dataIndex: 'value' },
              { title: '单位', dataIndex: 'unit' },
              { title: '参考范围', dataIndex: 'reference' },
              { title: '状态', dataIndex: 'abnormal', render: (v: string) => v === 'NORMAL' ? <Tag color="green">正常</Tag> : <Tag color="red">异常</Tag> },
            ]}
            rowKey="name"
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  );
}
