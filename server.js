require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/* 
// ==================== DB CONFIGURATION COMMENTED OUT FOR DEMO ====================
const mysql = require('mysql2/promise');
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
// ================================================================================
*/

// Root route
app.get('/', (req, res) => {
  res.send('Backend API running successfully on ECS Fargate!');
});

// ========== ENTER BUTTON (MOCKED) ==========
app.post('/api/enter', async (req, res) => {
  try {
    const { input_text } = req.body;

    if (!input_text || input_text.trim() === '') {
      return res.status(400).json({ error: 'Text cannot be empty' });
    }

    res.status(200).json({ 
      success: true, 
      id: 1,
      message: 'Entry saved successfully (Demo Mode)' 
    });
  } catch (err) {
    console.error('Error saving entry:', err);
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

// ========== LIST BUTTON (MOCKED) ==========
app.get('/api/list', async (req, res) => {
  res.status(200).json({ logs: 'Demo Log Entry - Logged on: ' + new Date().toLocaleString() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;

function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

startServer();
// adding comment to check CI/CD pipeline