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
import { IconButton } from "../../design-system";

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

interface Props {
  /** 항목 추가 시 호출. 직접 입력이면 key는 사용자가 입력한 항목명. */
  onAdd: (key: string, value: string) => void;
  presetKeys?: string[];
  /** 서버에 저장된 사용자 정의 키 (있으면 칩으로 렌더, 삭제 가능) */
  extraKeys?: ExtraSettingKey[];
  onDeleteExtraKey?: (id: string) => void;
  variant?: "inline" | "sheet";
}

export function SettingSelector({
  onAdd,
  presetKeys = DEFAULT_SETTING_KEYS,
  extraKeys = [],
  onDeleteExtraKey,
  variant = "inline",
}: Props) {
  const c = useColors();
  const [selectedKey, setSelectedKey] = useState(presetKeys[0] ?? "");
  /** 커스텀 항목이 현재 선택돼 있는가 (이름 확정 후) */
  const [isCustom, setIsCustom] = useState(false);
  /** 이름 입력창이 열려 있는가. isCustom 과 분리해야 "입력 중"과 "확정됨"이 갈린다. */
  const [editingCustom, setEditingCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [value, setValue] = useState("");
  const customRef = useRef<TextInput>(null);

  const sheet = variant === "sheet";
  const finalKey = isCustom ? customKey.trim() : selectedKey;

  const selectKey = (k: string) => {
    setIsCustom(false);
    setEditingCustom(false);
    setCustomKey("");
    setSelectedKey(k);
  };

  /** "+ 항목 추가" — 이름 입력창만 연다. 이 버튼은 선택 상태를 갖지 않는다. */
  const openNameInput = () => {
    setEditingCustom(true);
    setTimeout(() => customRef.current?.focus(), 100);
  };

  /** 이름 확정 — 입력창을 닫고 그 이름을 현재 선택으로 만든다. */
  const confirmName = () => {
    if (!customKey.trim()) return;
    setIsCustom(true);
    setSelectedKey("");
    setEditingCustom(false);
  };

  /** 이름 입력 취소 — 열기 전 상태로 되돌린다. */
  const cancelName = () => {
    setEditingCustom(false);
    if (!isCustom) setCustomKey("");
  };

  const submit = () => {
    if (!finalKey || !value.trim()) return;
    onAdd(finalKey, value.trim());
    setValue("");
    setCustomKey("");
    setIsCustom(false);
    setEditingCustom(false);
    setSelectedKey(presetKeys[0] ?? "");
  };

  /**
   * 삭제 가능한 커스텀 키는 칩 **안쪽 우측**에 ×를 둔다.
   *
   * 예전에는 칩 밖에 음수 마진으로 배지를 띄웠는데, 어느 칩의 삭제인지
   * 불분명했고 IconButton으로 옮기며 박스가 커지자 글리프가 칩에서 20pt
   * 떨어져 나갔다. 안으로 넣으면 소속이 구조로 드러난다.
   *
   * ×에 paddingHorizontal 6을 줘 박스 폭을 25로 키운 이유: hitSlop 모드는 부족한 만큼을
   * 사방에 절반씩 채우므로 박스가 작을수록 hitSlop이 커진다. 박스 13이면
   * hitSlop이 15.5라 히트 영역이 라벨 오른쪽 7.5pt를 덮어 "선택하려다 삭제"가
   * 난다. 박스 25면 hitSlop이 9.5로 줄어 겹침이 1.5pt까지 내려간다.
   * 아이콘 크기(13)는 그대로다 — 커진 것은 터치 박스뿐이다.
   *
   * 패딩은 가로에만 준다. 세로로도 주면 박스가 25×25가 돼 칩 높이를
   * 29 → 41로 밀어 올린다(칩 세로 패딩 16 + 박스 25). hitSlop은 축마다
   * 따로 계산되므로 박스가 25×13이어도 히트 영역은 44×44가 된다.
   *
   * box 모드(44)를 못 쓰는 이유는 칩 높이가 29라서다.
   */
  const chip = (
    label: string,
    on: boolean,
    onPress: () => void,
    key?: string,
    onDelete?: () => void,
    deleteLabel?: string,
  ) => {
    // ×는 라벨과 같은 색을 쓴다. 선택 상태에서 배경이 바뀌어도 대비가
    // 라벨과 같이 움직여 묻히지 않는다. textMuted는 선택된 칩 위에서 흐려진다.
    const fg = on ? (sheet ? c.primary : c.surface) : c.textSecondary;
    return (
      <TouchableOpacity activeOpacity={0.8}
        key={key ?? label}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: onDelete ? 8 : 0,
          borderRadius: sheet ? 20 : 999,
          paddingLeft: sheet ? 14 : 10,
          // ×가 자기 여백을 갖고 있어 오른쪽 패딩을 줄인다.
          paddingRight: onDelete ? 8 : sheet ? 14 : 10,
          paddingVertical: sheet ? 8 : 5,
          backgroundColor: on ? (sheet ? c.primary + "28" : c.primary) : c.surfaceAlt,
        }}
        onPress={onPress}>
        <Text
          style={{
            fontSize: sheet ? 13 : 11,
            fontWeight: "700",
            color: fg,
          }}>
          {label}
        </Text>
        {onDelete && (
          <IconButton
            accessibilityLabel={deleteLabel ?? `${label} 항목 삭제`}
            onPress={onDelete}
            touchTargetMode="hitSlop"
            style={{ paddingHorizontal: 6 }}>
            <Icon name="close" size={13} color={fg} />
          </IconButton>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * 확정된 커스텀 이름은 **선택된 칩**으로 보여 준다. 아직 서버에 저장되기
   * 전이라 extraKeys 에는 없다. 탭하면 이름을 다시 고칠 수 있다.
   */
  const draftChip =
    isCustom && customKey.trim()
      ? chip(customKey.trim(), true, () => openNameInput(), "__draft__")
      : null;

  const keyChips = (
    <>
      {presetKeys.map((k) => chip(k, !isCustom && selectedKey === k, () => selectKey(k)))}
      {extraKeys.map((k) =>
        chip(
          k.name,
          !isCustom && selectedKey === k.name,
          () => selectKey(k.name),
          k.id,
          onDeleteExtraKey ? () => onDeleteExtraKey(k.id) : undefined,
          `${k.name} 항목 삭제`,
        ),
      )}
      {draftChip}
    </>
  );

  /**
   * 항목 생성 액션. **칩이 아니다.**
   *
   * 예전에는 "+ 직접 입력"이 선택지 칩들과 같은 알약 모양으로 같은 줄에 있어
   * 설정 항목 중 하나처럼 보였다. 누르면 선택 상태(파란 배경)까지 됐다.
   * 선택 UI로 생성 기능을 표현하고 있었다.
   *
   * 형태는 앱의 기존 텍스트 액션을 따른다 — 배경 없이 글자만
   * (`workout.tsx:2465`, `:3325`의 "+ 추가"와 같은 꼴).
   * primary 대신 textSecondary 를 쓰는 이유는 이 시트에 이미 primary 액션
   * ("추가하기")이 있어서다. DESIGN.md: "파란색은 예산이다."
   */
  const addKeyAction = editingCustom ? null : (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="설정 항목 추가"
      onPress={openNameInput}
      style={{ alignSelf: "flex-start", paddingVertical: 6, paddingRight: 6 }}>
      <Text style={{ fontSize: sheet ? 12 : 11, fontWeight: "700", color: c.textSecondary }}>
        + 항목 추가
      </Text>
    </TouchableOpacity>
  );

  /**
   * 이름 입력창. 예전에는 확정도 취소도 없어 한 번 열리면 빠져나갈 방법이
   * 다른 칩을 누르는 것뿐이었다(그마저 눈에 띄지 않았다).
   */
  const customKeyInput = editingCustom ? (
    <View style={{ marginTop: sheet ? 10 : 6, gap: sheet ? 8 : 6 }}>
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
          borderWidth: 1.5,
          borderColor: c.primary + "60",
        }}
        placeholder="설정 항목 이름 입력 (예: 케이블각도, 풀리높이)"
        value={customKey}
        onChangeText={setCustomKey}
        placeholderTextColor={c.textMuted}
        returnKeyType="done"
        onSubmitEditing={confirmName}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="항목 이름 입력 취소"
          onPress={cancelName}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: sheet ? 14 : 10,
            backgroundColor: c.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Text style={{ fontSize: sheet ? 14 : 12, fontWeight: "700", color: c.textSecondary }}>
            취소
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="항목 이름 확인"
          accessibilityState={{ disabled: !customKey.trim() }}
          disabled={!customKey.trim()}
          onPress={confirmName}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: sheet ? 14 : 10,
            backgroundColor: c.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: customKey.trim() ? 1 : 0.5,
          }}>
          <Text style={{ fontSize: sheet ? 14 : 12, fontWeight: "800", color: c.onAccent }}>
            확인
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  // ── inline variant (운동 중 카드) ──
  if (!sheet) {
    return (
      <View style={{ gap: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {keyChips}
            {addKeyAction}
          </View>
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
          {/* 박스 42×36 → 44×44. height 36과 paddingHorizontal 14는 뺐다 —
              IconButton의 minWidth/minHeight 44가 Yoga에서 width/height보다
              우선이라 남겨도 효과가 없다.
              ⚠️ 같은 행의 TextInput은 height 36 그대로다. alignItems: center라
              버튼만 위아래로 4씩 삐져나온다. DESIGN.md의 input도 target.min을
              참조하므로 입력창도 44가 맞아 보이지만, IconButton 교체 범위 밖이라
              건드리지 않았다. */}
          <IconButton
            accessibilityLabel="설정 값 추가"
            onPress={submit}
            variant="filled"
            style={{ backgroundColor: c.primary, borderRadius: 10 }}>
            <Icon name="check" size={14} color={c.surface} />
          </IconButton>
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
      {addKeyAction}
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
