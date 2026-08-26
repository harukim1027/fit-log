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
import { showCuteAlert } from "../CuteAlert";
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
  /** 이름 입력창이 열려 있는가 */
  const [editingCustom, setEditingCustom] = useState(false);
  /** 입력창에 치고 있는 글자 */
  const [newKeyText, setNewKeyText] = useState("");
  /**
   * 이번 화면에서 만든, 아직 서버에 저장되기 전인 항목들.
   *
   * 예전에는 `customKey` 문자열 하나가 "초안"이자 "현재 선택"을 겸했다.
   * 그래서 초안을 하나밖에 못 만들었고, 확인을 눌러도 글자가 남아 다음 항목을
   * 만들려면 손으로 지워야 했다. 목록으로 바꾸니 그 두 문제가 같이 없어지고,
   * 초안도 프리셋·저장된 커스텀과 똑같이 `selectedKey` 하나로 다뤄진다.
   */
  const [draftKeys, setDraftKeys] = useState<string[]>([]);
  const [keyError, setKeyError] = useState("");
  const [value, setValue] = useState("");
  const customRef = useRef<TextInput>(null);

  const sheet = variant === "sheet";
  const finalKey = selectedKey;

  const selectKey = (k: string) => {
    setEditingCustom(false);
    setSelectedKey(k);
  };

  /** 이미 있는 이름인가 — 프리셋·저장된 커스텀·이번에 만든 초안 전부와 대조. */
  const existingKeys = [
    ...presetKeys,
    ...extraKeys.map((k) => k.name),
    ...draftKeys,
  ];

  /** "+ 항목 추가" — 입력창만 연다. 이 버튼은 선택 상태를 갖지 않는다. */
  const openNameInput = () => {
    setNewKeyText("");
    setKeyError("");
    setEditingCustom(true);
    setTimeout(() => customRef.current?.focus(), 100);
  };

  /**
   * 이름 확정 — 항목을 만들고 **입력 상태를 완전히 초기화**한다.
   * 글자를 비우고 입력창을 닫아, 곧바로 "+ 항목 추가"를 다시 눌러
   * 다음 항목을 만들 수 있게 한다.
   */
  const confirmName = () => {
    const v = newKeyText.trim();
    if (!v) return;
    if (existingKeys.some((k) => k.toLowerCase() === v.toLowerCase())) {
      setKeyError("이미 있는 항목이에요");
      return;
    }
    setDraftKeys((prev) => [...prev, v]);
    setSelectedKey(v);
    setNewKeyText("");
    setKeyError("");
    setEditingCustom(false);
  };

  /** 취소 — 확인과 같이 비우고 닫는다. */
  const cancelName = () => {
    setNewKeyText("");
    setKeyError("");
    setEditingCustom(false);
  };

  const submit = () => {
    if (!finalKey || !value.trim()) return;
    onAdd(finalKey, value.trim());
    setValue("");
    // 값이 붙었으니 초안의 역할은 끝났다. 시트 변형에서는 부모가 이 키를
    // 서버에 저장해 extraKeys 로 돌려준다.
    setDraftKeys([]);
    setNewKeyText("");
    setEditingCustom(false);
    setSelectedKey(presetKeys[0] ?? "");
  };

  /**
   * 커스텀 항목 삭제는 **길게 누르기**다.
   *
   * 칩 안에 ×를 두는 방식을 거쳐 왔는데, 44 터치 영역을 hitSlop으로 채우면
   * 히트 영역이 라벨 쪽으로 번져 "선택하려다 삭제"가 날 여지가 남았다.
   * 길게 누르기는 그 겹침을 시간 축으로 옮겨 없앤다.
   *
   * 그래서 커스텀 칩과 기본 칩의 렌더 구조가 완전히 같다. 다른 것은
   * `onLongPress`와 `accessibilityHint`가 붙는지뿐이다.
   *
   * RN Touchable은 `onLongPress`가 발동하면 뗄 때 `onPress`를 부르지 않는다.
   * 길게 눌렀다 떼어도 선택이 함께 실행되지 않는다.
   */
  const chip = (
    label: string,
    on: boolean,
    onPress: () => void,
    key?: string,
    onLongPress?: () => void,
    a11yHint?: string,
  ) => (
    <TouchableOpacity activeOpacity={0.8}
      key={key ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityHint={a11yHint}
      style={{
        borderRadius: sheet ? 20 : 999,
        paddingHorizontal: sheet ? 14 : 10,
        paddingVertical: sheet ? 8 : 5,
        backgroundColor: on ? (sheet ? c.primary + "28" : c.primary) : c.surfaceAlt,
      }}
      onPress={onPress}
      onLongPress={onLongPress}>
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

  /**
   * 선택 중인 항목이 지워지면 선택을 풀고 값도 비운다. 남겨 두면 사라진
   * 항목에 값을 적어 넣는 상태가 된다.
   */
  const clearIfSelected = (name: string) => {
    if (selectedKey !== name) return;
    setSelectedKey("");
    setValue("");
  };

  /**
   * 삭제 확인. 파괴적 액션이라 확인 다이얼로그를 반드시 거친다(DESIGN.md).
   * 형태는 앱의 기존 삭제 확인 3건과 같다 — showCuteAlert + icon "trash"
   * + tone "danger" + [취소 soft, 삭제 primary].
   * (CuteAlert의 버튼 style은 "primary" | "soft" 둘뿐이라 destructive가 없다.
   *  파괴성은 tone과 아이콘이 진다.)
   */
  const confirmDelete = (name: string, remove: () => void) => {
    showCuteAlert({
      icon: "trash",
      tone: "danger",
      title: "삭제할까요?",
      message: `'${name}' 항목을 삭제합니다.`,
      buttons: [
        { label: "취소", style: "soft" },
        {
          label: "삭제",
          style: "primary",
          onPress: () => { remove(); clearIfSelected(name); },
        },
      ],
    });
  };

  /**
   * 이번에 만든 초안 항목들. 아직 서버에 없으므로 extraKeys 와 별개다.
   * 선택은 다른 칩과 똑같이 selectedKey 로 다루고, 길게 눌러 지운다.
   */
  const draftChips = draftKeys.map((k) =>
    chip(
      k,
      selectedKey === k,
      () => selectKey(k),
      `__draft__${k}`,
      () => confirmDelete(k, () => setDraftKeys((prev) => prev.filter((x) => x !== k))),
      "길게 눌러 삭제할 수 있습니다",
    ),
  );

  const keyChips = (
    <>
      {presetKeys.map((k) => chip(k, selectedKey === k, () => selectKey(k)))}
      {extraKeys.map((k) =>
        chip(
          k.name,
          selectedKey === k.name,
          () => selectKey(k.name),
          k.id,
          onDeleteExtraKey
            ? () => confirmDelete(k.name, () => onDeleteExtraKey(k.id))
            : undefined,
          onDeleteExtraKey ? "길게 눌러 삭제할 수 있습니다" : undefined,
        ),
      )}
      {draftChips}
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
   * 이름 입력창. **보조 입력이므로 주 액션보다 작아야 한다.**
   *
   * 행 구성은 앱에 이미 있는 인라인 입력 패턴을 따른다 —
   * `TargetMuscleSelector.tsx:232`의 `[입력창 flex:1][작은 추가 버튼]` **두 칸**.
   * 취소 ×를 세 번째 칸으로 두었더니 한 덩어리로 안 읽히고 오른쪽 여백을
   * 많이 먹어서, 입력창 **안쪽** 우측으로 넣었다. 행은 두 칸 그대로다.
   *
   * 취소도 확인과 똑같이 글자를 비우고 창을 닫는다. 둘의 뒷정리가 다르면
   * "취소했는데 글자가 남아 있는" 상태가 생긴다.
   */
  const customKeyInput = editingCustom ? (
    <View style={{ marginTop: sheet ? 8 : 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <TextInput
            ref={customRef}
            style={{
              minHeight: 44,
              backgroundColor: c.surfaceAlt,
              borderRadius: 12,
              paddingLeft: 12,
              // 안쪽 × 자리
              paddingRight: 44,
              fontSize: 13,
              fontWeight: "700",
              color: c.textPrimary,
              borderWidth: keyError ? 1.5 : 0,
              borderColor: keyError ? c.danger : undefined,
            }}
            placeholder="항목 이름 (예: 케이블각도)"
            value={newKeyText}
            onChangeText={(t) => { setNewKeyText(t); if (keyError) setKeyError(""); }}
            placeholderTextColor={c.textMuted}
            returnKeyType="done"
            onSubmitEditing={confirmName}
          />
          <View style={{ position: "absolute", right: 0 }}>
            <IconButton accessibilityLabel="항목 이름 입력 취소" onPress={cancelName}>
              <Icon name="close" size={16} color={c.textSecondary} />
            </IconButton>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="항목 이름 확인"
          accessibilityState={{ disabled: !newKeyText.trim() }}
          disabled={!newKeyText.trim()}
          onPress={confirmName}
          style={{
            minHeight: 44,
            justifyContent: "center",
            backgroundColor: c.primary,
            borderRadius: 12,
            paddingHorizontal: 14,
            opacity: newKeyText.trim() ? 1 : 0.5,
          }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.onAccent }}>확인</Text>
        </TouchableOpacity>
      </View>
      {/* 안내 문구는 앱의 인라인 필드 에러 패턴을 따른다 (ExerciseAdder:767). */}
      {!!keyError && (
        <Text style={{ fontSize: 11, color: c.danger, marginTop: 4 }}>{keyError}</Text>
      )}
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
