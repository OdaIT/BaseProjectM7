import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// 1. Definimos o Schema para a Tarefa do ClickUp
// O Zod permite-nos adicionar .describe(), que o Gemini usa para entender o campo!
const clickupTaskSchema = z.object({
  name: z.string().describe("Um título curto e profissional para a tarefa."),
  description: z.string().describe("Um resumo detalhado do que precisa ser feito."),
  priority: z.enum(["Urgente", "Alta", "Normal", "Baixa"]).describe("Nível de prioridade:  (Urgente),  (Alta),  (Normal),  (Baixa)."),
  tags: z.array(z.string()).describe("Lista de categorias/etiquetas relevantes (ex: bug, feature, design)."),
  estimated_hours: z.number().optional().describe("Estimativa de tempo em horas, se mencionada.")
});

const ai = new GoogleGenAI("SUA_API_KEY");

// Exemplo de um input "sujo" (como viria de um chat ou email)
const rawUserRequest = "Olha, o botão de login na página inicial não está a funcionar no Safari. É urgente resolver isto porque os clientes não conseguem entrar. Acho que o João demora umas 3 horas a fixar isto.";

const prompt = `Analise o seguinte pedido de suporte e extraia as informações necessárias para criar uma tarefa no ClickUp.
Pedido: "${rawUserRequest}"`;

// 2. Chamada à API usando o schema definido
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview", // Ou o modelo que estiveres a usar no curso
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: {
    responseMimeType: "application/json",
    // Convertemos o Zod para JSON Schema que o Gemini entende nativamente
    responseJsonSchema: zodToJsonSchema(clickupTaskSchema),
  },
});

try {
  // 3. Parsing e Validação
  // O JSON.parse transforma a string em objeto, o .parse do Zod garante que os tipos estão corretos
  const taskData = clickupTaskSchema.parse(JSON.parse(response.text));

  console.log("Tarefa Estruturada para o ClickUp:");
  console.log(taskData);
  
  /* Exemplo de Output esperado:
    {
      name: "Correção de erro no botão de login - Safari",
      description: "O botão de login apresenta falhas de funcionamento especificamente no navegador Safari, impedindo o acesso dos utilizadores.",
      priority: "1",
      tags: ["bug", "login", "safari"],
      estimated_hours: 3
    }
  */

} catch (error) {
  console.error("A IA gerou um JSON inválido ou fora do schema:", error);
}