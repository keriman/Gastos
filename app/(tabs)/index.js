// app/(tabs)/index.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator
} from 'react-native';
import { getTransactions, getStatsSummary } from '../../utils/db';
import { useLocalSearchParams } from 'expo-router';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  const summaryHeight = new Animated.Value(1);

  // Obtener los parámetros de búsqueda locales
  const { updated } = useLocalSearchParams();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);

      // Cargar el resumen estadístico
      loadSummary();
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      // Obtener fechas para el último mes
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const summaryData = await getStatsSummary(startDate.toISOString(), endDate);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary stats:', error);
    }
  };

  const toggleSummary = () => {
    const toValue = showSummary ? 0 : 1;
    Animated.spring(summaryHeight, {
      toValue,
      friction: 10,
      tension: 40,
      useNativeDriver: false
    }).start();
    setShowSummary(!showSummary);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  // Efecto para cargar transacciones al inicio y cuando cambie updated
  useEffect(() => {
    console.log('Loading transactions due to update trigger:', updated);
    loadTransactions();
  }, [updated]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('es-ES', options);
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };

  const renderHeader = () => {
    const summaryContainerHeight = summaryHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 150]
    });

    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.summaryToggle} 
          onPress={toggleSummary}
          activeOpacity={0.7}
        >
          <Text style={styles.summaryToggleText}>
            {showSummary ? "Ocultar resumen" : "Mostrar resumen"}
          </Text>
          <Text style={styles.toggleIcon}>{showSummary ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        <Animated.View 
          style={[
            styles.summaryContainer, 
            { height: summaryContainerHeight, overflow: 'hidden' }
          ]}
        >
          {summary ? (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Balance del mes</Text>
                  <Text 
                    style={[
                      styles.summaryValue, 
                      { color: summary.balance >= 0 ? '#4CAF50' : '#F44336' }
                    ]}
                  >
                    ${formatCurrency(summary.balance)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Tasa de ahorro</Text>
                  <Text style={styles.summaryValue}>
                    {summary.total_income > 0 
                      ? Math.round((summary.balance / summary.total_income) * 100) 
                      : 0}%
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Ingresos</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    ${formatCurrency(summary.total_income)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Gastos</Text>
                  <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                    ${formatCurrency(summary.total_expense)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <ActivityIndicator size="small" color="#007AFF" />
          )}
        </Animated.View>
      </View>
    );
  };

  const renderTransaction = ({ item, index }) => {
    // Agrupar por fecha
    const showDateHeader = index === 0 || 
      formatDate(item.date) !== formatDate(transactions[index - 1].date);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDate(item.date)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.transactionCard,
            { borderLeftColor: item.type === 'income' ? '#4CAF50' : '#F44336' }
          ]}
          activeOpacity={0.7}
          onPress={() => {/* Implementar vista detallada si se desea */}}
        >
          <View style={styles.transactionHeader}>
            <Text 
              style={[
                styles.amount, 
                { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
              ]}>
              {item.type === 'income' ? '+' : '-'}${formatCurrency(Math.abs(item.amount))}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
            </View>
          </View>
          <Text style={styles.description}>{item.description}</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']} 
            progressBackgroundColor="#ffffff"
          />
        }
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          transactions.length === 0 ? styles.emptyListContainer : styles.listContainer
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                <Text style={styles.emptyText}>Cargando transacciones...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.emptyText}>No hay transacciones registradas</Text>
                <Text style={styles.emptySubtext}>Agrega una transacción usando la pestaña "Agregar"</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    marginBottom: 10,
  },
  summaryToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#efefef',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  summaryToggleText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 5,
  },
  toggleIcon: {
    fontSize: 12,
    color: '#555',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  transactionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#555',
  },
  description: {
    fontSize: 15,
    color: '#333',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
  },
});