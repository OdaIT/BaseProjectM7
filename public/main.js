const state = { tasks: [], filter: 'all', filterTag: '', sort: { field: null, direction: 'asc' }, skipNextText: false, isLoading: false };
let geminiHistory = [];

let userInput, sendBtn, responseBox, taskBoard;

async function init() {
  userInput  = document.getElementById('userInput');
  sendBtn    = document.getElementById('sendBtn');
  responseBox = document.getElementById('responseBox');
  taskBoard  = document.getElementById('taskBoard');

  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  await loadTasks();
}

async function loadTasks() {
  try {
    const res = await fetch('/tasks');
    state.tasks = await res.json();
    renderTasks();
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

async function handleSend() {
  const message = userInput.value.trim();
  if (!message || state.isLoading) return;

  state.isLoading = true;
  sendBtn.disabled = true;
  userInput.value = '';
  responseBox.textContent = 'Thinking...';

  const context = state.tasks.length
    ? 'Current tasks:\n' + state.tasks.map(t => `[ID: ${t.id} | ${t.title} | ${t.priority}]`).join('\n') + '\n\n'
    : '';

  geminiHistory.push({ role: 'user', parts: [{ text: message }] });

  await streamChat(context + message, message);
}

async function streamChat(message, rawMessage) {
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, rawMessage: rawMessage ?? message, history: geminiHistory })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6);
        if (raw === '[DONE]') return;
        try { handleSSEEvent(JSON.parse(raw)); } catch {}
      }
    }
  } catch (err) {
    responseBox.textContent = 'Error: ' + err.message;
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
  }
}

function handleSSEEvent(event) {
  if (event.type === 'tool_call') {
    applyToolToState(event.tool, event.data);
    renderTasks();
  } else if (event.type === 'text') {
    if (state.skipNextText) {
      state.skipNextText = false;
    } else {
      responseBox.textContent = event.content;
      geminiHistory.push({ role: 'model', parts: [{ text: event.content }] });
    }
  } else if (event.type === 'error') {
    responseBox.textContent = 'Error: ' + event.message;
  }
}

function applyToolToState(toolName, data) {
  switch (toolName) {
    case 'set_create_task_values':
      state.tasks.push({
        id: data.id,
        title: data.title,
        description: data.task_description,
        priority: data.priority ?? 'medium',
        tags: data.tags ?? [],
        completed: false
      });
      break;

    case 'set_refine_task_values': {
      const t = state.tasks.find(t => t.id === data.id);
      if (t) { t.title = data.title; t.description = data.task_description; t.priority = data.priority; t.tags = data.tags ?? []; }
      break;
    }

    case 'set_delete_task_values':
      state.tasks = state.tasks.filter(t => t.id !== data.task_id);
      break;

    case 'set_suggest_tag_values': {
      const t = state.tasks.find(t => t.id === data.task_id);
      if (t && !t.tags.includes(data.tag)) t.tags.push(data.tag);
      break;
    }

    case 'set_summarize_task_values': {
      const t = state.tasks.find(t => t.id === data.task_id);
      if (t) t.description = data.task_description;
      break;
    }

    case 'set_complete_task_values': {
      const t = state.tasks.find(t => t.id === data.task_id);
      if (t) t.completed = data.completed;
      break;
    }

    case 'set_filter_tasks_values':
      state.filter = data.filter;
      break;

    case 'set_filter_by_tag_values':
      state.filterTag = data.tag;
      break;

    case 'set_sort_tasks_values':
      state.sort = { field: data.field, direction: data.direction };
      break;

    case 'get_history_values': {
      if (!data.history?.length) {
        responseBox.textContent = 'No history found.';
      } else {
        responseBox.textContent = data.history
          .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
          .join('\n\n');
      }
      state.skipNextText = true;
      break;
    }
  }
}

function renderTasks() {
  taskBoard.innerHTML = '';
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

  const visible = state.tasks
    .filter(t => {
      const matchesStatus = state.filter === 'all' ? true : state.filter === 'completed' ? t.completed : !t.completed;
      const matchesTag = !state.filterTag || t.tags.includes(state.filterTag);
      return matchesStatus && matchesTag;
    })
    .sort((a, b) => {
      if (!state.sort.field) return 0;
      const dir = state.sort.direction === 'asc' ? 1 : -1;
      if (state.sort.field === 'title') return dir * a.title.localeCompare(b.title);
      if (state.sort.field === 'priority') return dir * (priorityOrder[a.priority] - priorityOrder[b.priority]);
      return 0;
    });

  if (!visible.length) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'No tasks yet. Ask the AI to create one!';
    taskBoard.appendChild(p);
    return;
  }
  visible.forEach(task => taskBoard.appendChild(createTaskCard(task)));
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card priority--${task.priority}`;
  if (task.completed) card.classList.add('completed');

  const title = document.createElement('h3');
  title.textContent = `${task.id}. ${task.title}`;

  const desc = document.createElement('p');
  desc.textContent = task.description;

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const badge = document.createElement('span');
  badge.className = `badge badge--${task.priority}`;
  badge.textContent = task.priority;
  meta.appendChild(badge);

  (task.tags ?? []).forEach(tag => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = tag;
    meta.appendChild(el);
  });

  card.append(title, desc, meta);
  return card;
}

document.addEventListener('DOMContentLoaded', init);
