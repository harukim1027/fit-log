import React from "react";
import { showCuteAlert } from "../../components/CuteAlert";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useDietStore } from "../../store/dietStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { Header, Button, NumberPad } from "../../components/ui";
import { Stepper } from "../../components/ui/Stepper";
import { Icon } from "../../components/AppIcons";
import { useColors, ThemeColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";

function getMacroColors(c: ThemeColors) {
  return {
    carbs: { bar: c.warning, text: c.warning, bg: c.warning + '18' },
    protein: { bar: c.primary, text: c.success, bg: c.surfaceAlt },
    fat: { bar: c.danger, text: c.danger, bg: c.danger + '18' },
  };
}

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
  color: { bar: string; text: string; bg: string };
  onInc: () => void;
  onDec: () => void;
  onRatioChange: (r: number) => void;
  targetCal: number;
  kcalPer: number;
}) {
  const c = useColors();
  const grams = Math.round((targetCal * ratio) / 100 / kcalPer);
  const [ratioPadVisible, setRatioPadVisible] = useState(false);
  const [gramPadVisible, setGramPadVisible] = useState(false);

  const handleGramConfirm = (text: string) => {
    const g = parseFloat(text);
    if (!isNaN(g) && g >= 0 && targetCal > 0) {
      const newRatio = Math.round(((g * kcalPer) / targetCal) * 100);
      onRatioChange(Math.max(1, Math.min(99, newRatio)));
    }
  };

  const handleRatioConfirm = (text: string) => {
    const r = parseInt(text);
    if (!isNaN(r) && r >= 1 && r <= 99) onRatioChange(r);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.bar }} />
        <Text style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary, flex: 1 }}>{label}</Text>
      </View>
      {/* 비율 바 */}
      <View style={{ height: 8, backgroundColor: c.surfaceAlt, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
        <View style={{ height: "100%", width: `${Math.min(ratio, 100)}%` as `${number}%`, backgroundColor: color.bar, borderRadius: 999 }} />
      </View>
      {/* % 조작 */}
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <TouchableOpacity
          onPress={onDec}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary, marginTop: -2 }}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRatioPadVisible(true)}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: color.bg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: color.text }}>{ratio}</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: color.text }}>%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onInc}
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color.bar, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: c.onAccent, marginTop: -2 }}>+</Text>
        </TouchableOpacity>
      </View>
      {/* g 직접 입력 */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "700", width: 60 }}>목표량</Text>
        <TouchableOpacity
          onPress={() => setGramPadVisible(true)}
          style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary, textAlign: "center" }}>{grams}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "700" }}>g</Text>
        <Text style={{ fontSize: 11, color: color.text, fontWeight: "700", width: 50, textAlign: "right" }}>
          {grams * kcalPer} kcal
        </Text>
      </View>

      <NumberPad
        visible={ratioPadVisible}
        value={String(ratio)}
        decimal={false}
        suffix="%"
        max={99}
        onConfirm={(v) => { handleRatioConfirm(v); setRatioPadVisible(false); }}
        onCancel={() => setRatioPadVisible(false)}
      />
      <NumberPad
        visible={gramPadVisible}
        value={String(grams)}
        decimal={false}
        suffix="g"
        onConfirm={(v) => { handleGramConfirm(v); setGramPadVisible(false); }}
        onCancel={() => setGramPadVisible(false)}
      />
    </View>
  );
}

export default function SetTargetModal() {
  const c = useColors();
  const MACRO_COLORS = getMacroColors(c);
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
    if (isNaN(calNum) || calNum < 500 || calNum > 9999) {
      showCuteAlert({ icon: 'pencil', tone: 'warn', title: '올바른 칼로리를 입력해주세요', message: '500 ~ 9999 사이로 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] });
      return;
    }

    const weightNum = parseFloat(weightValue);
    if (weightValue && (isNaN(weightNum) || weightNum < 20 || weightNum > 300)) {
      showCuteAlert({ icon: 'pencil', tone: 'warn', title: '올바른 체중을 입력해주세요', message: '20 ~ 300 사이로 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] });
      return;
    }

    if (carbs + protein + fat !== 100) {
      showCuteAlert({ icon: 'pencil', tone: 'warn', title: '비율 합계가 100%가 되어야 해요', message: `현재 ${carbs + protein + fat}%`, buttons: [{ label: '확인', style: 'primary' }] });
      return;
    }

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
      showCuteAlert({ icon: 'alert', tone: 'warn', title: '서버 저장 실패', message: '앱 내 설정은 저장되었어요', buttons: [{ label: '확인', style: 'primary' }] });
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <BackgroundBlobs />
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
              color: total === 100 ? c.success : c.danger,
            }}>
            합계 {total}%
          </Text>
        </View>

        {total !== 100 && (
          <View
            style={{
              backgroundColor: c.danger + '18',
              borderRadius: 12,
              padding: 10,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
            <Icon name="info" size={14} color={c.danger} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>
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
