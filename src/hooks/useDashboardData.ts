"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const USD_TO_ZAR = 18.5;

function getDateRange() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return { todayStart, tomorrowStart, yesterdayStart, thirtyDaysAgo, monthStart };
}

export interface DashboardStats {
  todaySlips: number;
  yesterdaySlips: number;
  autoApprovedToday: number;
  totalToday: number;
  pendingReview: number;
  fraudDetectedToday: number;
}

export interface VolumeDataPoint {
  date: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RetailerCount {
  retailer: string;
  count: number;
}

export interface CostDataPoint {
  date: string;
  dailyCost: number;
  cumulative: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  moderator_name: string | null;
  slip_retailer: string | null;
  slip_amount: number | null;
}

export interface FlaggedSlip {
  id: string;
  created_at: string;
  retailer_name: string | null;
  total_amount: number | null;
  fraud_risk_score: number | null;
  fraud_flags: string[] | null;
  status: string;
}

export interface DashboardData {
  stats: DashboardStats;
  volumeData: VolumeDataPoint[];
  statusBreakdown: StatusCount[];
  topRetailers: RetailerCount[];
  costData: CostDataPoint[];
  monthlyTotalCost: number;
  recentActivity: ActivityItem[];
  flaggedSlips: FlaggedSlip[];
  loading: boolean;
  error: string | null;
}

function groupByDate(items: { created_at: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const date = new Date(item.created_at).toISOString().split("T")[0];
    counts[date] = (counts[date] || 0) + 1;
  }
  return counts;
}

function fillDateRange(start: Date, end: Date, data: Record<string, number>): VolumeDataPoint[] {
  const result: VolumeDataPoint[] = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    result.push({ date: dateStr, count: data[dateStr] || 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStats>({
    todaySlips: 0,
    yesterdaySlips: 0,
    autoApprovedToday: 0,
    totalToday: 0,
    pendingReview: 0,
    fraudDetectedToday: 0,
  });
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([]);
  const [topRetailers, setTopRetailers] = useState<RetailerCount[]>([]);
  const [costData, setCostData] = useState<CostDataPoint[]>([]);
  const [monthlyTotalCost, setMonthlyTotalCost] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [flaggedSlips, setFlaggedSlips] = useState<FlaggedSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { todayStart, tomorrowStart, yesterdayStart, thirtyDaysAgo, monthStart } = getDateRange();

      // Run all queries in parallel
      const [
        todayRes,
        yesterdayRes,
        autoApprovedRes,
        pendingRes,
        fraudRes,
        volumeRes,
        statusRes,
        retailerRes,
        costRes,
        monthlyCostRes,
        activityRes,
        flaggedRes,
      ] = await Promise.all([
        // Today's slip count
        supabase
          .from("slips")
          .select("*", { count: "exact", head: true })
          .gte("created_at", todayStart)
          .lt("created_at", tomorrowStart),

        // Yesterday's slip count
        supabase
          .from("slips")
          .select("*", { count: "exact", head: true })
          .gte("created_at", yesterdayStart)
          .lt("created_at", todayStart),

        // Auto-approved today
        supabase
          .from("slips")
          .select("*", { count: "exact", head: true })
          .gte("created_at", todayStart)
          .lt("created_at", tomorrowStart)
          .eq("status", "auto_approved"),

        // Pending review (all time)
        supabase
          .from("slips")
          .select("*", { count: "exact", head: true })
          .eq("status", "manual_review"),

        // Fraud detected today
        supabase
          .from("slips")
          .select("*", { count: "exact", head: true })
          .gte("created_at", todayStart)
          .lt("created_at", tomorrowStart)
          .eq("fraud_risk_level", "HIGH"),

        // Slip volume last 30 days
        supabase
          .from("slips")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true }),

        // Status breakdown
        supabase.from("slips").select("status"),

        // Top retailers
        supabase
          .from("slips")
          .select("retailer_name")
          .not("retailer_name", "is", null),

        // Processing cost last 30 days
        supabase
          .from("slips")
          .select("created_at, ai_cost_usd")
          .gte("created_at", thirtyDaysAgo)
          .not("ai_cost_usd", "is", null)
          .order("created_at", { ascending: true }),

        // Monthly total cost
        supabase
          .from("slips")
          .select("ai_cost_usd")
          .gte("created_at", monthStart)
          .not("ai_cost_usd", "is", null),

        // Recent activity with joins
        supabase
          .from("activity_log")
          .select("id, action, details, created_at, moderators(name), slips(retailer_name, total_amount)")
          .order("created_at", { ascending: false })
          .limit(20),

        // Flagged slips
        supabase
          .from("slips")
          .select("id, created_at, retailer_name, total_amount, fraud_risk_score, fraud_flags, status")
          .eq("fraud_risk_level", "HIGH")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Process stats
      setStats({
        todaySlips: todayRes.count ?? 0,
        yesterdaySlips: yesterdayRes.count ?? 0,
        autoApprovedToday: autoApprovedRes.count ?? 0,
        totalToday: todayRes.count ?? 0,
        pendingReview: pendingRes.count ?? 0,
        fraudDetectedToday: fraudRes.count ?? 0,
      });

      // Process volume data
      if (volumeRes.data) {
        const grouped = groupByDate(volumeRes.data);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        setVolumeData(fillDateRange(start, end, grouped));
      }

      // Process status breakdown
      if (statusRes.data) {
        const counts: Record<string, number> = {};
        for (const row of statusRes.data) {
          if (row.status) {
            counts[row.status] = (counts[row.status] || 0) + 1;
          }
        }
        setStatusBreakdown(
          Object.entries(counts)
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count)
        );
      }

      // Process top retailers
      if (retailerRes.data) {
        const counts: Record<string, number> = {};
        for (const row of retailerRes.data) {
          if (row.retailer_name) {
            counts[row.retailer_name] = (counts[row.retailer_name] || 0) + 1;
          }
        }
        setTopRetailers(
          Object.entries(counts)
            .map(([retailer, count]) => ({ retailer, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      }

      // Process cost data
      if (costRes.data) {
        const dailyCosts: Record<string, number> = {};
        for (const row of costRes.data) {
          const date = new Date(row.created_at).toISOString().split("T")[0];
          const costZar = Number(row.ai_cost_usd) * USD_TO_ZAR;
          dailyCosts[date] = (dailyCosts[date] || 0) + costZar;
        }
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const costPoints: CostDataPoint[] = [];
        let cumulative = 0;
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split("T")[0];
          const daily = dailyCosts[dateStr] || 0;
          cumulative += daily;
          costPoints.push({
            date: dateStr,
            dailyCost: Math.round(daily * 100) / 100,
            cumulative: Math.round(cumulative * 100) / 100,
          });
          current.setDate(current.getDate() + 1);
        }
        setCostData(costPoints);
      }

      // Monthly total
      if (monthlyCostRes.data) {
        const total = monthlyCostRes.data.reduce(
          (sum, row) => sum + Number(row.ai_cost_usd) * USD_TO_ZAR,
          0
        );
        setMonthlyTotalCost(Math.round(total * 100) / 100);
      }

      // Process activity
      if (activityRes.data) {
        setRecentActivity(
          activityRes.data.map((row) => {
            const mod = row.moderators as unknown as { name: string } | null;
            const slip = row.slips as unknown as { retailer_name: string; total_amount: number } | null;
            return {
              id: row.id,
              action: row.action,
              details: row.details,
              created_at: row.created_at,
              moderator_name: mod?.name ?? null,
              slip_retailer: slip?.retailer_name ?? null,
              slip_amount: slip?.total_amount ?? null,
            };
          })
        );
      }

      // Flagged slips
      if (flaggedRes.data) {
        setFlaggedSlips(flaggedRes.data as FlaggedSlip[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
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
  };
}
