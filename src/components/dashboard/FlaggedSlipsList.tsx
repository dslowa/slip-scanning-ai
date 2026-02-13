"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { FlaggedSlip } from "@/hooks/useDashboardData";

interface FlaggedSlipsListProps {
  data: FlaggedSlip[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function FlaggedSlipsList({ data }: FlaggedSlipsListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function handleAction(slipId: string, action: "approved" | "rejected") {
    setActionLoading(slipId);
    try {
      await supabase
        .from("slips")
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq("id", slipId);

      await supabase.from("activity_log").insert({
        slip_id: slipId,
        action,
        details: `Quick action from dashboard: ${action}`,
      });

      setDismissed((prev) => new Set(prev).add(slipId));
    } finally {
      setActionLoading(null);
    }
  }

  const visibleSlips = data.filter((s) => !dismissed.has(s.id));

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Flagged Slips</h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-danger bg-danger/10">
          {visibleSlips.length} HIGH RISK
        </span>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {visibleSlips.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No flagged slips</p>
        ) : (
          visibleSlips.map((slip) => (
            <div
              key={slip.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-danger/20 bg-danger/5 hover:bg-danger/10 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {slip.retailer_name || "Unknown Retailer"}
                  </p>
                  {slip.fraud_risk_score != null && (
                    <span className="text-[10px] text-danger font-mono shrink-0">
                      {(Number(slip.fraud_risk_score) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {slip.total_amount != null && (
                    <span className="text-xs text-muted">
                      R{Number(slip.total_amount).toFixed(2)}
                    </span>
                  )}
                  <span className="text-[10px] text-muted">{timeAgo(slip.created_at)}</span>
                </div>
                {slip.fraud_flags && slip.fraud_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {slip.fraud_flags.slice(0, 3).map((flag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger/80"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => handleAction(slip.id, "approved")}
                  disabled={actionLoading === slip.id}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(slip.id, "rejected")}
                  disabled={actionLoading === slip.id}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
