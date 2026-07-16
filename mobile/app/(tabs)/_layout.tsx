import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Animated, View } from "react-native";
import { useColors } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/AppIcons";

type TabIconName = "home" | "dumbbell" | "chart";

const TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "index",   title: "홈",  icon: "home" },
  { name: "workout", title: "운동", icon: "dumbbell" },
  { name: "stats",   title: "통계", icon: "chart" },
];

function AnimatedTabIcon({ icon, focused }: { icon: TabIconName; focused: boolean }) {
  const c = useColors();
  const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.1 : 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 280,
    }).start();
  }, [focused]);

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
        focused && { backgroundColor: c.surfaceAlt },
      ]}>
      <Icon
        name={icon}
        size={22}
        color={focused ? c.primary : c.textMuted}
      />
    </Animated.View>
  );
}

/**
 * Configures the application's bottom tab navigation.
 *
 * @returns The tab navigator with the primary tabs and a hidden diet route.
 */
export default function TabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          elevation: 10,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon icon={tab.icon} focused={focused} />
            ),
          }}
        />
      ))}
      {/* diet 탭: 파일 보존, 탭바에서 숨김 */}
      <Tabs.Screen name="diet" options={{ href: null }} />
    </Tabs>
  );
}
