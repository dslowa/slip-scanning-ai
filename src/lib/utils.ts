import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function cleanRetailerName(name: string): string {
    if (!name) return "Unknown Retailer";

    // Basic normalization
    const cleaned = name.trim().toUpperCase();

    // Common adjustments
    if (cleaned.includes("SPAR")) return "SPAR";
    if (cleaned.includes("CHECKERS")) return "CHECKERS";
    if (cleaned.includes("WOOLWORTHS")) return "WOOLWORTHS";
    if (cleaned.includes("PICK N PAY")) return "PICK N PAY";
    if (cleaned.includes("SHOPRITE")) return "SHOPRITE";
    if (cleaned.includes("Clicks")) return "CLICKS"; // Case insensitive check above handles this but good to be explicit

    // Remove common geometric garbage if OCR fails (e.g. "SPAR 123")
    // For now simple return is fine
    return cleaned;
}

export function standardizeDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0]; // Fallback to today

    // Try to parse common formats
    // 01.12.25 -> 2025-12-01
    // 12 Dec 2025 -> 2025-12-12

    try {
        // Handle DD.MM.YY or DD.MM.YYYY
        if (dateStr.match(/^\d{2}\.\d{2}\.\d{2,4}$/)) {
            const parts = dateStr.split('.');
            const day = parts[0];
            const month = parts[1];
            let year = parts[2];
            if (year.length === 2) year = "20" + year;
            return `${year}-${month}-${day}`; // ISO format for DB
        }

        // Handle slash format DD/MM/YYYY or MM/DD/YYYY? 
        // South Africa uses DD/MM/YYYY usually. User said "MM/DD/YYYY" in prompt but example "01.12.25" fits DD.MM.YY for Dec 1st.
        // Let's assume input needs to be standardized to MM/DD/YYYY for display but YYYY-MM-DD for DB.
        // The prompt asked for Date Data type: string Format: MM/DD/YYYY.
        // But for DB (Postgres Date), we should probably store as YYYY-MM-DD or standard Date type.
        // I'll return YYYY-MM-DD for consistency and format it for display if needed.

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return dateStr;
    } catch {
        console.error("Date parsing error");
        return dateStr;
    }
}
// Output: MM/DD/YYYY
export function formatDateToMMDDYYYY(isoDate: string): string {
    if (!isoDate) return "";
    try {
        const [year, month, day] = isoDate.split('-');
        return `${month}/${day}/${year}`;
    } catch {
        return isoDate;
    }
}
