"use client";

import { useState } from "react";
import { Slip } from "@/types/slips";
import SlipDetailView from "./SlipDetailView";

interface SlipTableProps {
  slips: Slip[];
}

function getStatusStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case "approved":
    case "auto_approved":
      return { bg: "bg-success/15", text: "text-success" };
    case "rejected":
    case "auto_rejected":
      return { bg: "bg-danger/15", text: "text-danger" };
    case "manual_review":
      return { bg: "bg-warning/15", text: "text-warning" };
    case "corrected":
      return { bg: "bg-primary/15", text: "text-primary" };
    case "processing":
      return { bg: "bg-muted/15", text: "text-muted" };
    default:
      return { bg: "bg-muted/10", text: "text-muted" };
  }
}

function getRiskStyle(level: string | null): { bg: string; text: string } {
  switch (level) {
    case "LOW":
      return { bg: "bg-success/15", text: "text-success" };
    case "MEDIUM":
      return { bg: "bg-warning/15", text: "text-warning" };
    case "HIGH":
      return { bg: "bg-danger/15", text: "text-danger" };
    default:
      return { bg: "bg-muted/10", text: "text-muted" };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SlipTable({ slips }: SlipTableProps) {
  const [expandedSlipId, setExpandedSlipId] = useState<string | null>(null);

  const handleRowClick = (slipId: string) => {
    setExpandedSlipId((prev) => (prev === slipId ? null : slipId));
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Retailer
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Date
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Amount
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Risk
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Confidence
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider">
                Submitted
              </th>
            </tr>
          </thead>
          {slips.map((slip) => {
              const isExpanded = expandedSlipId === slip.id;
              const statusStyle = getStatusStyle(slip.status);
              const riskStyle = getRiskStyle(slip.fraud_risk_level);
              const confidence = slip.extraction_confidence
                ? Math.round(slip.extraction_confidence * 100)
                : null;
              const confColor =
                confidence === null
                  ? "text-muted"
                  : confidence >= 90
                  ? "text-success"
                  : confidence >= 70
                  ? "text-warning"
                  : "text-danger";

              return (
                <tbody key={slip.id}>
                  <tr
                    onClick={() => handleRowClick(slip.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${
                      isExpanded
                        ? "bg-primary/5 border-primary/20"
                        : "hover:bg-background/50"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {slip.retailer_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-muted">{slip.store_branch ?? ""}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-foreground">{slip.slip_date ?? "—"}</p>
                      <p className="text-xs text-muted">{slip.slip_time ?? ""}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {slip.total_amount !== null
                          ? `R ${slip.total_amount.toFixed(2)}`
                          : "—"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {slip.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}
                      >
                        {slip.fraud_risk_level ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-semibold ${confColor}`}>
                        {confidence !== null ? `${confidence}%` : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-foreground">{formatDate(slip.created_at)}</p>
                      <p className="text-xs text-muted">{formatTime(slip.created_at)}</p>
                    </td>
                  </tr>
                  {isExpanded && (
                    <SlipDetailView
                      slip={slip}
                      onClose={() => setExpandedSlipId(null)}
                    />
                  )}
                </tbody>
              );
            })}
        </table>
      </div>
    </div>
  );
}
