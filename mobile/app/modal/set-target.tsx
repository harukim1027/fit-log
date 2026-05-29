import React from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useDietStore } from "../../store/dietStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { Header, Button } from "../../components/ui";

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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header title="목표 설정" showClose />
      <View className="flex-1 p-6">
        {/* 목표 칼로리 */}
        <Text className="text-base font-semibold text-text-secondary mb-3">
          하루 목표 칼로리
        </Text>
        <TextInput
          className="bg-surface rounded-2xl text-text-primary font-bold text-center border border-border mb-2"
          style={{ paddingVertical: 18, fontSize: 28 }}
          value={calValue}
          onChangeText={setCalValue}
          keyboardType="numeric"
          selectTextOnFocus
          autoFocus
          placeholderTextColor="#C4B8D4"
        />
        <Text className="text-xs text-text-muted text-center mb-5">
          일반적으로 성인 기준 1800 ~ 2500 kcal예요
        </Text>

        <View className="flex-row gap-2 mb-4">
          {[1500, 1800, 2000, 2500].map((cal) => {
            const isActive = calValue === String(cal);
            return (
              <TouchableOpacity
                key={cal}
                className={[
                  "flex-1 rounded-xl py-3 items-center border",
                  isActive ? "bg-primary/10 border-primary" : "bg-surface border-border",
                ].join(" ")}
                onPress={() => setCalValue(String(cal))}>
                <Text
                  className={[
                    "text-base font-semibold",
                    isActive ? "text-primary" : "text-text-secondary",
                  ].join(" ")}>
                  {cal}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 체중 */}
        <Text className="text-base font-semibold text-text-secondary mb-3 mt-2">
          체중 (kg)
        </Text>
        <TextInput
          className="bg-surface rounded-2xl text-text-primary font-bold text-center border border-border mb-2"
          style={{ paddingVertical: 18, fontSize: 28 }}
          value={weightValue}
          onChangeText={setWeightValue}
          keyboardType="decimal-pad"
          placeholder="예: 70"
          placeholderTextColor="#C4B8D4"
          selectTextOnFocus
        />
        <Text className="text-xs text-text-muted text-center mb-5">
          칼로리 소모량 계산에 사용돼요 (미입력 시 70kg 기본값)
        </Text>

        <Button title="저장" onPress={handleSave} fullWidth className="mt-2" />
      </View>
    </SafeAreaView>
  );
}
