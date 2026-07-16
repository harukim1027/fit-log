/**
 * @file components/RoutineColorPicker.tsx
 * @description 루틴 색상 선택 — 추천 팔레트(빠른 선택) + 자유 색상 휠.
 *
 * 색상 휠은 reanimated-color-picker(reanimated + gesture-handler 기반).
 * 휠은 부모 ScrollView와의 제스처 충돌을 피하기 위해 전용 Modal로 분리한다.
 * ⚠️ RN <Modal>은 별도 네이티브 뷰 계층이라 앱 루트의 GestureHandlerRootView가
 *    닿지 않는다 → Modal 내부를 자체 GestureHandlerRootView로 감싸야 휠 제스처가 동작한다.
 */
import React, { useState, useEffect } from "react";
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
 * Renders a routine color picker with recommended colors and a custom color wheel.
 *
 * @param value - The currently selected color in hexadecimal format.
 * @param onChange - Callback invoked when a palette color is selected or a custom color is confirmed.
 */
export function RoutineColorPicker({ value, onChange }: Props) {
  const c = useColors();
  const [showWheel, setShowWheel] = useState(false);
  // 휠 편집용 draft — 조작 중엔 draft만 바뀌고, "완료" 눌러야 부모(onChange)에 확정.
  // 모달이 닫혀 있거나(value 변경 포함) 취소로 닫힐 땐 draft를 현재 값으로 되돌린다(롤백).
  const [draftHex, setDraftHex] = useState(value);
  useEffect(() => {
    if (!showWheel) setDraftHex(value);
  }, [showWheel, value]);

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
                value={draftHex}
                // onComplete는 UI 스레드(worklet)에서 호출돼 JS setState 직접 호출 시 크래시.
                // 라이브러리가 내부에서 runOnJS로 감싸주는 onCompleteJS를 사용(일반 JS 함수용).
                // 조작 중엔 draft만 갱신 (부모 미반영) — 확정은 "완료" 버튼에서만.
                onCompleteJS={({ hex }) => setDraftHex(hex)}
                style={{ width: "100%" }}>
                <Preview hideInitialColor style={{ marginBottom: 12, borderRadius: 12 }} />
                <Panel1 style={{ height: 200, borderRadius: 12, marginBottom: 12 }} />
                <HueSlider style={{ marginBottom: 4 }} />
              </ColorPicker>
              <TouchableOpacity
                onPress={() => { onChange(draftHex); setShowWheel(false); }}
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
