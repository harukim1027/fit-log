/**
 * @file components/workout/UnmatchedResolver.tsx
 * @description NL 파싱이 카탈로그 매칭에 실패한(unmatched) 종목을 사용자가 picker로
 *              확정해 저장하는 모달. ExerciseEditor를 nl-review 모드로 재사용한다.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../constants/colors';
import { Icon } from '../AppIcons';
import { NumberPad } from '../ui';
import ExerciseAdder, { ExerciseAddResult } from './ExerciseAdder';
import { ExerciseEditor } from './ExerciseEditor';
import { useNLLogStore } from '../../store/nlLogStore';
import { ExerciseDraft, UnmatchedExercise } from '../../types/exercise';

type PadCfg = {
  value: string;
  decimal?: boolean;
  suffix?: string;
  onConfirm: (v: string) => void;
};

const fromUnmatched = (u: UnmatchedExercise): ExerciseDraft => {
  const count = u.sets && u.sets > 0 ? u.sets : 1;
  return {
    name: '',
    category: '',
    rawName: u.name,
    sets: Array.from({ length: count }, () => ({
      weight: u.weight_kg ?? 0,
      reps: u.reps ?? 0,
      unit: 'kg' as const,
      completed: true,
    })),
  };
};

export function UnmatchedResolver({
  unmatched,
  sessionId,
  onClose,
}: {
  unmatched: UnmatchedExercise[];
  sessionId?: string;
  onClose: () => void;
}) {
  const c = useColors();
  const addManual = useNLLogStore((s) => s.addManual);
  const [drafts, setDrafts] = useState<ExerciseDraft[]>(unmatched.map(fromUnmatched));
  const [pickTarget, setPickTarget] = useState<number | null>(null);
  const [padCfg, setPadCfg] = useState<PadCfg | null>(null);
  const [saving, setSaving] = useState(false);

  // 선택만 반영 — 닫기는 ExerciseAdder가 onClose로 처리
  const handlePicked = (r: ExerciseAddResult) => {
    const idx = pickTarget;
    if (idx === null) return;
    setDrafts((prev) =>
      prev.map((d, i) =>
        i === idx ? { ...d, name: r.name, category: r.category, targetMuscles: r.targetMuscles } : d,
      ),
    );
  };

  const handleSave = async () => {
    const resolved = drafts.filter((d) => d.name.trim());
    if (resolved.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await addManual(
        resolved.map((d) => ({
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
        sessionId,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top', 'bottom']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '900', color: c.textPrimary }}>운동 선택</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 12 }}>
            매칭하지 못한 운동이에요. 어떤 운동인지 선택해 주세요.
          </Text>
          {drafts.map((d, i) => (
            <ExerciseEditor
              key={i}
              value={d}
              mode="nl-review"
              onChange={(next) => setDrafts((prev) => prev.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
              onPickExercise={() => setPickTarget(i)}
              openPad={(cfg) => setPadCfg(cfg)}
            />
          ))}
        </ScrollView>

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

        <Modal visible={pickTarget !== null} animationType="slide" onRequestClose={() => setPickTarget(null)}>
          <ExerciseAdder mode="session" onAdd={handlePicked} onClose={() => setPickTarget(null)} />
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
    </Modal>
  );
}
