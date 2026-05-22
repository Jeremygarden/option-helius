import httpx
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    
    async def send_discord_webhook(self, webhook_url: str, embed: dict):
        """Send rich embed to Discord webhook"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json={"embeds": [embed]})
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to send Discord webhook: {e}")
            return False
    
    async def send_weekly_picks_summary(self, user_settings: dict):
        """
        Weekly picks summary card for Discord.
        Format: Rich embed with top 3 strategy picks for the week.
        """
        webhook_url = user_settings.get("discord_webhook")
        if not webhook_url:
            logger.warning("No Discord webhook URL provided in user settings.")
            return False

        # In a real app, this would fetch from a database or pick service
        embed = {
            "title": "📊 本周期权精选 — " + datetime.now().strftime("%Y-%m-%d"),
            "color": 0x3fb950,  # green
            "fields": [
                {"name": "🥇 NVDA 铁鹰价差 (Iron Condor)", "value": "预估年化: 45%\n胜率: 72%\n建议区间: $800 - $950", "inline": False},
                {"name": "🥈 SPY Bull Put Spread", "value": "预估年化: 18%\n胜率: 85%\n行权价: $510 / $505", "inline": False},
                {"name": "🥉 AAPL Covered Call", "value": "持仓增强收益: +2.5%\n行权价: $200", "inline": False},
            ],
            "footer": {"text": "Option Helius • 安全垫优先策略"},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.send_discord_webhook(webhook_url, embed)
    
    async def send_macro_alert(self, webhook_url: str, indicator: str, old_value: float, new_value: float, new_signal: str):
        """Alert when indicator crosses threshold"""
        color = 0xda3633 if new_signal == "red" else 0xd4a017 # red or orange
        
        embed = {
            "title": f"⚠️ 宏观预警: {indicator} 指标变动",
            "description": f"指标 **{indicator}** 已从 {old_value} 变动至 **{new_value}**，触发 **{new_signal}** 警报。",
            "color": color,
            "footer": {"text": "Option Helius 实时监控"},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.send_discord_webhook(webhook_url, embed)

    async def send_test_notification(self, webhook_url: str, user_id: str = None):
        """Send a test notification to verify settings"""
        content = "这不仅是一个测试，它是 Helius 的声音。"
        if user_id:
            content = f"<@{user_id}> " + content
            
        embed = {
            "title": "🔔 Option Helius 测试推送",
            "description": content,
            "color": 0x5865F2, # Blurple
            "footer": {"text": "Option Helius • 系统设置"},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self.send_discord_webhook(webhook_url, embed)
