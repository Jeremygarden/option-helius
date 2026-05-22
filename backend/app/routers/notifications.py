from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..services.notification_service import NotificationService

router = APIRouter()
notification_service = NotificationService()

class NotificationTestRequest(BaseModel):
    webhook_url: str
    discord_user_id: Optional[str] = None

class NotificationSettingsRequest(BaseModel):
    discord_webhook: Optional[str] = None
    discord_user_id: Optional[str] = None
    weekly_picks_enabled: bool
    macro_alert_enabled: bool
    # In a real app, we'd save these to a DB. For now, we just return success
    # as the primary storage is localStorage on the frontend.

@router.post("/test")
async def test_notification(request: NotificationTestRequest):
    success = await notification_service.send_test_notification(
        request.webhook_url, 
        request.discord_user_id
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send notification")
    return {"status": "success"}

@router.post("/settings")
async def save_settings(settings: Dict[str, Any]):
    # Placeholder for persistent backend storage
    return {"status": "success", "message": "Settings saved (mock)"}

@router.get("/settings")
async def get_settings():
    # Placeholder for fetching from backend storage
    return {"status": "success", "settings": {}}

@router.post("/weekly-picks")
async def trigger_weekly_picks(settings: Dict[str, Any]):
    success = await notification_service.send_weekly_picks_summary(settings)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send weekly picks")
    return {"status": "success"}
