"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { StatusCount } from "@/hooks/useDashboardData";

interface StatusBreakdownChartProps {
  data: StatusCount[];
}

const STATUS_COLORS: Record<string, string> = {
  auto_approved: "#22c55e",
  auto_rejected: "#ef4444",
  manual_review: "#f59e0b",
  approved: "#3b82f6",
  rejected: "#a855f7",
  pending: "#94a3b8",
  processing: "#06b6d4",
  corrected: "#8b5cf6",
};

const STATUS_LABELS: Record<string, string> = {
  auto_approved: "Auto Approved",
  auto_rejected: "Auto Rejected",
  manual_review: "Manual Review",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  processing: "Processing",
  corrected: "Corrected",
};

export default function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d.status] || d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] || "#94a3b8",
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <h3 className="text-sm font-semibold text-foreground mb-4">Status Breakdown</h3>
      <p className="text-xs text-muted mb-4">Distribution of all slip statuses</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
