import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useDietStore } from "../../store/dietStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { Header, Button } from "../../components/ui";
import { Stepper } from "../../components/ui/Stepper";
import { Icon } from "../../components/AppIcons";

const MACRO_COLORS = {
  carbs: { bar: "#FFC078", text: "#E6932F", bg: "#FFF1E3" },
  protein: { bar: "#6FD3B6", text: "#2E9E83", bg: "#E7F7F0" },
  fat: { bar: "#FF9DB0", text: "#E76C86", bg: "#FFE8EF" },
};

function MacroRow({
  label,
  ratio,
  color,
  onInc,
  onDec,
  onRatioChange,
  targetCal,
  kcalPer,
}: {
  label: string;
  ratio: number;
  color: typeof MACRO_COLORS.carbs;
  onInc: () => void;
  onDec: () => void;
  onRatioChange: (r: number) => void;
  targetCal: number;
  kcalPer: number;
}) {
  const grams = Math.round((targetCal * ratio) / 100 / kcalPer);
  const [gramText, setGramText] = useState(String(grams));
  const [ratioText, setRatioText] = useState(String(ratio));

  useEffect(() => {
    setGramText(String(grams));
  }, [grams]);
  useEffect(() => {
    setRatioText(String(ratio));
  }, [ratio]);

  const handleGramChange = (text: string) => {
    setGramText(text);
    const g = parseFloat(text);
    if (!isNaN(g) && g >= 0 && targetCal > 0) {
      const newRatio = Math.round(((g * kcalPer) / targetCal) * 100);
      onRatioChange(Math.max(1, Math.min(99, newRatio)));
    }
  };

  const handleRatioTextChange = (text: string) => {
    setRatioText(text);
    const r = parseInt(text);
    if (!isNaN(r) && r >= 1 && r <= 99) onRatioChange(r);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color.bar,
          }}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: "#34514A",
            flex: 1,
          }}>
          {label}
        </Text>
      </View>
      {/* 비율 바 */}
      <View
        style={{
          height: 8,
          backgroundColor: "#E7F7F0",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 10,
        }}>
        <View
          style={{
            height: "100%",
            width: `${Math.min(ratio, 100)}%` as `${number}%`,
            backgroundColor: color.bar,
            borderRadius: 999,
          }}
        />
      </View>
      {/* % 조작 */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          marginBottom: 8,
        }}>
        <TouchableOpacity
          onPress={onDec}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#E7F7F0",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: "#7E9A90",
              marginTop: -2,
            }}>
            −
          </Text>
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: color.bg,
            borderRadius: 12,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}>
          <TextInput
            style={{
              flex: 1,
              fontSize: 20,
              fontWeight: "900",
              color: color.text,
              textAlign: "center",
              padding: 0,
            }}
            value={ratioText}
            onChangeText={handleRatioTextChange}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={{ fontSize: 16, fontWeight: "700", color: color.text }}>
            %
          </Text>
        </View>
        <TouchableOpacity
          onPress={onInc}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: color.bar,
            alignItems: "center",
            justifyContent: "center",
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: "#fff",
              marginTop: -2,
            }}>
            +
          </Text>
        </TouchableOpacity>
      </View>
      {/* g 직접 입력 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{
            fontSize: 12,
            color: "#7E9A90",
            fontWeight: "700",
            width: 60,
          }}>
          목표량
        </Text>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: "#E7F7F0",
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 12,
            fontSize: 14,
            fontWeight: "700",
            color: "#34514A",
            textAlign: "center",
          }}
          value={gramText}
          onChangeText={handleGramChange}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Text style={{ fontSize: 12, color: "#7E9A90", fontWeight: "700" }}>
          g
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: color.text,
            fontWeight: "700",
            width: 50,
            textAlign: "right",
          }}>
          {grams * kcalPer} kcal
        </Text>
      </View>
    </View>
  );
}

export default function SetTargetModal() {
  const router = useRouter();
  const {
    targetCalories,
    setTargetCalories,
    targetCarbsRatio,
    targetProteinRatio,
    targetFatRatio,
    setMacroRatios,
  } = useDietStore();
  const { user, updateProfile } = useAuthStore();

  const [calValue, setCalValue] = useState(String(targetCalories));
  const [weightValue, setWeightValue] = useState(
    user?.weight ? String(user.weight) : ""
  );
  const [carbs, setCarbs] = useState(targetCarbsRatio);
  const [protein, setProtein] = useState(targetProteinRatio);
  const [fat, setFat] = useState(targetFatRatio);

  const cal = parseInt(calValue) || 2000;
  const total = carbs + protein + fat;

  const adjust = (which: "carbs" | "protein" | "fat", delta: number) => {
    const others: Array<"carbs" | "protein" | "fat"> = (
      ["carbs", "protein", "fat"] as const
    ).filter((k) => k !== which);
    const getVal = (k: string) =>
      k === "carbs" ? carbs : k === "protein" ? protein : fat;
    const setVal = (k: string, v: number) => {
      if (k === "carbs") setCarbs(v);
      else if (k === "protein") setProtein(v);
      else setFat(v);
    };

    const cur = getVal(which);
    const newVal = Math.max(5, Math.min(80, cur + delta));
    const diff = newVal - cur;
    if (diff === 0) return;

    // distribute change to others, take from biggest
    const otherVals = others
      .map((k) => ({ k, v: getVal(k) }))
      .sort((a, b) => b.v - a.v);
    let remaining = diff;
    for (const { k, v } of otherVals) {
      const available = delta > 0 ? v - 5 : 80 - v;
      const take =
        Math.min(Math.abs(remaining), available) * Math.sign(remaining);
      setVal(k, v - take);
      remaining -= take;
      if (remaining === 0) break;
    }
    setVal(which, newVal);
  };

  const handleSave = async () => {
    const calNum = parseInt(calValue);
    if (isNaN(calNum) || calNum < 500 || calNum > 9999)
      return Alert.alert(
        "올바른 칼로리를 입력해주세요",
        "500 ~ 9999 사이로 입력해주세요"
      );

    const weightNum = parseFloat(weightValue);
    if (weightValue && (isNaN(weightNum) || weightNum < 20 || weightNum > 300))
      return Alert.alert(
        "올바른 체중을 입력해주세요",
        "20 ~ 300 사이로 입력해주세요"
      );

    if (carbs + protein + fat !== 100)
      return Alert.alert(
        "비율 합계가 100%가 되어야 해요",
        `현재 ${carbs + protein + fat}%`
      );

    setTargetCalories(calNum);
    setMacroRatios(carbs, protein, fat);

    try {
      await updateProfile({
        targetCalories: calNum,
        weight: weightValue && !isNaN(weightNum) ? weightNum : undefined,
        targetCarbsRatio: carbs,
        targetProteinRatio: protein,
        targetFatRatio: fat,
      } as any);
    } catch {
      Alert.alert("서버 저장 실패", "앱 내 설정은 저장되었어요");
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header title="목표 설정" showClose />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        {/* 목표 칼로리 */}
        <Text className="text-base font-semibold text-text-secondary mb-3">
          하루 목표 칼로리
        </Text>
        <Stepper
          value={calValue}
          onChange={setCalValue}
          step={50}
          min={500}
          max={9999}
          suffix="kcal"
        />
        <Text className="text-xs text-text-muted text-center mt-2 mb-3">
          일반적으로 성인 기준 1800 ~ 2500 kcal예요
        </Text>

        <View className="flex-row gap-2 mb-5">
          {[1500, 1800, 2000, 2500].map((c) => {
            const isActive = calValue === String(c);
            return (
              <TouchableOpacity
                key={c}
                className={[
                  "flex-1 rounded-2xl py-3 items-center border",
                  isActive
                    ? "bg-primary/10 border-primary"
                    : "bg-surface border-border",
                ].join(" ")}
                onPress={() => setCalValue(String(c))}>
                <Text
                  className={[
                    "text-base font-semibold",
                    isActive ? "text-primary" : "text-text-secondary",
                  ].join(" ")}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 탄단지 비율 */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}>
          <Text className="text-base font-semibold text-text-secondary">
            탄단지 비율
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: total === 100 ? "#2E9E83" : "#E76C86",
            }}>
            합계 {total}%
          </Text>
        </View>

        {total !== 100 && (
          <View
            style={{
              backgroundColor: "#FFE8EF",
              borderRadius: 12,
              padding: 10,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
            <Icon name="info" size={14} color="#E76C86" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#E76C86" }}>
              합계가 {total}%예요. 저장하려면 합계를 100%로 맞춰주세요.
            </Text>
          </View>
        )}

        {/* 탄수화물 */}
        <MacroRow
          label="탄수화물"
          ratio={carbs}
          color={MACRO_COLORS.carbs}
          onInc={() => adjust("carbs", 5)}
          onDec={() => adjust("carbs", -5)}
          onRatioChange={(r) => setCarbs(r)}
          targetCal={cal}
          kcalPer={4}
        />

        {/* 단백질 */}
        <MacroRow
          label="단백질"
          ratio={protein}
          color={MACRO_COLORS.protein}
          onInc={() => adjust("protein", 5)}
          onDec={() => adjust("protein", -5)}
          onRatioChange={(r) => setProtein(r)}
          targetCal={cal}
          kcalPer={4}
        />

        {/* 지방 */}
        <MacroRow
          label="지방"
          ratio={fat}
          color={MACRO_COLORS.fat}
          onInc={() => adjust("fat", 5)}
          onDec={() => adjust("fat", -5)}
          onRatioChange={(r) => setFat(r)}
          targetCal={cal}
          kcalPer={9}
        />

        <Text className="text-xs text-text-muted text-center mb-5">
          탄수화물·단백질 4kcal/g · 지방 9kcal/g 기준으로 목표량을 계산해요
        </Text>

        {/* 체중 */}
        <Text className="text-base font-semibold text-text-secondary mb-3 mt-2">
          체중 (kg)
        </Text>
        <Stepper
          value={weightValue || "70"}
          onChange={setWeightValue}
          step={1}
          min={20}
          max={300}
          suffix="kg"
          decimal
        />
        <Text className="text-xs text-text-muted text-center mt-2 mb-6">
          칼로리 소모량 계산에 사용돼요 (미입력 시 70kg 기본값)
        </Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}>
        <Button title="저장" onPress={handleSave} fullWidth />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
