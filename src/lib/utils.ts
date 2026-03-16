import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function cleanRetailerName(name: string): string {
    if (!name) return "Unknown";

    const cleaned = name.trim().toUpperCase();

    // Map of variations to standard chain names
    const chainMap: Record<string, string> = {
        "PICK N PAY": "PICK N PAY",
        "PNP": "PICK N PAY",
        "CHECKERS": "CHECKERS",
        "SHOPRITE": "SHOPRITE",
        "WOOLWORTHS": "WOOLWORTHS",
        "WOOLIES": "WOOLWORTHS",
        "SPAR": "SPAR",
        "KWIKSPAR": "SPAR",
        "SUPERSPAR": "SPAR",
        "CLICKS": "CLICKS",
        "DIS-CHEM": "DIS-CHEM",
        "DISCHEM": "DIS-CHEM",
        "MAKRO": "MAKRO",
        "GAME": "GAME",
        "BUILDERS": "BUILDERS",
        "LEROY MERLIN": "LEROY MERLIN",
        "FOOD LOVERS": "FOOD LOVERS MARKET",
        "FOOD LOVER'S": "FOOD LOVERS MARKET",
        "OK FURNITURE": "OK FURNITURE",
        "OK FOODS": "OK FOODS",
        "BOXER": "BOXER",
        "USAVE": "USAVE",
        "WEST PACK": "WEST PACK LIFESTYLE"
    };

    for (const [key, value] of Object.entries(chainMap)) {
        if (cleaned.includes(key)) return value;
    }

    return cleaned;
}

export function standardizeDate(dateStr: string | null | undefined): string {
    if (!dateStr || dateStr.trim() === "") return ""; // Blank — date was not readable

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

        // Handle YYYY/MM/DD or YYYY-MM-DD
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

        return ""; // Unparseable — treat as blank
    } catch {
        console.error("Date parsing error");
        return "";
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

/**
 * Robustly parses a value into a number.
 * Handles strings with currency symbols (R, $), commas as decimal separators,
 * and other non-numeric characters.
 */
export function parseSafeNumber(val: any): number {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val || typeof val !== 'string') return 0;

    try {
        // Remove currency symbols, spaces, and other non-numeric/comma/dot chars
        // We keep digits, dots, and commas
        const cleaned = val.replace(/[^0-9.,-]/g, '');

        // Handle European/SA style commas as decimal separators
        // but only if there isn't already a dot.
        // If there's both a comma and a dot (e.g. 1,234.56), we assume comma is thousands separator.
        let normalized = cleaned;
        if (cleaned.includes(',') && !cleaned.includes('.')) {
            normalized = cleaned.replace(',', '.');
        } else if (cleaned.includes(',') && cleaned.includes('.')) {
            // Remove comma if it's a thousands separator
            normalized = cleaned.replace(/,/g, '');
        }

        const num = parseFloat(normalized);
        return isNaN(num) ? 0 : num;
    } catch {
        return 0;
    }
}
