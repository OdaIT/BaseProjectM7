# Project Hail Mary — AI Task Manager

## Context

The project at `m7-03-utils` is a partially-built AI task manager. The backend (Express + Gemini tool-calling) and tool declarations exist, but the tool execution loop is missing, there is no frontend JavaScript, and the HTML is a stub. This plan completes the integration end-to-end: Gemini interprets natural language, calls tools, and the UI updates reactively via SSE.

---

## What Already Exists

- `stream_api.js` — Express server, Gemini chat, 5 tool declarations wired in, SSE output (incomplete)
- `tools/*.js` — 5 tool function declarations (create, refine, delete, suggest tag, summarize)
- `index.html` — stub with textarea, no JS
- `.env` — `GEMINI_API_KEY` and `PORT=3000`

---

## Database Schema (MySQL)

```sql
CREATE TABLE tasks (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(100) NOT NULL,
  task_description VARCHAR(400) NOT NULL,
  priority         ENUM('low','medium','high','urgent') DEFAULT 'medium',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed        BOOLEAN DEFAULT FALSE
);

CREATE TABLE tags (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(25) NOT NULL UNIQUE
);

CREATE TABLE task_tags (
  task_id INT NOT NULL,
  tag_id  INT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

**Column notes vs. original plan:**
- `tasks.task_description` (not `description`) — already matches the tool parameter name ✓
- `tasks.completed BOOLEAN DEFAULT FALSE` — toggled by a dedicated `set_complete_task` tool (Option A)
- `tags.tag_name` (not `name`) — affects every query that touches the `tags` table
- `priority` defaults to `'medium'` — no longer strictly required in INSERT statements

---

## What Needs to Be Built

### Step 0 — Add mysql2 and create `db.js`

Install the driver:
```bash
npm install mysql2
```

Create `db.js` — a single shared connection pool:
```js
import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

Add the four DB vars to `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=task_manager
```

---

### Step 1 — Update tool declarations

**`task_id` stays `Type.NUMBER`** — MySQL AUTO_INCREMENT returns integers. `deleteTask.js`, `suggestTag.js`, `summarizeTask.js` are already correct.

**Changes needed:**

- `tools/createTask.js` → change `tags` from `Type.STRING` → `Type.ARRAY` with `items: { type: Type.STRING }`
- `tools/refineTask.js` → same `tags` change + **add** `task_id: { type: Type.NUMBER, description: "ID of the task to refine" }` to `properties` and `required`
- `tools/completeTask.js` → **create new file** with tool `set_complete_task_values(task_id)`

**New tool declaration — `tools/completeTask.js`:**
```js
import { Type } from "@google/genai";

export const setCompleteTask = {
  name: "set_complete_task_values",
  description: "Marks a task as completed or uncompleted.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_id: {
        type: Type.NUMBER,
        description: "ID of the task to mark as complete.",
      },
      completed: {
        type: Type.BOOLEAN,
        description: "True to mark complete, false to reopen.",
      },
    },
    required: ["task_id", "completed"],
  },
};
```

Remember to import and add `setCompleteTask` to the tools array in `stream_api.js`.

`tags` must be an array so the backend can upsert each tag individually into the `tags` table and link via `task_tags`.

---

### Step 2 — Restructure into `routes/` + update `stream_api.js`

**File structure:**
```
stream_api.js        ← app setup only (middleware, routes, listen)
routes/
  chat.js            ← POST /chat handler, Gemini loop, executeTool, sendSSE
db.js                ← mysql2 pool (already done)
```

**`stream_api.js` becomes thin — only:**
```js
import express from 'express';
import 'dotenv/config';
import chatRouter from './routes/chat.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/chat', chatRouter);
app.listen(process.env.PORT, () => console.log(`Server on port ${process.env.PORT}`));
```

**`routes/chat.js`** — contains everything:
- All tool imports (`setCreateTask`, `setRefineTask`, ..., `setCompleteTask`)
- `pool` import from `db.js`
- `sendSSE(res, payload)` helper
- `upsertTag(tagName)` helper
- `executeTool(name, args)` — async, does real DB queries
- The `router.post('/', async (req, res) => { ... })` handler

