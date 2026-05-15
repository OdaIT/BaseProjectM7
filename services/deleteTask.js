import { jsonFormat } from "../zodtojson";

async function createTaskFromText(text) {
  const prompt = `Transform the following text into a structured task in JSON format. Reply only with the JSON, no additional text.

Text: "${text}, ${jsonFormat}" `;

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in createTaskFromText:', error);
    return {
      title: "Task deleted via IA",
      description: text,
      priority: "medium",
      tags: ["ia"]
    };
  }
}