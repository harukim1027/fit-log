import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useDietStore } from "../../store/dietStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { Header, Button } from "../../components/ui";
import { Stepper } from "../../components/ui/Stepper";
import { Icon } from "../../components/AppIcons";

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
        {/* 타겟 아이콘 */}
        <View className="items-center mb-4">
          <View className="w-16 h-16 rounded-3xl bg-primary/15 items-center justify-center">
            <Icon name="target" size={32} color="#0E8E8A" />
          </View>
        </View>
        {/* 목표 칼로리 */}
        <Text className="text-base font-semibold text-text-secondary mb-3">
          하루 목표 칼로리
        </Text>
        <Stepper value={calValue} onChange={setCalValue} step={50} min={500} max={9999} suffix="kcal" />
        <Text className="text-xs text-text-muted text-center mt-2 mb-4">
          일반적으로 성인 기준 1800 ~ 2500 kcal예요
        </Text>

        <View className="flex-row gap-2 mb-4">
          {[1500, 1800, 2000, 2500].map((cal) => {
            const isActive = calValue === String(cal);
            return (
              <TouchableOpacity
                key={cal}
                className={[
                  "flex-1 rounded-2xl py-3 items-center border",
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
        <Stepper value={weightValue || "70"} onChange={setWeightValue} step={1} min={20} max={300} suffix="kg" decimal />
        <Text className="text-xs text-text-muted text-center mt-2 mb-5">
          칼로리 소모량 계산에 사용돼요 (미입력 시 70kg 기본값)
        </Text>

        <Button title="저장" onPress={handleSave} fullWidth className="mt-2" />
      </View>
    </SafeAreaView>
  );
}
