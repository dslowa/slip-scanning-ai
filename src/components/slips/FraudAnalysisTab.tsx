"use client";

import { Slip } from "@/types/slips";

interface FraudAnalysisTabProps {
  slip: Slip;
}

function RiskScoreDisplay({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="text-center py-6">
        <p className="text-4xl font-bold text-muted">N/A</p>
        <p className="text-sm text-muted mt-1">No risk score available</p>
      </div>
    );
  }

  const pct = Math.round(score * 100);
  const color =
    pct <= 25
      ? "text-success"
      : pct <= 50
      ? "text-warning"
      : pct <= 75
      ? "text-orange-400"
      : "text-danger";
  const bgColor =
    pct <= 25
      ? "bg-success/10 border-success/20"
      : pct <= 50
      ? "bg-warning/10 border-warning/20"
      : pct <= 75
      ? "bg-orange-400/10 border-orange-400/20"
      : "bg-danger/10 border-danger/20";
  const riskLabel =
    pct <= 25 ? "Low Risk" : pct <= 50 ? "Medium Risk" : pct <= 75 ? "High Risk" : "Critical Risk";

  // SVG circle progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className={`flex items-center gap-6 p-5 rounded-xl border ${bgColor}`}>
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            className={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <div>
        <p className={`text-lg font-bold ${color}`}>{riskLabel}</p>
        <p className="text-sm text-muted mt-1">
          Fraud risk score based on AI analysis of photo authenticity, content consistency, and
          tampering indicators.
        </p>
      </div>
    </div>
  );
}

function AnalysisSection({
  title,
  confidence,
  flags,
}: {
  title: string;
  confidence: number | null;
  flags: string[];
}) {
  const pct = confidence !== null ? Math.round(confidence * 100) : null;
  const barColor =
    pct === null
      ? "bg-muted"
      : pct >= 80
      ? "bg-success"
      : pct >= 50
      ? "bg-warning"
      : "bg-danger";

  return (
    <div className="p-4 rounded-lg border border-border bg-background/30">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-foreground">{title}</h5>
        <span className="text-sm font-mono text-muted">
          {pct !== null ? `${pct}%` : "N/A"}
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {flags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => {
            const flagColor = getFlagColor(flag);
            return (
              <span
                key={flag}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${flagColor}`}
              >
                {formatFlag(flag)}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">No flags detected</p>
      )}
    </div>
  );
}

function getFlagColor(flag: string): string {
  const highRisk = ["duplicate_receipt", "different_user", "metadata_stripped", "tampering_detected"];
  const medRisk = ["screenshot_detected", "low_resolution", "metadata_mismatch", "slight_blur"];
  const lowRisk = ["minor_artifact"];

  if (highRisk.includes(flag)) return "bg-danger/20 text-danger border border-danger/30";
  if (medRisk.includes(flag)) return "bg-warning/20 text-warning border border-warning/30";
  if (lowRisk.includes(flag)) return "bg-primary/20 text-primary border border-primary/30";
  return "bg-muted/20 text-muted border border-muted/30";
}

function formatFlag(flag: string): string {
  return flag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function FraudAnalysisTab({ slip }: FraudAnalysisTabProps) {
  const fraudFlags = slip.fraud_flags ?? [];

  // Categorize flags into analysis sections
  const photoFlags = fraudFlags.filter((f) =>
    ["screenshot_detected", "low_resolution", "is_scan", "not_direct_photo"].includes(f)
  );
  const tamperingFlags = fraudFlags.filter((f) =>
    ["tampering_detected", "metadata_stripped", "metadata_mismatch", "slight_blur"].includes(f)
  );
  const consistencyFlags = fraudFlags.filter((f) =>
    ["duplicate_receipt", "different_user", "amount_mismatch", "date_inconsistency"].includes(f)
  );

  // Derive section confidences from fraud_risk_score (simulated breakdown)
  const baseConfidence = slip.fraud_risk_score !== null ? 1 - slip.fraud_risk_score : null;
  const photoConfidence =
    baseConfidence !== null
      ? slip.is_direct_photo
        ? Math.min(baseConfidence + 0.1, 1)
        : Math.max(baseConfidence - 0.15, 0)
      : null;
  const tamperingConfidence =
    baseConfidence !== null
      ? tamperingFlags.length === 0
        ? Math.min(baseConfidence + 0.05, 1)
        : Math.max(baseConfidence - 0.1 * tamperingFlags.length, 0)
      : null;
  const consistencyConfidence =
    baseConfidence !== null
      ? consistencyFlags.length === 0
        ? Math.min(baseConfidence + 0.05, 1)
        : Math.max(baseConfidence - 0.15 * consistencyFlags.length, 0)
      : null;

  return (
    <div className="space-y-5">
      <RiskScoreDisplay score={slip.fraud_risk_score} />

      <div className="space-y-3">
        <AnalysisSection
          title="Photo Authenticity"
          confidence={photoConfidence}
          flags={photoFlags.length > 0 ? photoFlags : slip.is_direct_photo === false ? ["not_direct_photo"] : []}
        />

        <AnalysisSection
          title="Tampering Detection"
          confidence={tamperingConfidence}
          flags={tamperingFlags}
        />

        <AnalysisSection
          title="Content Consistency"
          confidence={consistencyConfidence}
          flags={consistencyFlags}
        />
      </div>
    </div>
  );
}
