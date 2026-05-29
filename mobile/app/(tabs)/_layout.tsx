import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Animated, View } from "react-native";
import { Colors } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/AppIcons";

type TabIconName = "home" | "apple" | "dumbbell" | "chart";

const TABS: { name: string; title: string; icon: TabIconName }[] = [
  { name: "index",   title: "홈",  icon: "home" },
  { name: "diet",    title: "식단", icon: "apple" },
  { name: "workout", title: "운동", icon: "dumbbell" },
  { name: "stats",   title: "통계", icon: "chart" },
];

function AnimatedTabIcon({ icon, focused }: { icon: TabIconName; focused: boolean }) {
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
        focused && { backgroundColor: Colors.surfaceAlt },
      ]}>
      <Icon
        name={icon}
        size={22}
        color={focused ? Colors.mintInk : Colors.textMuted}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          shadowColor: "#4EBFA0",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          elevation: 10,
        },
        tabBarActiveTintColor: Colors.mintInk,
        tabBarInactiveTintColor: Colors.textMuted,
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
    </Tabs>
  );
}
