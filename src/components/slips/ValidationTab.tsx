"use client";

import { Slip } from "@/types/slips";

interface ValidationTabProps {
  slip: Slip;
}

interface CheckItemProps {
  passed: boolean | null;
  label: string;
  detail?: string;
}

function CheckItem({ passed, label, detail }: CheckItemProps) {
  const isPass = passed === true;
  const isFail = passed === false;
  const isUnknown = passed === null;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${
        isPass
          ? "border-success/20 bg-success/5"
          : isFail
          ? "border-danger/20 bg-danger/5"
          : "border-border bg-background/50"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isPass && (
          <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isFail && (
          <div className="w-6 h-6 rounded-full bg-danger/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        {isUnknown && (
          <div className="w-6 h-6 rounded-full bg-muted/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1">
        <p
          className={`text-sm font-medium ${
            isPass ? "text-success" : isFail ? "text-danger" : "text-muted"
          }`}
        >
          {label}
        </p>
        {detail && <p className="text-xs text-muted mt-1">{detail}</p>}
      </div>
    </div>
  );
}

export default function ValidationTab({ slip }: ValidationTabProps) {
  // Determine missing fields
  const requiredFields: { key: keyof Slip; label: string }[] = [
    { key: "retailer_name", label: "Retailer" },
    { key: "slip_date", label: "Date" },
    { key: "total_amount", label: "Total Amount" },
    { key: "payment_method", label: "Payment Method" },
    { key: "receipt_number", label: "Receipt #" },
  ];
  const missingFields = requiredFields
    .filter((f) => slip[f.key] === null || slip[f.key] === undefined || slip[f.key] === "")
    .map((f) => f.label);

  const hasSufficientData = missingFields.length === 0;

  // Determine retailer category (mock)
  const retailerCategories: Record<string, string> = {
    "Pick n Pay": "Grocery",
    Checkers: "Grocery",
    Woolworths: "Grocery / Fashion",
    Spar: "Grocery",
    Shoprite: "Grocery",
  };
  const retailerCategory = slip.retailer_name
    ? retailerCategories[slip.retailer_name] ?? "Unknown"
    : "Unknown";

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground mb-4">Validation Checklist</h4>

      <CheckItem
        passed={slip.approved_retailer}
        label="Approved Retailer"
        detail={
          slip.approved_retailer
            ? `${slip.retailer_name} — Category: ${retailerCategory}`
            : slip.retailer_name
            ? `"${slip.retailer_name}" is not in the approved retailer list`
            : "Retailer name not extracted"
        }
      />

      <CheckItem
        passed={slip.slip_within_7_days}
        label="Within 7 Days"
        detail={
          slip.slip_within_7_days
            ? `Slip date: ${slip.slip_date ?? "N/A"}`
            : slip.slip_date
            ? `Slip date ${slip.slip_date} is older than 7 days`
            : "Slip date not extracted"
        }
      />

      <CheckItem
        passed={hasSufficientData}
        label="Sufficient Data"
        detail={
          hasSufficientData
            ? "All required fields extracted successfully"
            : `Missing fields: ${missingFields.join(", ")}`
        }
      />

      <CheckItem
        passed={slip.is_valid}
        label="Overall Valid"
        detail={
          slip.is_valid === true
            ? "All validation checks passed"
            : slip.is_valid === false
            ? "One or more validation checks failed"
            : "Validation status not determined"
        }
      />

      {/* Duplicate warning */}
      {slip.is_duplicate && (
        <div className="mt-4 p-4 rounded-lg border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-warning">Duplicate Detected</p>
          </div>
          <p className="text-xs text-muted mt-2">
            This slip appears to be a duplicate of slip{" "}
            <span className="font-mono text-warning">{slip.duplicate_of?.slice(0, 8)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
