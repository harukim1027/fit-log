import React from "react";
import { Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useWorkoutStore } from "../../store/workoutStore";
import { WorkoutSet } from "../../types/workout";
import ExerciseAdder, { ExerciseAddResult } from "../../components/workout/ExerciseAdder";

export default function AddWorkoutModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editMode?: string;
    exerciseId?: string;
    exerciseData?: string;
  }>();
  const { addExercise, addSet, removeSet, updateExercise, activeSession } = useWorkoutStore();

  const isEditMode = params.editMode === 'true';
  const editExercise = isEditMode && params.exerciseData
    ? (() => { try { return JSON.parse(params.exerciseData!); } catch { return null; } })()
    : null;

  const handleAdd = (data: ExerciseAddResult) => {
    if (!activeSession) return Alert.alert("운동 세션을 먼저 시작해주세요");
    const exId = Date.now().toString();
    addExercise({
      id: exId,
      name: data.name,
      category: data.category,
      settings: data.settings,
      tip: data.tip,
      isSingleArm: data.isSingleArm,
      differentSides: data.differentSides,
      targetMuscles: data.targetMuscles,
      restSeconds: data.restSeconds,
      targetReps: data.targetReps,
    });
    (data.sets ?? []).forEach((st, i) => {
      addSet(exId, {
        id: `${exId}-${i}`,
        weight: st.weight,
        weightR: st.weightR,
        reps: st.reps,
        completed: false,
      });
    });
    // router.back() 호출 안 함 — ExerciseAdder가 성공 애니메이션 후 onClose로 닫음
  };

  const handleEditComplete = (data: ExerciseAddResult) => {
    const exId = params.exerciseId!;
    updateExercise(exId, {
      name: data.name,
      category: data.category,
      settings: data.settings,
      tip: data.tip,
      isSingleArm: data.isSingleArm,
      differentSides: data.differentSides,
      targetMuscles: data.targetMuscles,
      restSeconds: data.restSeconds,
      targetReps: data.targetReps,
    });
    const currentEx = useWorkoutStore.getState().activeSession?.exercises.find(e => e.id === exId);
    if (currentEx) {
      currentEx.sets.forEach(s => removeSet(exId, s.id));
    }
    (data.sets ?? []).forEach((st, i) => {
      addSet(exId, {
        id: `${exId}-edit-${Date.now()}-${i}`,
        weight: st.weight,
        weightR: st.weightR,
        reps: st.reps,
        completed: false,
      });
    });
    // router.back() 호출 안 함 — ExerciseAdder가 성공 애니메이션 후 onClose로 닫음
  };

  return (
    <ExerciseAdder
      mode="session"
      editMode={isEditMode}
      initialExercise={editExercise ?? undefined}
      onAdd={isEditMode ? handleEditComplete : handleAdd}
      onClose={() => router.back()}
    />
  );
}
