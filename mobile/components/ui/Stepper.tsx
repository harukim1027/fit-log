import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import { NumberPad } from "./NumberPad";

interface Props {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimal?: boolean;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
const LIGHT_SHADOW_KNOB = {
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
const LIGHT_SHADOW_KNOB_STRONG = { ...LIGHT_SHADOW_KNOB, shadowOpacity: 0.3 };

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99999,
  suffix,
  decimal = false,
}: Props) {
  const c = useColors();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const [padVisible, setPadVisible] = useState(false);
  const num = decimal ? parseFloat(value) || 0 : parseInt(value) || 0;

  const set = (n: number) => {
    const clamped = Math.max(min, Math.min(max, n));
    onChange(decimal ? String(Math.round(clamped * 10) / 10) : String(Math.round(clamped)));
  };

  return (
    <>
      <View className="flex-row items-center bg-surface-alt rounded-full p-1.5">
        {/* 회귀 방지: 노브(bg-surface)는 트랙(bg-surface-alt)과 명도 차가 1.12뿐이라
            그림자가 유일한 경계 단서였다. 다크에서는 그 그림자가 보이지 않으므로
            DESIGN.md가 대체 수단으로 정한 border.hairline을 쓴다.
            surfaceHigh로 올려보면 오히려 1.05로 더 나빠져 토큰 사다리로는 풀리지 않는다. */}
        <TouchableOpacity
          className={"w-11 h-11 rounded-full bg-surface items-center justify-center" + (isDark ? " border border-border" : "")}
          style={isDark ? null : LIGHT_SHADOW_KNOB}
          onPress={() => set(num - step)}
          activeOpacity={0.7}>
          <Text className="text-2xl font-bold text-primary" style={{ marginTop: -3 }}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-end justify-center gap-1"
          onPress={() => setPadVisible(true)}
          activeOpacity={0.7}>
          <Text className="text-text-primary font-extrabold text-center" style={{ fontSize: 24, minWidth: 56 }}>{value}</Text>
          {suffix ? (
            <Text className="text-text-muted font-bold text-sm mb-1">{suffix}</Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          className="w-11 h-11 rounded-full bg-primary items-center justify-center"
          style={isDark ? null : LIGHT_SHADOW_KNOB_STRONG}
          onPress={() => set(num + step)}
          activeOpacity={0.7}>
          <Text className="text-2xl font-bold text-on-accent" style={{ marginTop: -3 }}>+</Text>
        </TouchableOpacity>
      </View>

      <NumberPad
        visible={padVisible}
        value={value}
        decimal={decimal}
        suffix={suffix}
        max={max}
        onConfirm={(v) => {
          const n = decimal ? parseFloat(v) : parseInt(v);
          const clamped = Math.max(min, Math.min(max, isNaN(n) ? min : n));
          onChange(decimal ? String(Math.round(clamped * 10) / 10) : String(Math.round(clamped)));
          setPadVisible(false);
        }}
        onCancel={() => setPadVisible(false)}
      />
    </>
  );
}

export default Stepper;
