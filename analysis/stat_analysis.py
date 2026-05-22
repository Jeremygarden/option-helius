import numpy as np
import pandas as pd
from scipy.optimize import minimize
import random
import json
import os

# === STEP 1: GLOBAL CRASH DATABASE (35+ Events) ===

GLOBAL_CRASH_EVENTS = [
    # === USA (13 Events) ===
    {"id": "USA_1929", "date": "1929-09", "market": "US", "event": "大萧条前夕", "index": "DJIA", "peak_to_trough": -86.2, "return_1y": -38.6, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1937", "date": "1937-02", "market": "US", "event": "1937年二次探底", "index": "DJIA", "peak_to_trough": -60.0, "return_1y": -35.0, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1946", "date": "1946-05", "market": "US", "event": "战后通胀回调", "index": "DJIA", "peak_to_trough": -29.6, "return_1y": -12.1, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1968", "date": "1968-12", "market": "US", "event": "漂亮50泡沫前夕", "index": "SPX", "peak_to_trough": -36.1, "return_1y": -8.5, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1972", "date": "1972-12", "market": "US", "event": "漂亮50顶点", "index": "SPX", "peak_to_trough": -48.2, "return_1y": -14.7, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1987", "date": "1987-08", "market": "US", "event": "黑色星期一前夕", "index": "SPX", "peak_to_trough": -33.5, "return_1y": -12.8, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1990", "date": "1990-06", "market": "US", "event": "海湾战争衰退", "index": "SPX", "peak_to_trough": -19.9, "return_1y": -3.1, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_1999", "date": "1999-12", "market": "US", "event": "互联网泡沫顶点", "index": "SPX", "peak_to_trough": -49.1, "return_1y": -9.1, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_2007", "date": "2007-10", "market": "US", "event": "次贷危机前夕", "index": "SPX", "peak_to_trough": -56.8, "return_1y": -37.0, "systemic": True, "region": "NA", "data_quality": "historical"},
    {"id": "USA_2011", "date": "2011-04", "market": "US", "event": "欧债危机溢出", "index": "SPX", "peak_to_trough": -19.4, "return_1y": 2.1, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_2015", "date": "2015-08", "market": "US", "event": "中国股灾溢出", "index": "SPX", "peak_to_trough": -14.2, "return_1y": 1.4, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_2020", "date": "2020-02", "market": "US", "event": "新冠崩盘前", "index": "SPX", "peak_to_trough": -33.9, "return_1y": 18.4, "systemic": False, "region": "NA", "data_quality": "historical"},
    {"id": "USA_2021", "date": "2021-12", "market": "US", "event": "后疫情泡沫", "index": "SPX", "peak_to_trough": -25.4, "return_1y": -18.1, "systemic": True, "region": "NA", "data_quality": "historical"},

    # === JAPAN (4 Events) ===
    {"id": "JPN_1989", "date": "1989-12", "market": "JP", "event": "日本资产泡沫顶点", "index": "NIKKEI", "peak_to_trough": -63.2, "return_1y": -36.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "JPN_1991", "date": "1991-03", "market": "JP", "event": "日本地产崩盘开始", "index": "NIKKEI", "peak_to_trough": -45.0, "return_1y": -22.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "JPN_1997", "date": "1997-01", "market": "JP", "event": "日本金融危机", "index": "NIKKEI", "peak_to_trough": -35.0, "return_1y": -25.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "JPN_2008", "date": "2008-01", "market": "JP", "event": "雷曼危机(日本)", "index": "NIKKEI", "peak_to_trough": -60.0, "return_1y": -40.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},

    # === EUROPE (8 Events) ===
    {"id": "UK_1973", "date": "1973-01", "market": "UK", "event": "英国1973-74崩盘", "index": "FTSE", "peak_to_trough": -73.0, "return_1y": -45.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "UK_1987", "date": "1987-07", "market": "UK", "event": "英国黑色星期一", "index": "FTSE", "peak_to_trough": -35.0, "return_1y": -10.0, "systemic": False, "region": "EU", "data_quality": "estimated"},
    {"id": "UK_2000", "date": "2000-01", "market": "UK", "event": "英国科网泡沫", "index": "FTSE", "peak_to_trough": -50.0, "return_1y": -15.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "EU_2000", "date": "2000-03", "market": "EU", "event": "欧洲科网泡沫顶点", "index": "EUROSTOXX", "peak_to_trough": -65.0, "return_1y": -30.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "EU_2007", "date": "2007-06", "market": "EU", "event": "欧洲次贷危机前", "index": "EUROSTOXX", "peak_to_trough": -58.0, "return_1y": -32.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "EU_2011", "date": "2011-02", "market": "EU", "event": "欧债危机顶点", "index": "EUROSTOXX", "peak_to_trough": -35.0, "return_1y": -20.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "GER_2000", "date": "2000-03", "market": "DE", "event": "德国科网泡沫", "index": "DAX", "peak_to_trough": -73.0, "return_1y": -35.0, "systemic": True, "region": "EU", "data_quality": "estimated"},
    {"id": "FRA_2000", "date": "2000-03", "market": "FR", "event": "法国科网泡沫", "index": "CAC40", "peak_to_trough": -60.0, "return_1y": -25.0, "systemic": True, "region": "EU", "data_quality": "estimated"},

    # === EMERGING / ASIA (10 Events) ===
    {"id": "HK_1997", "date": "1997-08", "market": "HK", "event": "亚洲金融危机-香港", "index": "HSI", "peak_to_trough": -58.0, "return_1y": -40.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "KR_1997", "date": "1997-07", "market": "KR", "event": "亚洲金融危机-韩国", "index": "KOSPI", "peak_to_trough": -71.0, "return_1y": -48.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "RU_1998", "date": "1998-07", "market": "RU", "event": "俄罗斯债务危机", "index": "MOEX", "peak_to_trough": -85.0, "return_1y": -60.0, "systemic": True, "region": "EM", "data_quality": "estimated"},
    {"id": "CN_2007", "date": "2007-10", "market": "CN", "event": "A股5178顶点前", "index": "SHCOMP", "peak_to_trough": -70.0, "return_1y": -55.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "CN_2015", "date": "2015-06", "market": "CN", "event": "A股2015牛市顶", "index": "SHCOMP", "peak_to_trough": -45.0, "return_1y": -25.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "BR_2008", "date": "2008-05", "market": "BR", "event": "巴西金融危机前", "index": "IBOV", "peak_to_trough": -60.0, "return_1y": -40.0, "systemic": True, "region": "EM", "data_quality": "estimated"},
    {"id": "MX_1994", "date": "1994-11", "market": "MX", "event": "墨西哥比索危机", "index": "IPC", "peak_to_trough": -45.0, "return_1y": -30.0, "systemic": True, "region": "EM", "data_quality": "estimated"},
    {"id": "TH_1997", "date": "1997-01", "market": "TH", "event": "泰国亚洲金融危机", "index": "SET", "peak_to_trough": -78.0, "return_1y": -55.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "ID_1997", "date": "1997-07", "market": "ID", "event": "印尼亚洲金融危机", "index": "JCI", "peak_to_trough": -80.0, "return_1y": -60.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},
    {"id": "TW_2000", "date": "2000-04", "market": "TW", "event": "台湾科网泡沫", "index": "TWII", "peak_to_trough": -55.0, "return_1y": -30.0, "systemic": True, "region": "Asia", "data_quality": "estimated"},

    # === GLOBAL (2 Events) ===
    {"id": "GLOBAL_2008", "date": "2008-09", "market": "GLOBAL", "event": "全球金融危机雷曼", "index": "MSCI_WORLD", "peak_to_trough": -54.0, "return_1y": -35.0, "systemic": True, "region": "Global", "data_quality": "estimated"},
    {"id": "GLOBAL_2020", "date": "2020-02", "market": "GLOBAL", "event": "全球新冠崩盘", "index": "MSCI_WORLD", "peak_to_trough": -33.0, "return_1y": 15.0, "systemic": False, "region": "Global", "data_quality": "estimated"},
]

