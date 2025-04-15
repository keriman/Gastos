import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

export default function WeeklyStatsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Estadísticas semanales</Text>
        <Text style={styles.noDataText}>No hay datos disponibles</Text>
      </View>
    );
  }

  // Configuración del gráfico
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.8,
  };

  // Procesar datos para el gráfico
  const processChartData = () => {
    // Invertir el array para mostrar las semanas más recientes primero
    const reversedData = [...data].reverse();
    
    // Limitar a 6 semanas para no sobrecargar el gráfico
    const limitedData = reversedData.slice(0, 6);
    
    // Crear etiquetas legibles para las semanas
    const labels = limitedData.map(item => {
      const [year, week] = item.year_week.split('-');
      return `S${week}`;
    });
    
    // Datos de ingresos y gastos
    const incomeData = limitedData.map(item => Number(item.total_income || 0));
    const expenseData = limitedData.map(item => Number(item.total_expense || 0));
    
    return {
      labels,
      datasets: [
        {
          data: incomeData,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Verde para ingresos
        },
        {
          data: expenseData,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Rojo para gastos
        },
      ],
      legend: ['Ingresos', 'Gastos'],
    };
  };

  const screenWidth = Dimensions.get('window').width - 32; // Dejar margen
  const chartData = processChartData();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estadísticas semanales</Text>
      
      <BarChart
        data={chartData}
        width={screenWidth}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        fromZero={true}
        withInnerLines={false}
      />
      
      <Text style={styles.label}>Semanas recientes</Text>
      
      <Text style={styles.insightText}>
        {chartData.datasets[0].data.reduce((a, b) => a + b, 0) > 
         chartData.datasets[1].data.reduce((a, b) => a + b, 0)
          ? 'En las últimas semanas tus ingresos han superado tus gastos. ¡Sigue así!'
          : 'En las últimas semanas tus gastos han superado tus ingresos. Considera ajustar tu presupuesto.'}
      </Text>
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
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
  },
});