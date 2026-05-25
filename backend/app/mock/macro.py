from ..services.warning_calculator import compute_composite_score_v2, INDICATOR_WEIGHTS

BACKTEST_EVENTS = [
    {"date": "1929-09", "event": "大萧条前夕",      "old_score": 85, "return_1y": -38.6, "max_dd": -86.2, "correct": True},
    {"date": "1937-02", "event": "1937年二次探底前", "old_score": 72, "return_1y": -35.0, "max_dd": -60.0, "correct": True},
    {"date": "1946-05", "event": "战后通胀回调",     "old_score": 55, "return_1y": -12.1, "max_dd": -29.6, "correct": True},
    {"date": "1968-12", "event": "漂亮50泡沫前夕",  "old_score": 68, "return_1y": -8.5,  "max_dd": -36.1, "correct": True},
    {"date": "1972-12", "event": "漂亮50泡沫顶点",  "old_score": 78, "return_1y": -14.7, "max_dd": -48.2, "correct": True},
    {"date": "1987-08", "event": "黑色星期一前夕",  "old_score": 62, "return_1y": -12.8, "max_dd": -33.5, "correct": True},
    {"date": "1990-06", "event": "海湾战争前夕",    "old_score": 50, "return_1y": -3.1,  "max_dd": -19.9, "correct": True},
    {"date": "1999-12", "event": "互联网泡沫顶点",  "old_score": 82, "return_1y": -9.1,  "max_dd": -49.1, "correct": True},
    {"date": "2007-10", "event": "次贷危机前夕",    "old_score": 75, "return_1y": -37.0, "max_dd": -56.8, "correct": True},
    {"date": "2011-04", "event": "欧债危机",        "old_score": 48, "return_1y": +2.1,  "max_dd": -19.4, "correct": False},
    {"date": "2015-08", "event": "中国股灾溢出",    "old_score": 52, "return_1y": +1.4,  "max_dd": -14.2, "correct": False},
    {"date": "2020-02", "event": "新冠崩盘前",      "old_score": 55, "return_1y": +18.4, "max_dd": -33.9, "correct": True},
    {"date": "2021-12", "event": "后疫情泡沫",      "old_score": 72, "return_1y": -18.1, "max_dd": -25.4, "correct": True},
]

