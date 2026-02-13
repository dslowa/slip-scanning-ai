"use client";

import { SlipFilters } from "@/types/slip";

interface FilterBarProps {
  filters: SlipFilters;
  onChange: (filters: SlipFilters) => void;
  retailers: string[];
}

const inputClass =
  "bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

export default function FilterBar({
  filters,
  onChange,
  retailers,
}: FilterBarProps) {
  const update = (key: keyof SlipFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const applyQuickFilter = (type: "needs_review" | "flagged" | "today") => {
    const base: SlipFilters = {
      status: "all",
      dateFrom: "",
      dateTo: "",
      retailer: "all",
      riskLevel: "all",
      search: "",
      sortBy: "date_desc",
    };

    switch (type) {
      case "needs_review":
        onChange({ ...base, status: "manual_review" });
        break;
      case "flagged":
        onChange({ ...base, riskLevel: "HIGH" });
        break;
      case "today": {
        const today = new Date().toISOString().split("T")[0];
        onChange({ ...base, dateFrom: today, dateTo: today });
        break;
      }
    }
  };

  const isQuickActive = (type: "needs_review" | "flagged" | "today") => {
    switch (type) {
      case "needs_review":
        return filters.status === "manual_review";
      case "flagged":
        return filters.riskLevel === "HIGH";
      case "today": {
        const today = new Date().toISOString().split("T")[0];
        return filters.dateFrom === today && filters.dateTo === today;
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Main filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className={inputClass}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="auto_approved">Auto Approved</option>
          <option value="auto_rejected">Auto Rejected</option>
          <option value="manual_review">Manual Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="corrected">Corrected</option>
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update("dateFrom", e.target.value)}
            className={inputClass}
          />
          <span className="text-muted text-xs">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => update("dateTo", e.target.value)}
            className={inputClass}
          />
        </div>

        <select
          value={filters.retailer}
          onChange={(e) => update("retailer", e.target.value)}
          className={inputClass}
        >
          <option value="all">All Retailers</option>
          {retailers.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={filters.riskLevel}
          onChange={(e) => update("riskLevel", e.target.value)}
          className={inputClass}
        >
          <option value="all">All Risk Levels</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search receipt #, user, retailer..."
            className={`${inputClass} pl-8 w-64`}
          />
        </div>

        <select
          value={filters.sortBy}
          onChange={(e) => update("sortBy", e.target.value)}
          className={inputClass}
        >
          <option value="date_desc">Date (newest first)</option>
          <option value="date_asc">Date (oldest first)</option>
          <option value="total_desc">Total amount (high to low)</option>
          <option value="risk_desc">Risk score (high to low)</option>
        </select>
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted mr-1">Quick:</span>
        {(
          [
            { key: "needs_review" as const, label: "Needs Review" },
            { key: "flagged" as const, label: "Flagged" },
            { key: "today" as const, label: "Today's Slips" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => applyQuickFilter(key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isQuickActive(key)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
