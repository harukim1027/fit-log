/**
 * @file components/RoutineColorPicker.tsx
 * @description 루틴 색상 선택 — 추천 팔레트(빠른 선택) + 자유 색상 휠.
 *
 * 색상 휠은 reanimated-color-picker(reanimated + gesture-handler 기반).
 * 휠은 부모 ScrollView와의 제스처 충돌을 피하기 위해 전용 Modal로 분리한다.
 * ⚠️ RN <Modal>은 별도 네이티브 뷰 계층이라 앱 루트의 GestureHandlerRootView가
 *    닿지 않는다 → Modal 내부를 자체 GestureHandlerRootView로 감싸야 휠 제스처가 동작한다.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

/**
 * Provides recommended and custom color selection for a routine.
 *
 * @param value - The currently selected color in hexadecimal format
 * @param onChange - Called with the selected color in hexadecimal format
 */
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

      {/* 색상 휠 열기 (전용 모달) */}
      <TouchableOpacity
        onPress={() => setShowWheel(true)}
        activeOpacity={0.8}
        style={{
          padding: 12,
          backgroundColor: c.surfaceAlt,
          borderRadius: 12,
          alignItems: "center",
        }}>
        <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
          직접 색상 고르기
        </Text>
      </TouchableOpacity>

      {/* 색상 휠 모달 — 부모 ScrollView와 제스처 격리 + 자체 GestureHandlerRootView */}
      <Modal
        visible={showWheel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWheel(false)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
            {/* 바깥 탭 닫기 레이어 (카드 뒤) — 휠 제스처를 방해하지 않도록 카드와 분리 */}
            <TouchableOpacity
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
              activeOpacity={1}
              onPress={() => setShowWheel(false)}
            />
            {/* 카드 (위에 얹힘) */}
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
              }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, marginBottom: 14 }}>
                색상 고르기
              </Text>
              <ColorPicker
                value={value}
                // 제스처 종료 시에만 hex 반영 (연속 onChange 미사용 — 과도한 리렌더 방지)
                onComplete={({ hex }) => onChange(hex)}
                style={{ width: "100%" }}>
                <Preview hideInitialColor style={{ marginBottom: 12, borderRadius: 12 }} />
                <Panel1 style={{ height: 200, borderRadius: 12, marginBottom: 12 }} />
                <HueSlider style={{ marginBottom: 4 }} />
              </ColorPicker>
              <TouchableOpacity
                onPress={() => setShowWheel(false)}
                activeOpacity={0.85}
                style={{
                  marginTop: 16,
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: c.primary,
                  alignItems: "center",
                }}>
                <Text style={{ color: c.onAccent, fontWeight: "800", fontSize: 14 }}>완료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
