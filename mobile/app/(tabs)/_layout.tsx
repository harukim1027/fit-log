import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TABS = [
  {
    name: "index",
    title: "홈",
    icon: "home-outline" as IoniconsName,
    activeIcon: "home" as IoniconsName,
    color: Colors.primary,
  },
  {
    name: "diet",
    title: "식단",
    icon: "nutrition-outline" as IoniconsName,
    activeIcon: "nutrition" as IoniconsName,
    color: Colors.diet,
  },
  {
    name: "workout",
    title: "운동",
    icon: "barbell-outline" as IoniconsName,
    activeIcon: "barbell" as IoniconsName,
    color: Colors.workout,
  },
  {
    name: "stats",
    title: "통계",
    icon: "bar-chart-outline" as IoniconsName,
    activeIcon: "bar-chart" as IoniconsName,
    color: Colors.stats,
  },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
          shadowColor: "#9B8CC8",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <View
                style={
                  focused
                    ? {
                        backgroundColor: tab.color + "28",
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 5,
                      }
                    : {}
                }>
                <Ionicons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={size}
                  color={focused ? tab.color : Colors.textMuted}
                />
              </View>
            ),
            tabBarActiveTintColor: tab.color,
          }}
        />
      ))}
    </Tabs>
  );
}