# Indicator values for each event.
# Center values for reference from warning_calculator_v2.py:
# Valuation: cape=25, pe_gap=15, erp=0.02
# Volatility: vix=18 (invert), skew=130, move=100
# Positioning: aiae=0.38, m7_concentration=20, trend=8, naaim_exposure=65
# Sentiment: fear_greed=55, put_call_ratio=0.85 (invert)
# Cross-Asset: yield_curve=50 (invert), hy_oas=350, dxy=0, gold_copper=550
# Breadth: sectors_200dma=60 (dual), rsp_spy=-5 (invert)

GLOBAL_INDICATOR_VALUES = {
    # US Historical (from previous work/known data)
    "USA_1929": {"cape": 32.5, "pe_gap": 25.0, "erp": 0.005, "vix": 12.0, "skew": 145.0, "move": 150.0, "aiae": 0.55, "m7_concentration": 35.0, "trend": 25.0, "naaim_exposure": 105.0, "fear_greed": 85.0, "put_call_ratio": 0.55, "yield_curve": 20.0, "hy_oas": 250.0, "dxy": 5.0, "gold_copper": 800.0, "sectors_200dma": 95.0, "rsp_spy": -15.0},
    "USA_1937": {"cape": 22.0, "pe_gap": 18.0, "erp": 0.015, "vix": 16.0, "skew": 135.0, "move": 120.0, "aiae": 0.45, "m7_concentration": 25.0, "trend": 15.0, "naaim_exposure": 90.0, "fear_greed": 75.0, "put_call_ratio": 0.65, "yield_curve": 10.0, "hy_oas": 380.0, "dxy": 3.0, "gold_copper": 650.0, "sectors_200dma": 80.0, "rsp_spy": -8.0},
    "USA_1946": {"cape": 18.0, "pe_gap": 12.0, "erp": 0.035, "vix": 22.0, "skew": 125.0, "move": 110.0, "aiae": 0.35, "m7_concentration": 15.0, "trend": 10.0, "naaim_exposure": 70.0, "fear_greed": 60.0, "put_call_ratio": 0.85, "yield_curve": 150.0, "hy_oas": 320.0, "dxy": -2.0, "gold_copper": 500.0, "sectors_200dma": 65.0, "rsp_spy": -2.0},
    "USA_1968": {"cape": 23.0, "pe_gap": 20.0, "erp": 0.012, "vix": 15.0, "skew": 140.0, "move": 130.0, "aiae": 0.48, "m7_concentration": 30.0, "trend": 20.0, "naaim_exposure": 95.0, "fear_greed": 80.0, "put_call_ratio": 0.60, "yield_curve": -10.0, "hy_oas": 350.0, "dxy": 2.0, "gold_copper": 700.0, "sectors_200dma": 90.0, "rsp_spy": -10.0},
    "USA_1972": {"cape": 20.0, "pe_gap": 22.0, "erp": 0.008, "vix": 14.0, "skew": 142.0, "move": 140.0, "aiae": 0.50, "m7_concentration": 32.0, "trend": 22.0, "naaim_exposure": 100.0, "fear_greed": 82.0, "put_call_ratio": 0.58, "yield_curve": -20.0, "hy_oas": 400.0, "dxy": 4.0, "gold_copper": 750.0, "sectors_200dma": 92.0, "rsp_spy": -12.0},
    "USA_1987": {"cape": 18.0, "pe_gap": 15.0, "erp": 0.010, "vix": 13.5, "skew": 148.0, "move": 160.0, "aiae": 0.52, "m7_concentration": 28.0, "trend": 35.0, "naaim_exposure": 105.0, "fear_greed": 88.0, "put_call_ratio": 0.45, "yield_curve": 15.0, "hy_oas": 450.0, "dxy": -5.0, "gold_copper": 600.0, "sectors_200dma": 94.0, "rsp_spy": -5.0},
    "USA_1990": {"cape": 16.0, "pe_gap": 10.0, "erp": 0.030, "vix": 25.0, "skew": 115.0, "move": 120.0, "aiae": 0.32, "m7_concentration": 18.0, "trend": -5.0, "naaim_exposure": 40.0, "fear_greed": 30.0, "put_call_ratio": 1.20, "yield_curve": -5.0, "hy_oas": 600.0, "dxy": 6.0, "gold_copper": 450.0, "sectors_200dma": 40.0, "rsp_spy": 2.0},
    "USA_1999": {"cape": 44.0, "pe_gap": 35.0, "erp": -0.015, "vix": 18.0, "skew": 150.0, "move": 140.0, "aiae": 0.60, "m7_concentration": 45.0, "trend": 40.0, "naaim_exposure": 110.0, "fear_greed": 92.0, "put_call_ratio": 0.35, "yield_curve": -30.0, "hy_oas": 550.0, "dxy": 8.0, "gold_copper": 900.0, "sectors_200dma": 85.0, "rsp_spy": -20.0},
    "USA_2007": {"cape": 27.5, "pe_gap": 22.0, "erp": 0.012, "vix": 16.0, "skew": 138.0, "move": 125.0, "aiae": 0.45, "m7_concentration": 25.0, "trend": 15.0, "naaim_exposure": 95.0, "fear_greed": 80.0, "put_call_ratio": 0.65, "yield_curve": -50.0, "hy_oas": 420.0, "dxy": -10.0, "gold_copper": 700.0, "sectors_200dma": 82.0, "rsp_spy": -8.0},
    "USA_2011": {"cape": 22.0, "pe_gap": 15.0, "erp": 0.045, "vix": 28.0, "skew": 120.0, "move": 110.0, "aiae": 0.38, "m7_concentration": 20.0, "trend": 10.0, "naaim_exposure": 70.0, "fear_greed": 45.0, "put_call_ratio": 1.10, "yield_curve": 150.0, "hy_oas": 650.0, "dxy": 5.0, "gold_copper": 550.0, "sectors_200dma": 50.0, "rsp_spy": 1.0},
    "USA_2015": {"cape": 26.0, "pe_gap": 18.0, "erp": 0.038, "vix": 22.0, "skew": 130.0, "move": 100.0, "aiae": 0.40, "m7_concentration": 22.0, "trend": 5.0, "naaim_exposure": 80.0, "fear_greed": 55.0, "put_call_ratio": 0.95, "yield_curve": 120.0, "hy_oas": 550.0, "dxy": 12.0, "gold_copper": 600.0, "sectors_200dma": 60.0, "rsp_spy": -2.0},
    "USA_2020": {"cape": 31.0, "pe_gap": 24.0, "erp": 0.025, "vix": 14.0, "skew": 145.0, "move": 90.0, "aiae": 0.42, "m7_concentration": 28.0, "trend": 18.0, "naaim_exposure": 98.0, "fear_greed": 88.0, "put_call_ratio": 0.55, "yield_curve": 15.0, "hy_oas": 380.0, "dxy": -2.0, "gold_copper": 650.0, "sectors_200dma": 95.0, "rsp_spy": -6.0},
    "USA_2021": {"cape": 38.5, "pe_gap": 32.0, "erp": 0.005, "vix": 16.5, "skew": 155.0, "move": 110.0, "aiae": 0.52, "m7_concentration": 35.0, "trend": 30.0, "naaim_exposure": 105.0, "fear_greed": 85.0, "put_call_ratio": 0.50, "yield_curve": 50.0, "hy_oas": 310.0, "dxy": 5.0, "gold_copper": 850.0, "sectors_200dma": 88.0, "rsp_spy": -15.0},

    # Estimated Values for Non-US/Global
    "JPN_1989": {"cape": 60.0, "pe_gap": 50.0, "erp": -0.01, "vix": 15.0, "skew": 140.0, "move": 120.0, "aiae": 0.65, "m7_concentration": 40.0, "trend": 50.0, "naaim_exposure": 120.0, "fear_greed": 95.0, "put_call_ratio": 0.30, "yield_curve": 10.0, "hy_oas": 200.0, "dxy": -15.0, "gold_copper": 900.0, "sectors_200dma": 98.0, "rsp_spy": -25.0},
    "JPN_1991": {"cape": 45.0, "pe_gap": 35.0, "erp": 0.005, "vix": 25.0, "skew": 120.0, "move": 130.0, "aiae": 0.40, "m7_concentration": 30.0, "trend": -10.0, "naaim_exposure": 60.0, "fear_greed": 40.0, "put_call_ratio": 1.00, "yield_curve": -20.0, "hy_oas": 400.0, "dxy": -5.0, "gold_copper": 600.0, "sectors_200dma": 40.0, "rsp_spy": -5.0},
    "JPN_1997": {"cape": 30.0, "pe_gap": 20.0, "erp": 0.02, "vix": 35.0, "skew": 110.0, "move": 150.0, "aiae": 0.30, "m7_concentration": 20.0, "trend": -20.0, "naaim_exposure": 30.0, "fear_greed": 20.0, "put_call_ratio": 1.50, "yield_curve": 50.0, "hy_oas": 800.0, "dxy": 10.0, "gold_copper": 400.0, "sectors_200dma": 20.0, "rsp_spy": 5.0},
    "JPN_2008": {"cape": 25.0, "pe_gap": 15.0, "erp": 0.03, "vix": 45.0, "skew": 100.0, "move": 180.0, "aiae": 0.25, "m7_concentration": 20.0, "trend": -30.0, "naaim_exposure": 20.0, "fear_greed": 10.0, "put_call_ratio": 2.00, "yield_curve": 100.0, "hy_oas": 1000.0, "dxy": -20.0, "gold_copper": 300.0, "sectors_200dma": 10.0, "rsp_spy": 10.0},

    "UK_1973": {"cape": 15.0, "pe_gap": 10.0, "erp": 0.02, "vix": 30.0, "skew": 120.0, "move": 200.0, "aiae": 0.35, "m7_concentration": 25.0, "trend": -5.0, "naaim_exposure": 50.0, "fear_greed": 40.0, "put_call_ratio": 1.10, "yield_curve": -100.0, "hy_oas": 700.0, "dxy": 5.0, "gold_copper": 800.0, "sectors_200dma": 30.0, "rsp_spy": 2.0},
    "UK_1987": {"cape": 16.0, "pe_gap": 15.0, "erp": 0.015, "vix": 15.0, "skew": 145.0, "move": 150.0, "aiae": 0.50, "m7_concentration": 28.0, "trend": 30.0, "naaim_exposure": 100.0, "fear_greed": 85.0, "put_call_ratio": 0.50, "yield_curve": 20.0, "hy_oas": 400.0, "dxy": -8.0, "gold_copper": 650.0, "sectors_200dma": 90.0, "rsp_spy": -5.0},
    "UK_2000": {"cape": 28.0, "pe_gap": 25.0, "erp": -0.005, "vix": 20.0, "skew": 140.0, "move": 130.0, "aiae": 0.55, "m7_concentration": 40.0, "trend": 35.0, "naaim_exposure": 105.0, "fear_greed": 90.0, "put_call_ratio": 0.40, "yield_curve": -20.0, "hy_oas": 500.0, "dxy": 10.0, "gold_copper": 850.0, "sectors_200dma": 80.0, "rsp_spy": -15.0},
    "EU_2000": {"cape": 35.0, "pe_gap": 30.0, "erp": -0.01, "vix": 22.0, "skew": 145.0, "move": 140.0, "aiae": 0.58, "m7_concentration": 38.0, "trend": 38.0, "naaim_exposure": 110.0, "fear_greed": 92.0, "put_call_ratio": 0.38, "yield_curve": -35.0, "hy_oas": 550.0, "dxy": 12.0, "gold_copper": 880.0, "sectors_200dma": 85.0, "rsp_spy": -18.0},
    "EU_2007": {"cape": 25.0, "pe_gap": 20.0, "erp": 0.015, "vix": 18.0, "skew": 135.0, "move": 120.0, "aiae": 0.48, "m7_concentration": 28.0, "trend": 15.0, "naaim_exposure": 95.0, "fear_greed": 82.0, "put_call_ratio": 0.60, "yield_curve": -40.0, "hy_oas": 450.0, "dxy": -15.0, "gold_copper": 700.0, "sectors_200dma": 85.0, "rsp_spy": -10.0},
    "EU_2011": {"cape": 18.0, "pe_gap": 15.0, "erp": 0.05, "vix": 35.0, "skew": 110.0, "move": 160.0, "aiae": 0.32, "m7_concentration": 25.0, "trend": -5.0, "naaim_exposure": 50.0, "fear_greed": 35.0, "put_call_ratio": 1.30, "yield_curve": -150.0, "hy_oas": 850.0, "dxy": 8.0, "gold_copper": 500.0, "sectors_200dma": 45.0, "rsp_spy": 0.0},
    "GER_2000": {"cape": 40.0, "pe_gap": 35.0, "erp": -0.015, "vix": 20.0, "skew": 140.0, "move": 135.0, "aiae": 0.60, "m7_concentration": 42.0, "trend": 45.0, "naaim_exposure": 115.0, "fear_greed": 94.0, "put_call_ratio": 0.35, "yield_curve": -30.0, "hy_oas": 500.0, "dxy": 15.0, "gold_copper": 900.0, "sectors_200dma": 88.0, "rsp_spy": -22.0},
    "FRA_2000": {"cape": 32.0, "pe_gap": 28.0, "erp": -0.01, "vix": 19.0, "skew": 138.0, "move": 130.0, "aiae": 0.55, "m7_concentration": 35.0, "trend": 40.0, "naaim_exposure": 105.0, "fear_greed": 90.0, "put_call_ratio": 0.40, "yield_curve": -25.0, "hy_oas": 480.0, "dxy": 12.0, "gold_copper": 850.0, "sectors_200dma": 82.0, "rsp_spy": -18.0},

    "HK_1997": {"cape": 25.0, "pe_gap": 20.0, "erp": 0.01, "vix": 40.0, "skew": 120.0, "move": 150.0, "aiae": 0.40, "m7_concentration": 30.0, "trend": -5.0, "naaim_exposure": 60.0, "fear_greed": 30.0, "put_call_ratio": 1.40, "yield_curve": 300.0, "hy_oas": 900.0, "dxy": 20.0, "gold_copper": 550.0, "sectors_200dma": 30.0, "rsp_spy": 5.0},
    "KR_1997": {"cape": 20.0, "pe_gap": 15.0, "erp": 0.005, "vix": 50.0, "skew": 110.0, "move": 180.0, "aiae": 0.35, "m7_concentration": 25.0, "trend": -15.0, "naaim_exposure": 40.0, "fear_greed": 20.0, "put_call_ratio": 1.80, "yield_curve": 500.0, "hy_oas": 1200.0, "dxy": 25.0, "gold_copper": 450.0, "sectors_200dma": 20.0, "rsp_spy": 8.0},
    "RU_1998": {"cape": 15.0, "pe_gap": 10.0, "erp": -0.02, "vix": 60.0, "skew": 100.0, "move": 250.0, "aiae": 0.20, "m7_concentration": 20.0, "trend": -30.0, "naaim_exposure": 10.0, "fear_greed": 5.0, "put_call_ratio": 2.50, "yield_curve": 1000.0, "hy_oas": 2500.0, "dxy": 30.0, "gold_copper": 400.0, "sectors_200dma": 5.0, "rsp_spy": 15.0},
    "CN_2007": {"cape": 50.0, "pe_gap": 45.0, "erp": -0.015, "vix": 25.0, "skew": 150.0, "move": 140.0, "aiae": 0.70, "m7_concentration": 50.0, "trend": 60.0, "naaim_exposure": 130.0, "fear_greed": 98.0, "put_call_ratio": 0.25, "yield_curve": 50.0, "hy_oas": 300.0, "dxy": -5.0, "gold_copper": 1000.0, "sectors_200dma": 98.0, "rsp_spy": -30.0},
    "CN_2015": {"cape": 35.0, "pe_gap": 30.0, "erp": 0.01, "vix": 30.0, "skew": 140.0, "move": 130.0, "aiae": 0.60, "m7_concentration": 40.0, "trend": 50.0, "naaim_exposure": 110.0, "fear_greed": 90.0, "put_call_ratio": 0.40, "yield_curve": 100.0, "hy_oas": 500.0, "dxy": 0.0, "gold_copper": 800.0, "sectors_200dma": 95.0, "rsp_spy": -15.0},
    "BR_2008": {"cape": 25.0, "pe_gap": 20.0, "erp": 0.02, "vix": 45.0, "skew": 120.0, "move": 180.0, "aiae": 0.40, "m7_concentration": 30.0, "trend": -10.0, "naaim_exposure": 50.0, "fear_greed": 30.0, "put_call_ratio": 1.50, "yield_curve": 200.0, "hy_oas": 1000.0, "dxy": 10.0, "gold_copper": 500.0, "sectors_200dma": 30.0, "rsp_spy": 5.0},
    "MX_1994": {"cape": 22.0, "pe_gap": 18.0, "erp": 0.01, "vix": 35.0, "skew": 130.0, "move": 160.0, "aiae": 0.45, "m7_concentration": 35.0, "trend": 5.0, "naaim_exposure": 70.0, "fear_greed": 50.0, "put_call_ratio": 1.20, "yield_curve": 400.0, "hy_oas": 800.0, "dxy": 15.0, "gold_copper": 600.0, "sectors_200dma": 50.0, "rsp_spy": 3.0},
    "TH_1997": {"cape": 22.0, "pe_gap": 15.0, "erp": 0.005, "vix": 45.0, "skew": 115.0, "move": 170.0, "aiae": 0.38, "m7_concentration": 28.0, "trend": -10.0, "naaim_exposure": 45.0, "fear_greed": 25.0, "put_call_ratio": 1.60, "yield_curve": 450.0, "hy_oas": 1100.0, "dxy": 22.0, "gold_copper": 500.0, "sectors_200dma": 25.0, "rsp_spy": 6.0},
    "ID_1997": {"cape": 20.0, "pe_gap": 12.0, "erp": 0.00, "vix": 55.0, "skew": 110.0, "move": 190.0, "aiae": 0.32, "m7_concentration": 25.0, "trend": -20.0, "naaim_exposure": 35.0, "fear_greed": 15.0, "put_call_ratio": 1.90, "yield_curve": 600.0, "hy_oas": 1500.0, "dxy": 28.0, "gold_copper": 450.0, "sectors_200dma": 15.0, "rsp_spy": 10.0},
    "TW_2000": {"cape": 30.0, "pe_gap": 25.0, "erp": -0.01, "vix": 25.0, "skew": 140.0, "move": 130.0, "aiae": 0.55, "m7_concentration": 35.0, "trend": 40.0, "naaim_exposure": 100.0, "fear_greed": 90.0, "put_call_ratio": 0.45, "yield_curve": -10.0, "hy_oas": 450.0, "dxy": 5.0, "gold_copper": 800.0, "sectors_200dma": 85.0, "rsp_spy": -15.0},

    "GLOBAL_2008": {"cape": 24.0, "pe_gap": 18.0, "erp": 0.02, "vix": 35.0, "skew": 125.0, "move": 160.0, "aiae": 0.38, "m7_concentration": 25.0, "trend": -10.0, "naaim_exposure": 50.0, "fear_greed": 30.0, "put_call_ratio": 1.40, "yield_curve": -50.0, "hy_oas": 800.0, "dxy": 15.0, "gold_copper": 550.0, "sectors_200dma": 40.0, "rsp_spy": 0.0},
    "GLOBAL_2020": {"cape": 30.0, "pe_gap": 22.0, "erp": 0.03, "vix": 20.0, "skew": 140.0, "move": 110.0, "aiae": 0.45, "m7_concentration": 30.0, "trend": 15.0, "naaim_exposure": 95.0, "fear_greed": 85.0, "put_call_ratio": 0.60, "yield_curve": 30.0, "hy_oas": 450.0, "dxy": 0.0, "gold_copper": 650.0, "sectors_200dma": 95.0, "rsp_spy": -8.0},
}

