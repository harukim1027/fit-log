/**
 * @file app/modal/add-exercises.tsx
 * @description 수동 운동 추가 모달.
 *
 * 기존 ExerciseAdder(이름+카테고리 picker)로 종목을 고르고, ExerciseEditor로 세트를
 * 편집한 뒤 한 번에 저장한다. 저장은 nlLogStore.addManual → 백엔드 코어(source 'manual').
 * sessionId 파라미터가 있으면 그 세션(예: NL이 만든 오늘 세션)에 누적한다.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '../../constants/colors';
import { Icon } from '../../components/AppIcons';
import { NumberPad } from '../../components/ui';
import { showCuteAlert } from '../../components/CuteAlert';
import ExerciseAdder, {
  ExerciseAddResult,
} from '../../components/workout/ExerciseAdder';
import { ExerciseEditor } from '../../components/workout/ExerciseEditor';
import { useNLLogStore } from '../../store/nlLogStore';
import { ExerciseDraft } from '../../types/exercise';

type PadCfg = {
  value: string;
  decimal?: boolean;
  suffix?: string;
  onConfirm: (v: string) => void;
};

const toDraft = (r: ExerciseAddResult): ExerciseDraft => ({
  name: r.name,
  category: r.category,
  targetMuscles: r.targetMuscles,
  sets:
    r.sets && r.sets.length
      ? r.sets.map((s) => ({
          weight: s.weight ?? 0,
          reps: s.reps ?? 0,
          unit: s.unit ?? 'kg',
          completed: true,
        }))
      : [{ weight: 0, reps: 0, unit: 'kg', completed: true }],
});

export default function AddExercisesScreen() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const addManual = useNLLogStore((s) => s.addManual);

  const [drafts, setDrafts] = useState<ExerciseDraft[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  // picker가 신규 추가용인지(null) 특정 종목 교체용인지(index)
  const [pickTarget, setPickTarget] = useState<number | null>(null);
  const [padCfg, setPadCfg] = useState<PadCfg | null>(null);
  const [saving, setSaving] = useState(false);

  const openPicker = (target: number | null) => {
    setPickTarget(target);
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    setPickTarget(null);
  };

  // 선택만 반영 — 닫기는 ExerciseAdder가 성공 애니메이션 후 onClose로 처리
  const handlePicked = (r: ExerciseAddResult) => {
    setDrafts((prev) => {
      if (pickTarget === null) return [...prev, toDraft(r)];
      // 교체: 기존 세트는 유지하고 이름/카테고리만 갱신
      return prev.map((d, i) =>
        i === pickTarget
          ? { ...d, name: r.name, category: r.category, targetMuscles: r.targetMuscles }
          : d,
      );
    });
  };

  const handleSave = async () => {
    const valid = drafts.filter((d) => d.name.trim());
    if (valid.length === 0) {
      showCuteAlert({
        icon: 'alert',
        tone: 'info',
        title: '추가할 운동이 없어요',
        message: '종목을 하나 이상 선택해 주세요',
        buttons: [{ label: '확인', style: 'primary' }],
      });
      return;
    }
    setSaving(true);
    try {
      await addManual(
        valid.map((d) => ({
          name: d.name,
          category: d.category,
          targetMuscles: d.targetMuscles,
          sets: d.sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            unit: s.unit,
            completed: true,
          })),
        })),
        params.sessionId,
      );
      router.back();
    } catch {
      showCuteAlert({
        icon: 'alert',
        tone: 'danger',
        title: '저장에 실패했어요',
        message: '잠시 후 다시 시도해 주세요',
        buttons: [{ label: '확인', style: 'primary' }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '900', color: c.textPrimary }}>운동 추가</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {drafts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center' }}>
              "종목 추가"로 운동을 골라{'\n'}오늘 기록에 바로 더해보세요
            </Text>
          </View>
        ) : (
          drafts.map((d, i) => (
            <ExerciseEditor
              key={i}
              value={d}
              mode="manual"
              onChange={(next) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
              onPickExercise={() => openPicker(i)}
              openPad={(cfg) => setPadCfg(cfg)}
            />
          ))
        )}

        <TouchableOpacity
          onPress={() => openPicker(null)}
          style={{
            marginTop: 4,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: c.primary,
            borderStyle: 'dashed',
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: c.primary }}>+ 종목 추가</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 하단 고정 저장 */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: c.background }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: saving ? c.textMuted : c.primary,
            alignItems: 'center',
          }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: c.onAccent }}>
            {saving ? '저장 중…' : '저장'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 운동 picker (기존 ExerciseAdder 재사용 — full-screen이라 Modal로 오버레이) */}
      <Modal visible={showPicker} animationType="slide" onRequestClose={closePicker}>
        <ExerciseAdder mode="session" onAdd={handlePicked} onClose={closePicker} />
      </Modal>

      <NumberPad
        visible={padCfg !== null}
        value={padCfg?.value ?? '0'}
        decimal={padCfg?.decimal ?? true}
        suffix={padCfg?.suffix}
        onConfirm={(v) => {
          padCfg?.onConfirm(v);
          setPadCfg(null);
        }}
        onCancel={() => setPadCfg(null)}
      />
    </SafeAreaView>
  );
}
