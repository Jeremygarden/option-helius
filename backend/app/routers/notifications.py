from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..services.notification_service import NotificationService
from ..core.errors import upstream_unavailable
from ..core.validation import validate_webhook_url

router = APIRouter()
notification_service = NotificationService()

class NotificationTestRequest(BaseModel):
    webhook_url: str
    discord_user_id: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        self.webhook_url = validate_webhook_url(self.webhook_url)

class NotificationSettingsRequest(BaseModel):
    discord_webhook: Optional[str] = None
    discord_user_id: Optional[str] = None
    weekly_picks_enabled: bool
    macro_alert_enabled: bool

    def __init__(self, **data):
        super().__init__(**data)
        if self.discord_webhook:
            self.discord_webhook = validate_webhook_url(self.discord_webhook, field="discord_webhook")

@router.post("/test")
async def test_notification(request: NotificationTestRequest):
    success = await notification_service.send_test_notification(
        request.webhook_url, 
        request.discord_user_id
    )
    if not success:
        raise upstream_unavailable("Discord webhook", "notification delivery failed")
    return {"status": "success"}

@router.post("/settings")
async def save_settings(settings: Dict[str, Any]):
    return {"status": "success", "message": "Settings saved (mock)"}

@router.get("/settings")
async def get_settings():
    return {"status": "success", "settings": {}}

@router.post("/weekly-picks")
async def trigger_weekly_picks(settings: Dict[str, Any]):
    success = await notification_service.send_weekly_picks_summary(settings)
    if not success:
        raise upstream_unavailable("Discord webhook", "weekly picks delivery failed")
    return {"status": "success"}