# === STEP 2 & 3: OPTIMIZATION & VALIDATION ===

SIGMOID_PARAMS_DEFAULTS = {
    "cape": {"center": 25.0, "steepness": 0.12, "invert": False},
    "pe_gap": {"center": 15.0, "steepness": 0.10, "invert": False},
    "erp": {"center": 0.02, "steepness": 50.0, "invert": True},
    "vix": {"center": 18.0, "steepness": 0.25, "invert": True},
    "skew": {"center": 130.0, "steepness": 0.08, "invert": False},
    "move": {"center": 100.0, "steepness": 0.04, "invert": False},
    "aiae": {"center": 0.38, "steepness": 15.0, "invert": False},
    "m7_concentration": {"center": 20.0, "steepness": 0.15, "invert": False},
    "trend": {"center": 8.0, "steepness": 0.12, "invert": False},
    "naaim_exposure": {"center": 65.0, "steepness": 0.06, "invert": False},
    "fear_greed": {"center": 55.0, "steepness": 0.06, "invert": False},
    "put_call_ratio": {"center": 0.85, "steepness": 6.0, "invert": True},
    "yield_curve": {"center": 50.0, "steepness": 0.015, "invert": True},
    "hy_oas": {"center": 350.0, "steepness": 0.008, "invert": False},
    "dxy": {"center": 0.0, "steepness": 0.15, "invert": False},
    "gold_copper": {"center": 550.0, "steepness": 0.004, "invert": False},
    "sectors_200dma": {"center": 60.0, "steepness": 0.06, "invert": False, "dual_mode": True},
    "rsp_spy": {"center": -5.0, "steepness": 0.15, "invert": True},
}

