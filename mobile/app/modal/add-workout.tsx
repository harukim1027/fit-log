import React from "react";
import { } from "react-native";
import { useGoBack } from "../../hooks/useGoBack";
import { useLocalSearchParams } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useWorkoutStore } from "../../store/workoutStore";
import { useRoutineStore } from "../../store/routineStore";
import { showCuteAlert } from "../../components/CuteAlert";
import ExerciseAdder, { ExerciseAddResult } from "../../components/workout/ExerciseAdder";
import { Exercise } from "../../types/workout";

export default function AddWorkoutModal() {
  // 진입점은 운동 탭이다. 딥링크로 직접 열리면 스택이 비어 그쪽으로 보낸다.
  const goBack = useGoBack("/(tabs)/workout");
  const navigation = useNavigation();
  /**
   * ExerciseAdder 의 닫기 버튼은 자식이 직접 되묻는다. 여기서 막는 것은
   * **안드로이드 하드웨어 뒤로가기**다 — 그쪽은 버튼 핸들러를 거치지 않고
   * 라우트를 바로 pop 한다.
   */
  const [adderDirty, setAdderDirty] = React.useState(false);
  usePreventRemove(adderDirty, ({ data }) => {
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
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    });
  });
  const params = useLocalSearchParams<{
    editMode?: string;
    exerciseId?: string;
    exerciseData?: string;
    date?: string;
    sessionId?: string;
  }>();
  const { addExercise, addSet, removeSet, updateExercise, activeSession, createSessionForDate, updateSession, sessions } = useWorkoutStore();

  const isEditMode = params.editMode === 'true';
  const editExercise = isEditMode && params.exerciseData
    ? (() => { try { return JSON.parse(params.exerciseData!); } catch { return null; } })()
    : null;

  // 과거 날짜 직접 추가 모드
  const targetDate = params.date;
  const sessionId = params.sessionId;
  const isHistoricalMode = Boolean(targetDate);

  const buildExercise = (data: ExerciseAddResult): Exercise => {
    const exId = `hist-${Date.now()}`;
    return {
      id: exId,
      name: data.name,
      category: data.category,
      settings: data.settings,
      tip: data.tip,
      isSingleArm: data.isSingleArm ?? false,
      targetMuscles: data.targetMuscles,
      restSeconds: data.restSeconds,
      targetReps: data.targetReps,
      sets: (data.sets ?? []).map((st, i) => ({
        id: `${exId}-${i}`,
        weight: st.weight,
        reps: st.reps,
        completed: st.completed ?? false,
      })),
    };
  };

  const handleHistoricalAdd = async (data: ExerciseAddResult) => {
    const exercise = buildExercise(data);
    try {
      if (sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          await updateSession(sessionId, [...session.exercises, exercise]);
        }
      } else {
        await createSessionForDate(targetDate!, [exercise]);
      }
      goBack();
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '저장 실패', message: '다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };

  const handleAdd = (data: ExerciseAddResult) => {
    if (isHistoricalMode) {
      handleHistoricalAdd(data);
      return;
    }
    if (!activeSession) { showCuteAlert({ icon: 'alert', tone: 'warn', title: '운동 세션을 먼저 시작해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const exId = Date.now().toString();
    addExercise({
      id: exId,
      name: data.name,
      category: data.category,
      settings: data.settings,
      tip: data.tip,
      isSingleArm: data.isSingleArm,
      targetMuscles: data.targetMuscles,
      restSeconds: data.restSeconds,
      targetReps: data.targetReps,
    });
    (data.sets ?? []).forEach((st, i) => {
      addSet(exId, {
        id: `${exId}-${i}`,
        weight: st.weight,
        reps: st.reps,
        completed: st.completed ?? false,
        unit: st.unit ?? 'kg',
      });
    });

    // 루틴으로 시작한 세션이고, 추가한 운동이 루틴에 없으면 즉시 반영 여부 질문
    const fromRoutineId = activeSession.fromRoutineId;
    if (fromRoutineId) {
      const routine = useRoutineStore.getState().routines.find(r => r.id === fromRoutineId);
      if (routine && !routine.exercises.find(e => e.name === data.name)) {
        showCuteAlert({
          icon: 'pencil',
          tone: 'info',
          title: '루틴에도 추가할까요?',
          message: `${data.name}을(를) 루틴에 추가하면\n다음에도 바로 시작할 수 있어요`,
          buttons: [
            { label: '이번만', style: 'soft' },
            {
              label: '루틴에 추가',
              style: 'primary',
              onPress: () => {
                const currentSession = useWorkoutStore.getState().activeSession;
                if (currentSession) {
                  useRoutineStore.getState().updateRoutineFromSession(fromRoutineId, currentSession);
                }
              },
            },
          ],
        });
      }
    }
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
        reps: st.reps,
        completed: st.completed ?? false,
        unit: st.unit ?? 'kg',
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
      onClose={goBack}
      onDirtyChange={setAdderDirty}
    />
  );
}
