CREATE DATABASE task_manager;
USE task_manager;

CREATE TABLE tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(100) NOT NULL,
  task_description VARCHAR(400) NOT NULL,
  priority    ENUM('low','medium','high','urgent') DEFAULT ('medium'),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE tags (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(25) NOT NULL UNIQUE
);

CREATE TABLE task_tags (
  task_id INT NOT NULL,
  tag_id  INT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE TABLE chat_history (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  role       ENUM('user','model') NOT NULL,
  content    TEXT                 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
