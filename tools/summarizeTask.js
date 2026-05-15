import { Type } from "@google/genai";

// Define a function that the model can call to control smart lights
export const setSummarizeTask = {
  name: "set_summarize_task_values",
  description: "Summarizes a long description of a task into a shorter one.(max 200 characters)",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_description: {
        type: Type.STRING,
        description:
          "Description of the task.",
      },
      task_id: {
        type: Type.NUMBER,
        description:
          "Id of the task.",
      },
    },
    required: ["task_id", "task_description"],
  },
};

/**
 * @param {number} task_id - Id of the task
 * @param {string} task_description - Describes the task, whats the issue and all of that.
 * @return {Object} A dictionary containing the summarized task.
 * @param {string} tags - one word that describes the type of task
 * @return {Object} A dictionary containing the task.
 */
function setSummarizeTaskValues(task_id, task_description) {
  return {
    task_id: task_id,
    description: task_description
  };
}