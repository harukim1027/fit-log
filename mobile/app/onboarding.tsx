import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { useDietStore } from "../store/dietStore";
import { useHealthStore } from "../store/healthStore";
import { Colors } from "../constants/colors";

const GOALS = [
  { key: "체중감량", emoji: "🔥", desc: "체지방 줄이기" },
  { key: "근육증가", emoji: "💪", desc: "근육량 늘리기" },
  { key: "체력유지", emoji: "⚡", desc: "현재 체형 유지" },
  { key: "건강관리", emoji: "🌿", desc: "전반적인 건강" },
];

const ACTIVITY_LEVELS = [
  { key: "낮음", label: "낮음", desc: "주로 앉아서 생활", multiplier: 1.2 },
  { key: "보통", label: "보통", desc: "주 3~5회 운동", multiplier: 1.375 },
  { key: "높음", label: "높음", desc: "매일 강도 높은 운동", multiplier: 1.55 },
];

const GOAL_MULTIPLIER: Record<string, number> = {
  체중감량: 0.85,
  근육증가: 1.1,
  체력유지: 1.0,
  건강관리: 1.0,
};

const CARD_SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 3,
};

function calcBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === "남") {
    return Math.round(88.362 + 13.397 * weight + 4.799 * height - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weight + 3.098 * height - 4.33 * age);
}

function calcTarget(bmr: number, activityMultiplier: number, goal: string): number {
  return Math.round(bmr * activityMultiplier * (GOAL_MULTIPLIER[goal] ?? 1.0));
}

