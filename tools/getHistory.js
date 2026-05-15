import { Type } from "@google/genai";

export const getHistory = {
  name: "get_history_values",
  description: "Retrieves the recent chat history between the user and the AI.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: "Number of recent messages to retrieve. Max 20.",
      },
    },
    required: ["limit"],
  },
};
