import SlipTable from "@/components/slips/SlipTable";
import { mockSlips } from "@/lib/mock-slips";

export default function SlipsPage() {
  // In production, this would fetch from Supabase with filters
  const slips = mockSlips;

  const pendingCount = slips.filter((s) =>
    ["pending", "processing", "manual_review"].includes(s.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Slips Queue</h1>
          <p className="text-muted mt-1">
            {pendingCount} slip{pendingCount !== 1 ? "s" : ""} awaiting review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Click a row to expand details</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Manual Review",
            count: slips.filter((s) => s.status === "manual_review").length,
            color: "text-warning",
          },
          {
            label: "Auto Approved",
            count: slips.filter((s) => s.status === "auto_approved").length,
            color: "text-success",
          },
          {
            label: "Approved",
            count: slips.filter((s) => s.status === "approved" || s.status === "corrected").length,
            color: "text-primary",
          },
          {
            label: "Rejected",
            count: slips.filter((s) =>
              ["rejected", "auto_rejected"].includes(s.status)
            ).length,
            color: "text-danger",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <p className="text-xs text-muted">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <SlipTable slips={slips} />
    </div>
  );
}
