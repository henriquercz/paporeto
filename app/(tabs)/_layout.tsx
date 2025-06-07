import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native'; // Adicionado Platform e View
import { Colors, Fonts } from '@/constants/Colors';
import { Home, BookOpen, Target, Users, MessageCircle, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.accent,
        tabBarInactiveTintColor: Colors.neutral.gray100,
        tabBarStyle: {
          backgroundColor: Colors.primary.dark,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 70 : 60, // Altura ajustada para iOS
          paddingBottom: Platform.OS === 'ios' ? 20 : 8, // Padding inferior maior para iOS
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12, // Fonte diminuída para 12pt
          fontWeight: Fonts.weights.medium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="diario"
        options={{
          title: 'Diário',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="metas"
        options={{
          title: 'Metas',
          tabBarIcon: ({ size, color }) => (
            <Target size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="comunidade"
        options={{
          title: 'Comunidade',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Blob IA',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}