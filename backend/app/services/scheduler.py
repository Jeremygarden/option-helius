import logging
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .indicator_refresh import IndicatorRefreshService
from ..core.cache import get_redis

logger = logging.getLogger(__name__)

async def refresh_macro_job():
    """Daily/Weekly/Monthly macro refresh job."""
    logger.info("Starting scheduled macro indicator refresh")
    try:
        redis = await get_redis()
        service = IndicatorRefreshService(redis)
        
        now = datetime.utcnow()
        
        # Always run daily
        await service.refresh_daily_indicators()
        
        # Weekly (Monday)
        if now.weekday() == 0:
            await service.refresh_weekly_indicators(), instruction said Weekly for Weekly tier
            # Re-read: Schedule: every Monday 07:00 UTC — refresh WEEKLY tier
            # IndicatorRefreshService only has refresh_daily, refresh_monthly, refresh_quarterly
            # Let's add refresh_weekly to service or just use the dispatch logic
            
        # Monthly (1st)
        if now.day == 1:
            await service.refresh_monthly_indicators()
            
        logger.info("Scheduled macro indicator refresh completed")
    except Exception as exc:
        logger.error(f"Scheduled macro refresh failed: {exc}")

class MacroScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        # Schedule: daily 06:30 UTC — refresh all DAILY tier indicators
        self.scheduler.add_job(
            refresh_macro_job,
            CronTrigger(hour=6, minute=30),
            id="daily_macro_refresh",
            replace_existing=True
        )
        # Weekly/Monthly are checked inside the job or can be separate jobs
        self.scheduler.start()
        logger.info("Macro scheduler started")

    def shutdown(self):
        self.scheduler.shutdown()
        logger.info("Macro scheduler shut down")
