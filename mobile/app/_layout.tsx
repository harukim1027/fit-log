import "../global.css";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme, vars } from "nativewind";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useColors, lightColors, darkColors, type ThemeColors } from "../constants/colors";
import apiClient, { setUnauthorizedHandler } from "../lib/apiClient";
import { secureStorage } from "../lib/secureStorage";
import { requestNotificationPermission, setupNotificationChannel } from "../lib/workoutNotification";
import { useWorkoutStore } from "../store/workoutStore";
import { useSettingsStore } from "../store/settingsStore";
import { showCuteAlert } from "../components/CuteAlert";
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator, Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CuteAlertHost } from "../components/CuteAlert";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { initSentry } from "../lib/sentry";

// 앱 시작 시 즉시 초기화 (React 렌더 전)
initSentry();

if (!__DEV__) {
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('Global error:', error, isFatal);
  });
}

// NativeWind v4: CSS 변수는 컴파일 타임에 :root 값으로 고정되므로
// vars()로 런타임에 주입해야 dark mode CSS 변수가 실제로 교체됩니다.
//
// 회귀 방지: 값을 여기에 손으로 적지 말 것. constants/colors.ts가 색의 단일
// 출처이고(DESIGN.md 계약), 과거 여기 하드코딩된 값이 primary/warning/danger/
// stats/carb/fat에서 colors.ts와 어긋난 채로 남아 있었음. 반드시 파생시킬 것.
const toRgbChannels = (hex: string) => {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
};

const themeVars = (c: ThemeColors) => vars({
  "--color-primary":        toRgbChannels(c.primary),
  "--color-secondary":      toRgbChannels(c.secondary),
  "--color-success":        toRgbChannels(c.success),
  "--color-warning":        toRgbChannels(c.warning),
  "--color-danger":         toRgbChannels(c.danger),
  "--color-on-accent":      toRgbChannels(c.onAccent),
  "--color-background":     toRgbChannels(c.background),
  "--color-surface":        toRgbChannels(c.surface),
  "--color-surface-alt":    toRgbChannels(c.surfaceAlt),
  "--color-surface-high":   toRgbChannels(c.surfaceHigh),
  "--color-border":         toRgbChannels(c.border),
  "--color-text-primary":   toRgbChannels(c.textPrimary),
  "--color-text-secondary": toRgbChannels(c.textSecondary),
  "--color-text-muted":     toRgbChannels(c.textMuted),
  "--color-stats":          toRgbChannels(c.stats),
  "--color-carb":           toRgbChannels(c.carb),
  "--color-fat":            toRgbChannels(c.fat),
  "--color-diet":           toRgbChannels(c.diet),
  "--color-workout":        toRgbChannels(c.workout),
  "--color-water":          toRgbChannels(c.water),
  "--color-protein":        toRgbChannels(c.protein),
});

const lightVars = themeVars(lightColors);
const darkVars = themeVars(darkColors);

// 운동 진행 알림은 무음, 휴식 종료 알림은 포그라운드에서도 소리+배너 표시
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isRestEnd = notification.request.content.data?.type === 'rest-end';
    return {
      shouldShowAlert: isRestEnd,
      shouldPlaySound: isRestEnd,
      shouldSetBadge: false,
      priority: isRestEnd
        ? Notifications.AndroidNotificationPriority.HIGH
        : Notifications.AndroidNotificationPriority.LOW,
    } as Notifications.NotificationBehavior;
  },
});

/**
 * Hydrates the stored theme and synchronizes the application and native color schemes.
 */
function useThemeSync() {
  const mode = useThemeStore((s) => s.mode);
  const hydrate = useThemeStore((s) => s.hydrate);
  const { setColorScheme } = useColorScheme();
  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    setColorScheme(mode);
    // 회귀 방지: 네이티브 chrome(키보드, 시스템 Alert, 액션시트)을 앱 테마에 맞춘다.
    // app.json의 userInterfaceStyle이 "automatic"이어야 이 override가 먹는다.
    // "light"/"dark"로 고정하면 iOS가 스타일을 잠가 여기서 바꿀 수 없다.
    Appearance.setColorScheme(mode);
  }, [mode]);
}

/**
 * Prepares notification services and loads the user's notification settings.
 *
 * Clears previously scheduled notifications, configures the notification channel, and requests notification permission.
 */
function useNotificationSetup() {
  useEffect(() => {
    // 이전 세션에서 남아있던 예약 알림 전부 제거
    Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    setupNotificationChannel();
    requestNotificationPermission();
    // 휴식 알림 설정(30초 전 알림 등)을 미리 로드 — 첫 휴식 타이머가 설정을 반영하도록
    useSettingsStore.getState().loadSettings();
  }, []);
}

function usePreemptiveTokenRefresh() {
  const isReady = useAuthStore((s) => s.isReady);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!isReady || !token) return;

    const refresh = async () => {
      try {
        const stored = await secureStorage.getToken();
        if (!stored) return;
        const parts = stored.split('.');
        if (parts.length !== 3) return;
        // base64url → base64 변환 후 디코딩
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const expiresIn = payload.exp * 1000 - Date.now();
        // 만료 3일 이내면 미리 갱신
        if (expiresIn < 3 * 24 * 60 * 60 * 1000) {
          const res = await apiClient.post<{ access_token: string }>('/auth/refresh');
          const newToken = res.data.access_token;
          await secureStorage.setToken(newToken);
          useAuthStore.getState().setToken(newToken);
        }
      } catch {
        // 실패해도 무시 — 실제 요청 시 인터셉터가 재시도
      }
    };

    refresh();
  }, [isReady, token]);
}

function useDraftRestore() {
  const isReady = useAuthStore((s) => s.isReady);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!isReady || !token) return;
    useWorkoutStore.getState().restoreDraft().then((restored) => {
      if (!restored) return;
      showCuteAlert({
        icon: 'check',
        tone: 'info',
        title: '운동 기록 복구',
        message: '이전에 진행 중이던 운동 기록이 있어요.\n이어서 할까요?',
        buttons: [
          {
            label: '새로 시작',
            style: 'soft',
            onPress: () => useWorkoutStore.getState().cancelSession(),
          },
          {
            label: '이어하기',
            style: 'primary',
            onPress: () => useWorkoutStore.getState().startWorkoutTimer(),
          },
        ],
      });
    });
  }, [isReady, token]);
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
  useNotificationSetup();
  usePreemptiveTokenRefresh();
  useDraftRestore();
  const mode = useThemeStore((s) => s.mode);
  const colors = useColors();

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            <Stack.Screen
              name="modal/full-calendar"
              options={{ presentation: "fullScreenModal", headerShown: false, animation: "slide_from_bottom" }}
            />
          </Stack>
        </AuthGate>
      </View>
    </SafeAreaProvider>
    <CuteAlertHost />
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
