import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
import { useColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";
import { GoalIcon, Icon } from "../../components/AppIcons";

const GOALS = [
  { key: "체중감량" },
  { key: "근육증가" },
  { key: "체력유지" },
  { key: "건강관리" },
];

export default function EditProfileModal() {
  const c = useColors();
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

  const cardShadow = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  };

  const inputStyle = {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: c.textPrimary,
    ...cardShadow,
  };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <BackgroundBlobs />
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
        <TouchableOpacity
          style={{
            width: 36, height: 36, alignItems: "center", justifyContent: "center",
            borderRadius: 18, backgroundColor: c.surfaceAlt,
          }}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 18, color: c.textPrimary, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: c.textPrimary }}>프로필 편집</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>

          {/* 이름 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>이름</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="이름"
            placeholderTextColor={c.textMuted}
            returnKeyType="next"
          />

          {/* 성별 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>성별</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {["남", "여"].map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  { flex: 1, backgroundColor: c.surface, borderRadius: 20, paddingVertical: 14, alignItems: "center", borderWidth: 2, borderColor: 'transparent', ...cardShadow },
                  gender === g ? { backgroundColor: c.primary + "18", borderColor: c.primary } : undefined,
                ]}
                onPress={() => setGender(g)}>
                <Text style={[
                  { fontSize: 15, fontWeight: "600", color: c.textSecondary },
                  gender === g ? { color: c.primary, fontWeight: "700" } : undefined,
                ]}>
                  {g === "남" ? "남성" : "여성"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 신체 정보 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>신체 정보</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, marginBottom: 6 }}>나이</Text>
              <TextInput
                style={inputStyle}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="세"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, marginBottom: 6 }}>신장</Text>
              <TextInput
                style={inputStyle}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="cm"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted, marginBottom: 6 }}>체중</Text>
              <TextInput
                style={inputStyle}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={c.textMuted}
              />
            </View>
          </View>

          {/* 목표 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>목표</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  { width: "47%", backgroundColor: c.surface, borderRadius: 20, paddingVertical: 14, alignItems: "center", gap: 4, borderWidth: 2, borderColor: 'transparent', ...cardShadow },
                  goal === g.key ? { backgroundColor: c.primary + "18", borderColor: c.primary } : undefined,
                ]}
                onPress={() => setGoal(g.key)}>
                <View style={{ alignItems: 'center', justifyContent: 'center', height: 28 }}>
                  <GoalIcon goal={g.key} size={26} />
                </View>
                <Text style={[
                  { fontSize: 13, fontWeight: "600", color: c.textSecondary },
                  goal === g.key ? { color: c.primary, fontWeight: "700" } : undefined,
                ]}>
                  {g.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 목표 칼로리 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>목표 칼로리</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              value={targetCal}
              onChangeText={setTargetCal}
              keyboardType="number-pad"
              placeholder="2000"
              placeholderTextColor={c.textMuted}
            />
            <Text style={{ fontSize: 14, color: c.textSecondary, fontWeight: "600" }}>kcal / 일</Text>
          </View>

          {/* 앱 설정 */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 10, marginTop: 20 }}>앱 설정</Text>

          {/* 무게 단위 */}
          <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="dumbbell" size={16} color={c.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary }}>무게 단위</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['kg', 'lbs'] as const).map(u => (
                <TouchableOpacity
                  key={u}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                    backgroundColor: weightUnit === u ? c.primary : c.surfaceAlt,
                  }}
                  onPress={() => setWeightUnit(u)}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: weightUnit === u ? c.surface : c.textSecondary }}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 운동 부위 선택 표시 */}
          <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
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
              activeOpacity={0.8}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface,
                transform: [{ translateX: showBodypartSelector ? 20 : 0 }],
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
              }} />
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
            activeOpacity={0.8}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.onAccent }}>
              {isSaving ? "저장 중..." : "저장하기"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
