/**
 * @file components/RoutineColorPicker.tsx
 * @description 루틴 색상 선택 — 추천 팔레트(빠른 선택) + 자유 색상 휠.
 *
 * 색상 휠은 reanimated-color-picker(reanimated + gesture-handler 기반).
 * 앱 루트에 GestureHandlerRootView가 있어야 슬라이더 제스처가 동작한다.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ColorPicker, {
  Panel1,
  HueSlider,
  Preview,
} from "reanimated-color-picker";
import { useColors } from "../constants/colors";
import { Icon } from "./AppIcons";
import { ROUTINE_COLOR_POOL } from "../store/routineStore";

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function RoutineColorPicker({ value, onChange }: Props) {
  const c = useColors();
  const [showWheel, setShowWheel] = useState(false);

  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10 }}>
        루틴 색상
      </Text>

      {/* 현재 선택 색 미리보기 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: value,
            borderWidth: 2,
            borderColor: c.surface,
          }}
        />
        <Text style={{ color: c.textSecondary, fontVariant: ["tabular-nums"], fontSize: 14 }}>
          {value?.toUpperCase()}
        </Text>
      </View>

      {/* 추천 팔레트 */}
      <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>추천</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        {ROUTINE_COLOR_POOL.map((color) => {
          const on = value?.toLowerCase() === color.toLowerCase();
          return (
            <TouchableOpacity
              key={color}
              onPress={() => onChange(color)}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: color,
                borderWidth: on ? 3 : 0,
                borderColor: c.textPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}>
              {on && <Icon name="check" size={15} color="#fff" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 색상 휠 토글 */}
      <TouchableOpacity
        onPress={() => setShowWheel((v) => !v)}
        activeOpacity={0.8}
        style={{
          padding: 12,
          backgroundColor: c.surfaceAlt,
          borderRadius: 12,
          alignItems: "center",
        }}>
        <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
          {showWheel ? "색상 휠 닫기" : "직접 색상 고르기"}
        </Text>
      </TouchableOpacity>

      {/* 색상 휠 */}
      {showWheel && (
        <View style={{ marginTop: 16 }}>
          <ColorPicker
            value={value}
            // 제스처 종료 시 hex 반영 (연속 onChange는 과도한 리렌더 방지로 미사용)
            onComplete={({ hex }) => onChange(hex)}
            style={{ width: "100%" }}>
            <Preview hideInitialColor style={{ marginBottom: 12, borderRadius: 12 }} />
            <Panel1 style={{ height: 200, borderRadius: 12, marginBottom: 12 }} />
            <HueSlider style={{ marginBottom: 4 }} />
          </ColorPicker>
        </View>
      )}
    </View>
  );
}
