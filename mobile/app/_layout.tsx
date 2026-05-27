import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { Colors } from "../constants/colors";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isReady, loadToken, user } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!token) {
      if (!inAuth) router.replace("/auth/login" as any);
      return;
    }

    // 토큰 있음 + 온보딩 미완료
    if (!user?.isOnboardingDone) {
      if (!inOnboarding) router.replace("/onboarding" as any);
      return;
    }

    // 토큰 있음 + 온보딩 완료
    if (inAuth || inOnboarding) router.replace("/(tabs)" as any);
  }, [token, isReady, segments, user?.isOnboardingDone]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGate>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/add-food"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "식품 추가",
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.textPrimary,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="modal/add-workout"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="modal/barcode-scan"
            options={{ presentation: "fullScreenModal", headerShown: false }}
          />
        </Stack>
      </AuthGate>
    </SafeAreaProvider>
  );
}
