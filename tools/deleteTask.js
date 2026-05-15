import { Type } from "@google/genai";

// Define a function that the model can call to control smart lights
export const setDeleteTask = {
  name: "set_delete_task_values",
  description: "Deletes a task",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_id: {
        type: Type.NUMBER,
        description:
          "Id of the task. Only delete individual tasks.",
      },
    },
    required: ["task_id"],
  },
};

/**
 * @param {number} task_id - Id of the task to delete
 * @return {Object} A dictionary containing the deleted task.
 */
function setDeleteTaskValues(task_id) {
  return {
    task_id: task_id
  };
}

