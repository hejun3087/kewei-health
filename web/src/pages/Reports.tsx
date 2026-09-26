import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Input, Select, DatePicker, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const mockData = [
  { id: '1', reportDate: '2026-09-20', categoryL1: '血液检查', categoryL2: '血常规', hospital: '北京协和医院', summary: '各项指标正常', member: '本人' },
  { id: '2', reportDate: '2026-09-15', categoryL1: '生化检查', categoryL2: '肝功能', hospital: '北京协和医院', summary: 'ALT偏高 45U/L', member: '本人' },
  { id: '3', reportDate: '2026-09-10', categoryL1: '影像检查', categoryL2: '腹部B超', hospital: '北京大学人民医院', summary: '未见异常', member: '本人' },
  { id: '4', reportDate: '2026-08-25', categoryL1: '血液检查', categoryL2: '血脂', hospital: '北京协和医院', summary: '总胆固醇偏高', member: '本人' },
  { id: '5', reportDate: '2026-08-15', categoryL1: '尿液检查', categoryL2: '尿常规', hospital: '中日友好医院', summary: '各项正常', member: '父亲' },
];

const columns = (navigate: any) => [
  { title: '日期', dataIndex: 'reportDate', key: 'reportDate', width: 120 },
  { title: '分类', dataIndex: 'categoryL1', key: 'categoryL1', width: 120, render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '项目', dataIndex: 'categoryL2', key: 'categoryL2', width: 120 },
  { title: '医院', dataIndex: 'hospital', key: 'hospital' },
  { title: '摘要', dataIndex: 'summary', key: 'summary' },
  { title: '成员', dataIndex: 'member', key: 'member', width: 80 },
  {
    title: '操作', key: 'action', width: 80,
    render: (_: any, record: any) => <Button type="link" onClick={() => navigate(`/reports/${record.id}`)}>详情</Button>,
  },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>检查报告</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索报告..." style={{ width: 250 }} />
        <Select placeholder="分类筛选" style={{ width: 150 }} options={[
          { value: '血液检查', label: '血液检查' },
          { value: '生化检查', label: '生化检查' },
          { value: '影像检查', label: '影像检查' },
          { value: '尿液检查', label: '尿液检查' },
        ]} />
        <DatePicker.RangePicker />
      </Space>
      <Table dataSource={mockData} columns={columns(navigate)} rowKey="id" pagination={{ pageSize: 10 }} />
    </div>
  );
}
