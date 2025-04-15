// app/(tabs)/charts.js - Versión mejorada
import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  Platform, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useLocalSearchParams } from 'expo-router';
import { 
  getCategoryStats, 
  getMonthlyStats,
  getStatsSummary
} from '../../utils/db';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#fafafa'
  },
  propsForLabels: {
    fontSize: 12,
  },
  useShadowColorFromDataset: false
};

const colors = [
  '#FF6384', // rojo
  '#36A2EB', // azul
  '#FFCE56', // amarillo
  '#4BC0C0', // turquesa
  '#9966FF', // púrpura
  '#FF9F40', // naranja
  '#4CAF50', // verde
  '#9C27B0', // violeta
  '#3F51B5', // índigo
  '#795548', // marrón
];

export default function ChartsScreen() {
  const [expenseStats, setExpenseStats] = useState([]);
  const [incomeStats, setIncomeStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [dateRange, setDateRange] = useState('all'); // 'all', '3months', '6months', '1year'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('expenses'); // 'expenses', 'income', 'monthly'
  
  const chartOpacity = useRef(new Animated.Value(1)).current;
  const chartPosition = useRef(new Animated.Value(0)).current;
  
  // Obtener los parámetros de búsqueda para actualizaciones
  const { updated } = useLocalSearchParams();

  useEffect(() => {
    // Verificar si hay un timestamp global más reciente que el que tenemos
    if (global.lastUpdateTimestamp) {
      console.log('Detected global update in charts:', global.lastUpdateTimestamp);
      loadStats();
    }
  }, []);
  
  useEffect(() => {
    loadStats();
  }, [dateRange, updated]);

  const getFilterDate = () => {
    const now = new Date();
    switch (dateRange) {
      case '3months':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return threeMonthsAgo.toISOString();
      case '6months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        return sixMonthsAgo.toISOString();
      case '1year':
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        return oneYearAgo.toISOString();
      default:
        return null; // 'all' - no filter
    }
  };

  const animateChartTransition = () => {
    // Animar la desaparición
    Animated.parallel([
      Animated.timing(chartOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(chartPosition, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      // Al completar, resetear la posición y animar la aparición
      chartPosition.setValue(20);
      Animated.parallel([
        Animated.timing(chartOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(chartPosition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    });
  };

  const changeSelectedChart = (chart) => {
    if (chart !== selectedChart) {
      animateChartTransition();
      setSelectedChart(chart);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const filterDate = getFilterDate();
      
      // Cargar datos con filtros si es necesario
      const startDate = filterDate || '2000-01-01';
      const endDate = new Date().toISOString();
      
      const [expenses, incomes, monthly, summaryData] = await Promise.all([
        getCategoryStats('expense'),
        getCategoryStats('income'),
        getMonthlyStats(),
        getStatsSummary(startDate, endDate)
      ]);

      setExpenseStats(expenses);
      setIncomeStats(incomes);
      setMonthlyStats(monthly);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const preparePieChartData = (data) => {
    if (!data || data.length === 0) return [];
    
    // Calcula el total para determinar los porcentajes
    const total = data.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    
    return data.map((item, index) => {
      const amount = parseFloat(item.total || 0);
      const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
      
      return {
        name: item.name,
        amount: amount,
        percentage: `${percentage}%`,
        color: colors[index % colors.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      };
    });
  };

  const prepareLineChartData = () => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return {
        labels: [],
        datasets: [
          { data: [0], color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})` },
          { data: [0], color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})` }
        ],
        legend: ['Ingresos', 'Gastos']
      };
    }
    
    // Tomar hasta 6 meses ordenados del más antiguo al más reciente
    const dataToShow = [...monthlyStats].slice(0, 6).reverse();
    
    const labels = dataToShow.map(item => {
      const [year, month] = item.month ? item.month.split('-') : ['', ''];
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthIndex = parseInt(month, 10) - 1;
      return monthNames[monthIndex] || month;
    });

    const incomes = dataToShow.map(item => parseFloat(item.total_income || 0));
    const expenses = dataToShow.map(item => parseFloat(item.total_expense || 0));

    // Encontrar el valor máximo para la escala
    const maxValue = Math.max(...[...incomes, ...expenses]);
    
    return {
      labels,
      datasets: [
        {
          data: incomes,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: expenses,
          color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Ingresos', 'Gastos'],
    };
  };

  const renderSummary = () => {
    if (!summary) return null;
    
    const savingsRate = summary.total_income > 0 
      ? ((summary.total_income - summary.total_expense) / summary.total_income * 100).toFixed(0)
      : 0;
      
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text 
            style={[
              styles.balanceValue, 
              { color: summary.balance >= 0 ? '#4CAF50' : '#F44336' }
            ]}
          >
            ${formatCurrency(summary.balance)}
          </Text>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsLabel}>Tasa de ahorro:</Text>
            <Text 
              style={[
                styles.savingsValue,
                savingsRate >= 20 ? styles.highSavingsRate :
                savingsRate >= 10 ? styles.mediumSavingsRate :
                savingsRate > 0 ? styles.lowSavingsRate :
                styles.negativeSavingsRate
              ]}
            >
              {savingsRate}%
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxValue}>${formatCurrency(summary.total_income)}</Text>
            <Text style={styles.summaryBoxLabel}>Ingresos totales</Text>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxValue}>${formatCurrency(summary.total_expense)}</Text>
            <Text style={styles.summaryBoxLabel}>Gastos totales</Text>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxValue}>${formatCurrency(summary.avg_monthly_income)}</Text>
            <Text style={styles.summaryBoxLabel}>Promedio mensual (ingresos)</Text>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxValue}>${formatCurrency(summary.avg_monthly_expense)}</Text>
            <Text style={styles.summaryBoxLabel}>Promedio mensual (gastos)</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderExpensePieChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      );
    }
    
    if (!expenseStats || expenseStats.length === 0) {
      return (
        <View style={styles.emptyDataContainer}>
          <Text style={styles.noDataText}>No hay datos de gastos disponibles</Text>
          <Text style={styles.noDataSubtext}>Agrega transacciones para visualizar estadísticas</Text>
        </View>
      );
    }
    
    const chartData = preparePieChartData(expenseStats);
    
    return (
      <View style={styles.chartContainer}>
        <PieChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          hasLegend={true}
          avoidFalseZero={true}
        />
        
        <View style={styles.legendContainer}>
          {chartData.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColorDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendCategoryName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.legendPercentage}>{item.percentage}</Text>
              <Text style={styles.legendAmount}>${formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderIncomePieChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      );
    }
    
    if (!incomeStats || incomeStats.length === 0) {
      return (
        <View style={styles.emptyDataContainer}>
          <Text style={styles.noDataText}>No hay datos de ingresos disponibles</Text>
          <Text style={styles.noDataSubtext}>Agrega transacciones para visualizar estadísticas</Text>
        </View>
      );
    }
    
    const chartData = preparePieChartData(incomeStats);
    
    return (
      <View style={styles.chartContainer}>
        <PieChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
          hasLegend={true}
          avoidFalseZero={true}
        />
        
        <View style={styles.legendContainer}>
          {chartData.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColorDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendCategoryName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.legendPercentage}>{item.percentage}</Text>
              <Text style={styles.legendAmount}>${formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMonthlyChart = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      );
    }
    
    if (!monthlyStats || monthlyStats.length === 0) {
      return (
        <View style={styles.emptyDataContainer}>
          <Text style={styles.noDataText}>No hay datos mensuales disponibles</Text>
          <Text style={styles.noDataSubtext}>Agrega transacciones para visualizar estadísticas</Text>
        </View>
      );
    }
    
    const chartData = prepareLineChartData();
    
    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.lineChart}
        />
        
        <View style={styles.chartLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Ingresos</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Gastos</Text>
          </View>
        </View>
        
        <Text style={styles.chartInsight}>
          {monthlyStats.length > 1 
            ? 'La gráfica muestra la evolución de ingresos y gastos en los últimos meses'
            : 'Agrega más transacciones para ver la evolución a lo largo del tiempo'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Filtro de rango de fechas */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}>
            <Text style={styles.filterButtonText}>
              {dateRange === 'all' 
                ? 'Todos los datos' 
                : dateRange === '3months' 
                  ? 'Últimos 3 meses' 
                  : dateRange === '6months' 
                    ? 'Últimos 6 meses' 
                    : 'Último año'}
            </Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>
        </View>
        
        {/* Sección de resumen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen financiero</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
          ) : (
            renderSummary()
          )}
        </View>
        
        {/* Selector de gráficos */}
        <View style={styles.chartSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.chartSelectorButton,
              selectedChart === 'expenses' && styles.chartSelectorButtonActive
            ]}
            onPress={() => changeSelectedChart('expenses')}>
            <Text 
              style={[
                styles.chartSelectorText,
                selectedChart === 'expenses' && styles.chartSelectorTextActive
              ]}>
              Gastos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.chartSelectorButton,
              selectedChart === 'income' && styles.chartSelectorButtonActive
            ]}
            onPress={() => changeSelectedChart('income')}>
            <Text 
              style={[
                styles.chartSelectorText,
                selectedChart === 'income' && styles.chartSelectorTextActive
              ]}>
              Ingresos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.chartSelectorButton,
              selectedChart === 'monthly' && styles.chartSelectorButtonActive
            ]}
            onPress={() => changeSelectedChart('monthly')}>
            <Text 
              style={[
                styles.chartSelectorText,
                selectedChart === 'monthly' && styles.chartSelectorTextActive
              ]}>
              Evolución
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Contenedor de gráficos con animación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedChart === 'expenses' 
              ? 'Distribución de Gastos' 
              : selectedChart === 'income' 
                ? 'Distribución de Ingresos' 
                : 'Evolución Mensual'}
          </Text>
          
          <Animated.View 
            style={[
              styles.animatedChartContainer,
              {
                opacity: chartOpacity,
                transform: [{ translateY: chartPosition }]
              }
            ]}
          >
            {selectedChart === 'expenses' && renderExpensePieChart()}
            {selectedChart === 'income' && renderIncomePieChart()}
            {selectedChart === 'monthly' && renderMonthlyChart()}
          </Animated.View>
        </View>
      </ScrollView>
      
      {/* Modal de filtro */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar por fecha</Text>
            
            <TouchableOpacity
              style={[styles.filterOption, dateRange === 'all' && styles.selectedFilter]}
              onPress={() => {
                setDateRange('all');
                setShowFilterModal(false);
              }}>
              <Text style={styles.filterOptionText}>Todos los datos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, dateRange === '3months' && styles.selectedFilter]}
              onPress={() => {
                setDateRange('3months');
                setShowFilterModal(false);
              }}>
              <Text style={styles.filterOptionText}>Últimos 3 meses</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, dateRange === '6months' && styles.selectedFilter]}
              onPress={() => {
                setDateRange('6months');
                setShowFilterModal(false);
              }}>
              <Text style={styles.filterOptionText}>Últimos 6 meses</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterOption, dateRange === '1year' && styles.selectedFilter]}
              onPress={() => {
                setDateRange('1year');
                setShowFilterModal(false);
              }}>
              <Text style={styles.filterOptionText}>Último año</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFilterModal(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 6,
  },
  filterIcon: {
    color: 'white',
    fontSize: 10,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  summaryContainer: {
    marginBottom: 8,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 6,
  },
  savingsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  highSavingsRate: {
    color: '#4CAF50', // Verde
  },
  mediumSavingsRate: {
    color: '#2196F3', // Azul
  },
  lowSavingsRate: {
    color: '#FF9800', // Naranja
  },
  negativeSavingsRate: {
    color: '#F44336', // Rojo
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryBox: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  summaryBoxLabel: {
    fontSize: 12,
    color: '#666',
  },
  chartSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#eee',
    borderRadius: 10,
    padding: 4,
  },
  chartSelectorButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  chartSelectorButtonActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chartSelectorText: {
    color: '#666',
    fontWeight: '500',
  },
  chartSelectorTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  animatedChartContainer: {
    minHeight: 300, // Altura mínima para evitar saltos
  },
  chartContainer: {
    alignItems: 'center',
  },
  lineChart: {
    marginTop: 10,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  chartInsight: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  legendContainer: {
    width: '100%',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  legendColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendCategoryName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  legendPercentage: {
    width: 50,
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginRight: 10,
  },
  legendAmount: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  filterOption: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  selectedFilter: {
    backgroundColor: '#e1f5fe',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});