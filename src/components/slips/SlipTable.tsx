"use client";

import { Fragment } from "react";
import { Slip } from "@/types/slip";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/lib/supabase";

interface SlipTableProps {
  slips: Slip[];
  loading: boolean;
  selectedIndex: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSelect: (index: number) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return timeStr.substring(0, 5);
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "\u2014";
  return `R${Number(amount).toFixed(2)}`;
}

function getImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  const { data } = supabase.storage.from("slip-images").getPublicUrl(imageUrl);
  return data.publicUrl;
}

function getRiskDotColor(level: string | null): string {
  switch (level) {
    case "LOW":
      return "bg-success";
    case "MEDIUM":
      return "bg-warning";
    case "HIGH":
      return "bg-danger";
    default:
      return "bg-gray-500";
  }
}

function getRowBorderClass(slip: Slip): string {
  if (slip.fraud_risk_level === "HIGH")
    return "border-l-2 border-l-danger/60";
  if (slip.status === "manual_review")
    return "border-l-2 border-l-warning/60";
  return "border-l-2 border-l-transparent";
}

export default function SlipTable({
  slips,
  loading,
  selectedIndex,
  expandedIds,
  onToggleExpand,
  onApprove,
  onReject,
  onSelect,
}: SlipTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg
          className="w-6 h-6 animate-spin text-primary"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="ml-3 text-muted">Loading slips...</span>
      </div>
    );
  }

  if (slips.length === 0) {
    return (
      <div className="text-center py-20 text-muted">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg">No slips found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-card/50">
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left w-14">
              {/* Thumbnail */}
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Date &amp; Time
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Retailer
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Items
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Total
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Status
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Risk
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left">
              Confidence
            </th>
            <th className="py-3 px-3 text-xs font-medium text-muted uppercase tracking-wider text-left w-28">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {slips.map((slip, index) => {
            const isExpanded = expandedIds.has(slip.id);
            const isSelected = index === selectedIndex;
            const imgUrl = getImageUrl(slip.image_url);

            return (
              <Fragment key={slip.id}>
                <tr
                  onClick={() => {
                    onSelect(index);
                    onToggleExpand(slip.id);
                  }}
                  className={`
                    ${getRowBorderClass(slip)}
                    ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}
                    ${isExpanded ? "bg-card/40" : "hover:bg-card/30"}
                    border-b border-border/50 cursor-pointer transition-colors
                  `}
                >
                  {/* Thumbnail */}
                  <td className="py-2 px-3">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt="Slip"
                        className="w-10 h-10 rounded object-cover bg-card"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-card border border-border/50 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-muted/40"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </td>

                  {/* Date & Time */}
                  <td className="py-2 px-3">
                    <div className="text-sm text-foreground">
                      {formatDate(slip.slip_date)}
                    </div>
                    <div className="text-xs text-muted">
                      {formatTime(slip.slip_time)}
                    </div>
                  </td>

                  {/* Retailer */}
                  <td className="py-2 px-3">
                    <div className="text-sm text-foreground">
                      {slip.retailer_name || "\u2014"}
                    </div>
                    {slip.store_branch && (
                      <div className="text-xs text-muted">
                        {slip.store_branch}
                      </div>
                    )}
                  </td>

                  {/* Items */}
                  <td className="py-2 px-3 text-sm text-foreground">
                    {slip.line_items_count != null
                      ? `${slip.line_items_count} items`
                      : "\u2014"}
                  </td>

                  {/* Total */}
                  <td className="py-2 px-3 text-sm font-medium text-foreground">
                    {formatCurrency(slip.total_amount)}
                  </td>

                  {/* Status */}
                  <td className="py-2 px-3">
                    <StatusBadge status={slip.status} />
                  </td>

                  {/* Risk */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${getRiskDotColor(slip.fraud_risk_level)}`}
                      />
                      <span className="text-sm text-foreground">
                        {slip.fraud_risk_score != null
                          ? Number(slip.fraud_risk_score).toFixed(2)
                          : "\u2014"}
                      </span>
                    </div>
                  </td>

                  {/* Confidence */}
                  <td className="py-2 px-3">
                    {slip.extraction_confidence != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.round(Number(slip.extraction_confidence) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {Math.round(Number(slip.extraction_confidence) * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{"\u2014"}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpand(slip.id);
                        }}
                        className="p-1.5 rounded hover:bg-background text-muted hover:text-foreground transition-colors"
                        title="Expand details"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(slip.id);
                        }}
                        className="p-1.5 rounded hover:bg-success/10 text-muted hover:text-success transition-colors"
                        title="Approve"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(slip.id);
                        }}
                        className="p-1.5 rounded hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                        title="Reject"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {isExpanded && (
                  <tr>
                    <td
                      colSpan={9}
                      className="bg-card/30 border-b border-border p-0"
                    >
                      <ExpandedDetail slip={slip} imgUrl={imgUrl} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpandedDetail({
  slip,
  imgUrl,
}: {
  slip: Slip;
  imgUrl: string | null;
}) {
  return (
    <div className="p-5 flex gap-6">
      {/* Slip image */}
      <div className="flex-shrink-0">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt="Slip image"
            className="w-48 h-64 rounded-lg object-cover bg-card border border-border"
          />
        ) : (
          <div className="w-48 h-64 rounded-lg bg-card border border-border flex items-center justify-center">
            <span className="text-muted text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <DetailField label="Receipt #" value={slip.receipt_number} />
          <DetailField label="User ID" value={slip.user_id} />
          <DetailField label="Payment Method" value={slip.payment_method} />
          <DetailField label="Till Number" value={slip.till_number} />
          <DetailField
            label="VAT Amount"
            value={
              slip.vat_amount != null ? formatCurrency(slip.vat_amount) : null
            }
          />
          <DetailField label="Barcode" value={slip.barcode_data} />
          <DetailField label="AI Model" value={slip.ai_model_used} />
          <DetailField
            label="Processing Time"
            value={
              slip.ai_processing_time_ms != null
                ? `${slip.ai_processing_time_ms}ms`
                : null
            }
          />
          <DetailField
            label="AI Cost"
            value={
              slip.ai_cost_usd != null
                ? `$${Number(slip.ai_cost_usd).toFixed(4)}`
                : null
            }
          />
          <DetailField
            label="Approved Retailer"
            value={
              slip.approved_retailer != null
                ? slip.approved_retailer
                  ? "Yes"
                  : "No"
                : null
            }
          />
          <DetailField
            label="Within 7 Days"
            value={
              slip.slip_within_7_days != null
                ? slip.slip_within_7_days
                  ? "Yes"
                  : "No"
                : null
            }
          />
          <DetailField
            label="Direct Photo"
            value={
              slip.is_direct_photo != null
                ? slip.is_direct_photo
                  ? "Yes"
                  : "No"
                : null
            }
          />
          <DetailField
            label="Duplicate"
            value={slip.is_duplicate ? "Yes" : "No"}
          />
          <DetailField
            label="Corrected"
            value={slip.was_corrected ? "Yes" : "No"}
          />
          <DetailField
            label="Recommended Action"
            value={slip.recommended_action}
          />
        </div>

        {/* Fraud flags */}
        {slip.fraud_flags && slip.fraud_flags.length > 0 && (
          <div className="mt-4">
            <span className="text-muted text-xs uppercase tracking-wider font-medium">
              Fraud Flags
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {slip.fraud_flags.map((flag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs bg-danger/10 text-danger border border-danger/20"
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review notes */}
        {slip.review_notes && (
          <div className="mt-4">
            <span className="text-muted text-xs uppercase tracking-wider font-medium">
              Review Notes
            </span>
            <p className="text-sm text-foreground mt-1">{slip.review_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <span className="text-muted text-xs uppercase tracking-wider font-medium">
        {label}
      </span>
      <p className="text-foreground mt-0.5">{value || "\u2014"}</p>
    </div>
  );
}
