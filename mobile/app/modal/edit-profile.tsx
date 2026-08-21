import React, { useState, useEffect } from "react";
import { showCuteAlert } from "../../components/CuteAlert";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useDietStore } from "../../store/dietStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import { GoalIcon, Icon } from "../../components/AppIcons";
import { NumberPad } from "../../components/ui";

const GOALS = [
  { key: "체중감량" },
  { key: "근육증가" },
  { key: "체력유지" },
  { key: "건강관리" },
];

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수들을 토큰 참조로 교체할 것.
const LIGHT_CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};
const LIGHT_KNOB_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 3,
  elevation: 2,
};

export default function EditProfileModal() {
  const c = useColors();
  const isDark = useThemeStore((st) => st.mode) === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuthStore();
  const { setTargetCalories } = useDietStore();
  const { weightUnit, showBodypartSelector, notifyBeforeRestEnd, loadSettings, setWeightUnit, setShowBodypartSelector, setNotifyBeforeRestEnd } = useSettingsStore();
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => { loadSettings(); }, []);

  const [name, setName] = useState(user?.name ?? "");
  const [weight, setWeight] = useState(String(user?.weight ?? ""));
  const [height, setHeight] = useState(String(user?.height ?? ""));
  const [age, setAge] = useState(String(user?.age ?? ""));
  const [gender, setGender] = useState(user?.gender ?? "");
  const [goal, setGoal] = useState(user?.goal ?? "");
  const [weeklyGoal, setWeeklyGoal] = useState(
    user?.weeklyGoal ? String(user.weeklyGoal) : ""
  );
  const [targetCal, setTargetCal] = useState(
    String(user?.targetCalories ?? "")
  );
  const [isSaving, setIsSaving] = useState(false);

  type PadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setPadConfig({ value, decimal, suffix, onConfirm });

  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 surface 명도 차가 경계를 만든다.
  const cardShadow = isDark ? null : LIGHT_CARD_SHADOW;

  const inputStyle = {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    // 입력값은 numeric 15/800 — 체중·키·나이·목표 칼로리가 다수다
    fontSize: 15,
    fontWeight: "800" as const,
    color: c.textPrimary,
    ...cardShadow,
  };

  const handleSave = async () => {
    if (!name.trim()) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '이름을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }

    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age);
    const targetCalNum = parseInt(targetCal);
    const weeklyGoalNum = parseInt(weeklyGoal);

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        weight: isNaN(weightNum) ? undefined : weightNum,
        height: isNaN(heightNum) ? undefined : heightNum,
        age: isNaN(ageNum) ? undefined : ageNum,
        gender: gender || undefined,
        goal: goal || undefined,
        weeklyGoal: isNaN(weeklyGoalNum) || weeklyGoalNum <= 0 ? undefined : weeklyGoalNum,
        targetCalories: isNaN(targetCalNum) ? undefined : targetCalNum,
      });
      if (!isNaN(targetCalNum)) setTargetCalories(targetCalNum);
      router.back();
    } catch (e: any) {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '저장 실패', message: e.message ?? '다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.surfaceAlt,
        backgroundColor: c.background,
      }}>
        <TouchableOpacity activeOpacity={0.7}
          style={{
            width: 36, height: 36, alignItems: "center", justifyContent: "center",
            borderRadius: 999, backgroundColor: c.surfaceAlt,
          }}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={18} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary }}>프로필 편집</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        style={{ flex: 1 }}>

          {/* 이름 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>이름</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor={c.textMuted}
            returnKeyType="next"
          />

          {/* 성별 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>성별</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {["남", "여"].map((g) => (
              <TouchableOpacity activeOpacity={0.7}
                key={g}
                style={[
                  { flex: 1, backgroundColor: c.surface, borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 2, borderColor: 'transparent', ...cardShadow },
                  gender === g ? { backgroundColor: c.primary + "18", borderColor: c.primary } : undefined,
                ]}
                onPress={() => setGender(g)}>
                <Text style={[
                  { fontSize: 15, fontWeight: "800", color: c.textSecondary },
                  gender === g ? { color: c.primary, fontWeight: "700" } : undefined,
                ]}>
                  {g === "남" ? "남성" : "여성"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 신체 정보 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>신체 정보</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([
              { label: '나이', value: age, set: setAge, decimal: false, suffix: '세', max: 120 },
              { label: '신장', value: height, set: setHeight, decimal: true, suffix: 'cm', max: 250 },
              { label: '체중', value: weight, set: setWeight, decimal: true, suffix: 'kg', max: 300 },
            ] as const).map(({ label, value, set, decimal, suffix, max }) => (
              <View key={label} style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted, marginBottom: 6 }}>{label}</Text>
                <TouchableOpacity activeOpacity={0.7}
                  style={[inputStyle, { alignItems: 'center' }]}
                  onPress={() => openPad(value, decimal, suffix, set)}>
                  <Text style={{ fontSize: 15, color: value ? c.textPrimary : c.textMuted }}>
                    {value || suffix}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 목표 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>목표</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {GOALS.map((g) => (
              <TouchableOpacity activeOpacity={0.7}
                key={g.key}
                style={[
                  { width: "47%", backgroundColor: c.surface, borderRadius: 16, paddingVertical: 14, alignItems: "center", gap: 4, borderWidth: 2, borderColor: 'transparent', ...cardShadow },
                  goal === g.key ? { backgroundColor: c.primary + "18", borderColor: c.primary } : undefined,
                ]}
                onPress={() => setGoal(g.key)}>
                <View style={{ alignItems: 'center', justifyContent: 'center', height: 28 }}>
                  <GoalIcon goal={g.key} size={26} />
                </View>
                <Text style={[
                  { fontSize: 14, fontWeight: "600", color: c.textSecondary },
                  goal === g.key ? { color: c.primary, fontWeight: "700" } : undefined,
                ]}>
                  {g.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 목표 칼로리 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>목표 칼로리</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity activeOpacity={0.7}
              style={[inputStyle, { flex: 1, alignItems: 'center' }]}
              onPress={() => openPad(targetCal, false, 'kcal', setTargetCal)}>
              <Text style={{ fontSize: 15, color: targetCal ? c.textPrimary : c.textMuted }}>
                {targetCal || '2000'}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: c.textSecondary, fontWeight: "600" }}>kcal / 일</Text>
          </View>

          {/* 주간 운동 목표 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>주간 운동 목표</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity activeOpacity={0.7}
              style={[inputStyle, { flex: 1, alignItems: 'center' }]}
              onPress={() => openPad(weeklyGoal, false, '회', (v) => {
                const n = parseInt(v);
                setWeeklyGoal(n > 0 ? String(n) : '');
              })}>
              <Text style={{ fontSize: 15, color: weeklyGoal ? c.textPrimary : c.textMuted }}>
                {weeklyGoal || '미설정'}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: c.textSecondary, fontWeight: "600" }}>회 / 주</Text>
          </View>

          {/* 앱 설정 */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>앱 설정</Text>

          {/* 무게 단위 */}
          <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="dumbbell" size={16} color={c.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>무게 단위</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity activeOpacity={0.7}
                  key={u}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                    backgroundColor: weightUnit === u ? c.primary : c.surfaceAlt,
                  }}
                  onPress={() => setWeightUnit(u)}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: weightUnit === u ? c.surface : c.textSecondary }}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 운동 부위 선택 표시 */}
          <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 }}>
              <Icon name="target" size={16} color={c.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>운동 추가 시 부위 선택 표시</Text>
            </View>
            <TouchableOpacity
              style={{
                width: 46, height: 26, borderRadius: 13,
                backgroundColor: showBodypartSelector ? c.primary : c.surfaceAlt,
                justifyContent: 'center', paddingHorizontal: 2,
              }}
              onPress={() => setShowBodypartSelector(!showBodypartSelector)}
              activeOpacity={0.7}>
              {/* 노브는 off일 때 트랙(surfaceAlt)과 명도 차가 1.12뿐이라 그림자가 유일한
                  경계였다. 다크에서는 그 그림자가 안 보이므로 보더로 대체한다.
                  on일 때는 트랙이 primary라 배경 대비만으로 충분하다. */}
              <View style={[{
                width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface,
                transform: [{ translateX: showBodypartSelector ? 20 : 0 }],
              }, isDark
                ? (!showBodypartSelector && { borderWidth: 1, borderColor: c.border })
                : LIGHT_KNOB_SHADOW]} />
            </TouchableOpacity>
          </View>

          {/* 휴식 30초 전 알림 */}
          <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="timer" size={16} color={c.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>휴식 30초 전 알림</Text>
              </View>
              <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2, marginLeft: 24 }}>
                휴식 종료 30초 전에 미리 알려드려요
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 46, height: 26, borderRadius: 13,
                backgroundColor: notifyBeforeRestEnd ? c.primary : c.surfaceAlt,
                justifyContent: 'center', paddingHorizontal: 2,
              }}
              onPress={() => setNotifyBeforeRestEnd(!notifyBeforeRestEnd)}
              activeOpacity={0.7}>
              {/* 노브는 off일 때 트랙(surfaceAlt)과 명도 차가 1.12뿐이라 그림자가 유일한
                  경계였다. 다크에서는 그 그림자가 안 보이므로 보더로 대체한다.
                  on일 때는 트랙이 primary라 배경 대비만으로 충분하다. */}
              <View style={[{
                width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface,
                transform: [{ translateX: notifyBeforeRestEnd ? 20 : 0 }],
              }, isDark
                ? (!notifyBeforeRestEnd && { borderWidth: 1, borderColor: c.border })
                : LIGHT_KNOB_SHADOW]} />
            </TouchableOpacity>
          </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.surfaceAlt, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 12) }}>
        <TouchableOpacity
          style={[{
            backgroundColor: c.primary,
            borderRadius: 999,
            paddingVertical: 16,
            alignItems: "center",
          }, isSaving ? { opacity: 0.6 } : undefined]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>
            {isSaving ? "저장 중..." : "저장하기"}
          </Text>
        </TouchableOpacity>
      </View>

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
