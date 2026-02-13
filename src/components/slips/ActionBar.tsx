"use client";

import { useState } from "react";
import { Slip } from "@/types/slips";

interface ActionBarProps {
  slip: Slip;
  hasCorrections: boolean;
  moderatorName: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCorrectAndApprove: () => void;
  onEscalate: (note: string) => void;
  onAddNote: (note: string) => void;
}

const rejectionReasons = [
  "Not a valid receipt",
  "Duplicate submission",
  "Expired (older than 7 days)",
  "Unapproved retailer",
  "Insufficient data / unreadable",
  "Fraudulent / tampered",
  "Other",
];

export default function ActionBar({
  slip,
  hasCorrections,
  moderatorName,
  onApprove,
  onReject,
  onCorrectAndApprove,
  onEscalate,
  onAddNote,
}: ActionBarProps) {
  const [showRejectDropdown, setShowRejectDropdown] = useState(false);
  const [showEscalateInput, setShowEscalateInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [escalateNote, setEscalateNote] = useState("");
  const [noteText, setNoteText] = useState("");

  const isFinalized = ["approved", "rejected", "auto_approved", "auto_rejected"].includes(slip.status);

  return (
    <div className="sticky bottom-0 border-t border-border bg-card px-5 py-3">
      {/* Rejection dropdown */}
      {showRejectDropdown && (
        <div className="mb-3 p-3 bg-background rounded-lg border border-border">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            Select rejection reason
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {rejectionReasons.map((reason) => (
              <button
                key={reason}
                onClick={() => {
                  onReject(reason);
                  setShowRejectDropdown(false);
                }}
                className="text-left text-sm px-3 py-2 rounded-md hover:bg-danger/10 hover:text-danger text-foreground transition-colors border border-border/50"
              >
                {reason}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowRejectDropdown(false)}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Escalate input */}
      {showEscalateInput && (
        <div className="mb-3 p-3 bg-background rounded-lg border border-border">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            Escalation note
          </p>
          <textarea
            value={escalateNote}
            onChange={(e) => setEscalateNote(e.target.value)}
            placeholder="Describe why this needs senior review..."
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-warning resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (escalateNote.trim()) {
                  onEscalate(escalateNote.trim());
                  setEscalateNote("");
                  setShowEscalateInput(false);
                }
              }}
              className="px-3 py-1.5 bg-warning text-black text-xs font-semibold rounded-md hover:bg-warning/90 transition-colors"
            >
              Submit Escalation
            </button>
            <button
              onClick={() => {
                setShowEscalateInput(false);
                setEscalateNote("");
              }}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="mb-3 p-3 bg-background rounded-lg border border-border">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            Add a note
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter your note..."
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-muted resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (noteText.trim()) {
                  onAddNote(noteText.trim());
                  setNoteText("");
                  setShowNoteInput(false);
                }
              }}
              className="px-3 py-1.5 bg-muted/30 text-foreground text-xs font-semibold rounded-md hover:bg-muted/40 transition-colors"
            >
              Save Note
            </button>
            <button
              onClick={() => {
                setShowNoteInput(false);
                setNoteText("");
              }}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons + moderator info */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!isFinalized && (
            <>
              <button
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-success text-white text-sm font-semibold rounded-lg hover:bg-success/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve
              </button>

              <button
                onClick={() => {
                  setShowRejectDropdown(!showRejectDropdown);
                  setShowEscalateInput(false);
                  setShowNoteInput(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-danger/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>

              {hasCorrections && (
                <button
                  onClick={onCorrectAndApprove}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Correct &amp; Approve
                </button>
              )}

              <button
                onClick={() => {
                  setShowEscalateInput(!showEscalateInput);
                  setShowRejectDropdown(false);
                  setShowNoteInput(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-warning/20 text-warning text-sm font-semibold rounded-lg hover:bg-warning/30 transition-colors border border-warning/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Escalate
              </button>
            </>
          )}

          <button
            onClick={() => {
              setShowNoteInput(!showNoteInput);
              setShowRejectDropdown(false);
              setShowEscalateInput(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted/10 text-muted text-sm font-medium rounded-lg hover:bg-muted/20 hover:text-foreground transition-colors border border-border"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Add Note
          </button>
        </div>

        {/* Moderator info */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-muted">Reviewing as</p>
          <p className="text-sm font-medium text-foreground">{moderatorName}</p>
        </div>
      </div>
    </div>
  );
}
