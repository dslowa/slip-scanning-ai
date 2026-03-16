import { OcrResponse, ProcessedReceipt, ProcessedItem, ProcessedPayment } from "./types";
import { cleanRetailerName, standardizeDate, parseSafeNumber } from "./utils";

export function parseReceipt(ocrData: OcrResponse): ProcessedReceipt {
    // Extract Retailer
    const retailer = cleanRetailerName(
        ocrData.merchant_detection_sources?.value ||
        ocrData.raw_trip_header ||
        "Unknown"
    );

    // Extract Date
    const date = standardizeDate(ocrData.date?.value);

    // Extract Time
    const time = ocrData.time?.value || "00:00";

    // Extract Total
    const total_amount = parseSafeNumber(ocrData.total?.value);

    // Extract Items
    const items: ProcessedItem[] = (ocrData.products || []).map((product) => {
        const description = product.product_name || product.rsd?.value || product.rsd?.original_case_value || "Unknown Item";
        const quantity = parseSafeNumber(product.qty?.value) || 1;
        const unit_price = parseSafeNumber(product.price?.value);

        // As per ExportedItem definition: total_price is qty * unit_price
        const total_price = Number((quantity * unit_price).toFixed(2));

        // Get discount directly from product if it exists
        const discount = parseSafeNumber(product.discount);

        // Final paid amount is exactly what OCR returned as totalPrice
        const final_price = parseSafeNumber(product.totalPrice?.value) || Number((total_price - discount).toFixed(2));

        return {
            description,
            quantity,
            unit_price,
            total_price,
            discount,
            final_price
        };
    });

    // Extract Payments
    const payments: ProcessedPayment[] = (ocrData.paymentMethods || []).map((pm) => ({
        method: pm.method?.value || "Unknown",
        amount: parseSafeNumber(pm.amount?.value)
    }));

    return {
        retailer,
        date,
        time,
        total_amount,
        is_blurry: ocrData.is_blurry || false,
        is_screen: ocrData.is_screen || false,
        is_receipt: ocrData.is_receipt || true,
        items,
        payments
    };
}
