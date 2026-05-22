from datetime import datetime, timedelta
import random

def get_mock_social_posts(ticker: str):
    now = datetime.utcnow()
    posts = []
    
    # Mock Reddit posts
    reddit_content = [
        f"Just bought more {ticker} calls, the setup looks incredible for next week.",
        f"Why is everyone bullish on {ticker}? Valuation is stretched.",
        f"Theta gang strategy on {ticker}: selling puts at 20 delta.",
        f"{ticker} open interest is spiking in the OTM strikes.",
    ]
    
    for i, content in enumerate(reddit_content):
        posts.append({
            "id": f"reddit_{i}",
            "source": "reddit",
            "subreddit": "wallstreetbets",
            "content": content,
            "score": random.randint(10, 500),
            "num_comments": random.randint(5, 50),
            "created_at": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
            "sentiment_score": random.uniform(-1, 1)
        })
        
    # Mock KOL Tweets
    kol_content = [
        f"CPI data coming in hot, watch {ticker} for macro correlation.",
        f"GEX profile for {ticker} suggests a pin at the 500 level.",
        f"Technical breakout on {ticker} daily chart.",
    ]
    
    for i, content in enumerate(kol_content):
        posts.append({
            "id": f"tweet_{i}",
            "source": "twitter",
            "handle": "SpotGamma",
            "content": content,
            "score": random.randint(100, 2000),
            "num_comments": random.randint(20, 100),
            "created_at": (now - timedelta(hours=random.randint(1, 24))).isoformat(),
            "sentiment_score": random.uniform(-1, 1)
        })
        
    return posts
