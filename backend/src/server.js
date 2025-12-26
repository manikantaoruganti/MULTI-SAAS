require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
});

app.post('/api/auth/register-tenant', async (req, res) => {
  try {
    const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;
    const tenantId = uuidv4();
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await pool.query('BEGIN');
    await pool.query(
      'INSERT INTO tenants (id, name, subdomain, status, subscriptionplan, maxusers, maxprojects) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [tenantId, tenantName, subdomain, 'active', 'free', 5, 3]
    );
    await pool.query(
      'INSERT INTO users (id, tenantid, email, passwordhash, fullname, role, isactive) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, tenantId, adminEmail, hashedPassword, adminFullName, 'tenantadmin', true]
    );
    await pool.query('COMMIT');
    res.status(201).json({ success: true, data: { tenantId, userId, email: adminEmail, role: 'tenantadmin' } });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, tenantSubdomain } = req.body;
    const result = await pool.query(
      'SELECT u.*, t.id as tenantid, t.subscriptionplan FROM users u JOIN tenants t ON u.tenantid = t.id WHERE u.email = $1 AND t.subdomain = $2',
      [email, tenantSubdomain]
    );
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.passwordhash);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, tenantId: user.tenantid, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, data: { user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantid }, token, expiresIn: 86400 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, fullname, role, isactive FROM users WHERE id = $1', [req.user.userId]);
    const tenant = await pool.query('SELECT id, name, subdomain, subscriptionplan, maxusers, maxprojects FROM tenants WHERE id = $1', [req.user.tenantId]);
    res.json({ success: true, data: { ...result.rows[0], tenant: tenant.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/tenants/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, subdomain, status, subscriptionplan, maxusers, maxprojects FROM tenants WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tenant not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tenants/:tenantId/users', authenticateToken, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE tenantid = $1', [req.params.tenantId]);
    const tenant = await pool.query('SELECT maxusers FROM tenants WHERE id = $1', [req.params.tenantId]);
    if (parseInt(userCount.rows[0].count) >= tenant.rows[0].maxusers) return res.status(403).json({ success: false, message: 'User limit reached' });
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (id, tenantid, email, passwordhash, fullname, role, isactive) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, req.params.tenantId, email, hashedPassword, fullName, role || 'user', true]);
    res.status(201).json({ success: true, data: { id: userId, email, fullName, role: role || 'user' } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/tenants/:tenantId/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, fullname, role, isactive, createdat FROM users WHERE tenantid = $1 ORDER BY createdat DESC',
      [req.params.tenantId]);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const projectId = uuidv4();
    await pool.query('INSERT INTO projects (id, tenantid, name, description, status, createdby, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
      [projectId, req.user.tenantId, name, description || '', status || 'active', req.user.userId]);
    res.status(201).json({ success: true, data: { id: projectId, tenantId: req.user.tenantId, name, description, status: status || 'active' } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, status, createdat FROM projects WHERE tenantid = $1 ORDER BY createdat DESC',
      [req.user.tenantId]);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;
    const taskId = uuidv4();
    await pool.query('INSERT INTO tasks (id, projectid, tenantid, title, description, status, priority, assignedto, duedate, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
      [taskId, req.params.projectId, req.user.tenantId, title, description || '', 'todo', priority || 'medium', assignedTo || null, dueDate || null]);
    res.status(201).json({ success: true, data: { id: taskId, projectId: req.params.projectId, title, status: 'todo', priority: priority || 'medium' } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, description, status, priority, assignedto, duedate, createdat FROM tasks WHERE projectid = $1 AND tenantid = $2 ORDER BY createdat DESC',
      [req.params.projectId, req.user.tenantId]);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/tasks/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE tasks SET status = $1, updatedat = NOW() WHERE id = $2', [status, req.params.taskId]);
    res.json({ success: true, data: { id: req.params.taskId, status } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    await pool.query('UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status), priority = COALESCE($4, priority), assignedto = COALESCE($5, assignedto), duedate = COALESCE($6, duedate), updatedat = NOW() WHERE id = $7',
      [title, description, status, priority, assignedTo, dueDate, req.params.taskId]);
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1 AND tenantid = $2', [req.params.projectId, req.user.tenantId]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1 AND tenantid = $2', [req.params.taskId, req.user.tenantId]);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = app;
