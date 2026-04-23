const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "btsarmy7",
  database: process.env.DB_NAME || "blood_bank_db"
};

let pool;
let initPromise;

async function dropColumnIfExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [dbConfig.database, tableName, columnName]
  );

  if (!rows.length) {
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function seedDefaultAdmin() {
  const bcrypt = require("bcryptjs");
  const activePool = getPool();
  const [existing] = await activePool.execute(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (existing.length) {
    return;
  }

  const hashedPassword = await bcrypt.hash("password", 10);
  await activePool.execute(
    "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'admin', ?)",
    ["Rupabh", "rupabh@pulselink.com", hashedPassword, "9000000000"]
  );
}

async function initDatabase() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const schemaPath = path.join(__dirname, "..", "..", "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    let bootstrapConnection;

    try {
      bootstrapConnection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        multipleStatements: true
      });
      await bootstrapConnection.query(schemaSql);
      await dropColumnIfExists(bootstrapConnection, "donors", "latitude");
      await dropColumnIfExists(bootstrapConnection, "donors", "longitude");
      await dropColumnIfExists(bootstrapConnection, "patients", "latitude");
      await dropColumnIfExists(bootstrapConnection, "patients", "longitude");
      await dropColumnIfExists(bootstrapConnection, "requests", "latitude");
      await dropColumnIfExists(bootstrapConnection, "requests", "longitude");
    } catch (error) {
      throw new Error(
        `Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port}. Start MySQL/MariaDB and verify your DB_USER/DB_PASSWORD in .env.`
      );
    } finally {
      if (bootstrapConnection) {
        await bootstrapConnection.end();
      }
    }

    await seedDefaultAdmin();
  })();

  return initPromise;
}

async function query(sql, params = []) {
  await initDatabase();
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = {
  get pool() {
    return getPool();
  },
  initDatabase,
  query
};