**Tool execution loop inside the route handler:**
```
POST /chat:
  1. Set SSE headers
  2. Create Gemini chat from incoming history: ai.chats.create({ model, config: { tools, toolConfig }, history })
  3. Send first message: response = await chat.sendMessage({ message })
  4. Tool loop (max 5 iterations):
       while response.functionCalls?.length:
         for each fn in response.functionCalls:
           result = await executeTool(fn.name, fn.args)
           sendSSE(res, { type: "tool_call", tool: fn.name, data: result })
         response = await chat.sendMessage({ message: functionResponseParts })
  5. sendSSE(res, { type: "text", content: response.text })
  6. res.write('data: [DONE]\n\n'); res.end()
  7. Wrap in try/catch → sendSSE error event on failure
```

**`executeTool(name, args)`** — now `async`, does real DB work via `pool` from `db.js`:

| Tool | DB operations | Returns |
|---|---|---|
| `set_create_task_values` | INSERT into `tasks`, upsert each tag into `tags`, INSERT into `task_tags` | `{ id: insertId, title, description, priority, tags, status: "created" }` |
| `set_refine_task_values` | UPDATE `tasks` by `args.task_id`, delete old `task_tags`, re-insert tags | `{ id: args.task_id, title, description, priority, tags, status: "refined" }` |
| `set_delete_task_values` | DELETE from `tasks` (cascades to `task_tags`) | `{ task_id: args.task_id, status: "deleted" }` |
| `set_suggest_tag_values` | Upsert tag into `tags`, INSERT into `task_tags` | `{ task_id, tag, status: "tag_suggested" }` |
| `set_summarize_task_values` | UPDATE `tasks.task_description` by `args.task_id` | `{ task_id, task_description, status: "summarized" }` |
| `set_complete_task_values` | UPDATE `tasks SET completed = ?` by `args.task_id` | `{ task_id, completed, status: "completed" }` |

**Tag upsert pattern (reuse across tools):**
```js
async function upsertTag(tagName) {
  await pool.query('INSERT IGNORE INTO tags (tag_name) VALUES (?)', [tagName]);
  const [[row]] = await pool.query('SELECT id FROM tags WHERE tag_name = ?', [tagName]);
  return row.id;
}
```
Note: column is `tag_name`, not `name`.

**`sendSSE(res, payload)`** — helper: `res.write('data: ' + JSON.stringify(payload) + '\n\n')`

---

### Step 3 — Create `public/style.css`

Two-panel grid layout (chat left, task board right):

```
body         → height: 100vh, flex column, system-ui font
.app-layout  → grid-template-columns: 1fr 1.4fr, flex: 1
.panel--chat → white bg, flex column, border-right
.panel--board→ #f9f9fb bg, overflow-y: auto

.chat-messages → flex: 1, overflow-y: auto, flex column, gap
.message--user      → align-self: flex-end, dark bg, white text
.message--assistant → align-self: flex-start, light gray bg

.task-card → white, rounded, box-shadow, border-left 4px (color = priority)
  urgent → red (#e53e3e), high → orange, medium → yellow, low → green
.badge--<priority> → matching pastel background
.tag → pill shape, light gray
.btn-submit:disabled → opacity 0.5
```

---

### Step 4 — Rewrite `index.html`

Replace the stub body with a two-panel layout:

```
<header>  AI Task Manager title
<main class="app-layout">
  <section class="panel panel--chat">
    <div id="chatMessages"></div>
    <div class="chat-input-area">
      <textarea id="userInput"></textarea>
      <button id="sendBtn">Send</button>
    </div>
  </section>
  <section class="panel panel--board">
    <div id="taskBoard"></div>
  </section>
</main>
<link rel="stylesheet" href="style.css">   (in <head>)
<script src="main.js" defer></script>      (end of <body>)
```

---

### Step 5 — Create `public/main.js`

**State:**
```js
const state = { tasks: [], messages: [], isLoading: false }
let geminiHistory = []   // [{ role: "user"|"model", parts: [{ text }] }]
```

**Task object:** `{ id, title, description, priority, tags, createdAt }`

