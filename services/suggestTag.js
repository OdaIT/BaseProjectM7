async function suggestTags(task) {
  const prompt = `Analisa a tarefa e sugere tags relevantes. ${jsonFormat}`

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in suggestTags:', error);
    // Fallback to simple processing
    return {
      title: "Suggests tags via IA",
      description: "text",
      priority: "medium",
      tags: ["ia"]
    };
  }
}