// ── Step Indicator ──────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={si.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[si.dot, i < current ? si.dotDone : i === current ? si.dotActive : si.dotInactive]} />
      ))}
    </View>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const { setTargetCalories } = useDietStore();
  const { fetchHealthData, isLoading: healthLoading } = useHealthStore();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1
  const [goal, setGoal] = useState("");

  // Step 2
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  // Step 3
  const [activityKey, setActivityKey] = useState("보통");
  const [targetCal, setTargetCal] = useState("");

  const activityMultiplier =
    ACTIVITY_LEVELS.find((a) => a.key === activityKey)?.multiplier ?? 1.375;

  const bmr =
    gender && weight && height && age
      ? calcBMR(gender, parseFloat(weight), parseFloat(height), parseInt(age))
      : null;

  // 활동량/목표 변경 시 자동 계산
  const recalcTarget = (newActivity?: string, newGoal?: string) => {
    if (!bmr) return;
    const mult =
      ACTIVITY_LEVELS.find((a) => a.key === (newActivity ?? activityKey))?.multiplier ??
      activityMultiplier;
    const g = newGoal ?? goal;
    setTargetCal(String(calcTarget(bmr, mult, g)));
  };

  // ── Validation ──────────────────────────────────────────────
  const validateStep1 = () => {
    if (!goal) { Alert.alert("목표를 선택해주세요"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!gender) { Alert.alert("성별을 선택해주세요"); return false; }
    const a = parseInt(age), h = parseFloat(height), w = parseFloat(weight);
    if (!age || isNaN(a) || a < 10 || a > 100) { Alert.alert("나이를 올바르게 입력해주세요 (10~100)"); return false; }
    if (!height || isNaN(h) || h < 100 || h > 250) { Alert.alert("키를 올바르게 입력해주세요 (100~250cm)"); return false; }
    if (!weight || isNaN(w) || w < 20 || w > 300) { Alert.alert("몸무게를 올바르게 입력해주세요 (20~300kg)"); return false; }
    return true;
  };

  // ── Navigation ──────────────────────────────────────────────
  const goNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1) {
      if (!validateStep2()) return;
      // Step 3 진입 시 자동 계산
      if (bmr) setTargetCal(String(calcTarget(bmr, activityMultiplier, goal)));
    }
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  // ── Finish ──────────────────────────────────────────────────
  const handleFinish = async () => {
    const cal = parseInt(targetCal);
    if (isNaN(cal) || cal < 500 || cal > 9999) {
      Alert.alert("목표 칼로리를 올바르게 입력해주세요 (500~9999)");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile({
        goal,
        gender,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        targetCalories: cal,
        isOnboardingDone: true,
      });
      setTargetCalories(cal);
      router.replace("/(tabs)" as any);
    } catch {
      Alert.alert("저장 실패", "잠시 후 다시 시도해주세요");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* 상단 인디케이터 */}
        <View style={s.topBar}>
          {step > 0 ? (
            <TouchableOpacity style={s.backBtn} onPress={goBack}>
              <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={s.backBtn} />
          )}
          <StepIndicator current={step} total={3} />
          <View style={s.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">

          {/* ── STEP 0: 목표 선택 ── */}
          {step === 0 && (
            <View style={s.stepWrap}>
              <Text style={s.greeting}>안녕하세요, {user?.name ?? ""}님! 👋</Text>
              <Text style={s.stepTitle}>어떤 목표를 갖고 계신가요?</Text>
              <Text style={s.stepDesc}>목표에 맞게 칼로리를 자동으로 설정해드려요</Text>
              <View style={s.goalGrid}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[s.goalCard, goal === g.key && s.goalCardActive]}
                    onPress={() => setGoal(g.key)}
                    activeOpacity={0.7}>
                    <Text style={s.goalEmoji}>{g.emoji}</Text>
                    <Text style={[s.goalKey, goal === g.key && s.goalKeyActive]}>
                      {g.key}
                    </Text>
                    <Text style={s.goalDesc}>{g.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 1: 신체 정보 ── */}
          {step === 1 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>신체 정보를 입력해주세요</Text>
              <Text style={s.stepDesc}>기초대사량 계산에 사용돼요</Text>

              {/* Apple Health 자동 입력 (iOS만) */}
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={s.healthConnectBtn}
                  onPress={async () => {
                    const { data } = await (async () => {
                      await fetchHealthData();
                      return useHealthStore.getState();
                    })();
                    if (data.height) setHeight(String(data.height));
                    if (data.weight) setWeight(String(data.weight));
                    if (data.height || data.weight) {
                      Alert.alert("연동 완료", "Apple Health에서 키/몸무게를 가져왔어요.");
                    } else {
                      Alert.alert("데이터 없음", "Apple Health에 신체 정보가 없거나 권한이 필요해요.");
                    }
                  }}
                  disabled={healthLoading}
                  activeOpacity={0.8}>
                  {healthLoading ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="heart" size={18} color="#FF3B30" />
                  )}
                  <Text style={s.healthConnectText}>
                    {healthLoading ? "가져오는 중..." : "Apple Health 연동하기"}
                  </Text>
                  <Text style={s.healthConnectHint}>키·몸무게 자동 입력</Text>
                </TouchableOpacity>
              )}

              {/* 성별 */}
              <Text style={s.fieldLabel}>성별</Text>
              <View style={s.genderRow}>
                {["남", "여"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[s.genderBtn, gender === g && s.genderBtnActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.8}>
                    <Text style={s.genderEmoji}>{g === "남" ? "🧑" : "👩"}</Text>
                    <Text style={[s.genderLabel, gender === g && s.genderLabelActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 나이 */}
              <Text style={s.fieldLabel}>나이</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="예: 25"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                />
                <Text style={s.inputUnit}>세</Text>
              </View>

              {/* 키 */}
              <Text style={s.fieldLabel}>키</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="예: 170"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                />
                <Text style={s.inputUnit}>cm</Text>
              </View>

              {/* 몸무게 */}
              <Text style={s.fieldLabel}>몸무게</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="예: 70"
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="done"
                />
                <Text style={s.inputUnit}>kg</Text>
              </View>
            </View>
          )}

          {/* ── STEP 2: 칼로리 계산 ── */}
          {step === 2 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>목표 칼로리를 설정할게요</Text>
              <Text style={s.stepDesc}>Harris-Benedict 공식으로 자동 계산했어요</Text>

              {/* BMR 카드 */}
              {bmr !== null && (
                <View style={s.bmrCard}>
                  <Text style={s.bmrLabel}>기초대사량 (BMR)</Text>
                  <Text style={s.bmrValue}>{bmr.toLocaleString()} kcal</Text>
                  <Text style={s.bmrSub}>
                    {gender} · {age}세 · {height}cm · {weight}kg
                  </Text>
                </View>
              )}

              {/* 활동량 */}
              <Text style={s.fieldLabel}>활동량</Text>
              <View style={s.activityRow}>
                {ACTIVITY_LEVELS.map((a) => (
                  <TouchableOpacity
                    key={a.key}
                    style={[s.activityBtn, activityKey === a.key && s.activityBtnActive]}
                    onPress={() => {
                      setActivityKey(a.key);
                      recalcTarget(a.key);
                    }}
                    activeOpacity={0.8}>
                    <Text style={[s.activityLabel, activityKey === a.key && s.activityLabelActive]}>
                      {a.label}
                    </Text>
                    <Text style={s.activityDesc}>{a.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 목표 칼로리 */}
              <Text style={s.fieldLabel}>목표 칼로리 (수정 가능)</Text>
              <View style={s.targetCalWrap}>
                <TextInput
                  style={s.targetCalInput}
                  value={targetCal}
                  onChangeText={setTargetCal}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={s.targetCalUnit}>kcal / 일</Text>
              </View>
              <Text style={s.targetCalHint}>
                {goal} 목표 기준으로 계산됐어요 · 직접 수정도 가능해요
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={s.footer}>
          {step < 2 ? (
            <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={s.nextBtnText}>다음</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.nextBtn, s.finishBtn]}
              onPress={handleFinish}
              activeOpacity={0.8}
              disabled={isLoading}>
              <Text style={s.nextBtnText}>
                {isLoading ? "저장 중..." : "시작하기 🚀"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────
const si = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  dotDone: { backgroundColor: Colors.primary + "60" },
  dotInactive: { backgroundColor: Colors.surfaceAlt },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  stepWrap: { paddingTop: 8 },

  greeting: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 28,
    lineHeight: 20,
  },

  // 목표 선택
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  goalCard: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "transparent",
    ...{
      shadowColor: "#B4A0D8",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  goalCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  goalEmoji: { fontSize: 36 },
  goalKey: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  goalKeyActive: { color: Colors.primary },
  goalDesc: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },

  // 신체 정보
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  healthConnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FF3B3012",
    borderWidth: 1.5,
    borderColor: "#FF3B3030",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  healthConnectText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF3B30",
    flex: 1,
  },
  healthConnectHint: {
    fontSize: 11,
    color: "#FF3B3080",
    fontWeight: "600",
  },
  genderRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#B4A0D8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  genderEmoji: { fontSize: 32 },
  genderLabel: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.surfaceAlt,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // 칼로리 계산
  bmrCard: {
    backgroundColor: Colors.primary + "12",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    gap: 4,
  },
  bmrLabel: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  bmrValue: { fontSize: 32, fontWeight: "800", color: Colors.primary },
  bmrSub: { fontSize: 12, color: Colors.textMuted },

  activityRow: { gap: 10, marginBottom: 24 },
  activityBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#B4A0D8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  activityBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
    width: 40,
  },
  activityLabelActive: { color: Colors.primary },
  activityDesc: { fontSize: 13, color: Colors.textMuted },

  targetCalWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary + "60",
  },
  targetCalInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    color: Colors.primary,
    paddingVertical: 14,
    textAlign: "center",
  },
  targetCalUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  targetCalHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },

  // 하단 버튼
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    backgroundColor: Colors.background,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  finishBtn: { backgroundColor: Colors.workout },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
