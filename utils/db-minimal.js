// utils/db-minimal.js
import * as SQLite from 'expo-sqlite';

// Print the SQLite object to diagnose the issue
console.log("SQLite object in db-minimal.js:", SQLite);
console.log("typeof SQLite.openDatabase:", typeof SQLite.openDatabase);

// Basic database setup
let db;

try {
  db = SQLite.openDatabase('finances.db');
  console.log("Database opened successfully");
} catch (error) {
  console.error("Error opening database:", error);
}

// Simple initialization function
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    try {
      db.transaction(tx => {
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value TEXT);',
          [],
          () => {
            console.log("Test table created successfully");
            resolve();
          },
          (_, error) => {
            console.error('Error creating test table:', error);
            reject(error);
            return true;
          }
        );
      });
    } catch (e) {
      console.error("Transaction error:", e);
      reject(e);
    }
  });
};

// Simple function to test database access
export const testDB = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    try {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO test (value) VALUES (?)',
          ['Test value ' + new Date().toISOString()],
          (_, { insertId }) => {
            console.log("Test value inserted:", insertId);
            resolve(insertId);
          },
          (_, error) => {
            console.error('Error inserting test value:', error);
            reject(error);
            return true;
          }
        );
      });
    } catch (e) {
      console.error("Transaction error:", e);
      reject(e);
    }
  });
};

export { db };