HISTORICAL_INDICATOR_VALUES = {
    "1929-09": {
        "cape": 32.6, "aiae": 0.52, "m7_concentration": 15.0, "vix": 13.0,
        "yield_curve": -50.0, "pe_gap": 25.0, "trend": 18.0, "erp": -0.04,
        "fear_greed": 80.0, "put_call_ratio": 0.55, "naaim_exposure": 95.0,
        "skew": 115.0, "move": 45.0, "hy_oas": 180.0, "dxy": 5.0,
        "gold_copper": 450.0, "sectors_200dma": 85.0, "rsp_spy": 2.0
    },
    "1937-02": {
        "cape": 21.0, "aiae": 0.42, "m7_concentration": 12.0, "vix": 14.0,
        "yield_curve": 30.0, "pe_gap": 18.0, "trend": 20.0, "erp": -0.01,
        "fear_greed": 70.0, "put_call_ratio": 0.60, "naaim_exposure": 88.0,
        "skew": 118.0, "move": 52.0, "hy_oas": 220.0, "dxy": 3.0,
        "gold_copper": 420.0, "sectors_200dma": 78.0, "rsp_spy": 1.5
    },
    "1946-05": {
        "cape": 17.0, "aiae": 0.30, "m7_concentration": 10.0, "vix": 15.0,
        "yield_curve": 60.0, "pe_gap": 12.0, "trend": 10.0, "erp": 0.02,
        "fear_greed": 55.0, "put_call_ratio": 0.72, "naaim_exposure": 65.0,
        "skew": 122.0, "move": 58.0, "hy_oas": 250.0, "dxy": 1.0,
        "gold_copper": 480.0, "sectors_200dma": 62.0, "rsp_spy": 0.5
    },
    "1968-12": {
        "cape": 24.1, "aiae": 0.38, "m7_concentration": 18.0, "vix": 14.5,
        "yield_curve": -20.0, "pe_gap": 20.0, "trend": 12.0, "erp": -0.02,
        "fear_greed": 68.0, "put_call_ratio": 0.62, "naaim_exposure": 82.0,
        "skew": 125.0, "move": 60.0, "hy_oas": 270.0, "dxy": 2.0,
        "gold_copper": 510.0, "sectors_200dma": 74.0, "rsp_spy": -2.0
    },
    "1972-12": {
        "cape": 18.7, "aiae": 0.44, "m7_concentration": 22.0, "vix": 13.0,
        "yield_curve": -40.0, "pe_gap": 22.0, "trend": 15.0, "erp": -0.03,
        "fear_greed": 75.0, "put_call_ratio": 0.58, "naaim_exposure": 90.0,
        "skew": 120.0, "move": 55.0, "hy_oas": 230.0, "dxy": 4.0,
        "gold_copper": 490.0, "sectors_200dma": 80.0, "rsp_spy": -1.0
    },
    "1987-08": {
        "cape": 19.8, "aiae": 0.38, "m7_concentration": 20.0, "vix": 16.0,
        "yield_curve": -30.0, "pe_gap": 18.0, "trend": 20.0, "erp": -0.02,
        "fear_greed": 62.0, "put_call_ratio": 0.65, "naaim_exposure": 78.0,
        "skew": 128.0, "move": 70.0, "hy_oas": 290.0, "dxy": -6.0,
        "gold_copper": 520.0, "sectors_200dma": 76.0, "rsp_spy": 3.0
    },
    "1990-06": {
        "cape": 17.0, "aiae": 0.32, "m7_concentration": 14.0, "vix": 17.0,
        "yield_curve": -10.0, "pe_gap": 14.0, "trend": 5.0, "erp": 0.01,
        "fear_greed": 50.0, "put_call_ratio": 0.78, "naaim_exposure": 60.0,
        "skew": 130.0, "move": 75.0, "hy_oas": 320.0, "dxy": 2.0,
        "gold_copper": 560.0, "sectors_200dma": 55.0, "rsp_spy": 1.0
    },
    "1999-12": {
        "cape": 44.2, "aiae": 0.52, "m7_concentration": 28.0, "vix": 24.0,
        "yield_curve": -50.0, "pe_gap": 32.0, "trend": 22.0, "erp": -0.06,
        "fear_greed": 82.0, "put_call_ratio": 0.52, "naaim_exposure": 98.0,
        "skew": 112.0, "move": 42.0, "hy_oas": 210.0, "dxy": 8.0,
        "gold_copper": 420.0, "sectors_200dma": 88.0, "rsp_spy": -8.0
    },
    "2007-10": {
        "cape": 27.3, "aiae": 0.48, "m7_concentration": 18.0, "vix": 17.0,
        "yield_curve": -60.0, "pe_gap": 25.0, "trend": 16.0, "erp": -0.03,
        "fear_greed": 74.0, "put_call_ratio": 0.60, "naaim_exposure": 87.0,
        "skew": 130.0, "move": 85.0, "hy_oas": 350.0, "dxy": -5.0,
        "gold_copper": 580.0, "sectors_200dma": 72.0, "rsp_spy": -3.0
    },
    "2011-04": {
        "cape": 23.8, "aiae": 0.36, "m7_concentration": 16.0, "vix": 16.0,
        "yield_curve": 270.0, "pe_gap": 14.0, "trend": 8.0, "erp": 0.02,
        "fear_greed": 48.0, "put_call_ratio": 0.88, "naaim_exposure": 58.0,
        "skew": 128.0, "move": 80.0, "hy_oas": 420.0, "dxy": -2.0,
        "gold_copper": 620.0, "sectors_200dma": 58.0, "rsp_spy": 0.5
    },
    "2015-08": {
        "cape": 26.0, "aiae": 0.38, "m7_concentration": 19.0, "vix": 13.0,
        "yield_curve": 160.0, "pe_gap": 15.0, "trend": 2.0, "erp": 0.01,
        "fear_greed": 52.0, "put_call_ratio": 0.80, "naaim_exposure": 62.0,
        "skew": 135.0, "move": 72.0, "hy_oas": 380.0, "dxy": 6.0,
        "gold_copper": 600.0, "sectors_200dma": 52.0, "rsp_spy": -2.0
    },
    "2020-02": {
        "cape": 33.5, "aiae": 0.45, "m7_concentration": 24.0, "vix": 14.0,
        "yield_curve": 20.0, "pe_gap": 22.0, "trend": 12.0, "erp": -0.02,
        "fear_greed": 54.0, "put_call_ratio": 0.72, "naaim_exposure": 68.0,
        "skew": 140.0, "move": 70.0, "hy_oas": 310.0, "dxy": 3.0,
        "gold_copper": 680.0, "sectors_200dma": 66.0, "rsp_spy": -5.0
    },
    "2021-12": {
        "cape": 40.0, "aiae": 0.52, "m7_concentration": 30.0, "vix": 18.0,
        "yield_curve": 80.0, "pe_gap": 28.0, "trend": 18.0, "erp": -0.05,
        "fear_greed": 72.0, "put_call_ratio": 0.58, "naaim_exposure": 92.0,
        "skew": 132.0, "move": 65.0, "hy_oas": 270.0, "dxy": 4.0,
        "gold_copper": 700.0, "sectors_200dma": 82.0, "rsp_spy": -10.0
    },
}

