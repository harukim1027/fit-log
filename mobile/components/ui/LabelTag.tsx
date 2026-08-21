import React from "react";
import { View, Text } from "react-native";
import { useThemeStore } from "../../store/themeStore";
import { lightColors, darkColors } from "../../constants/colors";

interface LabelTagProps {
  label: string;
  color: string;
  style?: object;
}

// hex 색을 amt(0~1)만큼 어둡게 — 불투명 끈구멍색 (반투명 대체)
function darken(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
const LIGHT_SHADOW_TAG = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.22,
  shadowRadius: 4,
  elevation: 4,
};

// WCAG 2.1 상대 휘도 — 임의의 color prop 위에 올릴 전경색을 대비로 고르기 위해서만 쓴다.
function relLuminance(hex: string): number {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((x) => x + x).join("") : m;
  const ch = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// color prop은 호출부가 자유롭게 넘기므로 흰색을 고정하면 밝은 색에서 대비가 무너진다.
// 색을 새로 만들지 않고 colors.ts의 onAccent 두 값 중 대비가 높은 쪽만 고른다.
// (app/(tabs)/index.tsx의 onWash와 같은 방식)
function onTag(bg: string): string {
  return contrastRatio(bg, darkColors.onAccent) >= contrastRatio(bg, lightColors.onAccent)
    ? darkColors.onAccent
    : lightColors.onAccent;
}

export function LabelTag({ label, color, style }: LabelTagProps) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  return (
    <View
      style={[
        {
          position: "absolute",
          top: -14,
          left: 16,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: color,
          borderRadius: 999,
          paddingLeft: 10,
          paddingRight: 14,
          paddingVertical: 5,
          transform: [{ rotate: "-3deg" }],
          // 회귀 방지: 그림자는 라이트 전용. 다크에서는 태그가 color 배경을 갖고 있어
          // 배경 대비만으로 카드 위에 떠 보인다(DESIGN.md: 그림자는 라이트 모드에서만).
          ...(isDark ? null : LIGHT_SHADOW_TAG),
          zIndex: 10,
        },
        style,
      ]}>
      {/* 끈구멍 */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: darken(color, 0.35),
          marginRight: 7,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: onTag(color),
          letterSpacing: 0.3,
        }}>
        {label}
      </Text>
    </View>
  );
}
