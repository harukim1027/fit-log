import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { useColors } from "../../constants/colors";

interface Props {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimal?: boolean;
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99999,
  suffix,
  decimal = false,
}: Props) {
  const c = useColors();
  const num = decimal ? parseFloat(value) || 0 : parseInt(value) || 0;

  const set = (n: number) => {
    const clamped = Math.max(min, Math.min(max, n));
    onChange(decimal ? String(Math.round(clamped * 10) / 10) : String(Math.round(clamped)));
  };

  return (
    <View className="flex-row items-center bg-surface-alt rounded-full p-1.5">
      <TouchableOpacity
        className="w-11 h-11 rounded-full bg-surface items-center justify-center"
        style={{ shadowColor: c.primary, shadowOpacity: 0.15, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        onPress={() => set(num - step)}
        activeOpacity={0.7}>
        <Text className="text-2xl font-bold text-primary" style={{ marginTop: -3 }}>−</Text>
      </TouchableOpacity>

      <View className="flex-1 flex-row items-end justify-center gap-1">
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={decimal ? "decimal-pad" : "numeric"}
          selectTextOnFocus
          className="text-text-primary font-extrabold text-center"
          style={{ fontSize: 24, minWidth: 56, padding: 0 }}
          placeholderTextColor={c.textMuted}
        />
        {suffix ? (
          <Text className="text-text-muted font-bold text-sm mb-1">{suffix}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        className="w-11 h-11 rounded-full bg-primary items-center justify-center"
        style={{ shadowColor: c.primary, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
        onPress={() => set(num + step)}
        activeOpacity={0.7}>
        <Text className="text-2xl font-bold text-white" style={{ marginTop: -3 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default Stepper;
