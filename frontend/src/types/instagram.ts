// Instagram data type definitions
// Derived from backend compute functions in services/instagram_stats.py, instagram_insights.py

// --- Summary ---
export interface IgSummaryData {
  total_likes: number;
  post_likes: number;
  story_likes: number;
  total_messages: number;
  total_conversations: number;
  following_count: number;
  content_viewed: number;
}

// --- Top Accounts ---
export interface IgTopAccount {
  username: string;
  likes: number;
  story_likes: number;
  messages: number;
  total: number;
}
export type IgTopAccountsData = IgTopAccount[];

// --- Hourly ---
export interface IgHourlyItem {
  hour: number;
  count: number;
}
export type IgHourlyData = IgHourlyItem[];

// --- Day of Week ---
export interface IgDayOfWeekItem {
  day: string;
  day_index: number;
  total: number;
  avg: number;
}
export type IgDayOfWeekData = IgDayOfWeekItem[];

// --- Daily ---
export interface IgDailyItem {
  date: string;
  count: number;
}
export type IgDailyData = IgDailyItem[];

// --- DM Analysis ---
export interface IgDmConversation {
  conversation: string;
  count: number;
}
export interface IgDmAnalysisData {
  sent: number;
  received: number;
  top_conversations: IgDmConversation[];
}

// --- Topics ---
export type IgTopicsData = string[];

// --- Follow Network ---
export interface IgMonthlyGrowth {
  month: string;
  new: number;
  cumulative: number;
}
export interface IgUnfollowedAccount {
  username: string;
  timestamp: number;
}
export interface IgFollowNetworkData {
  monthly_growth: IgMonthlyGrowth[];
  recent_unfollowed: IgUnfollowedAccount[];
}

// --- Engagement Balance ---
export interface IgEngagementAccount {
  username: string;
  likes: number;
  story_likes: number;
  dms_sent: number;
  total: number;
}
export interface IgEngagementBalanceData {
  accounts: IgEngagementAccount[];
  total_engagement: number;
}

// --- DM Balance ---
export interface IgDmBalanceItem {
  conversation: string;
  sent: number;
  received: number;
  total: number;
  sent_pct: number;
  is_group: boolean;
}
export type IgDmBalanceData = IgDmBalanceItem[];

// --- Following Cleanup ---
export interface IgLowInteraction {
  username: string;
  count: number;
}
export interface IgFollowingCleanupData {
  total_following: number;
  no_interaction_count: number;
  no_interaction_pct: number;
  no_interaction_sample: string[];
  low_interaction: IgLowInteraction[];
}

// --- Lurker Index ---
export interface IgLurkerTrendItem {
  month: string;
  viewed: number;
  engaged: number;
  rate: number;
}
export interface IgLurkerIndexData {
  total_viewed: number;
  total_engagement: number;
  engagement_rate: number;
  lurker_score: number;
  trend: IgLurkerTrendItem[];
}

// --- Video Trend ---
export interface IgVideoTrendItem {
  month: string;
  posts: number;
  videos: number;
  video_pct: number;
}
export interface IgVideoTrendData {
  trend: IgVideoTrendItem[];
  total_posts: number;
  total_videos: number;
  first_video_pct: number;
  last_video_pct: number;
  change_pct: number;
}

// --- Late Night ---
export interface IgLateDmPartner {
  name: string;
  count: number;
}
export interface IgLateNightTrendItem {
  month: string;
  total: number;
  late: number;
  late_pct: number;
}
export interface IgLateNightData {
  total_actions: number;
  late_actions: number;
  late_ratio: number;
  peak_hour: number;
  top_dm_partners: IgLateDmPartner[];
  trend: IgLateNightTrendItem[];
}

// --- Unfollow Timeline ---
export interface IgUnfollowAccount {
  username: string;
  timestamp: number;
  date: string;
  prior_interactions: number;
}
export interface IgUnfollowTimelineData {
  total_unfollowed: number;
  accounts: IgUnfollowAccount[];
}

// --- Insights ---
export interface IgInsightItem {
  icon: string;
  text: string;
}
export type IgInsightsData = IgInsightItem[];

// --- Aggregated Instagram Data ---
export interface InstagramData {
  summary?: IgSummaryData;
  top_accounts?: IgTopAccountsData;
  hourly?: IgHourlyData;
  day_of_week?: IgDayOfWeekData;
  daily?: IgDailyData;
  dm_analysis?: IgDmAnalysisData;
  topics?: IgTopicsData;
  follow_network?: IgFollowNetworkData;
  engagement_balance?: IgEngagementBalanceData;
  dm_balance?: IgDmBalanceData;
  following_cleanup?: IgFollowingCleanupData;
  lurker_index?: IgLurkerIndexData;
  video_trend?: IgVideoTrendData;
  late_night?: IgLateNightData;
  unfollow_timeline?: IgUnfollowTimelineData;
  insights?: IgInsightsData;
}
