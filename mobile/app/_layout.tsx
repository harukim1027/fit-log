import "../global.css";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { setUnauthorizedHandler } from "../lib/apiClient";
import { Colors } from "../constants/colors";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isReady, loadToken, logout, user } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout().then(() => router.replace("/auth/login" as any));
    });
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

  const inAuth = segments[0] === "auth";
  const inOnboarding = segments[0] === "onboarding";

  const loading = (
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

  if (!isReady) return loading;

  // 미인증 상태인데 인증 페이지가 아직 아닌 경우 — redirect effect 대기
  if (!token && !inAuth) return loading;

  // 온보딩 미완료인데 온보딩 페이지가 아직 아닌 경우
  if (token && !user?.isOnboardingDone && !inOnboarding) return loading;

  // 인증 완료인데 auth/onboarding 페이지에 있는 경우 — redirect effect 대기
  if (token && user?.isOnboardingDone && (inAuth || inOnboarding)) return loading;

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
            animation: "slide_from_right",
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false, animation: "fade" }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false, animation: "slide_from_right" }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade_from_bottom" }} />
          <Stack.Screen
            name="modal/add-food"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modal/add-workout"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modal/barcode-scan"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modal/set-target"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modal/edit-profile"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modal/routine-manage"
            options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
          />
        </Stack>
      </AuthGate>
    </SafeAreaProvider>
  );
}
