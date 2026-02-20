import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

// Manually parse .env.local to avoid adding a dependency
const envFile = fs.readFileSync(".env.local", "utf8");
const envVars = Object.fromEntries(
    envFile.split("\n")
        .filter(line => line.includes("="))
        .map(line => line.split("="))
);

const GEMINI_API_KEY = envVars.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function testGemini() {
    if (!GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY not found in .env.local or process.env");
        return;
    }

    console.log("Testing Gemini API connectivity with key beginning with:", GEMINI_API_KEY.substring(0, 8));
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.trim());

        console.log("Listing available models...");
        // Use a known method or check documentation for node SDK model listing
        // In @google/generative-ai, listing might be different, let's try a simple model first
        const models = []; // Placeholder if listModels is not easily available in this SDK version

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Explain the meaning of 'Antigravity' in one sentence.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Gemini Response:", text);
    } catch (error) {
        console.error("❌ Gemini API Test Failed:");
        if (error && typeof error === 'object' && 'message' in error) {
            const msg = error.message;
            console.error("Message:", msg);

            if (msg.includes("404")) {
                console.log("Tip: 404 might mean the model name is wrong or the key doesn't have access to this specific API version.");
                console.log("Attempting to try 'gemini-pro' as a fallback...");
                try {
                    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.trim());
                    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                    const result = await model.generateContent("Hello?");
                    console.log("✅ Gemini-Pro Response:", (await result.response).text());
                } catch (e2) {
                    console.error("❌ Fallback to gemini-pro also failed:", e2.message);
                }
            }
        } else {
            console.error(error);
        }
    }
}

testGemini();
