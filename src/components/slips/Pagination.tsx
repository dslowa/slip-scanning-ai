"use client";

import { useState } from "react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: PaginationProps) {
  const [jumpTo, setJumpTo] = useState("");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  const handleJump = () => {
    const p = parseInt(jumpTo, 10);
    if (p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpTo("");
    }
  };

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <p className="text-sm text-muted">
        Showing{" "}
        <span className="text-foreground font-medium">
          {totalCount === 0 ? 0 : from}-{to}
        </span>{" "}
        of{" "}
        <span className="text-foreground font-medium">
          {totalCount.toLocaleString()}
        </span>{" "}
        slips
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <span className="text-sm text-muted">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>

        <div className="flex items-center gap-1.5 ml-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpTo}
            onChange={(e) => setJumpTo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJump()}
            placeholder="Page #"
            className="w-16 bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleJump}
            className="px-2 py-1.5 text-sm rounded-lg border border-border text-muted hover:text-foreground transition-colors"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
