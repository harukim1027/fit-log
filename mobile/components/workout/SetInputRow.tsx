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

/**
 * Renders weight and repetition controls with decrement, value, and increment buttons.
 *
 * @param weight - The displayed weight value.
 * @param reps - The displayed repetition count.
 * @param unit - The unit shown with the weight value.
 * @param onWeightStep - Handles weight adjustments in five-unit increments.
 * @param onRepsStep - Handles repetition adjustments in single-count increments.
 * @param onWeightPad - Handles presses on the weight value.
 * @param onRepsPad - Handles presses on the repetition value.
 * @param valueBg - Background color for the central value buttons.
 * @param containerStyle - Additional styles applied to the outer container.
 */
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
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.danger + '20', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onWeightStep(-5)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.danger }}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}
            style={{ paddingHorizontal: 10, height: 36, backgroundColor: bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 70 }}
            onPress={onWeightPad}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: c.primary }}>
              {weight || '0'}<Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}> {unit}</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.success + '20', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onWeightStep(5)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.success }}>+5</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>횟수</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.danger + '20', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onRepsStep(-1)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.danger }}>-1</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}
            style={{ paddingHorizontal: 10, height: 36, backgroundColor: bg, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 70 }}
            onPress={onRepsPad}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: c.primary }}>
              {reps || '0'}<Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}> 회</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.success + '20', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => onRepsStep(1)}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.success }}>+1</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
