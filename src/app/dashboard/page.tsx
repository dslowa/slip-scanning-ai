"use client";

import { useDashboardData } from "@/hooks/useDashboardData";
import StatCard from "@/components/dashboard/StatCard";
import SlipVolumeChart from "@/components/dashboard/SlipVolumeChart";
import StatusBreakdownChart from "@/components/dashboard/StatusBreakdownChart";
import TopRetailersChart from "@/components/dashboard/TopRetailersChart";
import ProcessingCostChart from "@/components/dashboard/ProcessingCostChart";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";
import FlaggedSlipsList from "@/components/dashboard/FlaggedSlipsList";

export default function DashboardPage() {
  const {
    stats,
    volumeData,
    statusBreakdown,
    topRetailers,
    costData,
    monthlyTotalCost,
    recentActivity,
    flaggedSlips,
    loading,
    error,
  } = useDashboardData();

  // Compute trend for today vs yesterday
  const slipTrend = (() => {
    if (stats.yesterdaySlips === 0 && stats.todaySlips === 0) {
      return { value: "no change", direction: "neutral" as const };
    }
    if (stats.yesterdaySlips === 0) {
      return { value: "+100% vs yesterday", direction: "up" as const };
    }
    const pct = ((stats.todaySlips - stats.yesterdaySlips) / stats.yesterdaySlips) * 100;
    const rounded = Math.abs(Math.round(pct));
    if (pct > 0) return { value: `+${rounded}% vs yesterday`, direction: "up" as const };
    if (pct < 0) return { value: `-${rounded}% vs yesterday`, direction: "down" as const };
    return { value: "no change", direction: "neutral" as const };
  })();

  // Auto-approved rate
  const autoApprovedRate =
    stats.totalToday > 0
      ? Math.round((stats.autoApprovedToday / stats.totalToday) * 100)
      : 0;

  const autoApprovedTrend =
    autoApprovedRate >= 80
      ? { value: "On target", direction: "up" as const }
      : autoApprovedRate >= 50
        ? { value: "Below target", direction: "neutral" as const }
        : { value: "Needs attention", direction: "down" as const };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted mt-1">Overview of slip scanning activity</p>
        </div>
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 text-center">
          <p className="text-danger font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-muted mt-2">{error}</p>
          <p className="text-xs text-muted mt-4">
            Make sure your Supabase environment variables are configured in{" "}
            <code className="text-primary">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted mt-1">Overview of slip scanning activity</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* TOP ROW — Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Slips"
          value={stats.todaySlips}
          trend={slipTrend}
          color="primary"
        />
        <StatCard
          title="Auto-Approved Rate"
          value={`${autoApprovedRate}%`}
          trend={autoApprovedTrend}
          color="success"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          subtitle="awaiting moderator"
          color="warning"
          highlight={stats.pendingReview > 50}
        />
        <StatCard
          title="Fraud Detected"
          value={stats.fraudDetectedToday}
          subtitle="high risk today"
          color="danger"
        />
      </div>

      {/* SECOND ROW — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SlipVolumeChart data={volumeData} />
        <StatusBreakdownChart data={statusBreakdown} />
      </div>

      {/* THIRD ROW — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopRetailersChart data={topRetailers} />
        <ProcessingCostChart data={costData} monthlyTotal={monthlyTotalCost} />
      </div>

      {/* FOURTH ROW — Activity & Flagged */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityFeed data={recentActivity} />
        <FlaggedSlipsList data={flaggedSlips} />
      </div>
    </div>
  );
}
