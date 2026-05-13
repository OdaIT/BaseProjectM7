import express from 'express';
// Esta é a nova lib oficial (SDK Unificada v3)
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import { setCreateTask } from './tools/createTask.js';
import { setRefineTask } from './tools/refineTask.js';
import { setDeleteTask } from './tools/deleteTask.js';
import { setSummarizeTask } from './tools/summarizeTask.js';
import { setSuggestTag } from './tools/suggestTag.js';

const app = express();

const config = {
  tools: [{
    functionDeclarations: [setCreateTask, setRefineTask, setDeleteTask, setSummarizeTask, setSuggestTag]
  }]
};

// Na v3, a inicialização é feita desta forma
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.get('/', async (req, res) => {
  // 1. Headers fundamentais para Streaming (SSE)
  res.setHeader('Content-Type', 'application/json');

  try {
    const prompt = req.query.prompt || "Tenho que entregar um trabalho de GenAI até sexta feira sem falta.";

    // 2. Na v3, usamos ai.models.generateContentStream
    // O modelo é passado como o primeiro argumento da configuração
  const chat = ai.chats.create({
    model: 'gemini-3.1-flash-lite-preview',
    config: {
      tools: [{ functionDeclarations: [setCreateTask, setRefineTask, setDeleteTask, setSummarizeTask, setSuggestTag] }],
      toolConfig: {
        functionCallingConfig: {
          mode: 'auto'  // Let LLM decide which tool to call
        }
      }
    }
  });

  const response = await chat.sendMessage({
    message: prompt
  });

    res.write('data: \n [DONE]\n\n');
    res.end();
    console.log(res)

  } catch (error) {
    console.error("Erro na SDK v3:", error);
    res.write(`data: ${JSON.stringify({ error: "Falha na conexão com Gemini 3" })}\n\n`);
    res.end();
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 ClickBot v3 (@google/genai) em http://localhost:${PORT}`));