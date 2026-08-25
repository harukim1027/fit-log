/**
 * @file components/workout/TargetMuscleSelector.tsx
 * @description 카테고리 + 타겟부위(다중 선택) 선택 UI — 재사용 컴포넌트
 *
 * 운동 추가 / 운동 중 카드 수정 / 루틴 종목 수정에서 동일한 타겟부위 선택 UI를
 * 쓰기 위해 분리했다. (이전에는 ExerciseAdder의 "직접 추가" 폼 안에만 있어
 * 한 번 추가한 종목은 타겟부위를 변경할 수 없었다.)
 *
 * controlled 컴포넌트: category / targetMuscles 상태는 부모가 소유한다.
 * "직접 입력" 토글/텍스트 입력은 일시적 UI라 내부 상태로 관리한다.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useColors } from "../../constants/colors";
import { Icon } from "../AppIcons";
import { IconButton } from "../../design-system";
import { EXERCISE_CATEGORIES } from "../../constants";

/** 카테고리별 기본 타겟부위 옵션 (마지막 '직접 입력'은 자유 입력 토글) */
export const CATEGORY_TARGETS: Record<string, string[]> = {
  가슴: ["상부", "중부", "하부", "내측", "직접 입력"],
  등: ["상부 승모", "중부 승모", "광배", "척추기립근", "직접 입력"],
  어깨: ["전면", "측면", "후면", "직접 입력"],
  팔: ["이두", "삼두", "전완", "직접 입력"],
  하체: ["대퇴사두", "햄스트링", "둔근", "종아리", "직접 입력"],
  복근: ["상복부", "하복부", "측복부", "직접 입력"],
  유산소: ["전신", "직접 입력"],
  기타: ["직접 입력"],
};

interface Props {
  category: string;
  /** 카테고리 변경 콜백 (showCategory=true일 때만 사용) */
  onCategoryChange?: (cat: string) => void;
  targetMuscles: string[];
  onTargetMusclesChange: (muscles: string[]) => void;
  /** 카테고리 선택 UI도 함께 렌더링할지 (기본 true) */
  showCategory?: boolean;
}

export function TargetMuscleSelector({
  category,
  onCategoryChange,
  targetMuscles,
  onTargetMusclesChange,
  showCategory = true,
}: Props) {
  const c = useColors();
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");

  const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  };

  const presetParts = CATEGORY_TARGETS[category] ?? ["직접 입력"];

  const toggle = (part: string) =>
    onTargetMusclesChange(
      targetMuscles.includes(part)
        ? targetMuscles.filter((p) => p !== part)
        : [...targetMuscles, part]
    );

  const addCustom = () => {
    const v = inputText.trim();
    if (v && !targetMuscles.includes(v))
      onTargetMusclesChange([...targetMuscles, v]);
    setInputText("");
    setShowInput(false);
  };

  return (
    <View>
      {showCategory && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: c.textMuted,
              marginBottom: 8,
            }}>
            카테고리
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            keyboardShouldPersistTaps="handled">
            {EXERCISE_CATEGORIES.map((cat) => {
              const on = category === cat;
              return (
                <TouchableOpacity activeOpacity={0.8}
                  key={cat}
                  style={[
                    {
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      marginRight: 8,
                      backgroundColor: on ? c.danger + "28" : c.surface,
                    },
                    SHADOW,
                  ]}
                  onPress={() => onCategoryChange?.(cat)}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: on ? c.danger : c.textSecondary,
                      fontWeight: on ? "700" : "600",
                    }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: c.textMuted,
          marginBottom: 8,
        }}>
        타겟 부위 (다중 선택)
      </Text>
      {!category ? (
        <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 16 }}>
          카테고리를 먼저 선택해주세요
        </Text>
      ) : (
        <View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: showInput ? 10 : 0,
            }}>
            {presetParts
              .filter((part) => part !== "직접 입력")
              .map((part) => {
              const on = targetMuscles.includes(part);
              return (
                <TouchableOpacity activeOpacity={0.8}
                  key={part}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: on ? c.primary : c.surfaceAlt,
                  }}
                  onPress={() => toggle(part)}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: on ? c.surface : c.textSecondary,
                    }}>
                    {part}
                  </Text>
                  </TouchableOpacity>
                );
              })}
            {/* 직접 입력으로 추가된 항목 태그 (프리셋에 없는 값) */}
            {targetMuscles
              .filter((p) => !presetParts.includes(p))
              .map((p) => (
                <TouchableOpacity activeOpacity={0.8}
                  key={p}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: c.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                  onPress={() => toggle(p)}>
                  <Text
                    style={{ fontSize: 12, fontWeight: "700", color: c.surface }}>
                    {p}
                  </Text>
                  <Text style={{ fontSize: 10, color: c.surface, opacity: 0.7 }}>
                    ×
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
          {/* 부위 생성 액션. **칩이 아니다.**
              예전에는 "+ 직접 입력"이 선택지 칩과 같은 알약 모양이었고
              입력창이 열리면 배경이 primary로 차서 선택된 것처럼 보였다.
              형태는 SettingSelector의 "+ 항목 추가"와 같다 — 배경 없이 글자만.
              (앱의 기존 텍스트 액션: workout.tsx:2465, :3325) */}
          {!showInput && (
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="타겟 부위 추가"
              onPress={() => setShowInput(true)}
              style={{ alignSelf: "flex-start", paddingVertical: 6, paddingRight: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary }}>
                + 부위 추가
              </Text>
            </TouchableOpacity>
          )}
          {showInput && (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                marginTop: 8,
              }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: c.surfaceAlt,
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 13,
                  color: c.textPrimary,
                }}
                placeholder="타겟 부위 직접 입력"
                placeholderTextColor={c.textMuted}
                value={inputText}
                onChangeText={setInputText}
                returnKeyType="done"
                onSubmitEditing={addCustom}
              />
              <TouchableOpacity activeOpacity={0.8}
                style={{
                  backgroundColor: c.primary,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
                onPress={addCustom}>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: c.surface }}>
                  추가
                </Text>
              </TouchableOpacity>
              {/* 생성 액션이 칩 토글이 아니게 되면서 닫을 수단이 필요해졌다. */}
              <IconButton
                accessibilityLabel="타겟 부위 입력 취소"
                onPress={() => { setInputText(""); setShowInput(false); }}>
                <Icon name="close" size={16} color={c.textSecondary} />
              </IconButton>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