**Key functions (implement in this order):**

1. `init()` — query DOM refs, attach event listeners, call initial renders
2. `handleSend()`:
   - Inject task context into prompt: `"Context: [ID: <uuid> | Title: ... | Priority: ...]\nUser: <msg>"`
   - Push user message to `state.messages`, render
   - Call `streamChat(augmentedMessage)`
3. `streamChat(message)`:
   - `fetch('POST /chat', { message, history: geminiHistory })`
   - Read `response.body` as `ReadableStream` with `TextDecoder`
   - Parse SSE: split buffer on `\n\n`, strip `data: `, JSON.parse, call `handleSSEEvent`
   - On `[DONE]`: set `isLoading = false`, re-enable button
4. `handleSSEEvent(event)`:
   - `"tool_call"` → `applyToolToState(event.tool, event.data)` + `renderTasks()`
   - `"text"` → push assistant message to `state.messages`, append to `geminiHistory`, `renderMessages()`
   - `"error"` → show error in chat
5. `applyToolToState(toolName, data)`:
   - `set_create_task_values` → push new task using `data.id` (from DB `insertId`, NOT `crypto.randomUUID()`)
   - `set_refine_task_values` → find by `data.task_id`, update fields in place
   - `set_delete_task_values` → filter out task by `data.task_id`
   - `set_suggest_tag_values` → find by `data.task_id`, update `tags`
   - `set_summarize_task_values` → find by `data.task_id`, update `description`
6. `renderTasks()` — clear `#taskBoard`, render a card per task (or empty state placeholder)
7. `createTaskCard(task)` — returns a DOM element (use `textContent`, not innerHTML, to avoid XSS)
8. `renderMessages()` — clear `#chatMessages`, render `.message--user/assistant` divs, scroll to bottom

---

## SSE Event Contract

```json
{ "type": "tool_call", "tool": "<tool_name>", "data": { ...toolArgs, "status": "created|refined|deleted|..." } }
{ "type": "text",      "content": "Natural language reply from Gemini" }
{ "type": "error",     "message": "Error message" }
// Stream terminator (raw, not JSON):
data: [DONE]
```

---

## Implementation Order

1. Run MySQL schema (create DB + 3 tables)
2. Install `mysql2`, add DB vars to `.env`, create `db.js`
3. Update `tools/createTask.js` — `tags` → `Type.ARRAY`
4. Update `tools/refineTask.js` — `tags` → `Type.ARRAY` + add `task_id`
5. Create `tools/completeTask.js` — new `set_complete_task_values` tool
5. Rewrite `stream_api.js` — POST endpoint, real `executeTool` with DB, tool loop
6. Create `public/` directory
7. Create `public/style.css`
8. Rewrite `index.html`
9. Create `public/main.js` (IDs come from SSE response, not browser)

---

## Verification

```bash
# Start server
node stream_api.js

# Test backend directly
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"create a task to fix the login bug, urgent priority","history":[]}'
# Expect SSE events: tool_call (set_create_task_values) then text

# Browser test at http://localhost:3000
# 1. Type "Create a task: Fix login bug, priority urgent" → card appears on board
# 2. Type "Delete that task" → card disappears
# 3. Type "Add task: Update docs, low priority, then refine it with more detail"
```

---

## Critical Files

| File | Action |
|---|---|
| `db.js` | Create new — mysql2 pool |
| `stream_api.js` | Slim down — middleware + route mounting only |
| `routes/chat.js` | Create new — Gemini loop, executeTool, DB queries |
| `index.html` | Rewrite — two-panel layout |
| `tools/createTask.js` | Change `tags` to `Type.ARRAY` |
| `tools/refineTask.js` | Change `tags` to `Type.ARRAY`, add `task_id` |
| `tools/deleteTask.js` | No change — already `Type.NUMBER` ✓ |
| `tools/suggestTag.js` | No change — already `Type.NUMBER` ✓ |
| `tools/summarizeTask.js` | No change — already `Type.NUMBER` ✓ |
| `tools/completeTask.js` | Create new |
| `public/main.js` | Create new |
| `public/style.css` | Create new |
| `.env` | Add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME |
