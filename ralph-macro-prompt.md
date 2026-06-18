# Macro Indicators Real Data Integration — 18 Indicators Daily Refresh

## Context
option-helius macro dashboard currently shows hardcoded mock data in the frontend.
Backend has `indicator_refresh.py` with 8 indicators configured but fetch functions are stubs returning mock values.
Goal: implement real data fetching for all 18 indicators with daily auto-refresh.

## Reference files (read before starting)
- `/home/azureuser/projects/options-dashboard/backend/app/services/indicator_refresh.py`
- `/home/azureuser/projects/options-dashboard/backend/app/routers/macro.py`
- `/home/azureuser/projects/options-dashboard/frontend/app/macro/page.tsx` (to understand data shape expected)
- `/home/azureuser/projects/options-dashboard/frontend/components/macro/RunRiskPanel.tsx` (full 18-indicator list)

## 18 Indicators & Their Real Data Sources

| id | source | method |
|---|---|---|
| vix | CBOE via yfinance `^VIX` | yfinance, daily |
| yield_curve | FRED `T10Y2Y` | fredapi, daily |
| trend | yfinance `^GSPC` + 200MA calc | yfinance, daily |
| erp | FRED `GS10` + yfinance earnings yield | computed daily |
| cape | multpl.com scrape OR FRED `CAPE` | scrape/FRED, monthly |
| aiae | FRED `BOGZ1FL153064476Q` | fredapi, quarterly |
| m7_concentration | yfinance SPY top-10 holdings calc | yfinance weekly |
| pe_gap | yfinance `^GSPC` TTM PE vs forward | yfinance, weekly |
| move | yfinance `^MOVE` | yfinance, daily |
| hy_oas | FRED `BAMLH0A0HYM2` | fredapi, daily |
| gold_copper | yfinance `GC=F` / `HG=F` ratio | yfinance, daily |
| dxy | yfinance `DX-Y.NYB` | yfinance, daily |
| naaim_exposure | naaim.org weekly CSV | HTTP fetch, weekly |
| fear_greed | alternative.me API | HTTP GET, daily |
| sectors_200dma | yfinance 11 sector ETFs (XLK,XLF,XLE,XLV,XLI,XLC,XLY,XLP,XLRE,XLB,XLU) | yfinance, daily |
| skew | yfinance `^SKEW` | yfinance, daily |
| put_call_ratio | CBOE daily report CSV | HTTP fetch, daily |
| rsp_spy | yfinance `RSP`/`SPY` ratio | yfinance, daily |

## This Round's Focus
Check `git log --oneline -40` first to see what feat(macro-round-*) commits exist.
Pick the NEXT incomplete area from the list below.

### Round Areas:

**Round 1 — Dependencies & Config**
Add to `backend/requirements.txt`: `fredapi>=0.5.0`, `beautifulsoup4>=4.12.0`, `lxml>=5.0.0`
Add to `backend/app/core/config.py`: `FRED_API_KEY: str = ""` env var (empty = skip FRED, use yfinance fallback)

**Round 2 — Core fetch utilities**
Create `backend/app/services/macro_fetchers.py`:
- `async def fetch_yfinance(ticker, period="5d", key="Close")` — thin async wrapper around yf.download
- `async def fetch_fred(series_id)` — uses fredapi with FRED_API_KEY; falls back to FRED public CSV if no key
- `async def fetch_http_json(url, path=None)` — GET + optional jq-style key path
- `async def fetch_http_csv(url, col_index=0, row_index=-1)` — GET CSV, return cell value

**Round 3 — Daily indicators (vix, yield_curve, trend, erp)**
In `indicator_refresh.py`, implement real fetch functions:
```python
async def fetch_vix(self): # yfinance ^VIX latest close
async def fetch_yield_curve(self): # FRED T10Y2Y or yfinance ^TNX - ^IRX
async def fetch_trend(self): # yfinance ^GSPC, calc (close - ma200) / ma200 * 100
async def fetch_erp(self): # earnings_yield(^GSPC) - FRED GS10
```
Each returns `{"value": float, "updated_at": iso_str, "source": str}`

**Round 4 — Daily indicators (move, hy_oas, gold_copper, dxy, rsp_spy)**
```python
async def fetch_move(self): # yfinance ^MOVE
async def fetch_hy_oas(self): # FRED BAMLH0A0HYM2
async def fetch_gold_copper(self): # yfinance GC=F / HG=F
async def fetch_dxy(self): # yfinance DX-Y.NYB
async def fetch_rsp_spy(self): # (RSP/SPY - 1) * 100
```

**Round 5 — Daily indicators (sectors_200dma, skew, fear_greed, put_call_ratio)**
```python
async def fetch_sectors_200dma(self):
    # tickers = [XLK,XLF,XLE,XLV,XLI,XLC,XLY,XLP,XLRE,XLB,XLU]
    # pct above 200MA
async def fetch_skew(self): # yfinance ^SKEW
async def fetch_fear_greed(self): # GET https://fear-and-greed-index.p.rapidapi.com/v1/fgi OR alternative.me/fng
async def fetch_put_call_ratio(self): # CBOE https://www.cboe.com/publish/scheduledtask/mktdata/datahouse/put_call_ratios.csv
```

**Round 6 — Weekly/Monthly indicators (naaim, pe_gap, m7_concentration)**
```python
async def fetch_naaim_exposure(self):
    # GET https://www.naaim.org/wp-content/uploads/NAAIM_Exposure_Index.csv
    # return latest weekly value
async def fetch_pe_gap(self):
    # yfinance ^GSPC P/E TTM from info dict; forward PE from analyst estimates
    # gap = (ttm_pe - forward_pe) / forward_pe * 100
async def fetch_m7_concentration(self):
    # yfinance SPY, get top holdings via .info or fast_info
    # M7 = AAPL+MSFT+NVDA+AMZN+GOOGL+META+TSLA weight sum
```

**Round 7 — Quarterly/Slow indicators (cape, aiae)**
```python
async def fetch_cape(self):
    # FRED CAPE series OR scrape https://www.multpl.com/shiller-pe/table/by-month
    # monthly, cache 30 days
async def fetch_aiae(self):
    # FRED BOGZ1FL153064476Q — Fed Z.1 household equity allocation
    # quarterly, cache 90 days
```

**Round 8 — Wire all fetch functions into refresh_indicator()**
Update `IndicatorRefreshService.refresh_indicator()`:
- Build dispatch table: `{"vix": self.fetch_vix, "yield_curve": self.fetch_yield_curve, ...}` for all 18
- Call the right fetch function, store result in Redis with TTL
- Handle exceptions: log error, return last cached value, never crash

**Round 9 — Expand INDICATOR_CONFIG to all 18**
Add missing 10 indicators to `INDICATOR_CONFIG` dict:
`move, hy_oas, gold_copper, dxy, naaim_exposure, fear_greed, sectors_200dma, skew, put_call_ratio, rsp_spy`
Each with correct tier, weight, ttl_seconds, staleness_warning_hours.

**Round 10 — Add daily cron scheduler**
Create `backend/app/services/scheduler.py`:
- Use `apscheduler` (add to requirements.txt) or `asyncio` periodic task
- Schedule: daily 06:30 UTC — refresh all DAILY tier indicators
- Schedule: every Monday 07:00 UTC — refresh WEEKLY tier
- Schedule: first day of month 07:00 UTC — refresh MONTHLY tier
- Wire into `backend/app/main.py` startup/shutdown

**Round 11 — Update macro router to serve real data**
Update `backend/app/routers/macro.py`:
- `GET /macro/indicators` — return all 18 indicators with real values + staleness info
- `GET /macro/indicator/{id}` — single indicator detail
- `GET /macro/composite` — weighted composite score from real data
- Use Redis cache, fallback to immediate fetch if cache miss

**Round 12 — Update frontend to consume real API**
Update `frontend/app/macro/page.tsx`:
- Remove hardcoded mockResponse
- `fetch("/api/macro/indicators")` on mount
- Show staleness badge per indicator (green/yellow/red based on last_updated)
- Show data_source label per indicator
- Loading skeleton while fetching
- Error state with "使用缓存数据" fallback message

## Rules
- Read relevant files BEFORE editing
- Preserve all existing logic — new data fetching is additive
- All fetch functions must have try/except and return last cached value on error
- No API keys hardcoded — read from env vars
- After each round: `git add -A && git commit -m "feat(macro-round-N): <english description>" && git pull --rebase origin main && git push origin main`
- Output exactly: COMPLETE

Working dir: /home/azureuser/projects/options-dashboard
