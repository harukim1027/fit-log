import "../global.css";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme, vars } from "nativewind";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useColors } from "../constants/colors";
import { setUnauthorizedHandler } from "../lib/apiClient";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

if (!__DEV__) {
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('Global error:', error, isFatal);
  });
}

interface ErrorBoundaryState { hasError: boolean }

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('앱 크래시:', error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children as React.ReactElement;
  }
}

// NativeWind v4: CSS 변수는 컴파일 타임에 :root 값으로 고정되므로
// vars()로 런타임에 주입해야 dark mode CSS 변수가 실제로 교체됩니다.
const lightVars = vars({
  "--color-primary":        "61 139 224",
  "--color-secondary":      "91 155 217",
  "--color-success":        "46 158 131",
  "--color-warning":        "197 127 28",
  "--color-danger":         "224 106 134",
  "--color-on-accent":      "255 255 255",
  "--color-background":     "242 246 251",
  "--color-surface":        "255 255 255",
  "--color-surface-alt":    "234 241 248",
  "--color-surface-high":   "228 236 244",
  "--color-border":         "220 230 240",
  "--color-text-primary":   "22 32 43",
  "--color-text-secondary": "90 102 117",
  "--color-text-muted":     "154 166 180",
  "--color-stats":          "197 127 28",
  "--color-carb":           "217 154 43",
  "--color-fat":            "224 106 134",
  "--color-diet":           "61 139 224",
  "--color-workout":        "91 155 217",
  "--color-water":          "61 139 224",
  "--color-protein":        "61 139 224",
});

const darkVars = vars({
  "--color-primary":        "61 139 224",
  "--color-secondary":      "91 155 217",
  "--color-success":        "79 169 140",
  "--color-warning":        "205 177 120",
  "--color-danger":         "213 141 156",
  "--color-on-accent":      "2 21 38",
  "--color-background":     "23 27 33",
  "--color-surface":        "33 39 47",
  "--color-surface-alt":    "34 48 63",
  "--color-surface-high":   "42 51 64",
  "--color-border":         "56 64 73",
  "--color-text-primary":   "224 230 236",
  "--color-text-secondary": "144 154 166",
  "--color-text-muted":     "100 110 122",
  "--color-stats":          "205 177 120",
  "--color-carb":           "205 177 120",
  "--color-fat":            "213 141 156",
  "--color-diet":           "61 139 224",
  "--color-workout":        "91 155 217",
  "--color-water":          "61 139 224",
  "--color-protein":        "61 139 224",
});

function useThemeSync() {
  const mode = useThemeStore((s) => s.mode);
  const hydrate = useThemeStore((s) => s.hydrate);
  const { setColorScheme } = useColorScheme();
  useEffect(() => { hydrate(); }, []);
  useEffect(() => { setColorScheme(mode); }, [mode]);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, isReady, loadToken, logout, user } = useAuthStore();
  const colors = useColors();
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

    if (!user?.isOnboardingDone) {
      if (!inOnboarding) router.replace("/onboarding" as any);
      return;
    }

    if (inAuth || inOnboarding) router.replace("/(tabs)" as any);
  }, [token, isReady, segments, user?.isOnboardingDone]);

  const inAuth = segments[0] === "auth";
  const inOnboarding = segments[0] === "onboarding";

  const loading = (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  if (!isReady) return loading;
  if (!token && !inAuth) return loading;
  if (token && !user?.isOnboardingDone && !inOnboarding) return loading;
  if (token && user?.isOnboardingDone && (inAuth || inOnboarding)) return loading;

  return <>{children}</>;
}

export default function RootLayout() {
  useThemeSync();
  const mode = useThemeStore((s) => s.mode);
  const colors = useColors();

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      {/* vars()로 NativeWind CSS 변수를 런타임에 교체 — bg-surface, bg-background 등 모든 클래스가 여기서 동적으로 해결됩니다 */}
      <View style={[{ flex: 1 }, mode === "dark" ? darkVars : lightVars]}>
        <AuthGate>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
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
      </View>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
