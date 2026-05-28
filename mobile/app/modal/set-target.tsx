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
import { useAuthStore } from "../../store/authStore";
import { Header } from "../../components/ui";

export default function SetTargetModal() {
  const router = useRouter();
  const { targetCalories, setTargetCalories } = useDietStore();
  const { user, updateProfile } = useAuthStore();

  const [calValue, setCalValue] = useState(String(targetCalories));
  const [weightValue, setWeightValue] = useState(
    user?.weight ? String(user.weight) : ""
  );

  const handleSave = async () => {
    const cal = parseInt(calValue);
    if (isNaN(cal) || cal < 500 || cal > 9999) {
      return Alert.alert(
        "올바른 칼로리를 입력해주세요",
        "500 ~ 9999 사이로 입력해주세요"
      );
    }

    const weightNum = parseFloat(weightValue);
    if (weightValue && (isNaN(weightNum) || weightNum < 20 || weightNum > 300)) {
      return Alert.alert(
        "올바른 체중을 입력해주세요",
        "20 ~ 300 사이로 입력해주세요"
      );
    }

    setTargetCalories(cal);

    if (weightValue && !isNaN(weightNum)) {
      try {
        await updateProfile({ weight: weightNum, targetCalories: cal });
      } catch {
        Alert.alert("체중 저장 실패", "잠시 후 다시 시도해주세요");
      }
    }

    router.back();
  };

  return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header title="목표 설정" showClose />
      <View style={s.content}>
      {/* 목표 칼로리 */}
      <Text style={s.sectionTitle}>하루 목표 칼로리</Text>
      <TextInput
        style={s.input}
        value={calValue}
        onChangeText={setCalValue}
        keyboardType="numeric"
        selectTextOnFocus
        autoFocus
      />
      <Text style={s.hint}>일반적으로 성인 기준 1800 ~ 2500 kcal예요</Text>

      <View style={s.presets}>
        {[1500, 1800, 2000, 2500].map((cal) => (
          <TouchableOpacity
            key={cal}
            style={[s.preset, calValue === String(cal) && s.presetActive]}
            onPress={() => setCalValue(String(cal))}>
            <Text
              style={[
                s.presetText,
                calValue === String(cal) && s.presetTextActive,
              ]}>
              {cal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 체중 */}
      <Text style={[s.sectionTitle, { marginTop: 8 }]}>체중 (kg)</Text>
      <TextInput
        style={s.input}
        value={weightValue}
        onChangeText={setWeightValue}
        keyboardType="decimal-pad"
        placeholder="예: 70"
        placeholderTextColor={Colors.textMuted}
        selectTextOnFocus
      />
      <Text style={s.hint}>칼로리 소모량 계산에 사용돼요 (미입력 시 70kg 기본값)</Text>

      <TouchableOpacity
        style={s.saveBtn}
        onPress={handleSave}
        activeOpacity={0.8}>
        <Text style={s.saveBtnText}>저장</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24 },
  sectionTitle: {
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
    fontSize: 28,
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
    marginBottom: 20,
  },
  presets: { flexDirection: "row", gap: 10, marginBottom: 16 },
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
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
