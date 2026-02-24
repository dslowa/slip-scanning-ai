/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { exportToJSON, exportToCSV, exportToExcel } from "@/lib/exportUtils";

interface ExportButtonsProps {
    data: any | any[];
    filename: string;
    labelPrefix?: string;
    disabled?: boolean;
}

export default function ExportButtons({ data, filename, labelPrefix = "Export", disabled = false }: ExportButtonsProps) {
    const handleJSON = () => exportToJSON(data, filename);
    const handleCSV = () => {
        const arrayData = Array.isArray(data) ? data : [data];
        exportToCSV(arrayData, filename);
    };
    const handleExcel = () => {
        const arrayData = Array.isArray(data) ? data : [data];
        exportToExcel(arrayData, filename);
    };

    return (
        <div className="flex flex-wrap gap-2">
            <button
                onClick={handleJSON}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50"
            >
                {labelPrefix} JSON
            </button>
            <button
                onClick={handleCSV}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50"
            >
                {labelPrefix} CSV
            </button>
            <button
                onClick={handleExcel}
                disabled={disabled}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
                {labelPrefix} Excel
            </button>
        </div>
    );
}
