// app/(tabs)/add.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { addTransaction, getCategories, addCategory, deleteCategory } from '../../utils/db';

export default function AddScreen() {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [type]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getCategories(type);
      setCategories(data);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Por favor ingrese un nombre para la categoría');
      return;
    }

    try {
      await addCategory(newCategoryName.trim(), type);
      setNewCategoryName('');
      setShowAddCategory(false);
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'No se pudo agregar la categoría');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Está seguro de que desea eliminar esta categoría?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(categoryId);
              loadCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'No se pudo eliminar la categoría');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!amount || !selectedCategory || !description) {
      Alert.alert('Campos incompletos', 'Por favor complete todos los campos');
      return;
    }

    const amountValue = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingrese un monto válido');
      return;
    }

    try {
      setLoading(true);
      await addTransaction(
        amountValue,
        description,
        selectedCategory,
        type,
        new Date().toISOString()
      );
      
      // Limpiar el formulario
      setAmount('');
      setDescription('');
      setSelectedCategory(null);
      
      // Mensaje de éxito y redirección con parámetro de actualización
      Alert.alert(
        '¡Transacción registrada!', 
        type === 'income' ? 'Ingreso agregado correctamente' : 'Gasto registrado correctamente', 
        [
          { 
            text: 'OK', 
            onPress: () => {
              const timestamp = new Date().getTime();
              
              // Primero, actualiza globalmente el timestamp para todas las pestañas
              global.lastUpdateTimestamp = timestamp;
              
              // Luego, navega de vuelta a la pestaña de transacciones con el parámetro
              router.push({
                pathname: '/(tabs)',
                params: { updated: timestamp }
              });
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'No se pudo registrar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Función para formatear el monto mientras el usuario escribe
  const formatAmount = (text) => {
    // Eliminar cualquier carácter que no sea número o punto
    let formattedText = text.replace(/[^0-9.]/g, '');
    
    // Asegurar que solo haya un punto decimal
    const parts = formattedText.split('.');
    if (parts.length > 2) {
      formattedText = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setAmount(formattedText);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            {/* Selector de tipo */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Tipo de transacción</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton, 
                    type === 'expense' && styles.selectedType,
                    type === 'expense' && styles.expenseSelected
                  ]}
                  onPress={() => setType('expense')}>
                  <Text style={[
                    styles.typeText, 
                    type === 'expense' && styles.selectedTypeText
                  ]}>
                    Gasto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton, 
                    type === 'income' && styles.selectedType,
                    type === 'income' && styles.incomeSelected
                  ]}
                  onPress={() => setType('income')}>
                  <Text style={[
                    styles.typeText, 
                    type === 'income' && styles.selectedTypeText
                  ]}>
                    Ingreso
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Monto */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Detalles</Text>
              <Text style={styles.label}>Monto</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={formatAmount}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Descripción */}
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Descripción de la transacción"
                placeholderTextColor="#999"
              />
            </View>

            {/* Categorías */}
            <View style={styles.formSection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.sectionTitle}>Categoría</Text>
                <TouchableOpacity 
                  style={styles.addCategoryButtonContainer}
                  onPress={() => setShowAddCategory(true)}
                >
                  <Text style={styles.addCategoryButton}>+ Nueva categoría</Text>
                </TouchableOpacity>
              </View>

              {loadingCategories ? (
                <ActivityIndicator size="small" color="#007AFF" style={styles.loadingIndicator} />
              ) : categories.length === 0 ? (
                <Text style={styles.noCategories}>
                  No hay categorías disponibles. Agrega una nueva categoría.
                </Text>
              ) : (
                <View style={styles.categoriesContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        selectedCategory === category.id && styles.selectedCategoryChip,
                        selectedCategory === category.id && (type === 'income' ? styles.incomeSelectedChip : styles.expenseSelectedChip)
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedCategory(category.id)}
                      onLongPress={() => handleDeleteCategory(category.id)}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategory === category.id && styles.selectedCategoryChipText,
                        ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <Text style={styles.tipText}>
                Mantén presionada una categoría para eliminarla
              </Text>
            </View>
          </View>

          {/* Botón de guardar */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              type === 'income' ? styles.submitButtonIncome : styles.submitButtonExpense,
              (!amount || !selectedCategory || !description) && styles.submitButtonDisabled
            ]} 
            onPress={handleSubmit}
            disabled={loading || !amount || !selectedCategory || !description}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {type === 'income' ? 'Registrar ingreso' : 'Registrar gasto'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modal para agregar nueva categoría */}
        <Modal
          visible={showAddCategory}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddCategory(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {type === 'income' ? 'Nueva categoría de ingreso' : 'Nueva categoría de gasto'}
              </Text>
              
              <TextInput
                style={styles.modalInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Nombre de la categoría"
                placeholderTextColor="#999"
                autoFocus={true}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setNewCategoryName('');
                    setShowAddCategory(false);
                  }}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    type === 'income' ? styles.confirmButtonIncome : styles.confirmButtonExpense,
                    !newCategoryName.trim() && styles.modalButtonDisabled
                  ]}
                  disabled={!newCategoryName.trim()}
                  onPress={handleAddCategory}>
                  <Text style={styles.modalButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
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
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  formSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedType: {
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
  expenseSelected: {
    borderBottomWidth: 3,
    borderBottomColor: '#F44336',
  },
  incomeSelected: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  typeText: {
    fontSize: 16,
    color: '#666',
  },
  selectedTypeText: {
    fontWeight: '600',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
    color: '#555',
  },
  input: {
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCategoryButtonContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addCategoryButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  noCategories: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontSize: 14,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
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
  tipText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonExpense: {
    backgroundColor: '#F44336',
  },
  submitButtonIncome: {
    backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  confirmButtonExpense: {
    backgroundColor: '#F44336',
  },
  confirmButtonIncome: {
    backgroundColor: '#4CAF50',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});