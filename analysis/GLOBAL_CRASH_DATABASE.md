# GLOBAL CRASH DATABASE (37+ Events)

Comprehensive list of major equity market crashes and systemic events worldwide, used for the statistical validation of the Macro Warning Indicator Model.

## Database Schema

- `id`: Unique identifier (Market_Year)
- `date`: Peak date (YYYY-MM)
- `market`: Primary market affected
- `event`: Event description
- `index`: Representative index
- `peak_to_trough`: Maximum drawdown (%)
- `return_1y`: Forward 1-year return (%)
- `systemic`: True if it triggered a global/broad financial crisis
- `region`: Geographical region
- `data_quality`: `historical` (precise) or `estimated` (derived from reports)

## Event List

| ID | Date | Market | Event | Drawdown | Systemic | Quality |
|----|------|--------|-------|----------|----------|---------|
| USA_1929 | 1929-09 | US | 大萧条前夕 | -86.2% | Yes | Historical |
| USA_1987 | 1987-08 | US | 黑色星期一前夕 | -33.5% | No | Historical |
| JPN_1989 | 1989-12 | JP | 日本资产泡沫顶点 | -63.2% | Yes | Estimated |
| HK_1997 | 1997-08 | HK | 亚洲金融危机-香港 | -58.0% | Yes | Estimated |
| RU_1998 | 1998-07 | RU | 俄罗斯债务危机 | -85.0% | Yes | Estimated |
| USA_1999 | 1999-12 | US | 互联网泡沫顶点 | -49.1% | Yes | Historical |
| EU_2000 | 2000-03 | EU | 欧洲科网泡沫顶点 | -65.0% | Yes | Estimated |
| USA_2007 | 2007-10 | US | 次贷危机前夕 | -56.8% | Yes | Historical |
| GLOBAL_2008 | 2008-09 | GLOBAL | 全球金融危机雷曼 | -54.0% | Yes | Estimated |
| EU_2011 | 2011-02 | EU | 欧债危机顶点 | -35.0% | Yes | Estimated |
| CN_2015 | 2015-06 | CN | A股2015牛市顶 | -45.0% | Yes | Estimated |
| USA_2021 | 2021-12 | US | 后疫情泡沫 | -25.4% | Yes | Historical |

*(Full list contains 37 events across NA, EU, Asia, and EM)*

## Estimated Indicator Values (Sample Logic)

For `estimated` events, indicators are derived using:
1. **Valuation**: Peak P/E ratios vs historical norms.
2. **Volatility**: Realized volatility spikes pre-crash.
3. **Liquidity**: Yield curve spreads and central bank rates.
4. **Sentiment**: Retail participation and margin debt reports.

Full raw data available in `analysis/stat_analysis.py`.
