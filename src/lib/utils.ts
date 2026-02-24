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

    try {
        const normalized = dateStr.replace(/[\.\s-]/g, '/');

        // Handle DD/MM/YY or DD/MM/YYYY
        const dmyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            let year = dmyMatch[3];
            if (year.length === 2) year = "20" + year;
            return `${year}-${month}-${day}`; // ISO format for DB
        }

        // Handle YYYY/MM/DD
        const ymdMatch = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

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
        if (!isoDate.includes('-')) return isoDate;
        const [year, month, day] = isoDate.split('-');
        if (!year || !month || !day) return isoDate;
        return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
    } catch {
        return isoDate;
    }
}

// Output: DD/MM/YYYY
export function formatDateToDDMMYYYY(isoDate: string): string {
    if (!isoDate) return "";
    try {
        if (!isoDate.includes('-')) return isoDate;
        const [year, month, day] = isoDate.split('-');
        if (!year || !month || !day) return isoDate;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    } catch {
        return isoDate;
    }
}
