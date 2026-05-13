async function summarizeTask(task) {
  const prompt = `Resume a description se for longa em uma frase simples, objetiva e profissional para facilitar leitura rápida. ${jsonFormat}`

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
