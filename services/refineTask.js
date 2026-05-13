async function refineTask(task) {
  const prompt = `Melhora a tarefa existente tornando-a mais clara, completa e profissional. ${jsonFormat} `

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in refineTask:', error);
    // Fallback to simple processing
    return {
      title: "Tarefa refinada via IA",
      description: "text",
      priority: "medium",
      tags: ["ia"]
    };
  }
}
