-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  task_id INT NOT NULL,
  created_by INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_created_by ON comments(created_by);
