"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { RetailerCount } from "@/hooks/useDashboardData";

interface TopRetailersChartProps {
  data: RetailerCount[];
}

export default function TopRetailersChart({ data }: TopRetailersChartProps) {
  const chartData = [...data].reverse();

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Retailers</h3>
      <p className="text-xs text-muted mb-4">Top 10 retailers by slip count</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: "#94a3b8" }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="retailer"
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: "#94a3b8" }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
