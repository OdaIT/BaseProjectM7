import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT id, title, task_description, priority, completed FROM tasks ORDER BY created_at ASC'
    );

    const [tagRows] = await pool.query(
      'SELECT tt.task_id, tg.tag_name FROM task_tags tt JOIN tags tg ON tt.tag_id = tg.id'
    );

    const tagMap = {};
    for (const row of tagRows) {
      if (!tagMap[row.task_id]) tagMap[row.task_id] = [];
      tagMap[row.task_id].push(row.tag_name);
    }

    const result = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.task_description,
      priority: t.priority,
      completed: !!t.completed,
      tags: tagMap[t.id] ?? []
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;