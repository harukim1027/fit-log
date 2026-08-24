import React from "react";
import { View } from "react-native";
import { IconButton } from "../../design-system";
import { useThemeStore } from "../../store/themeStore";
import { useColors } from "../../constants/colors";

/**
 * `size`는 **아이콘 기준 크기**다. 박스 크기가 아니다.
 *
 * IconButton으로 옮기면서 박스는 44(DESIGN.md target.min)로 고정됐다 —
 * 44는 호출부가 아니라 컴포넌트가 보장한다. 호출부가 넘기는 36/38은
 * 이제 안쪽 해/달 글리프 크기(size * 0.5 = 18/19)만 정한다.
 *
 * 배경은 IconButton의 filled(= surfaceAlt)가 그린다. MoonIcon의 초승달은
 * 배경과 같은 색 원을 겹쳐 파내는 방식이라 그 색이 surfaceAlt여야 하는데,
 * `bg-surface-alt`와 `c.surfaceAlt`가 같은 CSS 변수를 가리키므로 그대로 맞는다.
 */
export function ThemeToggle({ size = 36 }: { size?: number }) {
  const { mode, toggle } = useThemeStore();

  return (
    <IconButton
      onPress={toggle}
      variant="filled"
      accessibilityLabel={mode === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}>
      {mode === "dark" ? <SunIcon size={size * 0.5} /> : <MoonIcon size={size * 0.5} />}
    </IconButton>
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
