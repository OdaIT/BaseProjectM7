import { Type } from "@google/genai";

// Define a function that the model can call to control smart lights
export const setSuggestTag = {
  name: "set_suggest_tag_values",
  description: "Suggests a tag for a task based on its description.(max 20 characters)",
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
 * @return {Object} A dictionary containing the suggested tag.
 */
function setSuggestTagValues(task_id, task_description) {
  return {
    task_id: task_id,
    description: task_description
  };
}