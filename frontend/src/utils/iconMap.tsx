import {
  Clock, Moon, Zap, Brain, Timer, TrendingUp, TrendingDown,
  Film, Info,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "⏰": Clock,
  "🕐": Clock,
  "🌙": Moon,
  "⚡": Zap,
  "🧠": Brain,
  "🧘": Brain,
  "⏱️": Timer,
  "📈": TrendingUp,
  "📉": TrendingDown,
  "🎬": Film,
  "📭": Info,
  "📺": Film,
};

export function emojiToIcon(emoji: string, size = 18, className = "") {
  const Icon = MAP[emoji] || Info;
  return <Icon size={size} className={className} />;
}
