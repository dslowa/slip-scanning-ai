"use client";

import { useState, useCallback } from "react";
import { Slip, CorrectedFields, CorrectedLineItem } from "@/types/slips";

interface ExtractedDataTabProps {
  slip: Slip;
  correctedFields: CorrectedFields;
  correctedLineItems: CorrectedLineItem[];
  onFieldCorrection: (fieldName: string, original: string | number | null, corrected: string | number) => void;
  onLineItemCorrection: (
    itemId: string,
    fieldName: string,
    original: string | number | null,
    corrected: string | number
  ) => void;
}

interface EditableFieldProps {
  label: string;
  fieldName: string;
  value: string | number | null;
  corrected?: { original: string | number | null; corrected: string | number };
  onSave: (fieldName: string, original: string | number | null, corrected: string | number) => void;
}

function EditableField({ label, fieldName, value, corrected, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));

  const displayValue = corrected ? String(corrected.corrected) : String(value ?? "—");
  const hasCorrection = !!corrected;

  const handleSave = () => {
    if (editValue !== String(value ?? "")) {
      onSave(fieldName, value, editValue);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(String(corrected?.corrected ?? value ?? ""));
      setEditing(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-2 py-2 px-3 rounded-lg hover:bg-background/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted font-medium uppercase tracking-wider">{label}</p>
        {editing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="mt-1 w-full bg-background border border-primary rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        ) : (
          <div>
            <p className={`text-sm font-medium mt-0.5 ${hasCorrection ? "text-primary" : "text-foreground"}`}>
              {displayValue}
            </p>
            {hasCorrection && (
              <p className="text-xs text-muted line-through mt-0.5">
                Original: {String(corrected.original ?? "—")}
              </p>
            )}
          </div>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => {
            setEditValue(String(corrected?.corrected ?? value ?? ""));
            setEditing(true);
          }}
          className="mt-1 p-1 rounded hover:bg-border text-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Edit ${label}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface EditableCellProps {
  value: string | number | null;
  corrected?: { original: string | number | null; corrected: string | number };
  onSave: (original: string | number | null, corrected: string | number) => void;
  isNumeric?: boolean;
}

function EditableCell({ value, corrected, onSave, isNumeric }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));

  const displayValue = corrected ? String(corrected.corrected) : String(value ?? "—");
  const hasCorrection = !!corrected;

  const formatDisplay = (val: string) => {
    if (isNumeric && val !== "—") {
      const num = parseFloat(val);
      return isNaN(num) ? val : `R ${num.toFixed(2)}`;
    }
    return val;
  };

  const handleSave = () => {
    const newVal = isNumeric ? parseFloat(editValue) || editValue : editValue;
    if (String(newVal) !== String(value ?? "")) {
      onSave(value, newVal);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(String(corrected?.corrected ?? value ?? ""));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type={isNumeric ? "number" : "text"}
        step={isNumeric ? "0.01" : undefined}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-background border border-primary rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        autoFocus
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-primary/10 rounded px-1 py-0.5 -mx-1 transition-colors group/cell ${hasCorrection ? "bg-primary/5" : ""}`}
      onClick={() => {
        setEditValue(String(corrected?.corrected ?? value ?? ""));
        setEditing(true);
      }}
    >
      <span className={hasCorrection ? "text-primary font-medium" : ""}>
        {formatDisplay(displayValue)}
      </span>
      {hasCorrection && (
        <span className="block text-xs text-muted line-through">
          {formatDisplay(String(corrected.original ?? "—"))}
        </span>
      )}
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-muted text-sm">N/A</span>;

  const pct = Math.round(confidence * 100);
  const color =
    pct >= 90 ? "bg-success" : pct >= 70 ? "bg-warning" : "bg-danger";
  const textColor =
    pct >= 90 ? "text-success" : pct >= 70 ? "text-warning" : "text-danger";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-background rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${textColor} min-w-[3rem] text-right`}>{pct}%</span>
    </div>
  );
}

export default function ExtractedDataTab({
  slip,
  correctedFields,
  correctedLineItems,
  onFieldCorrection,
  onLineItemCorrection,
}: ExtractedDataTabProps) {
  const fields: { label: string; fieldName: string; value: string | number | null }[] = [
    { label: "Retailer", fieldName: "retailer_name", value: slip.retailer_name },
    { label: "Branch", fieldName: "store_branch", value: slip.store_branch },
    { label: "Date", fieldName: "slip_date", value: slip.slip_date },
    { label: "Time", fieldName: "slip_time", value: slip.slip_time },
    { label: "Payment Method", fieldName: "payment_method", value: slip.payment_method },
    { label: "Till #", fieldName: "till_number", value: slip.till_number },
    { label: "Receipt #", fieldName: "receipt_number", value: slip.receipt_number },
    { label: "Barcode", fieldName: "barcode_data", value: slip.barcode_data },
  ];

  const lineItems = slip.line_items ?? [];

  const getLineItemCorrection = useCallback(
    (itemId: string, fieldName: string) => {
      const item = correctedLineItems.find((c) => c.id === itemId);
      return item?.fields[fieldName];
    },
    [correctedLineItems]
  );

  const subtotal = lineItems.reduce((sum, item) => sum + (item.total_price ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header fields grid */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Receipt Details</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {fields.map((field) => (
            <EditableField
              key={field.fieldName}
              label={field.label}
              fieldName={field.fieldName}
              value={field.value}
              corrected={correctedFields[field.fieldName]}
              onSave={onFieldCorrection}
            />
          ))}
        </div>
      </div>

      {/* Line items table */}
      {lineItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Line Items</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted uppercase tracking-wider">Description</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted uppercase tracking-wider w-16">Qty</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted uppercase tracking-wider w-24">Unit Price</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted uppercase tracking-wider w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-background/30">
                    <td className="py-2 px-2">
                      <EditableCell
                        value={item.description}
                        corrected={getLineItemCorrection(item.id, "description")}
                        onSave={(orig, corrected) =>
                          onLineItemCorrection(item.id, "description", orig, corrected)
                        }
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <EditableCell
                        value={item.quantity}
                        corrected={getLineItemCorrection(item.id, "quantity")}
                        onSave={(orig, corrected) =>
                          onLineItemCorrection(item.id, "quantity", orig, corrected)
                        }
                        isNumeric
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <EditableCell
                        value={item.unit_price}
                        corrected={getLineItemCorrection(item.id, "unit_price")}
                        onSave={(orig, corrected) =>
                          onLineItemCorrection(item.id, "unit_price", orig, corrected)
                        }
                        isNumeric
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <EditableCell
                        value={item.total_price}
                        corrected={getLineItemCorrection(item.id, "total_price")}
                        onSave={(orig, corrected) =>
                          onLineItemCorrection(item.id, "total_price", orig, corrected)
                        }
                        isNumeric
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-3 border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm px-2">
              <span className="text-muted">Subtotal</span>
              <span className="text-foreground font-medium">R {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm px-2">
              <span className="text-muted">VAT</span>
              <span className="text-foreground font-medium">
                R {slip.vat_amount !== null ? slip.vat_amount.toFixed(2) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold px-2 pt-1.5 border-t border-border">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">
                R {slip.total_amount !== null ? slip.total_amount.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Extraction Confidence</h4>
        <ConfidenceBar confidence={slip.extraction_confidence} />
      </div>
    </div>
  );
}
