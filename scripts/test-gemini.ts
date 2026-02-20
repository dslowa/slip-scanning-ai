import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
    if (!GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY not found in .env.local");
        return;
    }

    console.log("Testing Gemini API connectivity...");
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = "Explain the meaning of 'Antigravity' in one sentence.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Gemini Response:", text);
    } catch (error) {
        console.error("❌ Gemini API Test Failed:");
        if (error instanceof Error) {
            console.error("Message:", error.message);
            // Check for common error codes
            if (error.message.includes("429")) {
                console.error("Tip: You've hit the rate limit or quota.");
            } else if (error.message.includes("403")) {
                console.error("Tip: API Key might be invalid or permissions are missing.");
            } else if (error.message.includes("400")) {
                console.error("Tip: Bad request (check prompt or model name).");
            }
        } else {
            console.error(error);
        }
    }
}

testGemini();
