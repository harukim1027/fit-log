/**
 * @file components/workout/SettingSelector.tsx
 * @description 기구 설정(항목 키 + 값) 추가 UI — 재사용 컴포넌트
 *
 * 운동 추가 / 운동 중 카드 수정 / 루틴 수정에서 동일한 기구 설정 추가 UI를
 * 쓰기 위해 분리했다. (이전에는 운동 중 카드 수정에 "직접 입력"이 없어
 * 목록에 없는 항목을 "기타"로만 저장해야 했다.)
 *
 * 키 선택 = 프리셋 칩 + (선택) 서버 저장 커스텀 키 + "직접 입력"(자유 입력).
 * "직접 입력" 선택 시 항목명 TextInput이 나타나고, 값과 함께 onAdd로 전달된다.
 *
 * variant:
 * - 'inline': 운동 중 카드 안 컴팩트 레이아웃 (가로 스크롤 칩 + 값 + 체크 버튼)
 * - 'sheet' : 모달 시트 레이아웃 (라벨 + 줄바꿈 칩 + "추가하기" 버튼)
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useColors } from "../../constants/colors";
import { Icon } from "../AppIcons";

/** 기구 설정 기본 키 목록 (마지막 "직접 입력"은 컴포넌트가 자동으로 덧붙임) */
export const DEFAULT_SETTING_KEYS = [
  "시트높이",
  "등받이각도",
  "그립종류",
  "발판위치",
  "바높이",
  "인클라인각도",
];

export interface ExtraSettingKey {
  id: string;
  name: string;
}

const CUSTOM = "직접 입력";

interface Props {
  /** 항목 추가 시 호출. 직접 입력이면 key는 사용자가 입력한 항목명. */
  onAdd: (key: string, value: string) => void;
  presetKeys?: string[];
  /** 서버에 저장된 사용자 정의 키 (있으면 칩으로 렌더, 삭제 가능) */
  extraKeys?: ExtraSettingKey[];
  onDeleteExtraKey?: (id: string) => void;
  variant?: "inline" | "sheet";
}

/**
 * Provides controls for selecting or entering a setting key and submitting its value.
 *
 * @param onAdd - Called with the selected key and trimmed value when both are provided.
 * @param presetKeys - Preset setting keys available for selection.
 * @param extraKeys - Additional setting keys available for selection.
 * @param onDeleteExtraKey - Called with an additional key's identifier when it is deleted.
 * @param variant - Selects the inline or sheet layout.
 */
export function SettingSelector({
  onAdd,
  presetKeys = DEFAULT_SETTING_KEYS,
  extraKeys = [],
  onDeleteExtraKey,
  variant = "inline",
}: Props) {
  const c = useColors();
  const [selectedKey, setSelectedKey] = useState(presetKeys[0] ?? "");
  const [isCustom, setIsCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [value, setValue] = useState("");
  const customRef = useRef<TextInput>(null);

  const sheet = variant === "sheet";
  const finalKey = isCustom ? customKey.trim() : selectedKey;

  const selectKey = (k: string) => {
    setIsCustom(false);
    setCustomKey("");
    setSelectedKey(k);
  };

  const enableCustom = () => {
    setIsCustom(true);
    setSelectedKey("");
    setTimeout(() => customRef.current?.focus(), 100);
  };

  const submit = () => {
    if (!finalKey || !value.trim()) return;
    onAdd(finalKey, value.trim());
    setValue("");
    setCustomKey("");
    setIsCustom(false);
    setSelectedKey(presetKeys[0] ?? "");
  };

  const chip = (label: string, on: boolean, onPress: () => void, key?: string) => (
    <TouchableOpacity activeOpacity={0.8}
      key={key ?? label}
      style={{
        borderRadius: sheet ? 20 : 999,
        paddingHorizontal: sheet ? 14 : 10,
        paddingVertical: sheet ? 8 : 5,
        backgroundColor: on ? (sheet ? c.primary + "28" : c.primary) : c.surfaceAlt,
      }}
      onPress={onPress}>
      <Text
        style={{
          fontSize: sheet ? 13 : 11,
          fontWeight: "700",
          color: on ? (sheet ? c.primary : c.surface) : c.textSecondary,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const customChip = chip(`+ ${CUSTOM}`, isCustom, enableCustom, "__custom__");

  const keyChips = (
    <>
      {presetKeys.map((k) => chip(k, !isCustom && selectedKey === k, () => selectKey(k)))}
      {extraKeys.map((k) => (
        <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {chip(k.name, !isCustom && selectedKey === k.name, () => selectKey(k.name), k.id)}
          {onDeleteExtraKey && (
            <TouchableOpacity activeOpacity={0.8}
              style={{ marginLeft: -4, marginTop: -8 }}
              onPress={() => onDeleteExtraKey(k.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Icon name="close" size={13} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {customChip}
    </>
  );

  const customKeyInput = isCustom ? (
    <TextInput
      ref={customRef}
      style={{
        backgroundColor: c.surfaceAlt,
        borderRadius: sheet ? 14 : 10,
        padding: sheet ? 13 : undefined,
        height: sheet ? undefined : 36,
        paddingHorizontal: sheet ? undefined : 10,
        fontSize: sheet ? 15 : 13,
        fontWeight: "700",
        color: c.textPrimary,
        marginTop: sheet ? 10 : 6,
        borderWidth: 1.5,
        borderColor: c.primary + "60",
      }}
      placeholder="설정 항목 이름 입력 (예: 케이블각도, 풀리높이)"
      value={customKey}
      onChangeText={setCustomKey}
      placeholderTextColor={c.textMuted}
      returnKeyType="next"
    />
  ) : null;

  // ── inline variant (운동 중 카드) ──
  if (!sheet) {
    return (
      <View style={{ gap: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 4 }}>{keyChips}</View>
        </ScrollView>
        {customKeyInput}
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: c.surfaceAlt,
              borderRadius: 10,
              height: 36,
              paddingHorizontal: 10,
              fontSize: 13,
              fontWeight: "700",
              color: c.textPrimary,
            }}
            placeholder="값 입력"
            placeholderTextColor={c.textMuted}
            value={value}
            onChangeText={setValue}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <TouchableOpacity activeOpacity={0.8}
            style={{
              backgroundColor: c.primary,
              borderRadius: 10,
              height: 36,
              paddingHorizontal: 14,
              justifyContent: "center",
            }}
            onPress={submit}>
            <Icon name="check" size={14} color={c.surface} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── sheet variant (모달) ──
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 10 }}>
        항목 선택
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {keyChips}
      </View>
      {customKeyInput}
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginTop: 16, marginBottom: 10 }}>
        값 입력
      </Text>
      <TextInput
        style={{
          backgroundColor: c.surfaceAlt,
          borderRadius: 14,
          padding: 14,
          fontSize: 15,
          color: c.textPrimary,
          marginBottom: 16,
        }}
        placeholder="예: 3단계, 45도, 오버핸드"
        value={value}
        onChangeText={setValue}
        placeholderTextColor={c.textMuted}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <TouchableOpacity
        style={{ backgroundColor: c.primary, borderRadius: 24, padding: 15, alignItems: "center" }}
        onPress={submit}
        activeOpacity={0.8}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: c.surface }}>추가하기</Text>
      </TouchableOpacity>
    </View>
  );
}
