"use client";

import { Slip } from "@/types/slips";

interface HistoryTabProps {
  slip: Slip;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionStyle(action: string): { bg: string; text: string; icon: React.ReactNode } {
  switch (action) {
    case "approved":
      return {
        bg: "bg-success/10 border-success/30",
        text: "text-success",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    case "rejected":
      return {
        bg: "bg-danger/10 border-danger/30",
        text: "text-danger",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case "corrected":
      return {
        bg: "bg-primary/10 border-primary/30",
        text: "text-primary",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ),
      };
    case "escalated":
      return {
        bg: "bg-warning/10 border-warning/30",
        text: "text-warning",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        ),
      };
    case "noted":
    default:
      return {
        bg: "bg-muted/10 border-muted/30",
        text: "text-muted",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        ),
      };
  }
}

export default function HistoryTab({ slip }: HistoryTabProps) {
  const activities = slip.activity_log ?? [];

  // AI recommendation summary
  const aiRecommendation = slip.recommended_action;
  const finalStatus = slip.status;
  const showDecisionComparison =
    aiRecommendation &&
    ["approved", "rejected", "corrected", "auto_approved", "auto_rejected"].includes(finalStatus);

  return (
    <div className="space-y-5">
      {/* AI vs Final Decision */}
      {showDecisionComparison && (
        <div className="p-4 rounded-lg border border-border bg-background/30">
          <h4 className="text-sm font-semibold text-foreground mb-3">Decision Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">AI Recommendation</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                  aiRecommendation === "AUTO_APPROVE"
                    ? "bg-success/15 text-success"
                    : aiRecommendation === "AUTO_REJECT"
                    ? "bg-danger/15 text-danger"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {aiRecommendation?.replace("_", " ")}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Final Decision</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                  finalStatus === "approved" || finalStatus === "auto_approved" || finalStatus === "corrected"
                    ? "bg-success/15 text-success"
                    : finalStatus === "rejected" || finalStatus === "auto_rejected"
                    ? "bg-danger/15 text-danger"
                    : "bg-muted/15 text-muted"
                }`}
              >
                {finalStatus.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Activity Log</h4>
        {activities.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">No activity recorded yet</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((entry) => {
                const style = getActionStyle(entry.action);
                return (
                  <div key={entry.id} className="flex gap-3 relative">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 ${style.bg}`}
                    >
                      <span className={style.text}>{style.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {entry.moderator?.name ?? "Unknown"}
                        </span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
                        >
                          {entry.action}
                        </span>
                        <span className="text-xs text-muted">{formatDateTime(entry.created_at)}</span>
                      </div>
                      {entry.details && (
                        <p className="text-sm text-muted mt-1">{entry.details}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
