/**
 * @file components/CategoryColorPicker.tsx
 * @description 부위(카테고리) 색상 선택 모달 시트 — 기본 팔레트 + 자유 색상 휠.
 * 루틴 색상 컴포넌트와 별개(reanimated-color-picker 휠을 직접 재사용).
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ColorPicker, {
  Panel1,
  HueSlider,
  Preview,
} from "reanimated-color-picker";
import { useColors } from "../constants/colors";
import { DEFAULT_CATEGORY_COLORS } from "../constants/categoryColors";

const PALETTE = Array.from(new Set(Object.values(DEFAULT_CATEGORY_COLORS)));

interface Props {
  category: string;
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function CategoryColorPicker({ category, value, onChange, onClose }: Props) {
  const c = useColors();
  const [showWheel, setShowWheel] = useState(false);

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
      }}
      activeOpacity={1}
      onPress={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {}}
        style={{
          margin: 24,
          backgroundColor: c.surface,
          borderRadius: 20,
          padding: 20,
        }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: c.textPrimary, marginBottom: 14 }}>
          {category} 색상
        </Text>

        {/* 미리보기 */}
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
          <Text style={{ color: c.textSecondary, fontSize: 14 }}>{value?.toUpperCase()}</Text>
        </View>

        {/* 기본 팔레트 */}
        <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>추천</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {PALETTE.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => onChange(color)}
              activeOpacity={0.8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: color,
                borderWidth: value?.toLowerCase() === color.toLowerCase() ? 3 : 0,
                borderColor: c.textPrimary,
              }}
            />
          ))}
        </View>

        {/* 색상 휠 토글 */}
        <TouchableOpacity
          onPress={() => setShowWheel((v) => !v)}
          activeOpacity={0.8}
          style={{ padding: 12, backgroundColor: c.surfaceAlt, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
            {showWheel ? "색상 휠 닫기" : "직접 색상 고르기"}
          </Text>
        </TouchableOpacity>

        {showWheel && (
          <View style={{ marginTop: 16 }}>
            <ColorPicker value={value} onComplete={({ hex }) => onChange(hex)} style={{ width: "100%" }}>
              <Preview hideInitialColor style={{ marginBottom: 12, borderRadius: 12 }} />
              <Panel1 style={{ height: 200, borderRadius: 12, marginBottom: 12 }} />
              <HueSlider style={{ marginBottom: 4 }} />
            </ColorPicker>
          </View>
        )}

        {/* 완료 */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={{
            backgroundColor: c.primary,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 16,
          }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.surface }}>완료</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
