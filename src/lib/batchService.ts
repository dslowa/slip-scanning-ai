import { callAiModel, AiProvider } from "./aiService";

// 1. Retry Wrapper
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(res => setTimeout(res, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
}

// 2. Fetch Image as Base64
export async function fetchImageAsBase64(imageUrl: string) {
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
    const buffer = await imgResponse.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";

    return { base64Data, mimeType };
}

/**
 * Resizes an image if it exceeds the specified maxSizeMB.
 * Returns the same base64 if no resizing was needed.
 */
export async function resizeImageIfTooLarge(base64Data: string, maxSizeMB: number = 4.8) {
    const stringLength = base64Data.length;
    // Claude checks the raw base64 string length against its 5MB limit.
    // 5MB = 5 * 1024 * 1024 = 5242880 bytes. We use 4.8MB to be safe.
    const maxStringLength = Math.floor(maxSizeMB * 1024 * 1024);

    console.log(`[Image Optimizer] Input - Base64 Chars: ${stringLength}`);

    if (stringLength <= maxStringLength) {
        console.log(`[Image Optimizer] Size is within limits (${stringLength} chars <= ${maxStringLength})`);
        return base64Data;
    }

    console.log(`[Image Optimizer] RESIZING: ${stringLength} chars exceeds ${maxStringLength} limit`);

    let sharp;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        sharp = require("sharp");
    } catch {
        console.error("[Image Optimizer] CRITICAL: sharp library could not be loaded. Compression aborted.");
        return base64Data;
    }

    try {
        const buffer = Buffer.from(base64Data, "base64");
        // Resize to 1400px max dimension and lower quality to be safe
        const resizedBuffer = await sharp(buffer)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 60, force: true })
            .toBuffer();

        const newBase64 = resizedBuffer.toString("base64");
        console.log(`[Image Optimizer] SUCCESS: New Base64 Chars: ${newBase64.length}`);

        return newBase64;
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Image Optimizer] ERROR during resize: ${errorMsg}`);
        return base64Data;
    }
}

/**
 * @deprecated Use callAiProvider instead for multi-provider support
 */
export async function callGeminiRaw(systemPrompt: string, base64Data: string, mimeType: string): Promise<{ text: string, usage?: unknown }> {
    const result = await callAiModel({
        provider: "gemini",
        model: "gemini-1.5-flash",
        systemPrompt,
        base64Data,
        mimeType
    });
    return result;
}

// 3. Unified AI Call for Batch
export async function callAiProvider(
    provider: AiProvider,
    model: string,
    systemPrompt: string,
    base64Data: string,
    mimeType: string
): Promise<{ text: string, usage?: unknown }> {
    return callAiModel({
        provider,
        model,
        systemPrompt,
        base64Data,
        mimeType
    });
}

// 4. Resolve JSON Path Helper
export function resolveJsonPath(obj: Record<string, unknown> | null | undefined, path: string): unknown {
    if (!obj || !path) return null;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return null;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

// 5. Compare Values
export function exactStringMatch(val1: unknown, val2: unknown): 'YES' | 'NO' {
    if (!val1 || !val2) return 'NO';
    return String(val1).trim().toLowerCase() === String(val2).trim().toLowerCase() ? 'YES' : 'NO';
}

export function numericMatch(val1: unknown, val2: unknown): 'YES' | 'NO' {
    if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) return 'NO';
    const n1 = Number(val1);
    const n2 = Number(val2);
    if (isNaN(n1) || isNaN(n2)) return 'NO';
    return Math.abs(n1 - n2) < 0.01 ? 'YES' : 'NO';
}
