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
          style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, fontSize: 30, fontWeight: '900', textAlign: 'center', color: '#2E9E83', borderWidth: 2, borderColor: '#6FD3B6', marginBottom: 8 }}
          value={calValue}
          onChangeText={setCalValue}
          keyboardType="numeric"
          selectTextOnFocus
          autoFocus
          placeholderTextColor="#B4CFC5"
        />
        <Text className="text-xs text-text-muted text-center mb-5">
          일반적으로 성인 기준 1800 ~ 2500 kcal예요
        </Text>

        <View className="flex-row gap-2 mb-6">
          {[1500, 1800, 2000, 2500].map((cal) => {
            const isActive = calValue === String(cal);
            return (
              <TouchableOpacity
                key={cal}
                style={{
                  flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center',
                  backgroundColor: isActive ? '#6FD3B620' : '#E7F7F0',
                  borderWidth: isActive ? 1.5 : 0,
                  borderColor: isActive ? '#6FD3B6' : 'transparent',
                }}
                onPress={() => setCalValue(String(cal))}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? '#2E9E83' : '#7E9A90' }}>
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
          style={{ backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, fontSize: 28, fontWeight: '900', textAlign: 'center', color: '#34514A', borderWidth: 1.5, borderColor: '#D6F0E6', marginBottom: 8 }}
          value={weightValue}
          onChangeText={setWeightValue}
          keyboardType="decimal-pad"
          placeholder="예: 70"
          placeholderTextColor="#B4CFC5"
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
