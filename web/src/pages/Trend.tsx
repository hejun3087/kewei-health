import { useEffect, useState, useRef } from 'react';
import { Card, Select, DatePicker, Empty, Spin } from 'antd';
// echarts 按需引入（1.3.6）：只注册折线图 + 用到的组件/渲染器，大幅缩减 vendor-echarts 体积
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import api from '../utils/api';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export default function TrendPage() {
  const [selectedItem, setSelectedItem] = useState<string>();
  const [trackableItems, setTrackableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.EChartsType>();

  useEffect(() => {
    api.get('/reports/trackable-items').then((res) => {
      const items = Array.isArray(res.data) ? res.data : [];
      setTrackableItems(items);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedItem || !chartRef.current) return;

    setLoading(true);
    api.get('/reports/trend', {
      params: { itemName: selectedItem },
    }).then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      renderChart(data);
    }).catch(() => {
      renderChart([]);
    }).finally(() => setLoading(false));
  }, [selectedItem]);

  const renderChart = (data: any[]) => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const dates = data.map((d: any) => (d.date || d.reportDate)?.slice(0, 10));
    const values = data.map((d: any) => parseFloat(d.value));

    chartInstance.current.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 60, right: 30, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: data[0]?.unit || '' },
      series: [
        {
          name: selectedItem,
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: { color: '#1677ff', width: 2 },
          itemStyle: { color: '#1677ff' },
          areaStyle: { color: 'rgba(22,119,255,0.1)' },
        },
      ],
    });
  };

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>趋势分析</h2>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Select
            placeholder="选择检查指标"
            style={{ width: 250 }}
            showSearch
            onChange={(v) => setSelectedItem(v)}
            options={trackableItems.map((i: any) => ({
              value: i.name,
              label: `${i.name}${i.unit ? ` (${i.unit})` : ''}`,
            }))}
          />
          <DatePicker.RangePicker />
        </div>

        {loading && <Spin style={{ display: 'block', margin: '60px auto' }} />}

        {!loading && selectedItem ? (
          <div ref={chartRef} style={{ height: 400, width: '100%' }} />
        ) : (
          !loading && <Empty description="请选择一个检查指标查看趋势" style={{ padding: 60 }} />
        )}
      </Card>
    </div>
  );
}
