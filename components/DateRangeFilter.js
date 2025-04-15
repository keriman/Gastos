import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function DateRangeFilter({ onApplyFilter }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState({
    start: null,
    end: null,
  });
  const [tempSelectedRange, setTempSelectedRange] = useState({
    start: null,
    end: null,
  });
  const [activeFilter, setActiveFilter] = useState('all');

  // Generar fechas para filtros predefinidos
  const getDateRange = (range) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case 'today':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date();
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        endDate = new Date();
        break;
      case 'year':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        endDate = new Date();
        break;
      case 'ytd':
        startDate = new Date(today.getFullYear(), 0, 1); // Primer día del año
        endDate = new Date();
        break;
      case 'all':
      default:
        startDate = new Date(2000, 0, 1); // Fecha muy anterior
        endDate = new Date();
        break;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const handleSelectDate = (day) => {
    const selectedDate = day.dateString;

    if (!tempSelectedRange.start || (tempSelectedRange.start && tempSelectedRange.end)) {
      // Si no hay fecha de inicio o ambas fechas están seleccionadas, empezamos de nuevo
      setTempSelectedRange({ start: selectedDate, end: null });
    } else {
      // Si ya hay fecha de inicio pero no de fin
      if (new Date(selectedDate) >= new Date(tempSelectedRange.start)) {
        setTempSelectedRange({ ...tempSelectedRange, end: selectedDate });
      } else {
        // Si la nueva fecha es anterior a la de inicio, actualizamos la de inicio
        setTempSelectedRange({ start: selectedDate, end: null });
      }
    }
  };

  const applyCustomRange = () => {
    if (tempSelectedRange.start && tempSelectedRange.end) {
      setSelectedRange(tempSelectedRange);
      setActiveFilter('custom');
      onApplyFilter(tempSelectedRange.start, tempSelectedRange.end);
      setModalVisible(false);
    }
  };

  const applyFilter = (filterName) => {
    const range = getDateRange(filterName);
    setSelectedRange(range);
    setActiveFilter(filterName);
    onApplyFilter(range.start, range.end);
  };

  // Generar marcados para el calendario
  const getMarkedDates = () => {
    if (!tempSelectedRange.start) return {};

    const markedDates = {};
    markedDates[tempSelectedRange.start] = { 
      selected: true, 
      startingDay: true, 
      color: '#007AFF' 
    };

    if (tempSelectedRange.end) {
      // Marcar días intermedios
      let currentDate = new Date(tempSelectedRange.start);
      const endDate = new Date(tempSelectedRange.end);
      
      while (currentDate < endDate) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dateString = currentDate.toISOString().split('T')[0];
        
        if (dateString === tempSelectedRange.end) {
          markedDates[dateString] = { 
            selected: true, 
            endingDay: true, 
            color: '#007AFF' 
          };
        } else {
          markedDates[dateString] = { 
            selected: true, 
            color: '#007AFF' 
          };
        }
      }
    }

    return markedDates;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtrar por período:</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'today' && styles.activeButton]}
          onPress={() => applyFilter('today')}>
          <Text style={[styles.filterText, activeFilter === 'today' && styles.activeText]}>Hoy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'week' && styles.activeButton]}
          onPress={() => applyFilter('week')}>
          <Text style={[styles.filterText, activeFilter === 'week' && styles.activeText]}>7 días</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'month' && styles.activeButton]}
          onPress={() => applyFilter('month')}>
          <Text style={[styles.filterText, activeFilter === 'month' && styles.activeText]}>30 días</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'year' && styles.activeButton]}
          onPress={() => applyFilter('year')}>
          <Text style={[styles.filterText, activeFilter === 'year' && styles.activeText]}>12 meses</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'ytd' && styles.activeButton]}
          onPress={() => applyFilter('ytd')}>
          <Text style={[styles.filterText, activeFilter === 'ytd' && styles.activeText]}>Este año</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'custom' && styles.activeButton]}
          onPress={() => setModalVisible(true)}>
          <Text style={[styles.filterText, activeFilter === 'custom' && styles.activeText]}>Personalizado</Text>
        </TouchableOpacity>
      </View>
      
      {activeFilter === 'custom' && (
        <Text style={styles.rangeText}>
          {`${new Date(selectedRange.start).toLocaleDateString()} - ${new Date(selectedRange.end).toLocaleDateString()}`}
        </Text>
      )}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar rango de fechas</Text>
            
            <Calendar
              onDayPress={handleSelectDate}
              markedDates={getMarkedDates()}
              markingType={'period'}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: 'white',
                todayTextColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
            />
            
            <Text style={styles.rangeInfoText}>
              {tempSelectedRange.start 
                ? `De: ${new Date(tempSelectedRange.start).toLocaleDateString()}` 
                : 'Selecciona fecha inicial'}
              {tempSelectedRange.end 
                ? ` - Hasta: ${new Date(tempSelectedRange.end).toLocaleDateString()}` 
                : tempSelectedRange.start ? ' - Selecciona fecha final' : ''}
            </Text>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.applyButton,
                  (!tempSelectedRange.start || !tempSelectedRange.end) && styles.disabledButton
                ]}
                disabled={!tempSelectedRange.start || !tempSelectedRange.end}
                onPress={applyCustomRange}>
                <Text style={styles.modalButtonText}>Aplicar</Text>
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
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 12,
    color: '#333',
  },
  activeText: {
    color: '#fff',
  },
  rangeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  rangeInfoText: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});