/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export function exportToJSON(data: any, filename: string) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function processFlatData(data: any[]) {
    return data.map(item => {
        const flat: any = {};
        for (const [key, value] of Object.entries(item)) {
            if (Array.isArray(value)) {
                if (key === 'payment_methods' || key === 'payments') {
                    flat[key] = value.map((p: any) => `${p.method || ''}: R${p.amount || 0}`).join(", ");
                } else if (key === 'product_line_items' || key === 'items') {
                    flat[key] = value.map((i: any) => `${i.qty || 1}x ${i.description || 'Item'} (R${i.final_line_total || i.final_price || 0})`).join(" | ");
                } else {
                    flat[key] = JSON.stringify(value);
                }
            } else if (value && typeof value === 'object') {
                flat[key] = JSON.stringify(value);
            } else {
                flat[key] = value;
            }
        }
        return flat;
    });
}

export function exportToCSV(data: any[], filename: string) {
    const flatData = processFlatData(data);
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportToExcel(data: any[], filename: string, sheetName: string = "Data") {
    // We will make a relational export for Excel if it contains nested arrays.
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Main Data (flattened)
    const flatData = processFlatData(data);
    const mainSheet = XLSX.utils.json_to_sheet(flatData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, sheetName);

    // See if we have items or payments to split into other sheets
    const allItems: any[] = [];
    const allPayments: any[] = [];

    data.forEach((row, index) => {
        const refId = row.id || row.retailer_name || `Row-${index + 1}`;

        const items = row.product_line_items || row.items || row.receipt_items;
        if (Array.isArray(items)) {
            items.forEach(item => {
                allItems.push({ ReceiptRef: refId, ...item });
            });
        }

        const payments = row.payment_methods || row.payments || row.receipt_payments;
        if (Array.isArray(payments)) {
            payments.forEach(payment => {
                allPayments.push({ ReceiptRef: refId, ...payment });
            });
        }
    });

    if (allItems.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(allItems);
        XLSX.utils.book_append_sheet(workbook, itemsSheet, "Line Items");
    }

    if (allPayments.length > 0) {
        const paymentsSheet = XLSX.utils.json_to_sheet(allPayments);
        XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments");
    }

    XLSX.writeFile(workbook, `${filename}.xlsx`);
}
