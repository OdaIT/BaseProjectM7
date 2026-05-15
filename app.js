import express from 'express';
import 'dotenv/config';
import chatRouter from './routes/chat.js';
import tasksRouter from './routes/tasks.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/chat', chatRouter);
app.use('/tasks', tasksRouter);

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);