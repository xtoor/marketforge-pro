"""
Crypto News API Endpoints

Fetches real-time cryptocurrency news from CryptoCompare API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx
from datetime import datetime

router = APIRouter()


class NewsItem(BaseModel):
    id: str
    title: str
    body: str
    source: str
    url: str
    published_at: str
    imageurl: Optional[str] = None
    sentiment: str = 'neutral'


class NewsResponse(BaseModel):
    news: List[NewsItem]
    count: int


@router.get("/crypto-news", response_model=NewsResponse)
async def get_crypto_news(limit: int = 10):
    """
    Fetch latest cryptocurrency news from CryptoCompare API

    CryptoCompare provides free access to crypto news aggregated from various sources
    No API key required for basic usage
    """

    try:
        async with httpx.AsyncClient() as client:
            # CryptoCompare News API endpoint
            response = await client.get(
                "https://min-api.cryptocompare.com/data/v2/news/",
                params={
                    "lang": "EN",
                    "sortOrder": "latest"
                },
                timeout=10.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch news from CryptoCompare: {response.status_code}"
                )

            data = response.json()

            if data.get("Response") == "Error":
                raise HTTPException(
                    status_code=500,
                    detail=f"CryptoCompare API error: {data.get('Message', 'Unknown error')}"
                )

            # Parse news items
            news_items = []
            raw_news = data.get("Data", [])[:limit]

            for item in raw_news:
                # Simple sentiment analysis based on title keywords
                sentiment = analyze_sentiment(item.get("title", ""))

                news_items.append(NewsItem(
                    id=item.get("id", ""),
                    title=item.get("title", ""),
                    body=item.get("body", ""),
                    source=item.get("source_info", {}).get("name", "Unknown"),
                    url=item.get("url", ""),
                    published_at=datetime.fromtimestamp(item.get("published_on", 0)).isoformat(),
                    imageurl=item.get("imageurl", ""),
                    sentiment=sentiment
                ))

            return NewsResponse(
                news=news_items,
                count=len(news_items)
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to CryptoCompare timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch crypto news: {str(e)}"
        )


def analyze_sentiment(text: str) -> str:
    """
    Simple sentiment analysis based on keyword matching

    In production, you would use a proper NLP model or sentiment API
    """
    text_lower = text.lower()

    bullish_keywords = [
        'surge', 'rally', 'bullish', 'gain', 'rise', 'up', 'high', 'boom',
        'breakthrough', 'adoption', 'growth', 'profit', 'moon', 'pump',
        'milestone', 'record', 'all-time high', 'ath', 'upgrade', 'partnership'
    ]

    bearish_keywords = [
        'crash', 'drop', 'fall', 'decline', 'bearish', 'down', 'loss', 'plunge',
        'dump', 'scam', 'hack', 'ban', 'regulation', 'warning', 'concern',
        'lawsuit', 'investigation', 'fraud', 'seizure', 'collapse'
    ]

    bullish_count = sum(1 for keyword in bullish_keywords if keyword in text_lower)
    bearish_count = sum(1 for keyword in bearish_keywords if keyword in text_lower)

    if bullish_count > bearish_count:
        return 'bullish'
    elif bearish_count > bullish_count:
        return 'bearish'
    else:
        return 'neutral'
