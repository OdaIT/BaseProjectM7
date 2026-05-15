import { Type } from "@google/genai";

export const setSortTasks = {
  name: "set_sort_tasks_values",
  description: "Sorts the task board by title or priority.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      field: {
        type: Type.STRING,
        enum: ["title", "priority"],
        description: "Field to sort by: 'title' for alphabetical order, 'priority' for priority level.",
      },
      direction: {
        type: Type.STRING,
        enum: ["asc", "desc"],
        description: "Sort direction: 'asc' for A-Z or low-to-high priority, 'desc' for Z-A or high-to-low priority.",
      },
    },
    required: ["field", "direction"],
  },
};
