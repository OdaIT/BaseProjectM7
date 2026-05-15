import { Type } from "@google/genai";

export const setFilterByTag = {
  name: "set_filter_by_tag_values",
  description: "Filters the task board to show only tasks that have a specific tag. Pass an empty string to clear the tag filter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      tag: {
        type: Type.STRING,
        description: "Tag to filter by. Pass an empty string to remove the tag filter and show all tags.",
      },
    },
    required: ["tag"],
  },
};
