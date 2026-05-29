import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useDietStore } from "../../store/dietStore";
import { useSettingsStore } from "../../store/settingsStore";
import { Colors } from "../../constants/colors";
import { GoalIcon, Icon } from "../../components/AppIcons";

const GOALS = [
  { key: "체중감량" },
  { key: "근육증가" },
  { key: "체력유지" },
  { key: "건강관리" },
];

const CARD_SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

export default function EditProfileModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuthStore();
  const { setTargetCalories } = useDietStore();
  const { weightUnit, showBodypartSelector, loadSettings, setWeightUnit, setShowBodypartSelector } = useSettingsStore();

  useEffect(() => { loadSettings(); }, []);

  const [name, setName] = useState(user?.name ?? "");
  const [weight, setWeight] = useState(String(user?.weight ?? ""));
  const [height, setHeight] = useState(String(user?.height ?? ""));
  const [age, setAge] = useState(String(user?.age ?? ""));
  const [gender, setGender] = useState(user?.gender ?? "");
  const [goal, setGoal] = useState(user?.goal ?? "");
  const [targetCal, setTargetCal] = useState(
    String(user?.targetCalories ?? "")
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert("이름을 입력해주세요");

    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age);
    const targetCalNum = parseInt(targetCal);

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        weight: isNaN(weightNum) ? undefined : weightNum,
        height: isNaN(heightNum) ? undefined : heightNum,
        age: isNaN(ageNum) ? undefined : ageNum,
        gender: gender || undefined,
        goal: goal || undefined,
        targetCalories: isNaN(targetCalNum) ? undefined : targetCalNum,
      });
      if (!isNaN(targetCalNum)) setTargetCalories(targetCalNum);
      router.back();
    } catch (e: any) {
      Alert.alert("저장 실패", e.message ?? "다시 시도해주세요");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 18, color: Colors.textPrimary, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>프로필 편집</Text>
        <View style={s.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}>
          {/* 이름 */}
          <Text style={s.sectionLabel}>이름</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="next"
          />

          {/* 성별 */}
          <Text style={s.sectionLabel}>성별</Text>
          <View style={s.genderRow}>
            {["남", "여"].map((g) => (
              <TouchableOpacity
                key={g}
                style={[s.genderBtn, gender === g && s.genderBtnActive]}
                onPress={() => setGender(g)}>
                <Text
                  style={[s.genderText, gender === g && s.genderTextActive]}>
                  {g === "남" ? "남성" : "여성"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 신체 정보 */}
          <Text style={s.sectionLabel}>신체 정보</Text>
          <View style={s.row3}>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>나이</Text>
              <TextInput
                style={s.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="세"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>신장</Text>
              <TextInput
                style={s.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="cm"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>체중</Text>
              <TextInput
                style={s.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* 목표 */}
          <Text style={s.sectionLabel}>목표</Text>
          <View style={s.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[s.goalBtn, goal === g.key && s.goalBtnActive]}
                onPress={() => setGoal(g.key)}>
                <View style={s.goalEmoji}>
                  <GoalIcon goal={g.key} size={26} />
                </View>
                <Text style={[s.goalText, goal === g.key && s.goalTextActive]}>
                  {g.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 목표 칼로리 */}
          <Text style={s.sectionLabel}>목표 칼로리</Text>
          <View style={s.calRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={targetCal}
              onChangeText={setTargetCal}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={s.calUnit}>kcal / 일</Text>
          </View>

          {/* 앱 설정 */}
          <Text style={s.sectionLabel}>앱 설정</Text>

          {/* 무게 단위 */}
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="dumbbell" size={16} color={Colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }}>무게 단위</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                    backgroundColor: weightUnit === u ? Colors.primary : Colors.surfaceAlt,
                  }}
                  onPress={() => setWeightUnit(u)}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: weightUnit === u ? '#fff' : Colors.textSecondary }}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 운동 부위 선택 표시 */}
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 12 }}>
              <Icon name="target" size={16} color={Colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textPrimary }}>운동 추가 시 부위 선택 표시</Text>
            </View>
            <TouchableOpacity
              style={{
                width: 46, height: 26, borderRadius: 13,
                backgroundColor: showBodypartSelector ? Colors.primary : Colors.surfaceAlt,
                justifyContent: 'center', paddingHorizontal: 2,
              }}
              onPress={() => setShowBodypartSelector(!showBodypartSelector)}
              activeOpacity={0.8}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                transform: [{ translateX: showBodypartSelector ? 20 : 0 }],
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
              }} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View
          style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}>
            <Text style={s.saveBtnText}>
              {isSaving ? "저장 중..." : "저장하기"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  headerRight: { width: 36 },

  content: { padding: 20, paddingBottom: 16 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 20,
  },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    ...CARD_SHADOW,
  },

  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: 'transparent',
    ...CARD_SHADOW,
  },
  genderBtnActive: { backgroundColor: Colors.primary + "18", borderColor: Colors.primary },
  genderText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary, fontWeight: "700" },

  row3: { flexDirection: "row", gap: 10 },
  inputWrap: { flex: 1 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 6,
  },

  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalBtn: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    ...CARD_SHADOW,
  },
  goalBtnActive: { backgroundColor: Colors.primary + "18", borderColor: Colors.primary },
  goalEmoji: { alignItems: 'center' as const, justifyContent: 'center' as const, height: 28 },
  goalText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  goalTextActive: { color: Colors.primary, fontWeight: "700" },

  calRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  calUnit: { fontSize: 14, color: Colors.textSecondary, fontWeight: "600" },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
