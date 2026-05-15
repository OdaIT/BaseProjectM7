import { Type } from "@google/genai";

// Define a function that the model can call to control smart lights
export const setCreateTask = {
  name: "set_create_task_values",
  description: "Creates a task",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description:
          "Short title for the task.(max 50 characters)",
      },
      task_description: {
        type: Type.STRING,
        description:
          "A detailed summary of what needs to be done.(NEVER EXCEED 200 characters)",
      },
      priority: {
        type: Type.STRING,
        enum: ["low", "medium", "high", "urgent"],
        description:
          "Defines the priority which the task needs to be solved. Can be `low`, `medium` `high` or `urgent`.",
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
            "List of short tags describing the task (example: ['bug', 'frontend']).(max 25 characters)",
      },
    },
    required: ["title", "task_description", "priority"],
  },
};

/**
 * @param {string} title - Short title for the task
 * @param {string} task_description - Describes the task, whats the issue and all of that.
 * @param {string} priority - Defines the priority which the task needs to be solved. Can be `low`, `medium` `high` or `urgent`.
 * @param {string} tags - one word that describes the type of task
 * @return {Object} A dictionary containing the task.
 */
function setCreateTaskValues(title, task_description, priority, tags) {
  return {
    title: title,
    description: task_description,
    priority: priority,
    tags: tags
  };
}