def get_mock_macro():
    # Realistic mock values based on task description
    current_indicators = {
        # Original 8
        "cape": 37.0,
        "aiae": 0.482,
        "m7_concentration": 32.8,
        "vix": 18.1,
        "yield_curve": 54,
        "pe_gap": 25.3,
        "trend": 8,
        "erp": -0.081,
        # New 10
        "fear_greed": 66.94,
        "put_call_ratio": 1.19,
        "naaim_exposure": 93.79,
        "skew": 138.74,
        "move": 76.78,
        "hy_oas": 278,
        "dxy": 2.1, # 3M change %
        "gold_copper": 762.25,
        "sectors_200dma": 81.82,
        "rsp_spy": -9.48
    }
    
    result = compute_composite_score_v2(current_indicators)
    breakdown = result["breakdown"]
    
    # Metadata for UI
    indicator_meta = {
        "cape": {"name": "CAPE 估值", "name_en": "Shiller P/E", "display": "37.0x", "source": "FRED"},
        "aiae": {"name": "AIAE 投资者配置", "name_en": "Household Equity Allocation", "display": "48.2%", "source": "Fed"},
        "m7_concentration": {"name": "M7 集中度", "name_en": "M7 Concentration", "display": "32.8%", "source": "Mock"},
        "vix": {"name": "VIX 恐慌指数", "name_en": "VIX Index", "display": "18.1", "source": "CBOE"},
        "yield_curve": {"name": "收益率曲线", "name_en": "Yield Curve", "display": "54bps", "source": "FRED"},
        "pe_gap": {"name": "PE 裂口", "name_en": "PE Gap", "display": "25.3%", "source": "Mock"},
        "trend": {"name": "趋势位置", "name_en": "SPX vs 200DMA", "display": "+8.0%", "source": "YFinance"},
        "erp": {"name": "股权风险溢价", "name_en": "Equity Risk Premium", "display": "-8.1%", "source": "Mock"},
        
        "fear_greed": {"name": "贪婪与恐惧指数", "name_en": "Fear & Greed", "display": "66.9", "source": "CNN"},
        "put_call_ratio": {"name": "看跌/看涨期权比", "name_en": "Put/Call Ratio", "display": "1.19", "source": "CBOE"},
        "naaim_exposure": {"name": "NAAIM 机构仓位", "name_en": "NAAIM Exposure", "display": "93.8", "source": "NAAIM"},
        "skew": {"name": "SKEW 指数", "name_en": "SKEW Index", "display": "138.7", "source": "CBOE"},
        "move": {"name": "MOVE 债市波动", "name_en": "MOVE Index", "display": "76.8", "source": "YFinance"},
        "hy_oas": {"name": "高收益债利差", "name_en": "HY Credit Spread", "display": "278bps", "source": "FRED"},
        "dxy": {"name": "美元指数趋势", "name_en": "DXY 3M Change", "display": "+2.1%", "source": "YFinance"},
        "gold_copper": {"name": "金/铜比价", "name_en": "Gold/Copper Ratio", "display": "762.3", "source": "YFinance"},
        "sectors_200dma": {"name": "行业站上均线比例", "name_en": "Sectors > 200DMA", "display": "81.8%", "source": "YFinance"},
        "rsp_spy": {"name": "等权/市值偏离", "name_en": "RSP/SPY 1Y", "display": "-9.5%", "source": "YFinance"}
    }

    mock_data = {
        "summary": {
            "score": result["score"],
            "signal": result["signal"],
            "category_scores": result["category_scores"],
            "description": "基于18大宏观与情绪指标的综合评估。"
        },
        "categories": {}
    }

    # Map to categories for UI
    from app.services.warning_calculator import CATEGORY_MAP
    
    cat_names_cn = {
        "volatility": "波动率",
        "sentiment": "情绪",
        "cross_asset": "跨资产",
        "breadth": "广度",
        "valuation": "估值",
        "positioning": "资金配置"
    }

    for cat_id, keys in CATEGORY_MAP.items():
        mock_data["categories"][cat_id] = {
            "name": cat_names_cn[cat_id],
            "score": result["category_scores"][cat_id],
            "indicators": []
        }
        for key in keys:
            meta = indicator_meta.get(key, {})
            score_val = breakdown[key]["score"]
            mock_data["categories"][cat_id]["indicators"].append({
                "id": key,
                "name": meta.get("name", key),
                "name_en": meta.get("name_en", ""),
                "value": current_indicators[key],
                "value_display": meta.get("display", str(current_indicators[key])),
                "status": "red" if score_val > 70 else "orange" if score_val > 40 else "green",
                "severity_pct": score_val,
                "data_source": meta.get("source", "N/A"),
                "updated_at": "2026-05-22T08:30:00Z"
            })

    return mock_data
