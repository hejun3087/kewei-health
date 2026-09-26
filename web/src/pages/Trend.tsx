import { useState } from 'react';
import { Card, Select, DatePicker, Empty } from 'antd';

const mockItems = [
  { name: '白细胞计数', unit: '10^9/L' },
  { name: '红细胞计数', unit: '10^12/L' },
  { name: '血红蛋白', unit: 'g/L' },
  { name: '血小板计数', unit: '10^9/L' },
  { name: '空腹血糖', unit: 'mmol/L' },
  { name: '总胆固醇', unit: 'mmol/L' },
  { name: '甘油三酯', unit: 'mmol/L' },
  { name: 'ALT', unit: 'U/L' },
];

export default function TrendPage() {
  const [selectedItem, setSelectedItem] = useState<string>();

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>趋势分析</h2>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Select
            placeholder="选择检查指标"
            style={{ width: 250 }}
            onChange={(v) => setSelectedItem(v)}
            options={mockItems.map(i => ({ value: i.name, label: `${i.name} (${i.unit})` }))}
          />
          <DatePicker.RangePicker />
        </div>

        {selectedItem ? (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: '#666' }}>📈 {selectedItem} 趋势图</p>
              <p style={{ color: '#999' }}>接入真实数据后将在此展示 ECharts 趋势曲线</p>
              <p style={{ color: '#999' }}>包含参考范围区间、异常值标记等</p>
            </div>
          </div>
        ) : (
          <Empty description="请选择一个检查指标查看趋势" style={{ padding: 60 }} />
        )}
      </Card>
    </div>
  );
}