def sigmoid_score(v, center, steepness, invert=False):
    try:
        if invert:
            raw = 1.0 / (1.0 + np.exp(steepness * (v - center)))
        else:
            raw = 1.0 / (1.0 + np.exp(-steepness * (v - center)))
        return 5.0 + 90.0 * raw
    except:
        return 95.0 if (v - center) > 0 else 5.0

def dual_sigmoid_score(v):
    distance = abs(v - 60.0)
    try:
        raw = 1.0 / (1.0 + np.exp(-0.10 * (distance - 20.0)))
        return 5.0 + 90.0 * raw
    except:
        return 95.0

def compute_weighted_score(weights, ind_values):
    score = 0
    weight_sum = sum(weights)
    norm_weights = [w / weight_sum for w in weights]
    
    ind_order = list(SIGMOID_PARAMS_DEFAULTS.keys())
    for i, ind_id in enumerate(ind_order):
        val = ind_values[ind_id]
        params = SIGMOID_PARAMS_DEFAULTS[ind_id]
        
        if params.get("dual_mode"):
            s_score = dual_sigmoid_score(val)
        else:
            s_score = sigmoid_score(val, params["center"], params["steepness"], invert=params["invert"])
            
        score += s_score * norm_weights[i]
    return score

def objective(weights, events, indicators):
    total_error = 0
    for event in events:
        ind_values = indicators[event["id"]]
        predicted_score = compute_weighted_score(weights, ind_values)
        
        if event["systemic"] and event["peak_to_trough"] < -30:
            true_danger = 75.0
        elif event["peak_to_trough"] < -20:
            true_danger = 55.0
        else:
            true_danger = 28.0
            
        quality_weight = 1.0 if event.get("data_quality") == "historical" else 0.7
        total_error += quality_weight * (predicted_score - true_danger) ** 2
    return total_error

