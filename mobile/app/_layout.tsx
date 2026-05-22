import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal/add-food" options={{ presentation: 'modal', headerShown: true, title: '식품 추가', headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.textPrimary }} />
        <Stack.Screen name="modal/add-workout" options={{ presentation: 'modal', headerShown: true, title: '운동 추가', headerStyle: { backgroundColor: Colors.surface }, headerTintColor: Colors.textPrimary }} />
      </Stack>
    </>
  );
}