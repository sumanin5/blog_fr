import {
  UserSession,
  DeviceType,
  UserType,
  ArticleStat,
  PageView,
  DashboardStats,
} from "@/types/analytics";

// Mock Data Generators
const IPS = [
  "192.168.1.1",
  "10.0.0.5",
  "172.16.254.1",
  "203.0.113.5",
  "198.51.100.2",
  "45.33.22.11",
  "104.21.55.2",
];
const LOCATIONS = [
  { country: "中国", city: "北京", region: "北京" },
  { country: "中国", city: "上海", region: "上海" },
  { country: "中国", city: "深圳", region: "广东" },
  { country: "中国", city: "广州", region: "广东" },
  { country: "中国", city: "杭州", region: "浙江" },
  { country: "中国", city: "成都", region: "四川" },
  { country: "美国", city: "旧金山", region: "加利福尼亚" },
  { country: "新加坡", city: "新加坡", region: "新加坡" },
];
const ARTICLES = [
  { title: "2024年React最佳实践", url: "/articles/react-2024-best-practices" },
  { title: "Tailwind CSS深度解析", url: "/articles/tailwind-deep-dive" },
  { title: "TypeScript 高级类型指南", url: "/articles/typescript-advanced" },
  { title: "Web性能优化全攻略", url: "/articles/web-performance" },
  { title: "Next.js 14 新特性", url: "/articles/nextjs-14-features" },
  { title: "如何构建AI驱动的应用", url: "/articles/building-ai-apps" },
];
const REFERRERS = ["Google", "Baidu", "Direct", "Twitter", "WeChat", "GitHub"];
const USER_AGENTS = {
  REAL: [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  ],
  BOT: [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  ],
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const generateMockData = (): {
  sessions: UserSession[];
  articles: ArticleStat[];
} => {
  const sessions: UserSession[] = [];
  const articleMap = new Map<string, ArticleStat>();

  // Initialize articles
  ARTICLES.forEach((art) => {
    articleMap.set(art.url, {
      id: art.url,
      title: art.title,
      url: art.url,
      views: 0,
      uniqueVisitors: 0,
      avgTimeOnPage: 0,
      botHits: 0,
    });
  });

  // Generate 150 sessions
  for (let i = 0; i < 150; i++) {
    const isBot = Math.random() < 0.25; // 25% bots
    const userType = isBot ? UserType.CRAWLER : UserType.REAL_USER;
    const deviceType = isBot
      ? DeviceType.BOT
      : randomItem([DeviceType.DESKTOP, DeviceType.MOBILE, DeviceType.TABLET]);
    const location = randomItem(LOCATIONS);
    const ip = `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;

    // Page Views for this session
    const numViews = isBot ? randomInt(1, 10) : randomInt(1, 5);
    const pageViews: PageView[] = [];
    let sessionDuration = 0;

    for (let j = 0; j < numViews; j++) {
      const art = randomItem(ARTICLES);
      const duration = isBot ? 1 : randomInt(10, 300);
      sessionDuration += duration;

      pageViews.push({
        id: `pv-${i}-${j}`,
        url: art.url,
        title: art.title,
        timestamp: Date.now() - randomInt(0, 86400000), // Within last 24h
        durationSeconds: duration,
      });

      // Update Article Stats
      const stat = articleMap.get(art.url);
      if (stat) {
        if (isBot) {
          stat.botHits++;
        } else {
          stat.views++;
          // Simple unique visitor logic approximation
          if (j === 0) stat.uniqueVisitors++;
          stat.avgTimeOnPage =
            (stat.avgTimeOnPage * (stat.views - 1) + duration) / stat.views;
        }
      }
    }

    sessions.push({
      sessionId: `sess-${i}`,
      ipAddress: ip,
      location: { ...location, lat: 0, lng: 0 },
      device: {
        type: deviceType,
        os: isBot
          ? "Linux"
          : deviceType === DeviceType.MOBILE
            ? "iOS"
            : "Windows",
        browser: isBot ? "Bot" : "Chrome",
        userAgent: isBot
          ? randomItem(USER_AGENTS.BOT)
          : randomItem(USER_AGENTS.REAL),
      },
      userType,
      referrer: randomItem(REFERRERS),
      startTime: pageViews[0]?.timestamp || Date.now(),
      pageViews: pageViews.sort((a, b) => a.timestamp - b.timestamp),
    });
  }

  // Calculate global stats for sorting
  const articles = Array.from(articleMap.values()).sort(
    (a, b) => b.views - a.views,
  );

  return {
    sessions: sessions.sort((a, b) => b.startTime - a.startTime),
    articles,
  };
};

export const calculateStats = (sessions: UserSession[]): DashboardStats => {
  const realSessions = sessions.filter(
    (s) => s.userType === UserType.REAL_USER,
  );
  const botSessions = sessions.filter((s) => s.userType === UserType.CRAWLER);

  const totalDuration = realSessions.reduce((acc, s) => {
    const duration = s.pageViews.reduce((d, p) => d + p.durationSeconds, 0);
    return acc + duration;
  }, 0);

  return {
    totalVisits: sessions.length,
    uniqueIPs: new Set(sessions.map((s) => s.ipAddress)).size,
    botTrafficPercent: (botSessions.length / sessions.length) * 100,
    avgSessionDuration: realSessions.length
      ? totalDuration / realSessions.length
      : 0,
    realUserCount: realSessions.length,
    crawlerCount: botSessions.length,
  };
};
