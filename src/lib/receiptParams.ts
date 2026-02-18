import { OcrResponse, ProcessedReceipt, ProcessedItem, ProcessedPayment } from "./types";
import { cleanRetailerName, standardizeDate } from "./utils";

export function parseReceipt(ocrData: OcrResponse, imageUrl: string): ProcessedReceipt {
    // Extract Retailer
    const retailer = cleanRetailerName(
        ocrData.merchant_detection_sources?.value ||
        ocrData.raw_trip_header ||
        "Unknown Retailer"
    );

    // Extract Date
    const date = standardizeDate(ocrData.date?.value);

    // Extract Time
    const time = ocrData.time?.value || "00:00";

    // Extract Total
    const total_amount = ocrData.total?.value || 0;

    // Extract Items
    const items: ProcessedItem[] = (ocrData.products || []).map((product) => {
        const description = product.product_name || product.rsd?.value || product.rsd?.original_case_value || "Unknown Item";
        const quantity = product.qty?.value || 1;
        const unit_price = product.price?.value || 0;
        const total_price = product.totalPrice?.value || (quantity * unit_price);

        // Calculate discount if possible (needs more data usually, but we can try)
        // For now assuming discount is 0 unless implicit difference
        const discount = 0;

        return {
            description,
            quantity,
            unit_price,
            total_price,
            discount,
            final_price: total_price // Assuming simplified total for now
        };
    });

    // Extract Payments
    const payments: ProcessedPayment[] = (ocrData.paymentMethods || []).map((pm) => ({
        method: pm.method?.value || "Unknown",
        amount: pm.amount?.value || 0
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
