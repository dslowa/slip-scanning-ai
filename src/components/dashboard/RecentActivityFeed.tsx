"use client";

import type { ActivityItem } from "@/hooks/useDashboardData";

interface RecentActivityFeedProps {
  data: ActivityItem[];
}

const actionStyles: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "Approved", color: "text-success", bg: "bg-success/10" },
  rejected: { label: "Rejected", color: "text-danger", bg: "bg-danger/10" },
  corrected: { label: "Corrected", color: "text-primary", bg: "bg-primary/10" },
  escalated: { label: "Escalated", color: "text-warning", bg: "bg-warning/10" },
  noted: { label: "Noted", color: "text-muted", bg: "bg-muted/10" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RecentActivityFeed({ data }: RecentActivityFeedProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {data.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No recent activity</p>
        ) : (
          data.map((item) => {
            const style = actionStyles[item.action] || actionStyles.noted;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-background/50 transition-colors"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style.color} ${style.bg} shrink-0 mt-0.5`}
                >
                  {style.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{item.moderator_name || "System"}</span>
                    {" "}
                    {item.action}
                    {item.slip_retailer && (
                      <span className="text-muted">
                        {" "}
                        — {item.slip_retailer}
                        {item.slip_amount != null && (
                          <> (R{Number(item.slip_amount).toFixed(2)})</>
                        )}
                      </span>
                    )}
                  </p>
                  {item.details && (
                    <p className="text-xs text-muted truncate mt-0.5">{item.details}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted shrink-0 mt-1">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
