async function createTaskFromText(text) {
  const prompt = `Transforma o seguinte texto em uma tarefa estruturada no formato JSON. Responde apenas com o JSON, sem texto adicional.

Texto: "${text}, ${jsonFormat}" `;

  try {
    const response = await callGemini(prompt);
    const cleanedResponse = response.replace(/```json\n?|```/g, '').trim();
    console.log('Gemini Response:', cleanedResponse);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error in createTaskFromText:', error);
    // Fallback to simple processing
    return {
      title: "Tarefa criada via IA",
      description: text,
      priority: "medium",
      tags: ["ia"]
    };
  }
}