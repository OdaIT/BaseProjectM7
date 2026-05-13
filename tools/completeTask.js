import { Type } from "@google/genai";

export const setCompleteTask = {
  name: "set_complete_task_values",
  description: "Marks a task as completed or reopens it.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_id: {
        type: Type.NUMBER,
        description: "ID of the task.",
      },
      completed: {
        type: Type.BOOLEAN,
        description: "True to mark complete, false to reopen.",
      },
    },
    required: ["task_id", "completed"],
  },
};
