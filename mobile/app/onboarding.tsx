import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { showCuteAlert } from "../components/CuteAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { NumberPad } from "../components/ui";
import { Button, Header } from "../design-system";
import { Icon, GoalIcon } from "../components/AppIcons";
import { useAuthStore } from "../store/authStore";
import { useColors } from "../constants/colors";

const GOALS = [
  { key: "체중감량", desc: "체지방 줄이기" },
  { key: "근육증가", desc: "근육량 늘리기" },
  { key: "체력유지", desc: "현재 체형 유지" },
  { key: "건강관리", desc: "전반적인 건강" },
];

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
  const c = useColors();
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [goal, setGoal] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  type PadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setPadConfig({ value, decimal, suffix, onConfirm });

  const validateStep0 = () => {
    if (!goal) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '목표를 선택해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return false; }
    return true;
  };

  const validateStep1 = () => {
    if (!gender) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '성별을 선택해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return false; }
    const a = parseInt(age), h = parseFloat(height), w = parseFloat(weight);
    if (!age || isNaN(a) || a < 10 || a > 100) { showCuteAlert({ icon: 'pencil', tone: 'warn', title: '나이를 확인해주세요', message: '10 ~ 100 사이로 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return false; }
    if (!height || isNaN(h) || h < 100 || h > 250) { showCuteAlert({ icon: 'pencil', tone: 'warn', title: '키를 확인해주세요', message: '100 ~ 250cm 사이로 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return false; }
    if (!weight || isNaN(w) || w < 20 || w > 300) { showCuteAlert({ icon: 'pencil', tone: 'warn', title: '몸무게를 확인해주세요', message: '20 ~ 300kg 사이로 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return false; }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validateStep0()) return;
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  const handleFinish = async () => {
    if (!validateStep1()) return;
    setIsLoading(true);
    try {
      await updateProfile({
        goal,
        gender,
        age: parseInt(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        isOnboardingDone: true,
      });
      router.replace("/(tabs)" as any);
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '저장 실패', message: '잠시 후 다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
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
        rightElement={<StepIndicator current={step} total={2} />}
      />
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={180}
        extraHeight={180}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 300 }}
        style={{ flex: 1 }}>

          {/* ── STEP 0: 운동 목표 선택 ── */}
          {step === 0 && (
            <View className="pt-2">
              <Text className="text-[15px] font-semibold text-primary mb-2">
                안녕하세요, {user?.name ?? ""}님!
              </Text>
              <Text className="text-[26px] font-extrabold text-text-primary leading-9 mb-2">
                어떤 목표를 갖고 계신가요?
              </Text>
              <Text className="text-sm text-text-secondary mb-7 leading-5">
                목표에 맞게 운동 계획을 추천해드려요
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
                        shadowColor: "#000",
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
                맞춤 운동 추천에 활용돼요
              </Text>

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
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        elevation: 2,
                      }}
                      onPress={() => setGender(g)}
                      activeOpacity={0.8}>
                      <Icon name="person" size={32} color={c.textMuted} />
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

              {([
                { label: '나이', value: age, set: setAge, decimal: false, suffix: '세', placeholder: '예: 25' },
                { label: '키', value: height, set: setHeight, decimal: true, suffix: 'cm', placeholder: '예: 170' },
                { label: '몸무게', value: weight, set: setWeight, decimal: true, suffix: 'kg', placeholder: '예: 70' },
              ] as const).map(({ label, value, set, decimal, suffix, placeholder }) => (
                <View key={label} style={{ marginBottom: 16 }}>
                  <Text className="text-text-secondary text-xs font-bold mb-1.5">{label}</Text>
                  <TouchableOpacity activeOpacity={0.8}
                    className="flex-row items-center bg-surface-alt rounded-2xl px-3"
                    onPress={() => openPad(value, decimal, suffix, set)}>
                    <Text className="flex-1 py-3 text-base" style={{ color: value ? c.textPrimary : c.textMuted }}>
                      {value || placeholder}
                    </Text>
                    <Text className="text-sm font-semibold text-text-muted">{suffix}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        {/* 하단 버튼 */}
        <View className="px-6 pt-3 pb-2 border-t border-border bg-background">
          {step < 1 ? (
            /* 새 Button에는 rightIcon prop이 없다. children으로 직접 구성한다.
               접근성 이름도 문자열 children에서만 뽑히므로 명시한다.

               Button의 children이 문자열이 아니면 라벨 서식이 적용되지 않아
               여기서 14/800 onAccent를 직접 지정한다.
               design-system Button의 라벨 서식이 바뀌면 이 호출부도 함께 수정할 것. */
            <Button onPress={goNext} disabled={!goal} accessibilityLabel="다음">
              <View className="flex-row items-center">
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>
                  다음
                </Text>
                <View className="ml-2">
                  <Icon name="chevronRight" size={20} color={c.surface} />
                </View>
              </View>
            </Button>
          ) : (
            /* 기존 className="bg-workout"의 배경 오버라이드를 style로 옮겼다.
               Button이 backgroundColor: c.primary 뒤에 style을 병합하므로 이긴다. */
            <Button
              onPress={handleFinish}
              loading={isLoading}
              disabled={!gender || !age || !height || !weight}
              style={{ backgroundColor: c.workout }}>
              {isLoading ? "저장 중..." : "시작하기"}
            </Button>
          )}
        </View>
      </KeyboardAwareScrollView>

      <NumberPad
        visible={padConfig !== null}
        value={padConfig?.value ?? '0'}
        decimal={padConfig?.decimal ?? false}
        suffix={padConfig?.suffix}
        onConfirm={v => { padConfig?.onConfirm(v); setPadConfig(null); }}
        onCancel={() => setPadConfig(null)}
      />
    </SafeAreaView>
  );
}
