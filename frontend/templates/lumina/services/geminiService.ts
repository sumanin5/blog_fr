import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: In a real environment, ensure process.env.API_KEY is set.
// If not set, the app will handle the error gracefully.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const summarizePost = async (content: string): Promise<string> => {
  if (!process.env.API_KEY) {
    // Return a mock response if no API key is present to prevent crashing in preview
    return "API Key is missing. Please configure your Gemini API Key to see the AI summary. This is a simulated response for demonstration purposes.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Please provide a concise, engaging summary of the following blog post in about 2-3 sentences. Capture the main essence and key takeaways.\n\nBlog Content:\n${content}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate summary due to an error. Please try again later.";
  }
};