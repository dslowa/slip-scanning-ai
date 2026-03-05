import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

export type AiProvider = "gemini" | "claude";

export interface AiRequest {
    provider: AiProvider;
    model: string;
    systemPrompt: string;
    base64Data: string;
    mimeType: string;
}

export interface AiResponse {
    text: string;
    usage?: {
        prompt_tokens: number;
        candidates_tokens: number;
        total_tokens: number;
    };
}

/**
 * Helper to strip markdown code blocks from AI responses
 */
export function cleanJsonResponse(text: string): string {
    // Remove markdown code blocks if present (e.g. ```json ... ```)
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z]*\n/i, "");
        cleaned = cleaned.replace(/\n```$/i, "");
    }
    return cleaned.trim();
}

export async function callAiModel(req: AiRequest): Promise<AiResponse> {
    const modelName = req.model || (req.provider === "claude" ? "claude-sonnet-4-6" : "gemini-1.5-flash");
    console.log(`[AI Call] Provider: ${req.provider.toUpperCase()}, Model: ${modelName}`);
    if (req.provider === "claude") {
        return callClaude({ ...req, model: modelName });
    } else {
        return callGemini({ ...req, model: modelName });
    }
}

async function callGemini(req: AiRequest): Promise<AiResponse> {
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: req.model || "gemini-1.5-flash",
        systemInstruction: req.systemPrompt,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
        }
    });

    const result = await model.generateContent([
        {
            inlineData: { data: req.base64Data, mimeType: req.mimeType }
        },
        "Extract receipt data in JSON format."
    ]);

    const response = await result.response;
    const text = response.text();
    console.log(`[Gemini Response] Length: ${text.length} chars`);

    return {
        text: cleanJsonResponse(text),
        usage: response.usageMetadata ? {
            prompt_tokens: response.usageMetadata.promptTokenCount,
            candidates_tokens: response.usageMetadata.candidatesTokenCount,
            total_tokens: response.usageMetadata.totalTokenCount,
        } : undefined
    };
}

async function callClaude(req: AiRequest): Promise<AiResponse> {
    if (!CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY is missing");

    const anthropic = new Anthropic({
        apiKey: CLAUDE_API_KEY,
    });

    const response = await anthropic.messages.create({
        model: req.model || "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        system: req.systemPrompt,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: req.mimeType as any,
                            data: req.base64Data,
                        },
                    },
                    {
                        type: "text",
                        text: "Extract receipt data in JSON format. Return ONLY the JSON object."
                    },
                ],
            },
        ],
        temperature: 0,
    });

    const text = response.content.find(c => c.type === "text")?.type === "text"
        ? (response.content.find(c => c.type === "text") as any).text
        : "";

    console.log(`[Claude Response] Length: ${text.length} chars`);
    console.log(`[Claude Raw Text Sample]: ${text.substring(0, 100)}...`);

    return {
        text: cleanJsonResponse(text),
        usage: {
            prompt_tokens: response.usage.input_tokens,
            candidates_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        }
    };
}
