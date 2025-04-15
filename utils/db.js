// utils/db.js
import * as SQLite from 'expo-sqlite';

// Create database using the new API
let db = null;

export const initDB = async () => {
  try {
    // Open database using the new async API
    db = await SQLite.openDatabaseAsync('finances.db');
    console.log("Database opened successfully");
    
    // Create tables
    await createTables();
    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

const createTables = async () => {
  try {
    // Create categories table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      );
    `);
    
    // Create transactions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `);
    
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

// Category operations
export const getCategories = async (type) => {
  try {
    const result = await db.getAllAsync(`SELECT * FROM categories WHERE type = ?;`, [type]);
    return result;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

export const addCategory = async (name, type) => {
  try {
    const result = await db.runAsync(
      'INSERT INTO categories (name, type) VALUES (?, ?);',
      [name, type]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Transaction operations
export const addTransaction = async (amount, description, categoryId, type, date) => {
  try {
    const result = await db.runAsync(
      'INSERT INTO transactions (amount, description, category_id, type, date) VALUES (?, ?, ?, ?, ?);',
      [amount, description, categoryId, type, date]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

export const getTransactions = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      JOIN categories c ON t.category_id = c.id 
      ORDER BY t.date DESC;
    `);
    return result;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

// Statistics operations
export const getCategoryStats = async (type) => {
  try {
    const result = await db.getAllAsync(`
      SELECT c.id, c.name, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = ?
      GROUP BY c.id
      ORDER BY total DESC;
    `, [type]);
    return result;
  } catch (error) {
    console.error('Error getting category stats:', error);
    throw error;
  }
};

export const getMonthlyStats = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      GROUP BY month
      ORDER BY month DESC;
    `);
    return result;
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    throw error;
  }
};

// Test function to check if the database is working
export const testDB = async () => {
  try {
    // Create a test table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL
      );
    `);
    
    // Insert a test record
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO test_table (timestamp) VALUES (?);',
      [now]
    );
    
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error testing database:', error);
    throw error;
  }
};

// Estadísticas mejoradas - añadir estas funciones a utils/db.js

// Estadísticas por categoría con filtro de fechas
export const getCategoryStatsWithDateRange = async (type, startDate, endDate) => {
  try {
    const result = await db.getAllAsync(`
      SELECT c.id, c.name, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = ?
        AND t.date >= ?
        AND t.date <= ?
      GROUP BY c.id
      ORDER BY total DESC;
    `, [type, startDate, endDate]);
    return result;
  } catch (error) {
    console.error('Error getting category stats with date range:', error);
    throw error;
  }
};

// Estadísticas mensuales con filtro de año
export const getMonthlyStatsByYear = async (year) => {
  try {
    const result = await db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        strftime('%m', date) as month_num,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE strftime('%Y', date) = ?
      GROUP BY month
      ORDER BY month;
    `, [year]);
    return result;
  } catch (error) {
    console.error('Error getting monthly stats by year:', error);
    throw error;
  }
};

// Obtener años disponibles para filtrar
export const getAvailableYears = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT DISTINCT strftime('%Y', date) as year
      FROM transactions
      ORDER BY year DESC;
    `);
    return result.map(item => item.year);
  } catch (error) {
    console.error('Error getting available years:', error);
    throw error;
  }
};

// Obtener resumen de estadísticas (totales, promedios, etc.)
export const getStatsSummary = async (startDate, endDate) => {
  try {
    // Total de gastos e ingresos
    const totals = await db.getFirstAsync(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(DISTINCT strftime('%Y-%m', date)) as total_months
      FROM transactions
      WHERE date >= ? AND date <= ?;
    `, [startDate, endDate]);
    
    // Calcular promedios mensuales
    const avgMonthlyIncome = totals.total_income / (totals.total_months || 1);
    const avgMonthlyExpense = totals.total_expense / (totals.total_months || 1);
    
    // Transacción más grande
    const maxTransactions = await db.getAllAsync(`
      SELECT MAX(CASE WHEN type = 'income' THEN amount ELSE 0 END) as max_income,
             MAX(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as max_expense
      FROM transactions
      WHERE date >= ? AND date <= ?;
    `, [startDate, endDate]);
    
    return {
      total_income: totals.total_income || 0,
      total_expense: totals.total_expense || 0,
      balance: (totals.total_income || 0) - (totals.total_expense || 0),
      avg_monthly_income: avgMonthlyIncome || 0,
      avg_monthly_expense: avgMonthlyExpense || 0,
      max_income: maxTransactions[0]?.max_income || 0,
      max_expense: maxTransactions[0]?.max_expense || 0,
      months_count: totals.total_months || 0
    };
  } catch (error) {
    console.error('Error getting stats summary:', error);
    throw error;
  }
};

// Estadísticas semanales
export const getWeeklyStats = async (startDate, endDate) => {
  try {
    const result = await db.getAllAsync(`
      SELECT 
        strftime('%Y-%W', date) as year_week,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE date >= ? AND date <= ?
      GROUP BY year_week
      ORDER BY year_week DESC
      LIMIT 10;
    `, [startDate, endDate]);
    return result;
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    throw error;
  }
};
// Estadísticas mensuales con filtro de fechas
export const getMonthlyStatsWithDateRange = async (startDate, endDate) => {
  try {
    const params = [];
    let query = `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(id) as transaction_count
      FROM transactions
    `;
    
    if (startDate) {
      query += ` WHERE date >= ?`;
      params.push(startDate);
      
      if (endDate) {
        query += ` AND date <= ?`;
        params.push(endDate);
      }
    } else if (endDate) {
      query += ` WHERE date <= ?`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY month
      ORDER BY month DESC;
    `;
    
    const result = await db.getAllAsync(query, params);
    return result;
  } catch (error) {
    console.error('Error getting monthly stats with date range:', error);
    throw error;
  }
};

//

// Export for direct access if needed
export { db };