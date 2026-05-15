import { jsonFormat } from "../zodtojson";

async function suggestTags(task) {
  const prompt = `Analyze the task and suggest relevant tags. ${jsonFormat}`

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in suggestTags:', error);
    return {
      title: "Suggests tags via IA",
      description: "text",
      priority: "medium",
      tags: ["ia"]
    };
  }
}