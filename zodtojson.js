import { GoogleGenAI } from "@google/genai";
import { z } from "zod";


export const jsonFormat = z.object({
  title: z.string().describe("A short and professional title for the task (max 100 characters)."),
  task_description: z.string().describe("A detailed summary of what needs to be done (max 200 characters)."),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .describe("Priority level: low, medium, high, or urgent."),
  tags: z
    .array(z.string())
    .describe("A list of short relevant tags (e.g., bug, frontend, design)."),
});