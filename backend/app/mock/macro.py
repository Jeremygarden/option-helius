from app.services.warning_calculator import compute_composite_score, OPTIMIZED_WEIGHTS

def get_mock_macro():
    current_indicators = {
        "cape": 37.0,
        "aiae": 0.482,
        "m7_concentration": 32.8,
        "vix": 18.1,
        "yield_curve": 54,
        "pe_gap": 25.3,
        "trend": 8,  # % above 200MA
        "erp": -0.081
    }
    
    result = compute_composite_score(current_indicators)
    breakdown = result["breakdown"]
    
    # Map back to mock format
    indicator_list = [
        {
            "id": "cape",
            "name": "CAPE 估值",
            "name_en": "Shiller P/E",
            "value": 37.0,
            "value_display": "37.0x",
            "status": "red" if breakdown["cape"]["score"] > 70 else "orange" if breakdown["cape"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["cape"],
            "severity_pct": breakdown["cape"]["score"],
            "description": "Shiller周期调整市盈率，衡量长期估值水平。",
            "threshold_text": "> 30x: 极端估值区域",
            "data_source": "FRED"
        },
        {
            "id": "aiae",
            "name": "AIAE 投资者配置",
            "name_en": "Household Equity Allocation",
            "value": 0.482,
            "value_display": "0.482",
            "status": "red" if breakdown["aiae"]["score"] > 70 else "orange" if breakdown["aiae"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["aiae"],
            "severity_pct": breakdown["aiae"]["score"],
            "description": "美国家庭和机构总资产中股票的占比。当前处于1945年以来最高位。",
            "threshold_text": "> 0.46: 历史性极端",
            "data_source": "mock"
        },
        {
            "id": "m7_conc",
            "name": "市场集中度",
            "name_en": "M7 Concentration",
            "value": 32.8,
            "value_display": "32.8%",
            "status": "red" if breakdown["m7_concentration"]["score"] > 70 else "orange" if breakdown["m7_concentration"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["m7_concentration"],
            "severity_pct": breakdown["m7_concentration"]["score"],
            "description": "七大巨头(M7)占标普500总市值的比例。",
            "threshold_text": "> 32%: 历史极端",
            "data_source": "mock"
        },
        {
            "id": "vix",
            "name": "VIX 恐慌指数",
            "name_en": "VIX Index",
            "value": 18.1,
            "value_display": "18.1",
            "status": "red" if breakdown["vix"]["score"] > 70 else "orange" if breakdown["vix"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["vix"],
            "severity_pct": breakdown["vix"]["score"],
            "description": "衡量市场预期波动率。极低VIX=过度自满。",
            "threshold_text": "< 15: 警惕过度乐观",
            "data_source": "CBOE"
        },
        {
            "id": "yield_curve",
            "name": "收益率曲线",
            "name_en": "Yield Curve",
            "value": 54,
            "value_display": "54bps",
            "status": "red" if breakdown["yield_curve"]["score"] > 70 else "orange" if breakdown["yield_curve"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["yield_curve"],
            "severity_pct": breakdown["yield_curve"]["score"],
            "description": "10年-2年美债利差。",
            "threshold_text": "< 0: 衰退指标",
            "data_source": "FRED"
        },
        {
            "id": "pe_gap",
            "name": "PE 裂口",
            "name_en": "PE Gap",
            "value": 25.3,
            "value_display": "25.3%",
            "status": "red" if breakdown["pe_gap"]["score"] > 70 else "orange" if breakdown["pe_gap"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["pe_gap"],
            "severity_pct": breakdown["pe_gap"]["score"],
            "description": "TTM PE与Forward PE的差距。",
            "threshold_text": "> 20%: 预期过高",
            "data_source": "mock"
        },
        {
            "id": "spx_trend",
            "name": "趋势位置",
            "name_en": "SPX vs 200MA",
            "value": 8,
            "value_display": "+8%",
            "status": "red" if breakdown["trend"]["score"] > 70 else "orange" if breakdown["trend"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["trend"],
            "severity_pct": breakdown["trend"]["score"],
            "description": "标普500相对于200日均线的位置。",
            "threshold_text": "> 15%: 超买风险",
            "data_source": "mock"
        },
        {
            "id": "erp",
            "name": "权益风险溢价",
            "name_en": "Equity Risk Premium",
            "value": -0.081,
            "value_display": "-0.081",
            "status": "red" if breakdown["erp"]["score"] > 70 else "orange" if breakdown["erp"]["score"] > 40 else "green",
            "weight": OPTIMIZED_WEIGHTS["erp"],
            "severity_pct": breakdown["erp"]["score"],
            "description": "股票相对于10年期国债的超额回报补偿。",
            "threshold_text": "< 0%: 股票昂贵",
            "data_source": "mock"
        }
    ]

    return {
        "vix": 18.1,
        "vix_change": 0.5,
        "yield_curve": "Flat",
        "ten_year_note": 4.5,
        "spx_trend": "Bullish",
        "market_regime": "High Val Dispersion",
        "warning_indicators": {
            "composite_score": result["score"],
            "composite_label": result["signal"],
            "composite_description": "当前市场综合风险评分为 " + str(result["score"]) + "，处于 " + result["signal"] + " 状态。",
            "red_count": len([i for i in indicator_list if i["status"] == "red"]),
            "orange_count": len([i for i in indicator_list if i["status"] == "orange"]),
            "green_count": len([i for i in indicator_list if i["status"] == "green"]),
            "indicators": indicator_list
        },
        "run_risk": {
            "composite_score": result["score"],
            "signal": "red" if result["score"] > 70 else "orange" if result["score"] > 55 else "yellow" if result["score"] > 40 else "green",
            "signal_label": result["signal"],
            "action_label": "建议降仓" if result["score"] > 55 else "建议持有",
            "recommended_position": "20-40%" if result["score"] > 70 else "40-60%" if result["score"] > 55 else "70-90%",
            "evaluation_text": "当前评分 " + str(result["score"]) + "。历史上类似组合出现在1929、1999和2021年。建议降低风险敞口。",
            "action_items": [
                "降低股票头寸至 " + ("20-40%" if result["score"] > 70 else "40-60%"),
                "增加现金或短期国债配置",
                "对冲大科技股敞口",
                "关注趋势线支撑位"
            ],
            "levels": [
                {"range": "0-25",  "min": 0,  "max": 25,  "signal": "安心持有", "color": "#3fb950", "accuracy": "—", "position": "70-90%", "is_current": result["score"] <= 25},
                {"range": "26-50", "min": 26, "max": 50,  "signal": "保持关注", "color": "#d29922", "accuracy": "~60%", "position": "60-75%", "is_current": 25 < result["score"] <= 50},
                {"range": "51-70", "min": 51, "max": 70,  "signal": "降仓",    "color": "#f0883e", "accuracy": "~80%", "position": "40-60%", "is_current": 50 < result["score"] <= 70},
                {"range": "71-85", "min": 71, "max": 85,  "signal": "大幅降仓", "color": "#f85149", "accuracy": "~90%", "position": "20-35%", "is_current": 70 < result["score"] <= 85},
                {"range": "86-100","min": 86, "max": 100, "signal": "清仓",    "color": "#6e7681", "accuracy": "100%", "position": "<20%", "is_current": result["score"] > 85},
            ]
        }
    }
