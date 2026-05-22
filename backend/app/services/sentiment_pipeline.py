import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

def fetch_reddit_posts(subreddit: str, ticker: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch posts from a subreddit mentioning a ticker.
    Implementation note: Use agent-reach (curl reddit.json) or PRAW.
    """
    # Mock return structure
    return []

def fetch_kol_tweets(handles: List[str], ticker: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Fetch tweets from specific KOL handles mentioning a ticker.
    Implementation note: Use browser automation or bird CLI.
    """
    return []

def compute_post_weight(post: Dict[str, Any], now: datetime) -> float:
    """
    Weight formula:
    - Recency: exponential decay with 3-day half-life
    - Engagement: log(1 + score + comments) normalized
    - Combined: recency * engagement_boost
    """
    created_at = post.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    # Recency weight: half-life = 72 hours
    age_hours = (now - created_at).total_seconds() / 3600
    recency_weight = math.exp(-age_hours * math.log(2) / 72)
    
    # Engagement weight: log scale to prevent viral posts from dominating
    engagement = post.get('score', 0) + post.get('num_comments', 0) * 2
    engagement_weight = math.log1p(max(0, engagement)) / math.log1p(1000)  # normalize to ~0-1
    
    # Combined (0.5 base + 0.5 engagement boost)
    return recency_weight * (0.5 + 0.5 * engagement_weight)

def analyze_sentiment_batch(posts: List[Dict[str, Any]], ticker: str) -> Dict[str, Any]:
    """
    Batch sentiment analysis using GitHub Copilot LLM via OpenClaw.
    
    Prompt Template:
    You are a financial sentiment analyst. Analyze these {N} social media posts about {ticker}.
    For each post, return JSON: {"id": X, "sentiment": "bullish/bearish/neutral", "confidence": 0-1, "key_insight": "one sentence"}
    Also return an aggregate: {"overall": "bullish/bearish/neutral", "score": -100 to 100, "top_themes": [...], "summary": "2-3 sentence Chinese summary"}
    """
    # implementation will use subagents/browser/message to call the LLM
    return {}

def aggregate_sentiment(posts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute weighted aggregate sentiment score.
    Returns: {"score": -100 to 100, "trend": "rising/falling/stable", 
              "top_posts": [...top 5 by weight...]}
    """
    if not posts:
        return {"score": 0, "trend": "stable", "top_posts": []}
        
    now = datetime.utcnow()
    total_weight = 0
    weighted_score = 0
    
    scored_posts = []
    for post in posts:
        weight = compute_post_weight(post, now)
        # Assuming sentiment_score is -1 to 1 from LLM analysis
        sentiment_val = post.get('sentiment_score', 0) 
        weighted_score += sentiment_val * weight
        total_weight += weight
        
        post['calculated_weight'] = weight
        scored_posts.append(post)
        
    final_score = (weighted_score / total_weight) * 100 if total_weight > 0 else 0
    
    # Sort by weight to get top posts
    scored_posts.sort(key=lambda x: x['calculated_weight'], reverse=True)
    
    return {
        "score": round(final_score, 2),
        "trend": "stable", # Needs historical comparison for real trend
        "top_posts": scored_posts[:5]
    }
