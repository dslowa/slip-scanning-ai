"use client";

import { SlipStatus } from "@/types/slip";

const statusConfig: Record<
  SlipStatus,
  { label: string; className: string; icon?: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
  processing: {
    label: "Processing",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    icon: (
      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ),
  },
  auto_approved: {
    label: "Auto Approved",
    className: "bg-success/15 text-success border-success/30",
  },
  auto_rejected: {
    label: "Auto Rejected",
    className: "bg-danger/15 text-danger border-danger/30",
  },
  manual_review: {
    label: "Needs Review",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  approved: {
    label: "Approved",
    className: "bg-success/15 text-success border-success/30",
    icon: (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  rejected: {
    label: "Rejected",
    className: "bg-danger/15 text-danger border-danger/30",
  },
  corrected: {
    label: "Corrected",
    className: "bg-primary/15 text-primary border-primary/30",
  },
};

export default function StatusBadge({ status }: { status: SlipStatus }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
