const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

async function testGemini() {
    try {
        // Read .env.local manually
        const envPath = path.join(process.cwd(), ".env.local");
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);

        if (!match) {
            console.error("No GEMINI_API_KEY found in .env.local");
            process.exit(1);
        }

        const apiKey = match[1].trim();
        console.log("Found API Key:", apiKey.substring(0, 5) + "...");

        try {
            console.log("Listing available models...");
            // Actually SDK doesn't have direct listModels on the high level instance easily?
            // Wait, looking at docs (memory), it might be via a ModelManager or similar.
            // But let's try a direct REST call if SDK fails, or check valid method.
            // Actually, newer SDK has specific methods.

            // Let's just try 'gemini-1.0-pro'
            // or maybe the user needs to enable the API in Google Cloud?
            // But usually 'gemini-pro' works.

            // Let's force a fetch to the list models endpoint to see what's what.
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listResp.json();

            if (listData.models) {
                console.log("Available Model Names:");
                listData.models.forEach(m => console.log(m.name));
            } else {
                console.log("No models found in response:", listData);
            }

        } catch (e) {
            console.error("List Test Failed:", e);
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Models to try
        const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash-lite"];

        for (const modelName of models) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you working?");
                const response = await result.response;
                console.log(`✅ Success! Model '${modelName}' is working.`);
                console.log("Response:", response.text());
                return; // Exit after first success
            } catch (error) {
                console.error(`❌ Failed with ${modelName}:`, error.message);
            }
        }

        console.error("\nAll models failed.");

    } catch (error) {
        console.error("Test Script Error:", error);
    }
}

testGemini();
