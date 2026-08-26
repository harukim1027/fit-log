import React, { useEffect, useRef } from "react";
import { Tabs } from "expo-router";
import { Animated, Text, View } from "react-native";
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

  // 선택 표시는 색상 대비로만 한다 (iOS 기본 탭바 방식). 배경 알약은 없앴다.
  //
  // scale은 남긴다. primary와 textSecondary의 휘도 대비가 1.40:1(라이트)
  // / 1.32:1(다크)로 낮아 색상만으로는 구분이 약하고, 색각 이상 사용자에게는
  // 색 이외의 단서가 하나는 있어야 한다. 크기 변화가 그 역할을 한다.
  //
  // paddingVertical 5는 배경이 없어져도 유지한다 — 빼면 아이콘과 라벨 간격이
  // 5pt 좁아져 라벨이 아이콘에 붙는다.
  return (
    <Animated.View style={{ transform: [{ scale }], paddingVertical: 5 }}>
      <Icon
        name={icon}
        size={22}
        color={focused ? c.primary : c.textSecondary}
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
        // textMuted → textSecondary. textMuted는 탭바 배경 대비가
        // 2.47:1(라이트) / 2.90:1(다크)로 아이콘 최소 기준 3:1에도 못 미쳤다.
        // textSecondary는 5.85 / 5.27로 라벨 기준 4.5:1까지 통과한다.
        tabBarInactiveTintColor: c.textSecondary,
        // tabBarLabelStyle은 두지 않는다 — 아래 tabBarLabel이 함수라
        // 적용되지 않는다(BottomTabItem이 함수 label에는 style을 넘기지 않음).
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
            // 색상 대비(1.40:1)만으로는 선택 구분이 약해 굵기 차를 더한다.
            // color는 라이브러리가 active/inactive tint로 이미 해결해 넘겨준다.
            tabBarLabel: ({ focused, color }) => (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: focused ? "800" : "600",
                  color,
                  marginTop: 2,
                }}>
                {tab.title}
              </Text>
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
