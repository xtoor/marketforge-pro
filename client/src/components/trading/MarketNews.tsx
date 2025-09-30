export default function MarketNews() {
  // Mock news data - in real app, fetch from news API
  const newsItems = [
    {
      id: 1,
      title: "Bitcoin ETF Approval Drives Market Rally",
      summary: "The SEC's approval of spot Bitcoin ETFs has triggered a significant market...",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      title: "Fed Chair Signals Potential Rate Cuts",
      summary: "Jerome Powell's latest speech indicates the Federal Reserve may...",
      timestamp: "4 hours ago",
    },
    {
      id: 3,
      title: "Tech Stocks Rally on AI Breakthrough",
      summary: "Major technology companies surge following announcement of new AI capabilities...",
      timestamp: "6 hours ago",
    },
  ];

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Market News</h3>
      
      <div className="space-y-3">
        {newsItems.map((news) => (
          <div
            key={news.id}
            className="bg-card rounded-lg p-3 cursor-pointer hover:bg-card/80 transition-all"
            data-testid={`news-item-${news.id}`}
          >
            <h4 className="text-sm font-medium mb-1">{news.title}</h4>
            <p className="text-xs text-muted-foreground mb-2">{news.summary}</p>
            <span className="text-xs text-primary">{news.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
