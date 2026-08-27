require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const DB_NAME = process.env.DB_NAME || 'labdb';
const DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 30);
const DB_CONNECT_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);
let pool;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dbConnectionConfig(database) {
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
  };

  if (database) {
    config.database = database;
  }

  return config;
}

async function createConnectionWithRetry(database) {
  let lastError;

  for (let attempt = 1; attempt <= DB_CONNECT_RETRIES; attempt += 1) {
    try {
      return await mysql.createConnection(dbConnectionConfig(database));
    } catch (err) {
      lastError = err;
      console.log(
        `Database not ready yet. Retry ${attempt}/${DB_CONNECT_RETRIES}: ${err.message}`
      );
      await sleep(DB_CONNECT_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function initDB() {
  const initConn = await createConnectionWithRetry();

  try {
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await initConn.query(`USE \`${DB_NAME}\`;`);
    await initConn.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log(`Database "${DB_NAME}" and table "entries" are ready.`);
  } finally {
    await initConn.end();
  }

  pool = mysql.createPool({
    ...dbConnectionConfig(DB_NAME),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// ========== ENTER BUTTON ==========
app.post('/api/enter', async (req, res) => {
  try {
    const { input_text } = req.body;

    if (!input_text || input_text.trim() === '') {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    const query = 'INSERT INTO entries (text, created_at) VALUES (?, NOW())';
    const [result] = await pool.query(query, [input_text.trim()]);

    res.status(200).json({ 
      success: true, 
      id: result.insertId,
      message: 'Entry saved successfully' 
    });
  } catch (err) {
    console.error('Error saving entry:', err);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// ========== LIST BUTTON ==========
app.get('/api/list', async (req, res) => {
  try {
    const query = 'SELECT text, created_at FROM entries ORDER BY created_at DESC';
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.status(200).json({ logs: 'No entries found' });
    }

    const logs = rows.map(row => {
      const date = new Date(row.created_at);
      const formattedDate = date.toLocaleString();
      return `${row.text} - Logged on: ${formattedDate}`;
    }).join('\n\n');

    res.status(200).json({ logs });
  } catch (err) {
    console.error('Error fetching entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', timestamp: new Date() });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'ERROR', error: 'Database unavailable' });
  }
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database initialization failed after retries:', err.message);
    process.exit(1);
  }
}

startServer();
//adding comment to check CI/CD pipeline
