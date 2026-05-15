import { Type } from "@google/genai";

export const setFilterTasks = {
  name: "set_filter_tasks_values",
  description: "Filters the task board by completion status.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filter: {
        type: Type.STRING,
        enum: ["all", "completed", "pending"],
        description: "Filter to apply: 'all' shows every task, 'completed' shows only finished tasks, 'pending' shows only unfinished tasks.",
      },
    },
    required: ["filter"],
  },
};
