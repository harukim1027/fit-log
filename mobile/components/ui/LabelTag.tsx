import React from "react";
import { View, Text } from "react-native";

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

export function LabelTag({ label, color, style }: LabelTagProps) {
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.22,
          shadowRadius: 4,
          elevation: 4,
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
          color: "#FFFFFF",
          letterSpacing: 0.3,
        }}>
        {label}
      </Text>
    </View>
  );
}
