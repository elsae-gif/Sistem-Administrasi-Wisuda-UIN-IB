require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'siwis',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // tanggal dikembalikan sebagai string (tanpa konversi zona waktu)
  decimalNumbers: true,
});

module.exports = pool;
