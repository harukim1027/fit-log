import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Animated, View } from "react-native";
import { useColors } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/AppIcons";
import { ActiveWorkoutBar } from "../../components/workout/ActiveWorkoutBar";

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

export default function TabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          // height는 padding을 포함한 총 높이라 insets.bottom이 height와
          // paddingBottom 양쪽에 나타나는 것이 정상이다(중복 계산이 아니다).
          // 콘텐츠 박스 = height - paddingTop - paddingBottom = 54.
          // 회귀 방지: paddingBottom에 안전영역 위로 +8을 더 얹지 말 것.
          // 그러면 바만 8pt 높아지고 아이콘·라벨이 하단에서 떠 보인다.
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
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
    {/* 운동 중 전역 미니 바 (탭바 위 오버레이, 운동 탭에선 자동 숨김) */}
    <ActiveWorkoutBar />
    </View>
  );
}
