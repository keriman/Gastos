import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatsSummary({ data }) {
  if (!data) return null;
  
  // Calcular porcentaje de ahorro
  const savingsRate = data.total_income > 0 
    ? ((data.total_income - data.total_expense) / data.total_income * 100).toFixed(0)
    : 0;
  
  // Determinar el color del balance según si es positivo o negativo
  const balanceColor = data.balance >= 0 ? '#4CAF50' : '#F44336';
  
  // Formatear números para mejor visualización
  const formatCurrency = (value) => {
    return value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen del período</Text>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Balance:</Text>
        <Text style={[styles.balanceValue, { color: balanceColor }]}>
          ${formatCurrency(data.balance)}
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>${formatCurrency(data.total_income)}</Text>
          <Text style={styles.statsLabel}>Ingresos totales</Text>
        </View>
        
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>${formatCurrency(data.total_expense)}</Text>
          <Text style={styles.statsLabel}>Gastos totales</Text>
        </View>
        
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>${formatCurrency(data.avg_monthly_income)}</Text>
          <Text style={styles.statsLabel}>Ingreso mensual</Text>
        </View>
        
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>${formatCurrency(data.avg_monthly_expense)}</Text>
          <Text style={styles.statsLabel}>Gasto mensual</Text>
        </View>
        
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>{savingsRate}%</Text>
          <Text style={styles.statsLabel}>Tasa de ahorro</Text>
        </View>
        
        <View style={styles.statsItem}>
          <Text style={styles.statsValue}>${formatCurrency(data.max_expense)}</Text>
          <Text style={styles.statsLabel}>Gasto mayor</Text>
        </View>
      </View>
      
      <View style={styles.insightContainer}>
        <Text style={styles.insightTitle}>Análisis rápido:</Text>
        <Text style={styles.insightText}>
          {savingsRate >= 20
            ? '¡Excelente tasa de ahorro! Estás en un buen camino financiero.'
            : savingsRate >= 10
            ? 'Buena tasa de ahorro. Considera aumentarla para mejores resultados.'
            : savingsRate > 0
            ? 'Estás ahorrando, pero deberías intentar aumentar tu tasa de ahorro.'
            : 'Tus gastos superan tus ingresos. Considera revisar tu presupuesto.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
  },
  insightContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});