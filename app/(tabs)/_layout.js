// app/(tabs)/_layout.js - Actualizado con botón de salir
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tabs } from 'expo-router';
import { PlusCircle, LineChart, Wallet, LogOut } from 'lucide-react-native';
import { useEffect, useCallback } from 'react';
import { Alert, BackHandler, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function TabLayout() {
  const router = useRouter();
  // Obtener parámetros compartidos a nivel de pestañas
  const { updated } = useLocalSearchParams();
  
  // Al cambiar updated, actualizar el timestamp global
  useEffect(() => {
    if (updated) {
      console.log('Setting global timestamp from layout:', updated);
      global.lastUpdateTimestamp = updated;
    }
  }, [updated]);

  // Función para confirmar el cierre de la app
  const confirmExit = () => {
    Alert.alert(
      'Cerrar aplicación',
      '¿Estás seguro de que deseas salir de la aplicación?',
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

  // Controlar el evento de retroceso en Android cuando la pestaña transacciones está activa
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        confirmExit
      );
      return () => subscription.remove();
    }, [])
  );

  // Función para manejar el botón de salir
  const handleExitPress = () => {
    confirmExit();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          elevation: 0,
          shadowOpacity: 0,
        },
        // Añadir botón de salir en el header
        headerRight: () => (
          <TouchableOpacity 
            onPress={handleExitPress}
            style={{ 
              paddingHorizontal: 15, 
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <LogOut size={20} color="#F44336" />
          </TouchableOpacity>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Transacciones',
          headerTitle: 'Transacciones',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Agregar',
          headerTitle: 'Agregar Transacción',
          tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Gráficos',
          headerTitle: 'Estadísticas',
          tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}