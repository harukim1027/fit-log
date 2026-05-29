import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header, Button, Input } from "../components/ui";
import { Icon, GoalIcon, HeartIcon } from "../components/AppIcons";
import { useAuthStore } from "../store/authStore";
import { useDietStore } from "../store/dietStore";
import { useHealthStore } from "../store/healthStore";

const GOALS = [
  { key: "체중감량", desc: "체지방 줄이기" },
  { key: "근육증가", desc: "근육량 늘리기" },
  { key: "체력유지", desc: "현재 체형 유지" },
  { key: "건강관리", desc: "전반적인 건강" },
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

function calcBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === "남") {
    return Math.round(88.362 + 13.397 * weight + 4.799 * height - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weight + 3.098 * height - 4.33 * age);
}

function calcTarget(bmr: number, activityMultiplier: number, goal: string): number {
  return Math.round(bmr * activityMultiplier * (GOAL_MULTIPLIER[goal] ?? 1.0));
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-2 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={[
            "h-2 rounded-full",
            i < current
              ? "bg-primary/60 w-2"
              : i === current
              ? "bg-primary w-6"
              : "bg-surface-alt w-2",
          ].join(" ")}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const { setTargetCalories } = useDietStore();
  const { fetchHealthData, isLoading: healthLoading, isAvailable: healthAvailable } =
    useHealthStore();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [goal, setGoal] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityKey, setActivityKey] = useState("보통");
  const [targetCal, setTargetCal] = useState("");

  const activityMultiplier =
    ACTIVITY_LEVELS.find((a) => a.key === activityKey)?.multiplier ?? 1.375;

  const bmr =
    gender && weight && height && age
      ? calcBMR(gender, parseFloat(weight), parseFloat(height), parseInt(age))
      : null;

  const recalcTarget = (newActivity?: string, newGoal?: string) => {
    if (!bmr) return;
    const mult =
      ACTIVITY_LEVELS.find((a) => a.key === (newActivity ?? activityKey))?.multiplier ??
      activityMultiplier;
    const g = newGoal ?? goal;
    setTargetCal(String(calcTarget(bmr, mult, g)));
  };

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

  const goNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1) {
      if (!validateStep2()) return;
      if (bmr) setTargetCal(String(calcTarget(bmr, activityMultiplier, goal)));
    }
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header
        title=""
        showBack={step > 0}
        onBack={goBack}
        rightElement={<StepIndicator current={step} total={3} />}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">

          {/* ── STEP 0: 목표 선택 ── */}
          {step === 0 && (
            <View className="pt-2">
              <Text className="text-[15px] font-semibold text-primary mb-2">
                안녕하세요, {user?.name ?? ""}님!
              </Text>
              <Text className="text-[26px] font-extrabold text-text-primary leading-9 mb-2">
                어떤 목표를 갖고 계신가요?
              </Text>
              <Text className="text-sm text-text-secondary mb-7 leading-5">
                목표에 맞게 칼로리를 자동으로 설정해드려요
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {GOALS.map((g) => {
                  const isActive = goal === g.key;
                  return (
                    <TouchableOpacity
                      key={g.key}
                      className={[
                        "w-[47%] bg-surface rounded-[20px] p-5 items-center gap-1 border-2",
                        isActive ? "border-primary bg-primary/10" : "border-transparent",
                      ].join(" ")}
                      style={{
                        shadowColor: "#4EBFA0",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        elevation: 2,
                      }}
                      onPress={() => setGoal(g.key)}
                      activeOpacity={0.7}>
                      <GoalIcon goal={g.key} size={36} />
                      <Text
                        className={[
                          "text-[15px] font-bold",
                          isActive ? "text-primary" : "text-text-primary",
                        ].join(" ")}>
                        {g.key}
                      </Text>
                      <Text className="text-[11px] text-text-muted text-center">
                        {g.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── STEP 1: 신체 정보 ── */}
          {step === 1 && (
            <View className="pt-2">
              <Text className="text-[26px] font-extrabold text-text-primary leading-9 mb-2">
                신체 정보를 입력해주세요
              </Text>
              <Text className="text-sm text-text-secondary mb-7 leading-5">
                기초대사량 계산에 사용돼요
              </Text>

              {Platform.OS === "ios" && healthAvailable && (
                <TouchableOpacity
                  className="flex-row items-center gap-2 border border-[#FF3B3030] rounded-[18px] px-[18px] py-[14px] mb-6"
                  style={{ backgroundColor: '#FF3B3012', borderWidth: 1.5, borderColor: '#FF3B3030' }}
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
                    <HeartIcon size={16} filled color="#FF3B30" />
                  )}
                  <Text className="text-[15px] font-bold flex-1" style={{ color: '#FF3B30' }}>
                    {healthLoading ? "가져오는 중..." : "Apple Health 연동하기"}
                  </Text>
                  <Text className="text-[11px] font-semibold" style={{ color: '#FF3B3080' }}>
                    키·몸무게 자동 입력
                  </Text>
                </TouchableOpacity>
              )}

              <Text className="text-xs font-bold text-text-secondary mb-2">성별</Text>
              <View className="flex-row gap-3 mb-5">
                {["남", "여"].map((g) => {
                  const isActive = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      className={[
                        "flex-1 bg-surface rounded-[18px] py-5 items-center gap-2 border-2",
                        isActive ? "border-primary bg-primary/10" : "border-transparent",
                      ].join(" ")}
                      style={{
                        shadowColor: "#4EBFA0",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        elevation: 2,
                      }}
                      onPress={() => setGender(g)}
                      activeOpacity={0.8}>
                      <Icon name="person" size={32} color="#B4CFC5" />
                      <Text
                        className={[
                          "text-base font-bold",
                          isActive ? "text-primary" : "text-text-secondary",
                        ].join(" ")}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label="나이"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="예: 25"
                rightElement={<Text className="text-sm font-semibold text-text-muted">세</Text>}
                returnKeyType="next"
              />
              <Input
                label="키"
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="예: 170"
                rightElement={<Text className="text-sm font-semibold text-text-muted">cm</Text>}
                returnKeyType="next"
              />
              <Input
                label="몸무게"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="예: 70"
                rightElement={<Text className="text-sm font-semibold text-text-muted">kg</Text>}
                returnKeyType="done"
              />
            </View>
          )}

          {/* ── STEP 2: 칼로리 계산 ── */}
          {step === 2 && (
            <View className="pt-2">
              <Text className="text-[26px] font-extrabold text-text-primary leading-9 mb-2">
                목표 칼로리를 설정할게요
              </Text>
              <Text className="text-sm text-text-secondary mb-7 leading-5">
                Harris-Benedict 공식으로 자동 계산했어요
              </Text>

              {bmr !== null && (
                <View className="bg-primary/10 rounded-[20px] p-5 items-center mb-6 gap-1">
                  <Text className="text-xs font-semibold text-primary">기초대사량 (BMR)</Text>
                  <Text className="text-[32px] font-extrabold text-primary">
                    {bmr.toLocaleString()} kcal
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {gender} · {age}세 · {height}cm · {weight}kg
                  </Text>
                </View>
              )}

              <Text className="text-xs font-bold text-text-secondary mb-2">활동량</Text>
              <View className="gap-2 mb-6">
                {ACTIVITY_LEVELS.map((a) => {
                  const isActive = activityKey === a.key;
                  return (
                    <TouchableOpacity
                      key={a.key}
                      className={[
                        "bg-surface rounded-2xl px-[18px] py-[14px] flex-row items-center gap-3 border-2",
                        isActive ? "border-primary bg-primary/10" : "border-transparent",
                      ].join(" ")}
                      style={{
                        shadowColor: "#4EBFA0",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.07,
                        shadowRadius: 8,
                        elevation: 2,
                      }}
                      onPress={() => {
                        setActivityKey(a.key);
                        recalcTarget(a.key);
                      }}
                      activeOpacity={0.8}>
                      <Text
                        className={[
                          "text-[15px] font-bold w-10",
                          isActive ? "text-primary" : "text-text-secondary",
                        ].join(" ")}>
                        {a.label}
                      </Text>
                      <Text className="text-sm text-text-muted">{a.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs font-bold text-text-secondary mb-2">
                목표 칼로리 (수정 가능)
              </Text>
              <View className="flex-row items-center bg-surface rounded-2xl px-4 mb-2 border border-primary/60">
                <TextInput
                  className="flex-1 text-primary font-extrabold text-center"
                  style={{ fontSize: 32, paddingVertical: 14 }}
                  value={targetCal}
                  onChangeText={setTargetCal}
                  keyboardType="numeric"
                  selectTextOnFocus
                  placeholderTextColor="#B4CFC5"
                />
                <Text className="text-sm font-semibold text-text-muted">kcal / 일</Text>
              </View>
              <Text className="text-xs text-text-muted text-center mb-2">
                {goal} 목표 기준으로 계산됐어요 · 직접 수정도 가능해요
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        <View className="px-6 pt-3 pb-2 border-t border-border bg-background">
          {step < 2 ? (
            <Button
              title="다음"
              rightIcon={<Icon name="chevronRight" size={20} color="#fff" />}
              onPress={goNext}
              fullWidth
            />
          ) : (
            <Button
              title={isLoading ? "저장 중..." : "시작하기"}
              onPress={handleFinish}
              loading={isLoading}
              fullWidth
              className="bg-workout"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
