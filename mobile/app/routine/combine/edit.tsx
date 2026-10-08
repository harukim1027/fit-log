/**
 * @file app/routine/combine/edit.tsx
 * @description 합쳐진 종목 정리. 합치기 흐름의 2단계.
 *
 * 전에는 `routine-manage.tsx` 의 `mode === "combine-edit"` 였다.
 * 뒤로 가면 선택 화면(`combine/index`)으로 돌아간다 — 스택이라 그냥 pop 이다.
 *
 * 합쳐진 결과는 `routineStore.draft`(kind: "combine")에 있다. 앞 단계가
 * `beginDraft` 로 만들어 두고 여기로 보낸다. 저장할 원본 루틴 ids 는
 * `draft.sourceIds` 다.
 */
import React, { useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useRoutineStore } from "../../../store/routineStore";
import type { CombineExercise } from "../../../store/routineStore";
import { useColors } from "../../../constants/colors";
import { useThemeStore } from "../../../store/themeStore";
import { useKeyboardHeight } from "../../../hooks/useKeyboardHeight";
import { SortableList } from "../../../components/ui";
import { Header, IconButton } from "../../../design-system";
import { Icon } from "../../../components/AppIcons";
import { showCuteAlert } from "../../../components/CuteAlert";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { fmtMeta, EXERCISE_ITEM_H, LIGHT_SHADOW_SM } from "../_helpers";

function CombineEditScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;
  const keyboardHeight = useKeyboardHeight();

  const {
    draft,
    patchDraft,
    setDraftExercises,
    removeDraftExercise,
    clearDraft,
    isDraftDirty,
    combineRoutines,
  } = useRoutineStore();

  const combineScrollRef = useRef<ScrollView>(null);
  const combineScrollOffset = useRef(0);

  const setName = (v: string) => patchDraft({ name: v });

  usePreventRemove(isDraftDirty(), ({ data }) => {
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "작성 중인 내용이 있어요",
      message: "닫으면 입력한 내용이 사라져요.",
      buttons: [
        { label: "계속 작성", style: "soft" },
        {
          label: "닫기",
          style: "primary",
          onPress: () => {
            clearDraft();
            navigation.dispatch(data.action);
          },
        },
      ],
    });
  });

  const handleCombineSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      showCuteAlert({ icon: "pencil", tone: "info", title: "루틴 이름을 입력해주세요", buttons: [{ label: "확인", style: "primary" }] });
      return;
    }
    if (draft.exercises.length === 0) {
      showCuteAlert({ icon: "pencil", tone: "info", title: "최소 1개 종목이 필요해요", buttons: [{ label: "확인", style: "primary" }] });
      return;
    }
    const payload = draft.exercises.map(
      ({ gifUrl, key, fromRoutineName, isDuplicate, ...rest }: any) => rest,
    );
    await combineRoutines(draft.sourceIds, draft.name.trim(), payload);
    // 저장됐으므로 초안을 버린다. dismissAll 앞에 둬야 usePreventRemove 가
    // dirty 로 보고 확인창을 띄우지 않는다.
    clearDraft();
    // 선택 화면까지 함께 닫고 목록으로 돌아간다 — 합치기가 끝났는데
    // 뒤로가기로 선택 화면이 다시 나오면 이미 사라진 루틴들이 보인다.
    router.dismissTo("/routine");
  };

  // 앞 단계 없이 직접 들어온 경우(딥링크 등). 그릴 것이 없다.
  if (!draft) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  /**
   * 초안의 종목은 이 흐름에서 CombineExercise 다 — 앞 단계가 출처
   * (fromRoutineName)와 중복 표시(isDuplicate)를 붙여 넣는다.
   * RoutineDraft.exercises 는 두 흐름이 공유하는 타입이라 좁은 쪽으로 본다.
   */
  const items = draft.exercises as CombineExercise[];

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.background }}
        edges={["bottom"]}>
        <Header
          title="루틴 결합 편집"
          showBack
        />
        <ScrollView
          ref={combineScrollRef}
          onScroll={(e) => { combineScrollOffset.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
          style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: c.textSecondary,
                marginBottom: 8,
              }}>
              새 루틴 이름
            </Text>
            <TextInput
              style={[
                {
                  backgroundColor: c.surface,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  fontWeight: "600",
                  color: c.textPrimary,
                  marginBottom: 20,
                },
                SHADOW,
              ]}
              value={draft.name}
              onChangeText={setName}
              placeholder="결합된 루틴 이름"
              placeholderTextColor={c.textMuted}
              returnKeyType="done"
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: c.textSecondary,
                marginBottom: 6,
              }}>
              종목 목록 ({items.length}개) — 꾹 눌러 순서 변경
            </Text>
            <SortableList
              data={items}
              keyExtractor={(ex) => ex.key}
              itemHeight={EXERCISE_ITEM_H}
              scrollRef={combineScrollRef}
              scrollOffsetRef={combineScrollOffset}
              onDragStart={() => combineScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
              onDragRelease={() => combineScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
              onDragEnd={setDraftExercises}
              renderItem={(ex, idx) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    // 다크 버그 수정: "#FFF3CD"는 라이트 전용 크림색이라 다크 배경에서 튀었다
                      backgroundColor: ex.isDuplicate ? c.warning + "18" : c.surfaceAlt,
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 8,
                    gap: 10,
                    flex: 1,
                  }}>
                  <Icon name="menu" size={16} color={c.textMuted} />
                  {ex.gifUrl && (
                    <Image
                      source={{ uri: ex.gifUrl }}
                      style={{ width: 36, height: 36, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        flexWrap: "wrap",
                      }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: c.textPrimary,
                          flexShrink: 1,
                        }}>
                        {ex.name}
                      </Text>
                      {ex.isDuplicate && (
                        <View
                          style={{
                            backgroundColor: c.warning,
                            borderRadius: 999,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                          }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: c.onAccent,
                            }}>
                            중복
                          </Text>
                        </View>
                      )}
                      {fmtMeta(ex.targetReps, ex.restSeconds) !== null && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: c.textSecondary,
                            fontWeight: "700",
                          }}>
                          {fmtMeta(ex.targetReps, ex.restSeconds)}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: c.textSecondary,
                        fontWeight: "700",
                        marginTop: 1,
                      }}>
                      {ex.fromRoutineName} · {ex.defaultSets}세트
                    </Text>
                    {(ex.targetMuscles?.length ?? 0) > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {ex.targetMuscles!.map((m, mi) => (
                          <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <IconButton
                    accessibilityLabel={`${ex.name} 제외`}
                    onPress={() => removeDraftExercise(idx)}>
                    <Icon name="close" size={15} color={c.textMuted} />
                  </IconButton>
                </View>
              )}
            />
            <TouchableOpacity
              style={{
                backgroundColor: c.secondary,
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
              }}
              onPress={handleCombineSave}
              activeOpacity={0.7}>
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>
                결합 루틴 저장
              </Text>
            </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function CombineEditRoute() {
  return (
    <ErrorBoundary screenName="루틴 합치기">
      <CombineEditScreen />
    </ErrorBoundary>
  );
}
