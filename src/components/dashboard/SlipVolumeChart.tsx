"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { VolumeDataPoint } from "@/hooks/useDashboardData";

interface SlipVolumeChartProps {
  data: VolumeDataPoint[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export default function SlipVolumeChart({ data }: SlipVolumeChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <h3 className="text-sm font-semibold text-foreground mb-4">Slip Volume</h3>
      <p className="text-xs text-muted mb-4">Daily slip count — last 30 days</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: "#94a3b8" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: "#94a3b8" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
              labelFormatter={(label) => formatDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
