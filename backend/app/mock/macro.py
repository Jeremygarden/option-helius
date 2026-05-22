def get_mock_macro():
    return {
        "vix": 14.5,
        "vix_change": -2.1,
        "yield_curve": "Inverted",
        "ten_year_note": 4.25,
        "spx_trend": "Bullish",
        "market_regime": "Low Vol Expansion",
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
        },
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
                {"range": "0-25",  "min": 0,  "max": 25,  "signal": "安心持有", "color": "#3fb950", "accuracy": "—（低风险区间）",    "position": "70-90%", "is_current": False},
                {"range": "26-50", "min": 26, "max": 50,  "signal": "保持关注", "color": "#d29922", "accuracy": "~60%（部分预警）",   "position": "60-75%", "is_current": False},
                {"range": "51-70", "min": 51, "max": 70,  "signal": "降仓",    "color": "#f0883e", "accuracy": "~80%（多数正确）",   "position": "40-60%", "is_current": True},
                {"range": "71-85", "min": 71, "max": 85,  "signal": "大幅降仓", "color": "#f85149", "accuracy": "~90%（高准确率）",  "position": "20-35%", "is_current": False},
                {"range": "86-100","min": 86, "max": 100, "signal": "清仓",    "color": "#6e7681", "accuracy": "100%（历史无失误）", "position": "<20%",   "is_current": False},
            ]
        }
    }
