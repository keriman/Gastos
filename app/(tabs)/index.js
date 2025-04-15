// app/(tabs)/index.js - Actualizado con manejo de gesto atrás
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  BackHandler
} from 'react-native';
import { getTransactions, getStatsSummary, deleteTransaction, getTransactionById, updateTransaction, getCategories } from '../../utils/db';
import { useLocalSearchParams } from 'expo-router';
import { Edit, Trash } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  
  // Estados para el modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategories, setEditCategories] = useState([]);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);

  // Obtener los parámetros de búsqueda locales
  const { updated } = useLocalSearchParams();

  // Controlar el gesto de retroceso (para Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Cerrar aplicación',
          '¿Estás seguro de que deseas cerrar la aplicación?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Salir', 
              style: 'destructive',
              onPress: () => BackHandler.exitApp()
            }
          ]
        );
        return true; // Prevenir el comportamiento predeterminado
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );
      return () => subscription.remove();
    }, [])
  );

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

  // Método simple para toggle con LayoutAnimation
  const toggleSummary = () => {
    // Configurar la animación
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Actualizar el estado
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

  // Función para formatear el monto mientras el usuario escribe en el modal de edición
  const formatEditAmount = (text) => {
    // Eliminar cualquier carácter que no sea número o punto
    let formattedText = text.replace(/[^0-9.]/g, '');
    
    // Asegurar que solo haya un punto decimal
    const parts = formattedText.split('.');
    if (parts.length > 2) {
      formattedText = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setEditAmount(formattedText);
  };

  // Función para abrir el modal de edición
  const openEditModal = async (transaction) => {
    try {
      setEditingLoading(true);
      const fullTransaction = await getTransactionById(transaction.id);
      if (fullTransaction) {
        setEditingTransaction(fullTransaction);
        setEditDescription(fullTransaction.description);
        setEditAmount(fullTransaction.amount.toString());
        
        // Cargar las categorías del tipo correspondiente
        const categories = await getCategories(fullTransaction.type);
        setEditCategories(categories);
        setEditCategoryId(fullTransaction.category_id);
        
        setEditModalVisible(true);
      }
    } catch (error) {
      console.error('Error getting transaction details:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles de la transacción');
    } finally {
      setEditingLoading(false);
    }
  };

  // Función para guardar los cambios en la transacción
  const saveTransactionChanges = async () => {
    if (!editAmount || !editCategoryId || !editDescription) {
      Alert.alert('Campos incompletos', 'Por favor complete todos los campos');
      return;
    }

    const amountValue = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingrese un monto válido');
      return;
    }

    try {
      setEditingLoading(true);
      await updateTransaction(
        editingTransaction.id,
        amountValue,
        editDescription,
        editCategoryId,
        editingTransaction.type,
        editingTransaction.date
      );
      
      setEditModalVisible(false);
      
      // Actualizar timestamp global y recargar datos
      const timestamp = new Date().getTime();
      global.lastUpdateTimestamp = timestamp;
      
      // Recargar la lista de transacciones
      await loadTransactions();
      
      // Mostrar mensaje de éxito
      Alert.alert('¡Transacción actualizada!', 'Los cambios se han guardado correctamente');
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'No se pudo actualizar la transacción');
    } finally {
      setEditingLoading(false);
    }
  };

  // Función para eliminar una transacción
  const confirmDeleteTransaction = (transaction) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              
              // Actualizar timestamp global
              const timestamp = new Date().getTime();
              global.lastUpdateTimestamp = timestamp;
              
              // Recargar la lista de transacciones
              await loadTransactions();
              
              // Mostrar mensaje de éxito
              Alert.alert('Transacción eliminada', 'La transacción ha sido eliminada correctamente');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'No se pudo eliminar la transacción');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => {
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

        {showSummary && (
          <View style={styles.summaryContainer}>
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
          </View>
        )}
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
        <View style={[
          styles.transactionCard,
          { borderLeftColor: item.type === 'income' ? '#4CAF50' : '#F44336' }
        ]}>
          <View style={styles.transactionContent}>
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
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Edit size={18} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => confirmDeleteTransaction(item)}
            >
              <Trash size={18} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
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
      
      {/* Modal de edición de transacción */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Editar {editingTransaction?.type === 'income' ? 'Ingreso' : 'Gasto'}
            </Text>
            
            {editingLoading ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.modalLoader} />
            ) : (
              <ScrollView style={styles.modalScrollView}>
                {/* Monto */}
                <Text style={styles.modalLabel}>Monto</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    value={editAmount}
                    onChangeText={formatEditAmount}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Descripción */}
                <Text style={styles.modalLabel}>Descripción</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Descripción de la transacción"
                  placeholderTextColor="#999"
                />

                {/* Categorías */}
                <Text style={styles.modalLabel}>Categoría</Text>
                <View style={styles.categoriesContainer}>
                  {editCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        editCategoryId === category.id && styles.selectedCategoryChip,
                        editCategoryId === category.id && 
                          (editingTransaction?.type === 'income' ? styles.incomeSelectedChip : styles.expenseSelectedChip)
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setEditCategoryId(category.id)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          editCategoryId === category.id && styles.selectedCategoryChipText,
                        ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  editingTransaction?.type === 'income' ? styles.saveButtonIncome : styles.saveButtonExpense,
                  (!editAmount || !editCategoryId || !editDescription || editingLoading) && styles.saveButtonDisabled
                ]}
                disabled={!editAmount || !editCategoryId || !editDescription || editingLoading}
                onPress={saveTransactionChanges}
              >
                {editingLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionContent: {
    flex: 1,
    padding: 16,
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
  actionButtons: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  actionButton: {
    padding: 8,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
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
  modalScrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
    color: '#555',
  },
  modalInput: {
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    paddingLeft: 14,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    padding: 14,
    fontSize: 20,
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  categoryChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
    borderColor: 'transparent',
  },
  incomeSelectedChip: {
    backgroundColor: '#4CAF50',
  },
  expenseSelectedChip: {
    backgroundColor: '#F44336',
  },
  categoryChipText: {
    color: '#333',
    fontSize: 14,
  },
  selectedCategoryChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButtonExpense: {
    backgroundColor: '#F44336',
  },
  saveButtonIncome: {
    backgroundColor: '#4CAF50',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalLoader: {
    marginVertical: 40,
  },
});