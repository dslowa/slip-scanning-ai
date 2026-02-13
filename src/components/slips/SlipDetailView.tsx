"use client";

import { useState, useCallback } from "react";
import { Slip, CorrectedFields, CorrectedLineItem } from "@/types/slips";
import ImageViewer from "./ImageViewer";
import ExtractedDataTab from "./ExtractedDataTab";
import ValidationTab from "./ValidationTab";
import FraudAnalysisTab from "./FraudAnalysisTab";
import HistoryTab from "./HistoryTab";
import ActionBar from "./ActionBar";

interface SlipDetailViewProps {
  slip: Slip;
  onClose: () => void;
}

type TabId = "extracted" | "validation" | "fraud" | "history";

const tabs: { id: TabId; label: string }[] = [
  { id: "extracted", label: "Extracted Data" },
  { id: "validation", label: "Validation" },
  { id: "fraud", label: "Fraud Analysis" },
  { id: "history", label: "History" },
];

export default function SlipDetailView({ slip, onClose }: SlipDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("extracted");
  const [correctedFields, setCorrectedFields] = useState<CorrectedFields>({});
  const [correctedLineItems, setCorrectedLineItems] = useState<CorrectedLineItem[]>([]);
  const [localSlip, setLocalSlip] = useState<Slip>(slip);

  const hasCorrections =
    Object.keys(correctedFields).length > 0 || correctedLineItems.length > 0;

  const handleFieldCorrection = useCallback(
    (fieldName: string, original: string | number | null, corrected: string | number) => {
      setCorrectedFields((prev) => ({
        ...prev,
        [fieldName]: { original, corrected },
      }));
    },
    []
  );

  const handleLineItemCorrection = useCallback(
    (
      itemId: string,
      fieldName: string,
      original: string | number | null,
      corrected: string | number
    ) => {
      setCorrectedLineItems((prev) => {
        const existing = prev.find((c) => c.id === itemId);
        if (existing) {
          return prev.map((c) =>
            c.id === itemId
              ? { ...c, fields: { ...c.fields, [fieldName]: { original, corrected } } }
              : c
          );
        }
        return [...prev, { id: itemId, fields: { [fieldName]: { original, corrected } } }];
      });
    },
    []
  );

  const handleApprove = useCallback(() => {
    setLocalSlip((prev) => ({ ...prev, status: "approved" }));
    // In production: call supabase to update slip status + log activity
  }, []);

  const handleReject = useCallback((reason: string) => {
    setLocalSlip((prev) => ({ ...prev, status: "rejected", review_notes: reason }));
    // In production: call supabase to update slip status + log activity
  }, []);

  const handleCorrectAndApprove = useCallback(() => {
    setLocalSlip((prev) => ({
      ...prev,
      status: "corrected",
      was_corrected: true,
      corrected_data: {
        fields: correctedFields,
        lineItems: correctedLineItems,
      },
    }));
    // In production: save corrections to corrected_data jsonb, update status, log activity
  }, [correctedFields, correctedLineItems]);

  const handleEscalate = useCallback((note: string) => {
    setLocalSlip((prev) => ({
      ...prev,
      status: "manual_review",
      review_notes: `ESCALATED: ${note}`,
    }));
    // In production: update status, log escalation activity
  }, []);

  const handleAddNote = useCallback((note: string) => {
    setLocalSlip((prev) => ({
      ...prev,
      activity_log: [
        ...(prev.activity_log ?? []),
        {
          id: `note-${Date.now()}`,
          slip_id: prev.id,
          moderator_id: "current-mod",
          action: "noted" as const,
          details: note,
          created_at: new Date().toISOString(),
          moderator: { name: "Current Moderator", email: "mod@savvysaver.co.za" },
        },
      ],
    }));
    // In production: insert into activity_log
  }, []);

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className="border-t border-primary/30 bg-card/80 backdrop-blur animate-in slide-in-from-top-2">
          {/* Save corrections banner */}
          {hasCorrections && (
            <div className="flex items-center justify-between px-5 py-2.5 bg-primary/10 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="text-sm text-primary font-medium">
                  {Object.keys(correctedFields).length + correctedLineItems.reduce((sum, li) => sum + Object.keys(li.fields).length, 0)} field(s) modified
                </span>
              </div>
              <button
                onClick={handleCorrectAndApprove}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors"
              >
                Save Corrections
              </button>
            </div>
          )}

          {/* Main content area */}
          <div className="flex flex-col lg:flex-row">
            {/* Left: Image (40%) */}
            <div className="lg:w-[40%] p-5 border-b lg:border-b-0 lg:border-r border-border">
              <div className="sticky top-4">
                <ImageViewer imageUrl={localSlip.image_url} alt={`Slip ${localSlip.id}`} />
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>ID: {localSlip.id.slice(0, 8)}...</span>
                  <span>User: {localSlip.user_id ?? "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Right: Tabbed content (60%) */}
            <div className="lg:w-[60%] flex flex-col min-h-[500px]">
              {/* Tab headers */}
              <div className="flex border-b border-border px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab.id
                        ? "text-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                ))}
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="ml-auto px-3 py-3 text-muted hover:text-foreground transition-colors"
                  title="Close detail view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === "extracted" && (
                  <ExtractedDataTab
                    slip={localSlip}
                    correctedFields={correctedFields}
                    correctedLineItems={correctedLineItems}
                    onFieldCorrection={handleFieldCorrection}
                    onLineItemCorrection={handleLineItemCorrection}
                  />
                )}
                {activeTab === "validation" && <ValidationTab slip={localSlip} />}
                {activeTab === "fraud" && <FraudAnalysisTab slip={localSlip} />}
                {activeTab === "history" && <HistoryTab slip={localSlip} />}
              </div>

              {/* Action bar */}
              <ActionBar
                slip={localSlip}
                hasCorrections={hasCorrections}
                moderatorName="Sarah Johnson"
                onApprove={handleApprove}
                onReject={handleReject}
                onCorrectAndApprove={handleCorrectAndApprove}
                onEscalate={handleEscalate}
                onAddNote={handleAddNote}
              />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
