import { GoogleGenerativeAI } from "@google/generative-ai";
import { OcrResponse } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function processReceiptWithOCR(imageUrl: string): Promise<OcrResponse> {
    if (!GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY not found. Using Mock Service.");
        return processReceiptWithMock();
    }

    try {
        console.log("Processing with Gemini 1.5 Flash...");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // Fetch Image
        const imageResp = await fetch(imageUrl);
        const imageBuffer = await imageResp.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");

        const prompt = `
        Analyze this receipt image and extract structured data.
        Return ONLY valid JSON.
        
        Required JSON Structure:
        {
            "retailer": "string (store name)",
            "date": "string (YYYY-MM-DD or MM/DD/YYYY)",
            "time": "string (HH:MM)",
            "total": number (float),
            "paymentMethods": [ { "method": "string", "amount": number } ],
            "items": [
                {
                    "description": "string",
                    "quantity": number,
                    "unitPrice": number,
                    "totalPrice": number
                }
            ],
            "is_blurry": boolean,
            "is_screen": boolean,
            "is_receipt": boolean
        }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg", // Assuming JPEG for now, could detect from URL
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text); // Debug log

        // Clean markdown code blocks if present
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const data = JSON.parse(jsonString);

            // Map to internal OcrResponse structure
            return {
                banner_id: 0,
                date: { confidence: 0.9, value: data.date },
                isDigital: false,
                isFraudulent: false,
                is_blurry: data.is_blurry || false,
                is_receipt: data.is_receipt !== false, // Default true
                is_screen: data.is_screen || false,
                ocr_confidence: 0.9,
                paymentMethods: (data.paymentMethods || []).map((pm: { amount: number; method: string }) => ({
                    amount: { confidence: 0.9, value: pm.amount },
                    method: { confidence: 0.9, value: pm.method }
                })),
                products: (data.items || []).map((item: { unitPrice: number; quantity: number; description: string; totalPrice: number }, i: number) => ({
                    line: i + 1,
                    price: { confidence: 0.9, value: item.unitPrice },
                    qty: { confidence: 0.9, value: item.quantity },
                    rsd: { confidence: 0.9, value: item.description },
                    totalPrice: { confidence: 0.9, value: item.totalPrice },
                    product_name: item.description
                })),
                total: { confidence: 0.9, value: data.total },
                time: { confidence: 0.9, value: data.time },
                merchant_detection_sources: { value: data.retailer, confidence: 0.9 }
            } as OcrResponse;

        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Failed JSON String:", jsonString);
            throw new Error("Failed to parse OCR response");
        }

    } catch (error) {
        console.error("Gemini OCR Failed:", error);
        if (error instanceof Error) {
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        }
        throw new Error("OCR Processing Failed");
    }
}

async function processReceiptWithMock(): Promise<OcrResponse> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock response based on the user provided JSON
    const mockResponse: OcrResponse = {
        "banner_id": 0,
        "date": {
            "confidence": 99.1866683959961,
            "value": "01/12/2025"
        },
        "isDigital": false,
        "isFraudulent": false,
        "is_blurry": false,
        "is_receipt": true,
        "is_screen": false,
        "ocr_confidence": 96.30787658691406,
        "paymentMethods": [
            {
                "amount": { "confidence": 100, "value": 141.1 },
                "method": { "confidence": 99.98564910888672, "value": "Cash" }
            }
        ],
        "products": [
            {
                "line": 1009,
                "price": { "confidence": 99.98662567138672, "value": 12.99 },
                "qty": { "confidence": 100, "value": 1 },
                "rsd": { "confidence": 99.76820373535156, "value": "MESSARIS BUBBLES 100GR" },
                "totalPrice": { "confidence": 100, "value": 12.99 },
                "product_name": "MESSARIS BUBBLES 100GR"
            }
            // ... (rest of mock data can be simplified or full list)
        ],
        "total": { "confidence": 95, "value": 141.13 },
        "time": { "confidence": 99.1866683959961, "value": "19:00" },
        "merchant_detection_sources": { "confidence": 99, "value": "SPAR" }
    };

    return mockResponse;
}
