import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useColors } from '../../constants/colors';

export interface SetInputRowProps {
  weight: string;
  reps: string;
  unit?: string;
  onWeightStep: (delta: number) => void;
  onRepsStep: (delta: number) => void;
  onWeightPad: () => void;
  onRepsPad: () => void;
  valueBg?: string;
  containerStyle?: ViewStyle;
}

export function SetInputRow({
  weight,
  reps,
  unit = 'kg',
  onWeightStep,
  onRepsStep,
  onWeightPad,
  onRepsPad,
  valueBg,
  containerStyle,
}: SetInputRowProps) {
  const c = useColors();
  const bg = valueBg ?? c.surfaceAlt;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
        },
        containerStyle,
      ]}>
      <View style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>무게</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onWeightStep(-5)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.textSecondary }}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, height: 36, backgroundColor: bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 70 }}
            onPress={onWeightPad}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: weight ? c.textPrimary : c.textMuted }}>
              {weight || '0'}<Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}> {unit}</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onWeightStep(5)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.surface }}>+5</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>횟수</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onRepsStep(-1)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.textSecondary }}>-1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, height: 36, backgroundColor: bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 70 }}
            onPress={onRepsPad}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: reps ? c.textPrimary : c.textMuted }}>
              {reps || '0'}<Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}> 회</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onRepsStep(1)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.surface }}>+1</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
