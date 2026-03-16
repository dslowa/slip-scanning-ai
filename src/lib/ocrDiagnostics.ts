import { OcrResponse, OcrDiagnostics, OcrRuleCheck, ProcessedReceipt } from "./types";
import { parseSafeNumber } from "./utils";

/**
 * Evaluates the parsed OCR result against the prompt rules and returns
 * a structured diagnostics object explaining what passed, failed, and why.
 */
export function evaluateDiagnostics(
    ocrResult: OcrResponse,
    parsedData: ProcessedReceipt
): OcrDiagnostics {
    const rules: OcrRuleCheck[] = [];
    const warnings: string[] = [];

    const rawItems = ocrResult.products || [];
    const rawItemCount = rawItems.length;
    const savedItemCount = parsedData.items.length;

    // ── QUALITY CHECKS ────────────────────────────────────────────────────────

    // Check: is_receipt
    rules.push({
        rule: "Quality: is_receipt detected",
        passed: ocrResult.is_receipt !== false,
        detail: ocrResult.is_receipt !== false
            ? "Image was identified as a receipt."
            : "❌ Image was NOT identified as a receipt — items will not be extracted.",
    });

    // Check: is_blurry
    rules.push({
        rule: "Quality: Image not blurry",
        passed: !ocrResult.is_blurry,
        detail: ocrResult.is_blurry
            ? "⚠️ Image flagged as blurry — OCR accuracy may be reduced."
            : "Image is clear.",
    });

    // Check: is_screen
    rules.push({
        rule: "Quality: Not a screen photo",
        passed: !ocrResult.is_screen,
        detail: ocrResult.is_screen
            ? "⚠️ Image flagged as a photo of a screen — OCR accuracy may be reduced."
            : "Image is a physical receipt, not a screen photo.",
    });

    // ── BASIC EXTRACTION ──────────────────────────────────────────────────────

    // Check: Retailer found
    const retailerFound = !!parsedData.retailer && parsedData.retailer.toUpperCase() !== "UNKNOWN RETAILER";
    rules.push({
        rule: "Extraction: Retailer name found",
        passed: retailerFound,
        detail: retailerFound
            ? `Retailer extracted: "${parsedData.retailer}"`
            : `❌ Could not extract retailer name (got "${parsedData.retailer}").`,
    });

    // Check: Date found
    const dateFound = !!parsedData.date && parsedData.date !== "1970-01-01";
    rules.push({
        rule: "Extraction: Date found",
        passed: dateFound,
        detail: dateFound
            ? `Date extracted: ${parsedData.date}`
            : "❌ Could not extract a valid date.",
    });

    // Check: Total > 0
    const totalFound = parsedData.total_amount > 0;
    rules.push({
        rule: "Extraction: Total amount found",
        passed: totalFound,
        detail: totalFound
            ? `Total extracted: R${parsedData.total_amount}`
            : "❌ Total amount is 0 or missing.",
    });

    // ── ITEM EXTRACTION ───────────────────────────────────────────────────────

    // Check: At least one item returned
    rules.push({
        rule: "RULE 1–5: Items extracted by Gemini",
        passed: rawItemCount > 0,
        detail: rawItemCount > 0
            ? `Gemini returned ${rawItemCount} line item(s).`
            : "❌ Gemini returned NO line items. Possible causes: image quality, not a grocery slip, or OCR failure.",
    });

    // Check: No "Unknown Item" descriptions
    const unknownItems = parsedData.items.filter(
        (i) => i.description === "Unknown Item"
    );
    rules.push({
        rule: "Extraction: All items have descriptions",
        passed: unknownItems.length === 0,
        detail: unknownItems.length === 0
            ? "All item descriptions were extracted successfully."
            : `⚠️ ${unknownItems.length} item(s) had unreadable descriptions (fell back to "Unknown Item").`,
    });

    // Check: No standalone discount lines (RULE 1)
    // Heuristic: if any saved item has a NEGATIVE unit_price, it wasn't merged
    const negativeItems = parsedData.items.filter((i) => i.unit_price < 0);
    rules.push({
        rule: "RULE 1: No standalone discount lines",
        passed: negativeItems.length === 0,
        detail: negativeItems.length === 0
            ? "No standalone discount lines detected — all discounts appear merged."
            : `❌ ${negativeItems.length} item(s) have a negative unit price, suggesting a discount line was NOT merged into the product above it.`,
    });

    // Check: Discounts recorded (RULE 2)
    const itemsWithDiscount = parsedData.items.filter((i) => i.discount > 0);
    rules.push({
        rule: "RULE 2: Discounts correctly merged",
        passed: true, // informational only — can't fail without knowing the slip
        detail: itemsWithDiscount.length > 0
            ? `${itemsWithDiscount.length} item(s) have discounts recorded and merged.`
            : "No discounts found on this slip (or none detected).",
    });

    // Check: Item total matches receipt total (RULE 6)
    const itemSum = parsedData.items.reduce((acc, i) => acc + parseSafeNumber(i.final_price), 0);
    const totalAmountNum = parseSafeNumber(parsedData.total_amount);
    const difference = Math.abs(itemSum - totalAmountNum);
    const totalMatchPassed = difference <= 0.10;

    const fmtItemSum = itemSum.toFixed(2);
    const fmtTotal = totalAmountNum.toFixed(2);
    const fmtDiff = difference.toFixed(2);

    rules.push({
        rule: "RULE 6: Item totals sum matches receipt total (±R0.10)",
        passed: totalMatchPassed,
        detail: totalMatchPassed
            ? `Item sum R${fmtItemSum} matches receipt total R${fmtTotal} (diff: R${fmtDiff}).`
            : `⚠️ Item sum R${fmtItemSum} differs from receipt total R${fmtTotal} by R${fmtDiff} — may indicate missing items or an unmerged discount.`,
    });

    // ── WARNINGS ──────────────────────────────────────────────────────────────

    if (rawItemCount === 0 && ocrResult.is_receipt !== false) {
        warnings.push(
            "No items were extracted despite the image being identified as a receipt. " +
            "Check the Gemini raw response below for more detail."
        );
    }

    if (!totalMatchPassed && rawItemCount > 0) {
        const fmtItemSum = itemSum.toFixed(2);
        const fmtTotal = totalAmountNum.toFixed(2);
        const fmtDiff = difference.toFixed(2);
        warnings.push(
            `Item sum (R${fmtItemSum}) and receipt total (R${fmtTotal}) differ by R${fmtDiff}. ` +
            "This could indicate a missing line item, an unmerged discount, or a cash-rounding issue."
        );
    }

    if (ocrResult.is_blurry) {
        warnings.push("Image quality: blurry image detected. Consider re-uploading a clearer photo.");
    }

    return {
        raw_item_count: rawItemCount,
        saved_item_count: savedItemCount,
        rules,
        warnings,
        gemini_raw_response: ocrResult.gemini_raw_response,
    };
}
