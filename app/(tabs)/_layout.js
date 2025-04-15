// app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { PlusCircle, LineChart, Wallet } from 'lucide-react-native';

export default function TabLayout() {
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