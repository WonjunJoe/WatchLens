// YouTube data type definitions
// Derived from backend compute functions in services/stats_service.py, indices.py, insights.py

// --- Summary ---
export interface SummaryData {
  total_watched: number;
  total_channels: number;
  period: string;
  daily_average: number;
  shorts_count: number;
}

// --- Hourly ---
export interface HourlyItem {
  hour: number;
  count: number;
}
export type HourlyData = HourlyItem[];

// --- Daily ---
export interface DailyItem {
  date: string;
  count: number;
}
export type DailyData = DailyItem[];

// --- Top Channels ---
export interface ChannelCount {
  channel_name: string;
  count: number;
}
export interface TopChannelsData {
  longform: ChannelCount[];
  shorts: ChannelCount[];
}

// --- Shorts ---
export interface ShortsTrendItem {
  date: string;
  shorts_ratio: number;
}
export interface ShortsData {
  shorts_count: number;
  regular_count: number;
  shorts_ratio: number;
  daily_trend: ShortsTrendItem[];
}

// --- Categories ---
export interface CategoryCount {
  category_name: string;
  count: number;
}
export interface CategoriesData {
  longform: CategoryCount[];
  shorts: CategoryCount[];
}

// --- Watch Time ---
export interface WatchTimeData {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
}

// --- Weekly Watch Time ---
export interface WeeklyWatchTimeItem {
  week_label: string;
  min_hours: number;
  max_hours: number;
  change_pct: number | null;
}
export type WeeklyWatchTimeData = WeeklyWatchTimeItem[];

// --- Weekly ---
export interface WeeklyItem {
  week_label: string;
  total: number;
  shorts: number;
  longform: number;
  daily_avg: number;
}
export type WeeklyData = WeeklyItem[];

// --- Dopamine ---
export interface DopamineBreakdownItem {
  value: number;
  score: number;
  weight: number;
  description: string;
}
export interface DopamineData {
  score: number;
  grade: string;
  breakdown: Record<string, DopamineBreakdownItem>;
}

// --- Day of Week ---
export interface DayOfWeekItem {
  day: string;
  day_index: number;
  total: number;
  avg: number;
  weeks: number;
}
export type DayOfWeekData = DayOfWeekItem[];

// --- Viewer Type ---
export interface ViewerTypeAxis {
  axis: string;
  left: string;
  right: string;
  value: number;
  pick: string;
}
export interface ViewerTypeData {
  code: string;
  type_name: string;
  description: string;
  axes: ViewerTypeAxis[];
}

// --- Search Keywords ---
export interface SearchKeywordItem {
  keyword: string;
  count: number;
}
export type SearchKeywordsData = SearchKeywordItem[];

// --- Content Diversity ---
export interface DiversityCategory {
  category: string;
  count: number;
  pct: number;
}
export interface DiversityMonthly {
  month: string;
  score: number;
}
export interface ContentDiversityData {
  score: number;
  category_count: number;
  top_categories: DiversityCategory[];
  monthly_trend: DiversityMonthly[];
}

// --- Attention Trend ---
export interface AttentionTrendItem {
  month: string;
  avg_duration_min: number;
  shorts_pct: number;
}
export interface AttentionTrendData {
  trend: AttentionTrendItem[];
  overall_change_pct: number;
  first_avg_min: number;
  last_avg_min: number;
}

// --- Time Cost ---
export interface TimeCostEquivalent {
  label: string;
  value: number;
  unit: string;
  desc: string;
}
export interface TimeCostData {
  total_hours: number;
  equivalents: TimeCostEquivalent[];
}

// --- Binge Sessions ---
export interface BingeChannel {
  channel: string;
  count: number;
}
export interface BingeSessionsData {
  total_sessions: number;
  binge_sessions: number;
  binge_ratio: number;
  total_binge_videos: number;
  longest_binge: number;
  top_binge_channels: BingeChannel[];
}

// --- Search Watch Flow ---
export interface ConvertingSearch {
  query: string;
  searches: number;
  converted: number;
  rate: number;
}
export interface AbandonedSearch {
  query: string;
  searches: number;
  converted: number;
  abandon_rate: number;
}
export interface SearchWatchFlowData {
  total_searches: number;
  total_watches: number;
  conversion_rate: number;
  top_converting: ConvertingSearch[];
  top_abandoned: AbandonedSearch[];
}

// --- Insights ---
export interface InsightItem {
  icon: string;
  text: string;
}
export type InsightsData = InsightItem[];

// --- Aggregated YouTube Data ---
export interface YouTubeData {
  summary?: SummaryData;
  hourly?: HourlyData;
  daily?: DailyData;
  top_channels?: TopChannelsData;
  shorts?: ShortsData;
  categories?: CategoriesData;
  watch_time?: WatchTimeData;
  weekly_watch_time?: WeeklyWatchTimeData;
  weekly?: WeeklyData;
  dopamine?: DopamineData;
  day_of_week?: DayOfWeekData;
  viewer_type?: ViewerTypeData;
  search_keywords?: SearchKeywordsData;
  content_diversity?: ContentDiversityData;
  attention_trend?: AttentionTrendData;
  time_cost?: TimeCostData;
  binge_sessions?: BingeSessionsData;
  search_watch_flow?: SearchWatchFlowData;
  insights?: InsightsData;
}
