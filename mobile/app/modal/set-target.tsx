import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useDietStore } from "../../store/dietStore";
import { Colors } from "../../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SetTargetModal() {
  const router = useRouter();
  const { targetCalories, setTargetCalories } = useDietStore();
  const [value, setValue] = useState(String(targetCalories));

  const handleSave = () => {
    const cal = parseInt(value);
    if (isNaN(cal) || cal < 500 || cal > 9999) {
      return Alert.alert(
        "올바른 칼로리를 입력해주세요",
        "500 ~ 9999 사이로 입력해주세요"
      );
    }
    setTargetCalories(cal);
    router.back();
  };

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Text style={s.label}>하루 목표 칼로리</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        selectTextOnFocus
        autoFocus
      />
      <Text style={s.hint}>일반적으로 성인 기준 1800 ~ 2500 kcal예요</Text>

      <View style={s.presets}>
        {[1500, 1800, 2000, 2500].map((cal) => (
          <TouchableOpacity
            key={cal}
            style={[s.preset, value === String(cal) && s.presetActive]}
            onPress={() => setValue(String(cal))}>
            <Text
              style={[
                s.presetText,
                value === String(cal) && s.presetTextActive,
              ]}>
              {cal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={s.saveBtn}
        onPress={handleSave}
        activeOpacity={0.8}>
        <Text style={s.saveBtnText}>저장</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  presets: { flexDirection: "row", gap: 10, marginBottom: 32 },
  preset: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors?.border,
  },
  presetActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  presetText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  presetTextActive: { color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
