/**
 * @file app/routine/exercise.tsx
 * @description 루틴에 종목을 추가하거나 편집한다. `?index=N` 이면 편집.
 *
 * 전에는 `routine-manage.tsx` 의 `subMode === "addExercise" | "editExercise"`
 * 였다. `ExerciseAdder` 가 화면을 통째로 대체하는데 **라우트는 그대로**여서,
 * 그 상태에서 스와이프하면 "종목 추가 취소"가 아니라 "루틴 관리 전체 닫기"가
 * 됐다. 그걸 막으려고 그 상태에서만 `gestureEnabled: false` 를 걸어 두었다.
 *
 * 라우트가 갈리면서 그 절충이 필요 없어졌다 — 여기서 스와이프하면 정확히
 * 이 단계만 취소된다.
 *
 * ── 부모로 돌아가는 경로 ─────────────────────────────────────────────────
 * 전에는 `onAdd` 콜백이 부모의 `setExercises` 를 직접 불렀다. 라우트가
 * 갈리면 콜백을 넘길 수 없으므로 **단방향**이다:
 *
 *   여기서 addDraftExercise / updateDraftExercise → router.back()
 *   edit 화면은 draft.exercises 를 구독하고 있어 자동으로 반영된다
 *
 * edit 화면은 이 왕복 동안 **스택에 살아 있다.** 그래서 edit 의 초안 준비
 * effect 는 deps 가 `[]` 여야 한다 — 다시 돌면 방금 추가한 종목이 초안
 * 재생성으로 날아간다.
 */
import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useRoutineStore } from "../../store/routineStore";
import { showCuteAlert } from "../../components/CuteAlert";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import ExerciseAdder, { ExerciseAddResult } from "../../components/workout/ExerciseAdder";

function RoutineExerciseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ index?: string }>();
  const { draft, addDraftExercise, updateDraftExercise } = useRoutineStore();

  const parsed = params.index !== undefined ? Number(params.index) : NaN;
  const editIndex = Number.isInteger(parsed) ? parsed : null;
  const target = editIndex !== null ? draft?.exercises[editIndex] : undefined;
  const isEdit = editIndex !== null && !!target;

  /**
   * ExerciseAdder 내부의 dirty. 자식 안에 있어 부모가 스스로 알 수 없다.
   * 자식의 닫기 버튼은 자식이 직접 되묻고, 이 값은 **안드로이드 뒤로가기와
   * 스와이프**용이다 — 그쪽은 버튼 핸들러를 거치지 않는다.
   * `add-workout.tsx` 가 쓰는 것과 같은 방식이다.
   */
  const [adderDirty, setAdderDirty] = useState(false);

  usePreventRemove(adderDirty, ({ data }) => {
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "작성 중인 내용이 있어요",
      message: "닫으면 입력한 내용이 사라져요.",
      buttons: [
        { label: "계속 작성", style: "soft" },
        { label: "닫기", style: "primary", onPress: () => navigation.dispatch(data.action) },
      ],
    });
  });

  const handleAdd = (data: ExerciseAddResult) => {
    const ex = {
      name: data.name,
      category: data.category,
      defaultSets: data.defaultSets ?? 3,
      // routineSets 가 있으면 세트별 목표가 구체적으로 잡힌 것이라
      // default* 단일값은 넣지 않는다. 둘 다 있으면 어느 쪽이 진짜인지 모호해진다.
      defaultWeight: data.routineSets ? undefined : data.defaultWeight,
      defaultUnit: data.routineSets ? undefined : data.defaultUnit,
      defaultReps: data.routineSets ? undefined : data.defaultReps,
      sets: data.routineSets,
      restSeconds: data.restSeconds,
      targetReps: data.targetReps,
      settings: data.settings,
      tip: data.tip,
      targetMuscles: data.targetMuscles,
      gifUrl: data.gifUrl,
      isSingleArm: data.isSingleArm,
    };
    if (isEdit) updateDraftExercise(editIndex, ex);
    else addDraftExercise(ex);
    router.back();
  };

  // 편집 대상이 사라졌다(초안이 비었거나 인덱스가 범위 밖). 되돌린다.
  if (editIndex !== null && !target) {
    return null;
  }

  return (
    <ExerciseAdder
      mode="routine"
      editMode={isEdit}
      initialExercise={
        isEdit && target
          ? {
              name: target.name,
              category: target.category,
              settings: target.settings,
              tip: target.tip,
              restSeconds: target.restSeconds,
              targetReps: target.targetReps,
              targetMuscles: target.targetMuscles,
              isSingleArm: target.isSingleArm,
              defaultSets: target.defaultSets,
              defaultWeight: target.defaultWeight,
              defaultUnit: target.defaultUnit ?? "kg",
              defaultReps: target.defaultReps,
              routineSets: target.sets,
            }
          : undefined
      }
      onAdd={handleAdd}
      onClose={() => router.back()}
      onDirtyChange={setAdderDirty}
    />
  );
}

export default function RoutineExerciseRoute() {
  return (
    <ErrorBoundary screenName="종목 추가">
      <RoutineExerciseScreen />
    </ErrorBoundary>
  );
}
