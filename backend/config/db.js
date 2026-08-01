import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const forceSqlite = process.env.FORCE_SQLITE === 'true';
let isMysqlConnected = false;
let sequelize;

if (!forceSqlite) {
  // Tự động tạo Database MySQL nếu chưa tồn tại
  try {
    const dbName = process.env.DB_NAME || 'pka_portal';
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      connectTimeout: 5000
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();
    console.log(`📁 Đảm bảo tồn tại database MySQL: ${dbName}`);
    isMysqlConnected = true;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Không thể kết nối MySQL trong production: ${err.message}`);
    }
    console.log('⚠️ Không thể kết nối hoặc khởi tạo MySQL. Tự động kích hoạt cơ chế dự phòng chuyển sang SQLite cục bộ.');
    isMysqlConnected = false;
  }
}

if (!forceSqlite && isMysqlConnected) {
  console.log(`🔌 Đang kết nối Cơ sở dữ liệu MySQL tại ${process.env.DB_HOST}:${process.env.DB_PORT}...`);
  sequelize = new Sequelize(
    process.env.DB_NAME || 'pka_portal',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false,
      define: {
        timestamps: true
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  console.log('⚠️ Sử dụng Cơ sở dữ liệu SQLite cục bộ (database.sqlite)');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_STORAGE || path.resolve(__dirname, '../database.sqlite'),
    logging: false
  });
}

export default sequelize;
