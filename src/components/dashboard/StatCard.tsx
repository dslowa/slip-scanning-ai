"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  color?: "primary" | "success" | "warning" | "danger" | "muted";
  highlight?: boolean;
}

const colorMap = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-muted",
};

const trendColors = {
  up: "text-success",
  down: "text-danger",
  neutral: "text-muted",
};

const trendArrows = {
  up: "\u2191",
  down: "\u2193",
  neutral: "\u2192",
};

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  color = "primary",
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={`
        bg-card border rounded-xl p-5 transition-all duration-200
        hover:border-opacity-60 hover:shadow-lg hover:shadow-black/20
        hover:-translate-y-0.5 cursor-default
        ${highlight ? "border-warning/50 bg-warning/5" : "border-border"}
      `}
    >
      <p className="text-sm text-muted font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colorMap[color]}`}>{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trend && (
          <span className={`text-sm font-medium ${trendColors[trend.direction]}`}>
            {trendArrows[trend.direction]} {trend.value}
          </span>
        )}
        {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
      </div>
    </div>
  );
}
