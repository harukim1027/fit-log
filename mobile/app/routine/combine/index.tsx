/**
 * @file app/routine/combine/index.tsx
 * @description 합칠 루틴 고르기. 합치기 흐름의 1단계.
 *
 * 전에는 `routine-manage.tsx` 의 `mode === "combine-select"` 였다.
 * 2단계(`combine/edit`)와 모드로 이어져 있어서, 정리 화면에서 뒤로 가면
 * 선택 화면이 아니라 목록으로 튀는 일이 없도록 버튼 가드가 따로 필요했다.
 * 스택이 되면서 그 자리에서 뒤로가기가 곧 "선택으로 돌아가기"다.
 *
 * 선택 상태(selectedIds)는 이 화면의 로컬이다. 초안이 아니다 — 아직
 * 아무것도 만들지 않았고, 다음 단계에서 초안이 만들어진다.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useRoutineStore } from "../../../store/routineStore";
import type { CombineExercise } from "../../../store/routineStore";
import { useColors } from "../../../constants/colors";
import { useThemeStore } from "../../../store/themeStore";
import { Header } from "../../../design-system";
import { Icon } from "../../../components/AppIcons";
import { showCuteAlert } from "../../../components/CuteAlert";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import { LIGHT_SHADOW_SM } from "../_helpers";

function CombineSelectScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;

  const { routines, beginDraft } = useRoutineStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * 고르기만 한 상태에서 나가려 하면 되묻는다. 저장되는 것은 없지만
   * 여러 개를 골라 둔 것이 사라지므로 사용자에겐 잃는 것이 있다.
   */
  usePreventRemove(selectedIds.size > 0, ({ data }) => {
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "선택한 루틴이 있어요",
      message: "닫으면 선택이 사라져요.",
      buttons: [
        { label: "계속 고르기", style: "soft" },
        { label: "닫기", style: "primary", onPress: () => navigation.dispatch(data.action) },
      ],
    });
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /**
   * 고른 루틴들의 종목을 합쳐 초안을 만들고 다음 단계로 보낸다.
   * 중복 이름은 지우지 않고 `isDuplicate` 로 표시만 한다 — 지울지는
   * 사용자가 다음 화면에서 정한다.
   */
  const enterCombineEdit = () => {
    const selected = routines.filter((r) => selectedIds.has(r.id));
    const seen = new Set<string>();
    const merged: CombineExercise[] = [];
    selected.forEach((r) => {
      r.exercises.forEach((ex, i) => {
        merged.push({
          ...ex,
          key: `${r.id}-${i}-${Date.now()}`,
          fromRoutineName: r.name,
          isDuplicate: seen.has(ex.name),
        });
        seen.add(ex.name);
      });
    });
    beginDraft({
      kind: "combine",
      id: null,
      name: selected.map((r) => r.name).join(" + "),
      color: selected[0]?.color ?? c.primary,
      exercises: merged,
      sourceIds: Array.from(selectedIds),
    });
    router.push("/routine/combine/edit");
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["bottom"]}>
      <Header
        title="루틴 결합"
        showClose
        showBack
      />
      <Text
        style={{
          fontSize: 14,
          color: c.textSecondary,
          fontWeight: "600",
          textAlign: "center",
          paddingVertical: 8,
        }}>
        결합할 루틴을 2개 이상 선택하세요
      </Text>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {routines.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: selectedIds.has(r.id) ? c.border : c.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                borderWidth: selectedIds.has(r.id) ? 2 : 0,
                borderColor: c.primary,
              },
              SHADOW,
            ]}
            onPress={() => toggleSelect(r.id)}
            activeOpacity={0.7}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 10,
                backgroundColor: selectedIds.has(r.id)
                  ? c.primary
                  : c.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
              }}>
              {selectedIds.has(r.id) && (
                <Icon name="check" size={14} color={c.surface} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>
                {r.name}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: c.textSecondary,
                  fontWeight: "600",
                  marginTop: 2,
                }}>
                {r.exercises.length}종목
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {selectedIds.size >= 2 && (
        <View
          style={{ position: "absolute", bottom: 32, left: 20, right: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: c.secondary,
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
            onPress={enterCombineEdit}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>
              {selectedIds.size}개 루틴 결합하기 →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function CombineSelectRoute() {
  return (
    <ErrorBoundary screenName="루틴 합치기">
      <CombineSelectScreen />
    </ErrorBoundary>
  );
}
