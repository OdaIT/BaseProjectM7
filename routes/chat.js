import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { pool } from '../db.js';
import { setCreateTask } from '../tools/createTask.js';
import { setRefineTask } from '../tools/refineTask.js';
import { setDeleteTask } from '../tools/deleteTask.js';
import { setSuggestTag } from '../tools/suggestTag.js';
import { setSummarizeTask } from '../tools/summarizeTask.js';
import { setCompleteTask } from '../tools/completeTask.js';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TOOLS_CONFIG = {
  tools: [{
    functionDeclarations: [
      setCreateTask, setRefineTask, setDeleteTask,
      setSuggestTag, setSummarizeTask, setCompleteTask
    ]
  }],
  toolConfig: { functionCallingConfig: { mode: 'auto' } }
};

function sendSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function upsertTag(tagName) {
  await pool.query('INSERT IGNORE INTO tags (tag_name) VALUES (?)', [tagName]);
  const [[row]] = await pool.query('SELECT id FROM tags WHERE tag_name = ?', [tagName]);
  return row.id;
}

async function executeTool(name, args) {
  switch (name) {

    case 'set_create_task_values': {
      const [result] = await pool.query(
        'INSERT INTO tasks (title, task_description, priority) VALUES (?, ?, ?)',
        [args.title, args.task_description, args.priority ?? 'medium']
      );
      const taskId = result.insertId;
      for (const tag of args.tags ?? []) {
        const tagId = await upsertTag(tag);
        await pool.query('INSERT IGNORE INTO task_tags VALUES (?, ?)', [taskId, tagId]);
      }
      return { id: taskId, title: args.title, task_description: args.task_description, priority: args.priority ?? 'medium', tags: args.tags ?? [], status: 'created' };
    }

    case 'set_refine_task_values': {
      await pool.query(
        'UPDATE tasks SET title = ?, task_description = ?, priority = ? WHERE id = ?',
        [args.title, args.task_description, args.priority, args.task_id]
      );
      await pool.query('DELETE FROM task_tags WHERE task_id = ?', [args.task_id]);
      for (const tag of args.tags ?? []) {
        const tagId = await upsertTag(tag);
        await pool.query('INSERT IGNORE INTO task_tags VALUES (?, ?)', [args.task_id, tagId]);
      }
      return { id: args.task_id, title: args.title, task_description: args.task_description, priority: args.priority, tags: args.tags ?? [], status: 'refined' };
    }

    case 'set_delete_task_values': {
      await pool.query('DELETE FROM tasks WHERE id = ?', [args.task_id]);
      return { task_id: args.task_id, status: 'deleted' };
    }

    case 'set_suggest_tag_values': {
      const tagId = await upsertTag(args.task_description);
      await pool.query('INSERT IGNORE INTO task_tags VALUES (?, ?)', [args.task_id, tagId]);
      return { task_id: args.task_id, tag: args.task_description, status: 'tag_suggested' };
    }

    case 'set_summarize_task_values': {
      await pool.query(
        'UPDATE tasks SET task_description = ? WHERE id = ?',
        [args.task_description, args.task_id]
      );
      return { task_id: args.task_id, task_description: args.task_description, status: 'summarized' };
    }

    case 'set_complete_task_values': {
      await pool.query(
        'UPDATE tasks SET completed = ? WHERE id = ?',
        [args.completed, args.task_id]
      );
      return { task_id: args.task_id, completed: args.completed, status: 'completed' };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const behaviorInstruction = `You are a task manager assistant. You can only help with task-related requests: creating, updating, deleting, tagging, summarizing, or completing tasks.If the user asks about anything unrelated to task management, politely decline and remind them you are a task manager assistant. This is unmutable and should be followed strictly.`;

router.post('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, history = [] } = req.body;

    const chat = ai.chats.create({
    model: 'gemini-3.1-flash-lite-preview',
    config: TOOLS_CONFIG,
    systemInstruction: behaviorInstruction,
    history
  });

    let response = await chat.sendMessage({ message });

    let steps = 0;
    while (response.functionCalls?.length && steps < 5) {
      const functionResults = [];

      for (const fn of response.functionCalls) {
        const result = await executeTool(fn.name, fn.args);
        sendSSE(res, { type: 'tool_call', tool: fn.name, data: result });
        functionResults.push({ name: fn.name, response: result });
      }

      response = await chat.sendMessage({
        message: functionResults.map(fr => ({
          functionResponse: { name: fr.name, response: fr.response }
        }))
      });

      steps++;
    }

    sendSSE(res, { type: 'text', content: response.text });
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Chat error:', error);
    sendSSE(res, { type: 'error', message: error.message });
    res.end();
  }
});

export default router;