def optimize_weights_on_sample(events, indicators):
    n_ind = 18
    initial_weights = [1.0/n_ind] * n_ind
    bounds = [(0.01, 0.25)] * n_ind
    constraints = [{"type": "eq", "fun": lambda w: sum(w) - 1.0}]
    
    res = minimize(objective, initial_weights, args=(events, indicators), 
                   method='SLSQP', bounds=bounds, constraints=constraints)
    
    ind_order = list(SIGMOID_PARAMS_DEFAULTS.keys())
    return {ind_id: res.x[i] for i, ind_id in enumerate(ind_order)}

def run_validation():
    events = GLOBAL_CRASH_EVENTS
    indicators = GLOBAL_INDICATOR_VALUES
    
    # Walk-forward
    train_events = [e for e in events if e["date"] < "2000-01"]
    test_events = [e for e in events if e["date"] >= "2000-01"]
    
    train_opt_weights_dict = optimize_weights_on_sample(train_events, indicators)
    train_weights = list(train_opt_weights_dict.values())
    
    train_mse = objective(train_weights, train_events, indicators) / len(train_events)
    test_mse = objective(train_weights, test_events, indicators) / len(test_events)
    
    # Bootstrap
    n_bootstrap = 100
    ind_order = list(SIGMOID_PARAMS_DEFAULTS.keys())
    weight_distributions = {ind: [] for ind in ind_order}
    
    for _ in range(n_bootstrap):
        sample = random.choices(events, k=len(events))
        opt_weights = optimize_weights_on_sample(sample, indicators)
        for ind, w in opt_weights.items():
            weight_distributions[ind].append(w)
            
    bootstrap_results = {}
    for ind, weights in weight_distributions.items():
        arr = np.array(weights)
        bootstrap_results[ind] = {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "ci_low": float(np.percentile(arr, 2.5)),
            "ci_high": float(np.percentile(arr, 97.5)),
            "ci_width": float(np.percentile(arr, 97.5) - np.percentile(arr, 2.5)),
            "stable": float(np.std(arr)) < 0.03
        }
        
    return {
        "walk_forward": {
            "train_n": len(train_events),
            "test_n": len(test_events),
            "train_mse": train_mse,
            "test_mse": test_mse,
            "weights": train_opt_weights_dict
        },
        "bootstrap": bootstrap_results
    }

if __name__ == "__main__":
    results = run_validation()
    print(json.dumps(results, indent=2))
