/**
 * @file components/workout/ExerciseEditor.tsx
 * @description NL/수동 공용 종목 편집기 (이름+카테고리 기반).
 *
 * - mode='manual'  : picker로 고른 운동 + 세트 편집
 * - mode='nl-review': AI 추정 종목. 미매칭(unmatched)이면 "운동 선택 필요" 상태로 노출,
 *                     picker로 매칭하면 저장 가능. 상단에 원문(rawName) + "AI 추정" 뱃지.
 *
 * 세트 값 편집은 부모가 내려준 openPad(NumberPad 호스트)로 처리한다.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColors } from '../../constants/colors';
import { useCategoryColor } from '../../store/categoryColorStore';
import { SetInputRow } from './SetInputRow';
import { ExerciseDraft, SetDraft } from '../../types/exercise';

export interface ExerciseEditorProps {
  value: ExerciseDraft;
  onChange: (next: ExerciseDraft) => void;
  onRemove: () => void;
  mode: 'manual' | 'nl-review';
  /** picker 열기 (운동 선택/변경). nl-review 미매칭 시 필수 동작. */
  onPickExercise?: () => void;
  /** NumberPad 열기 (부모가 호스팅) */
  openPad?: (cfg: {
    value: string;
    decimal?: boolean;
    suffix?: string;
    onConfirm: (v: string) => void;
  }) => void;
}

const clamp = (n: number, min = 0) => (n < min ? min : n);

export function ExerciseEditor({
  value,
  onChange,
  onRemove,
  mode,
  onPickExercise,
  openPad,
}: ExerciseEditorProps) {
  const c = useColors();
  const getColor = useCategoryColor();
  const assigned = !!value.name?.trim();
  const unit = value.sets[0]?.unit ?? 'kg';

  const setSets = (sets: SetDraft[]) => onChange({ ...value, sets });

  const updateSet = (i: number, patch: Partial<SetDraft>) =>
    setSets(value.sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addSet = () => {
    const last = value.sets[value.sets.length - 1];
    setSets([
      ...value.sets,
      {
        weight: last?.weight ?? 0,
        reps: last?.reps ?? 0,
        unit: last?.unit ?? 'kg',
        completed: true,
      },
    ]);
  };

  const removeSet = (i: number) =>
    setSets(value.sets.filter((_, idx) => idx !== i));

  const toggleUnit = () => {
    const next = unit === 'kg' ? 'lbs' : 'kg';
    setSets(value.sets.map((s) => ({ ...s, unit: next })));
  };

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: c.surfaceAlt,
      }}>
      {/* nl-review 상단: AI 추정 뱃지 + 원문 */}
      {mode === 'nl-review' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <View
            style={{
              backgroundColor: c.stats + '22',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: c.stats }}>AI 추정</Text>
          </View>
          {!!value.rawName && (
            <Text style={{ fontSize: 12, color: c.textMuted }} numberOfLines={1}>
              "{value.rawName}"
            </Text>
          )}
        </View>
      )}

      {/* 헤더: 운동명/카테고리 + 변경/삭제 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          {assigned ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: getColor(value.category),
                  }}
                />
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>
                  {value.category}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.textPrimary, marginTop: 2 }}>
                {value.name}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              onPress={onPickExercise}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: c.primary + '18',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.primary }}>
                + 운동 선택 필요
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {assigned && !!onPickExercise && (
          <TouchableOpacity onPress={onPickExercise} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>변경</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.textMuted }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 세트 편집 (운동이 선택된 경우에만) */}
      {assigned && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textMuted }}>
              세트 {value.sets.length}
            </Text>
            <TouchableOpacity
              onPress={toggleUnit}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: c.surfaceAlt,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.textSecondary }}>{unit}</Text>
            </TouchableOpacity>
          </View>

          {value.sets.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ width: 22, fontSize: 12, fontWeight: '800', color: c.textMuted }}>
                {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <SetInputRow
                  weight={String(s.weight)}
                  reps={String(s.reps)}
                  unit={s.unit}
                  onWeightStep={(d) => updateSet(i, { weight: clamp(s.weight + d) })}
                  onRepsStep={(d) => updateSet(i, { reps: clamp(s.reps + d) })}
                  onWeightPad={() =>
                    openPad?.({
                      value: String(s.weight),
                      decimal: true,
                      suffix: s.unit,
                      onConfirm: (v) => updateSet(i, { weight: clamp(parseFloat(v) || 0) }),
                    })
                  }
                  onRepsPad={() =>
                    openPad?.({
                      value: String(s.reps),
                      decimal: false,
                      suffix: '회',
                      onConfirm: (v) => updateSet(i, { reps: clamp(parseInt(v, 10) || 0) }),
                    })
                  }
                />
              </View>
              {value.sets.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeSet(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 15, color: c.textMuted }}>−</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={addSet}
            style={{
              marginTop: 2,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: c.surfaceAlt,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>+ 세트 추가</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
