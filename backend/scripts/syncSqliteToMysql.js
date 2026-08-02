import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, QueryTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const applyChanges = process.argv.includes('--apply');
const sourcePath = process.env.SQLITE_STORAGE
  ? path.resolve(projectRoot, process.env.SQLITE_STORAGE)
  : path.join(projectRoot, 'backend', 'database.sqlite');
const databaseName = process.env.DB_NAME || 'pka_portal';

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME chỉ được chứa chữ, số và dấu gạch dưới.');
}

const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  connectTimeout: 5000
};

const tableOrder = [
  'Departments',
  'Majors',
  'AcademicTerms',
  'Users',
  'Lecturers',
  'Students',
  'Courses',
  'Classes',
  'RegistrationPeriods',
  'Registrations',
  'Grades',
  'Payments',
  'PaymentTransactions',
  'Notifications',
  'RefreshTokens',
  'AuditLogs'
];

const quoteId = identifier => `\`${identifier.replace(/`/g, '``')}\``;

function normalizeSqliteValue(value) {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? \+00:00$/.test(value)
  ) {
    return new Date(value.replace(' ', 'T').replace(' +00:00', 'Z'));
  }
  return value;
}

function normalizeSqliteRows(rows) {
  return rows.map(row => Object.fromEntries(
    Object.entries(row).map(([column, value]) => [column, normalizeSqliteValue(value)])
  ));
}

function backupDatabaseName() {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `${databaseName}_backup_${timestamp}`;
}

async function readSqliteCounts(sqlite) {
  const counts = {};
  for (const table of tableOrder) {
    const result = await sqlite.query(
      `SELECT COUNT(*) AS count FROM ${quoteId(table)}`,
      { type: QueryTypes.SELECT }
    );
    counts[table] = Number(result[0].count);
  }
  return counts;
}

async function databaseExists(admin) {
  const [rows] = await admin.query(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [databaseName]
  );
  return rows.length > 0;
}

async function readMysqlCounts(admin) {
  if (!(await databaseExists(admin))) return null;

  const [tables] = await admin.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [databaseName]
  );
  const existing = new Set(tables.map(row => row.TABLE_NAME.toLowerCase()));
  const counts = {};

  for (const table of tableOrder) {
    if (!existing.has(table.toLowerCase())) {
      counts[table] = null;
      continue;
    }
    const [rows] = await admin.query(
      `SELECT COUNT(*) AS count FROM ${quoteId(databaseName)}.${quoteId(table)}`
    );
    counts[table] = Number(rows[0].count);
  }
  return counts;
}

async function backupMysqlDatabase(admin) {
  const [tables] = await admin.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [databaseName]
  );
  if (tables.length === 0) return null;

  const backupName = backupDatabaseName();
  await admin.query(
    `CREATE DATABASE ${quoteId(backupName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  for (const { TABLE_NAME: table } of tables) {
    await admin.query(
      `CREATE TABLE ${quoteId(backupName)}.${quoteId(table)} LIKE ${quoteId(databaseName)}.${quoteId(table)}`
    );
    await admin.query(
      `INSERT INTO ${quoteId(backupName)}.${quoteId(table)} SELECT * FROM ${quoteId(databaseName)}.${quoteId(table)}`
    );
  }
  return backupName;
}

function printCounts(title, counts) {
  console.log(`\n${title}`);
  if (!counts) {
    console.log('  Database chưa tồn tại.');
    return;
  }
  for (const table of tableOrder) {
    const value = counts[table];
    console.log(`  ${table.padEnd(21)} ${value === null ? 'chưa có bảng' : value}`);
  }
}

async function main() {
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: sourcePath,
    logging: false
  });
  const admin = await mysql.createConnection(mysqlConfig);

  try {
    await sqlite.authenticate();
    const sqliteCounts = await readSqliteCounts(sqlite);
    const mysqlCountsBefore = await readMysqlCounts(admin);

    printCounts('Dữ liệu nguồn SQLite:', sqliteCounts);
    printCounts('Dữ liệu MySQL hiện tại:', mysqlCountsBefore);

    if (!applyChanges) {
      console.log('\nChế độ kiểm tra: chưa thay đổi MySQL. Chạy lại với --apply để đồng bộ.');
      return;
    }

    await admin.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteId(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    const backupName = await backupMysqlDatabase(admin);
    if (backupName) {
      console.log(`\nĐã sao lưu MySQL hiện tại sang database: ${backupName}`);
    } else {
      console.log('\nMySQL chưa có bảng dữ liệu, không cần tạo bản sao lưu.');
    }

    process.env.FORCE_SQLITE = 'false';
    const { sequelize: mysqlSequelize } = await import('../models/index.js');
    await mysqlSequelize.sync({ force: true });

    const transaction = await mysqlSequelize.transaction();
    try {
      await mysqlSequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
      for (const table of tableOrder) {
        const sourceRows = await sqlite.query(
          `SELECT * FROM ${quoteId(table)}`,
          { type: QueryTypes.SELECT }
        );
        const rows = normalizeSqliteRows(sourceRows);
        for (let offset = 0; offset < rows.length; offset += 250) {
          await mysqlSequelize.getQueryInterface().bulkInsert(
            table,
            rows.slice(offset, offset + 250),
            { transaction }
          );
        }
        console.log(`  Đã nạp ${String(rows.length).padStart(5)} dòng vào ${table}`);
      }
      await mysqlSequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    const mysqlCountsAfter = await readMysqlCounts(admin);
    printCounts('Dữ liệu MySQL sau đồng bộ:', mysqlCountsAfter);

    const mismatches = tableOrder.filter(table => mysqlCountsAfter?.[table] !== sqliteCounts[table]);
    if (mismatches.length > 0) {
      throw new Error(`Số bản ghi không khớp ở: ${mismatches.join(', ')}`);
    }

    const [targetUser] = await admin.query(
      `SELECT id, username, role, status FROM ${quoteId(databaseName)}.Users WHERE username = ?`,
      ['GV20260147@pka.edu.vn']
    );
    if (targetUser.length !== 1) {
      throw new Error('Không tìm thấy tài khoản GV20260147 sau đồng bộ.');
    }

    console.log('\nĐồng bộ hoàn tất và đã xác minh tài khoản GV20260147@pka.edu.vn.');
    await mysqlSequelize.close();
  } finally {
    await sqlite.close();
    await admin.end();
  }
}

main().catch(error => {
  console.error(`\nĐồng bộ thất bại: ${error.message}`);
  process.exitCode = 1;
});
