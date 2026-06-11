import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../store/themeStore";
import { useColors } from "../../constants/colors";

export function ThemeToggle({ size = 36 }: { size?: number }) {
  const { mode, toggle } = useThemeStore();

  return (
    <TouchableOpacity
      onPress={toggle}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
      className="bg-surface-alt"
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityLabel={mode === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}>
      {mode === "dark" ? <SunIcon size={size * 0.5} /> : <MoonIcon size={size * 0.5} />}
    </TouchableOpacity>
  );
}

function SunIcon({ size }: { size: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* center dot */}
      <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: 999, backgroundColor: c.warning }} />
      {/* rays — 8 short lines using absolute positioned dots */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = size * 0.46;
        const x = size / 2 + r * Math.cos(rad) - size * 0.07;
        const y = size / 2 + r * Math.sin(rad) - size * 0.07;
        return (
          <View
            key={deg}
            style={{
              position: "absolute",
              width: size * 0.14,
              height: size * 0.14,
              borderRadius: 999,
              backgroundColor: c.warning,
              left: x,
              top: y,
            }}
          />
        );
      })}
    </View>
  );
}

function MoonIcon({ size }: { size: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size * 0.75,
          height: size * 0.75,
          borderRadius: 999,
          backgroundColor: c.secondary,
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: 999,
          position: "absolute",
          right: 0,
          top: 0,
        }}
        className="bg-surface-alt"
      />
    </View>
  );
}

export default ThemeToggle;
