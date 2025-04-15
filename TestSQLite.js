// TestSQLite.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { initDB, testDB } from './utils/db';

export default function TestSQLite() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testDatabase() {
      try {
        console.log("Testing database functions...");
        setStatus('Testing database connection...');
        
        // The database is already initialized in _layout.js, so we can skip that step
        // Just do a simple test operation
        const result = await testDB();
        
        setStatus(`Database working! Test ID: ${result}`);
      } catch (err) {
        console.error("Database test error:", err);
        setError(err.message || 'Unknown database error');
        setStatus('Error');
      }
    }

    testDatabase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SQLite Test</Text>
      <Text style={styles.status}>{status}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  error: {
    color: 'red',
    fontSize: 14,
  }
});