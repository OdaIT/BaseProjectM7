async function summarizeTask(task) {
  const prompt = `Summarize the description if it is long—into a simple, concise, and professional sentence to make it easier to read quickly. Max 200 characters`

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in summarizeTask:', error);
    // Fallback to simple processing
    return {
      title: "Description sumarizada via IA",
      description: "text",
      priority: "medium",
      tags: ["ia"]
    };
  }
}
