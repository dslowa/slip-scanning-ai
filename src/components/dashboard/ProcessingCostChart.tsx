"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { CostDataPoint } from "@/hooks/useDashboardData";

interface ProcessingCostChartProps {
  data: CostDataPoint[];
  monthlyTotal: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export default function ProcessingCostChart({ data, monthlyTotal }: ProcessingCostChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Processing Cost</h3>
          <p className="text-xs text-muted mt-1">Daily AI cost in ZAR — last 30 days</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Monthly Total</p>
          <p className="text-lg font-bold text-warning">R{monthlyTotal.toLocaleString("en-ZA")}</p>
        </div>
      </div>
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
              tickFormatter={(v) => `R${v}`}
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
              formatter={(value, name) => [
                `R${Number(value).toFixed(2)}`,
                name === "dailyCost" ? "Daily Cost" : "Cumulative",
              ]}
            />
            <Legend
              iconType="line"
              iconSize={12}
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              formatter={(value) => (value === "dailyCost" ? "Daily Cost" : "Cumulative")}
            />
            <Line
              type="monotone"
              dataKey="dailyCost"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#f59e0b" }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
