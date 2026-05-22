'use client';

import React, { useState, useEffect } from 'react';
import WarningIndicators from '@/components/macro/WarningIndicators';
import RunRiskPanel from '@/components/macro/RunRiskPanel';

export default function MacroPage() {
  const [macroData, setMacroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an API call
    // For now, we'll use a local mock or the backend data if available
    const fetchData = async () => {
      try {
        // Mocking the API response structure based on the updated backend mock
        const mockResponse = {
          "run_risk": {
            "composite_score": 67,
            "raw_weighted_score": 2.00,
            "max_raw_score": 3.00,
            "current_position_pct": 90,
            "signal": "orange",
            "signal_label": "橙色预警",
            "action_label": "建议降仓",
            "recommended_position": "40-60%",
            "evaluation_text": "多个核心指标同时预警。历史上类似的指标组合出现在1972年(漂亮50泡沫)、1999年(互联网泡沫)和2021年(后疫情泡沫)。每次后续都发生了超过-20%的修正。建议显著降低仓位。",
            "action_items": [
                "将股票仓位降至40-60%（当前90%仓位过高）",
                "将减仓资金转入短债基金或货币基金（当前YTM 4.6%）",
                "保留20-30%现金，等待市场修正时分批买入",
                "对QDII基金：注意汇率风险，人民币若升值会额外损失",
                "设置止损/止盈纪律，不要让亏损扩大"
            ],
            "levels": [
                {"range": "0-25",  "min": 0,  "max": 25,  "signal": "安心持有", "color": "#3fb950", "accuracy": "—（低风险区间）",    "position": "70-90%", "is_current": false},
                {"range": "26-50", "min": 26, "max": 50,  "signal": "保持关注", "color": "#d29922", "accuracy": "~60%（部分预警）",   "position": "60-75%", "is_current": false},
                {"range": "51-70", "min": 51, "max": 70,  "signal": "降仓",    "color": "#f0883e", "accuracy": "~80%（多数正确）",   "position": "40-60%", "is_current": true},
                {"range": "71-85", "min": 71, "max": 85,  "signal": "大幅降仓", "color": "#f85149", "accuracy": "~90%（高准确率）",  "position": "20-35%", "is_current": false},
                {"range": "86-100","min": 86, "max": 100, "signal": "清仓",    "color": "#6e7681", "accuracy": "100%（历史无失误）", "position": "<20%",   "is_current": false},
            ]
          },
          "warning_indicators": {
            "composite_score": 73,
            "composite_label": "中高风险",
            "composite_description": "市场处于历史高位，建议谨慎加仓，增加对冲",
            "red_count": 4,
            "orange_count": 3,
            "green_count": 1,
            "indicators": [
                {
                    "id": "cape",
                    "name": "CAPE 估值",
                    "name_en": "Shiller P/E",
                    "value": 37.0,
                    "value_display": "37.0x",
                    "status": "red",
                    "weight": 0.20,
                    "severity_pct": 85,
                    "description": "Shiller周期调整市盈率，衡量长期估值水平。历史上CAPE>30时，后续10年回报中位数仅1.8%。",
                    "threshold_text": "> 30x: 极端估值区域。历史上仅1929、2000、2021年高于此",
                    "data_source": "FRED/mock"
                },
                {
                    "id": "aiae",
                    "name": "AIAE 投资者配置",
                    "name_en": "Household Equity Allocation",
                    "value": 0.482,
                    "value_display": "0.482",
                    "status": "red",
                    "weight": 0.15,
                    "severity_pct": 92,
                    "description": "美国家庭和机构总资产中股票的占比。当所有人都已满仓，边际买家消失。当前处于1945年以来最高位。",
                    "threshold_text": "> 0.46: 历史性极端。过去两次达到此水平 (2000、2007) 后均发生重大危机",
                    "data_source": "mock"
                },
                {
                    "id": "m7_conc",
                    "name": "市场集中度",
                    "name_en": "M7 Concentration",
                    "value": 32.8,
                    "value_display": "32.8%",
                    "status": "red",
                    "weight": 0.15,
                    "severity_pct": 88,
                    "description": "七大巨头(M7)占标普500总市值的比例。极端集中度意味着指数表现高度依赖少数股票——一旦它们动摇，整个市场都会晃动。",
                    "threshold_text": "> 32%: 历史极端。2000年IT板块峰值33.6%后再未出现此水平",
                    "data_source": "mock"
                },
                {
                    "id": "vix",
                    "name": "VIX 恐慌指数",
                    "name_en": "VIX Index",
                    "value": 18.1,
                    "value_display": "18.1",
                    "status": "orange",
                    "weight": 0.10,
                    "severity_pct": 50,
                    "description": "衡量市场预期波动率。极低VIX=过度自满(危险)，极高VIX=恐慌(机会)。18附近属于中性区间。",
                    "threshold_text": "15-25: 正常波动区间，市场情绪中性",
                    "data_source": "CBOE"
                },
                {
                    "id": "yield_curve",
                    "name": "收益率曲线",
                    "name_en": "Yield Curve",
                    "value": 0.54,
                    "value_display": "0.54bps",
                    "status": "orange",
                    "weight": 0.15,
                    "severity_pct": 45,
                    "description": "10年-2年美债利差。倒挂(负利差)是经济衰退的可靠领先指标(领先12-18个月)。当前已结束倒挂但仍在低位。",
                    "threshold_text": "0-100bp: 利差收窄，需关注但尚未发出警报",
                    "data_source": "FRED"
                },
                {
                    "id": "pe_gap",
                    "name": "PE 裂口",
                    "name_en": "PE Gap",
                    "value": 25.3,
                    "value_display": "25.3%",
                    "status": "orange",
                    "weight": 0.10,
                    "severity_pct": 65,
                    "description": "TTM PE与Forward PE的差距。裂口越大，市场对未来盈利增长的预期越高——如果预期落空，下跌空间巨大。",
                    "threshold_text": "20-30%: 市场定价了显著盈利增长——容错空间缩小",
                    "data_source": "mock"
                },
                {
                    "id": "spx_trend",
                    "name": "趋势位置",
                    "name_en": "SPX vs 200MA",
                    "value": 6558.0,
                    "value_display": "6558.0",
                    "status": "green",
                    "weight": 0.10,
                    "severity_pct": 20,
                    "description": "标普500相对于200日均线的位置。200MA是牛熊分界线。当前在200MA上方运行。",
                    "threshold_text": "200MA上方 >5%: 技术面健康，处于上升趋势中",
                    "data_source": "mock"
                },
                {
                    "id": "erp",
                    "name": "权益风险溢价",
                    "name_en": "Equity Risk Premium",
                    "value": -0.081,
                    "value_display": "-0.081",
                    "status": "red",
                    "weight": 0.05,
                    "severity_pct": 95,
                    "description": "股票相对于10年期国债的超额回报补偿。负值意味着经风险调整后，股票不如债券有吸引力。这是巴菲特最关注的指标之一。",
                    "threshold_text": "< 0% (负): 股票经风险调整后不如债券。2000年和2007年曾出现此信号",
                    "data_source": "mock"
                }
            ]
          }
        };
        setMacroData(mockResponse);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch macro data", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">宏观概览 / Macro Dashboard</h1>
        <p className="text-[#7d8590] text-sm">Global market regime & cross-asset correlations</p>
      </div>

      {macroData?.run_risk && (
        <RunRiskPanel data={macroData.run_risk} />
      )}

      {/* 八大预警指标 Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white">八大预警指标</h2>
          <p className="text-[#7d8590] text-xs">基于历史数据的市场风险综合评估</p>
        </div>
        {macroData && <WarningIndicators data={macroData.warning_indicators} />}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "VIX INDEX", value: "14.50", change: "-2.1%", color: "text-accent-green" },
          { label: "US 10Y YIELD", value: "4.25%", change: "+0.5%", color: "text-accent-red" },
          { label: "DXY INDEX", value: "104.2", change: "+0.1%", color: "text-[#7d8590]" },
          { label: "GOLD", value: "$2350", change: "+1.2%", color: "text-accent-green" },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <span className="text-[10px] text-[#7d8590] uppercase font-bold">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono">{item.value}</span>
              <span className={`text-xs font-bold ${item.color}`}>{item.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 card p-6">
           <h3 className="text-sm font-semibold mb-6">收益率曲线 / Yield Curve (1M - 30Y)</h3>
           <div className="h-64 border-l border-b border-[#30363d] relative">
              <div className="absolute inset-0 flex items-center justify-center text-[#30363d] text-4xl font-bold uppercase rotate-12">
                 Coming Soon
              </div>
           </div>
        </div>
        <div className="card p-6">
           <h3 className="text-sm font-semibold mb-4">当前市场状态 / Market Regime</h3>
           <div className="flex flex-col gap-6 mt-8">
              <div className="flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full border-4 border-accent-teal flex items-center justify-center text-accent-teal font-bold text-center p-4">
                    Low Vol Expansion
                 </div>
                 <span className="mt-4 text-sm font-medium">Risk-On Mode</span>
              </div>
              <div className="space-y-2 mt-4">
                 <div className="flex justify-between text-xs">
                    <span className="text-[#7d8590]">Bullish Prob.</span>
                    <span className="text-accent-green">78%</span>
                 </div>
                 <div className="w-full h-1 bg-[#30363d] rounded-full overflow-hidden">
                    <div className="h-full bg-accent-teal" style={{ width: '78%' }} />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
