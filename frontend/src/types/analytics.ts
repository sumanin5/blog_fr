// 核心分析数据类型定义

export enum DeviceType {
  DESKTOP = "Desktop",
  MOBILE = "Mobile",
  TABLET = "Tablet",
  BOT = "Bot",
}

export enum UserType {
  REAL_USER = "Real User",
  CRAWLER = "Crawler",
}

export interface Location {
  country: string;
  city: string;
  region: string;
  lat?: number;
  lng?: number;
}

export interface PageView {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  durationSeconds: number;
}

export interface UserSession {
  sessionId: string;
  ipAddress: string;
  location: Location;
  device: {
    type: DeviceType;
    os: string;
    browser: string;
    userAgent: string;
  };
  userType: UserType;
  referrer: string;
  startTime: number;
  pageViews: PageView[];
}

export interface ArticleStat {
  id: string;
  title: string;
  url: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  botHits: number;
}

export interface DashboardStats {
  totalVisits: number;
  uniqueIPs: number;
  botTrafficPercent: number;
  avgSessionDuration: number;
  realUserCount: number;
  crawlerCount: number;
}
