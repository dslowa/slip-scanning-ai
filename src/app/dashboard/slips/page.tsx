"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Slip, SlipFilters } from "@/types/slip";
import FilterBar from "@/components/slips/FilterBar";
import SlipTable from "@/components/slips/SlipTable";
import Pagination from "@/components/slips/Pagination";

const PAGE_SIZE = 50;

const defaultFilters: SlipFilters = {
  status: "all",
  dateFrom: "",
  dateTo: "",
  retailer: "all",
  riskLevel: "all",
  search: "",
  sortBy: "date_desc",
};

export default function SlipsPage() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SlipFilters>(defaultFilters);
  const [retailers, setRetailers] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newSlipsBuffer, setNewSlipsBuffer] = useState<Slip[]>([]);

  // Fetch distinct retailers for the filter dropdown
  useEffect(() => {
    async function fetchRetailers() {
      const { data } = await supabase
        .from("slips")
        .select("retailer_name")
        .not("retailer_name", "is", null)
        .order("retailer_name");

      if (data) {
        const unique = Array.from(
          new Set(
            data
              .map((d: { retailer_name: string | null }) => d.retailer_name)
              .filter(Boolean) as string[]
          )
        );
        setRetailers(unique);
      }
    }
    fetchRetailers();
  }, []);

  // Fetch slips based on current filters and page
  const fetchSlips = useCallback(async () => {
    setLoading(true);

    let query = supabase.from("slips").select("*", { count: "exact" });

    // Status filter
    if (filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Date range
    if (filters.dateFrom) {
      query = query.gte("slip_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("slip_date", filters.dateTo);
    }

    // Retailer
    if (filters.retailer !== "all") {
      query = query.eq("retailer_name", filters.retailer);
    }

    // Risk level
    if (filters.riskLevel !== "all") {
      query = query.eq("fraud_risk_level", filters.riskLevel);
    }

    // Search across receipt number, user ID, and retailer name
    if (filters.search.trim()) {
      const term = filters.search.trim();
      query = query.or(
        `receipt_number.ilike.%${term}%,user_id.ilike.%${term}%,retailer_name.ilike.%${term}%`
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case "date_asc":
        query = query.order("created_at", { ascending: true });
        break;
      case "total_desc":
        query = query.order("total_amount", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "risk_desc":
        query = query.order("fraud_risk_score", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "date_desc":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (!error && data) {
      setSlips(data as Slip[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  // Reset page and selection when filters change
  const handleFiltersChange = useCallback((newFilters: SlipFilters) => {
    setFilters(newFilters);
    setPage(1);
    setSelectedIndex(-1);
    setExpandedIds(new Set());
  }, []);

  // Supabase realtime subscription for new inserts and updates
  useEffect(() => {
    const channel = supabase
      .channel("slips-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "slips" },
        (payload) => {
          setNewSlipsBuffer((prev) => [payload.new as Slip, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "slips" },
        (payload) => {
          const updated = payload.new as Slip;
          setSlips((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load buffered new slips into the table
  const loadNewSlips = useCallback(() => {
    if (page === 1 && filters.sortBy === "date_desc") {
      setSlips((prev) => [...newSlipsBuffer, ...prev].slice(0, PAGE_SIZE));
      setTotalCount((prev) => prev + newSlipsBuffer.length);
    } else {
      fetchSlips();
    }
    setNewSlipsBuffer([]);
  }, [page, filters.sortBy, newSlipsBuffer, fetchSlips]);

  // Toggle row expansion
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Approve a slip (optimistic update)
  const handleApprove = useCallback(async (id: string) => {
    setSlips((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "approved" as const,
              reviewed_at: new Date().toISOString(),
            }
          : s
      )
    );
    await supabase
      .from("slips")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  // Reject a slip (optimistic update)
  const handleReject = useCallback(async (id: string) => {
    setSlips((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "rejected" as const,
              reviewed_at: new Date().toISOString(),
            }
          : s
      )
    );
    await supabase
      .from("slips")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, slips.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < slips.length) {
            toggleExpand(slips[selectedIndex].id);
          }
          break;
        case "a":
        case "A":
          if (selectedIndex >= 0 && selectedIndex < slips.length) {
            handleApprove(slips[selectedIndex].id);
          }
          break;
        case "r":
        case "R":
          if (selectedIndex >= 0 && selectedIndex < slips.length) {
            handleReject(slips[selectedIndex].id);
          }
          break;
        case "e":
        case "E":
          if (selectedIndex >= 0 && selectedIndex < slips.length) {
            toggleExpand(slips[selectedIndex].id);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [slips, selectedIndex, toggleExpand, handleApprove, handleReject]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Slips Queue
          </h1>
          <p className="text-sm text-muted mt-1">
            Review and manage submitted till slips
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">
              &uarr;&darr;
            </kbd>{" "}
            Navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">
              Enter
            </kbd>{" "}
            Expand
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">
              A
            </kbd>{" "}
            Approve
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">
              R
            </kbd>{" "}
            Reject
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[10px] font-mono">
              E
            </kbd>{" "}
            Edit
          </span>
        </div>
      </div>

      {/* New slips notification */}
      {newSlipsBuffer.length > 0 && (
        <button
          onClick={loadNewSlips}
          className="w-full py-2.5 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
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
              d="M7 11l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
          {newSlipsBuffer.length} new slip
          {newSlipsBuffer.length !== 1 ? "s" : ""} &mdash; click to load
        </button>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        retailers={retailers}
      />

      {/* Slip table */}
      <SlipTable
        slips={slips}
        loading={loading}
        selectedIndex={selectedIndex}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onApprove={handleApprove}
        onReject={handleReject}
        onSelect={setSelectedIndex}
      />

      {/* Pagination */}
      {!loading && slips.length > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
