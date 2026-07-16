import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header, Card, Input, Button, NumberPad } from "../../components/ui";
import { Stepper } from "../../components/ui/Stepper";
import { useState, useEffect, useCallback } from "react";
import { Icon, HeartIcon, BowlMascot, EmptyMascot } from "../../components/AppIcons";
import { showCuteAlert } from "../../components/CuteAlert";
import { useDietStore } from "../../store/dietStore";
import { useFavoriteStore } from "../../store/favoriteStore";
import { MEAL_LABELS } from "../../constants";
import { useColors } from "../../constants/colors";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";
import * as ImagePicker from 'expo-image-picker';

type Tab = "search" | "favorites" | "photo" | "manual";

const TABS: { key: Tab; label: string }[] = [
  { key: "search", label: "검색" },
  { key: "favorites", label: "즐겨찾기" },
  { key: "photo", label: "사진" },
  { key: "manual", label: "직접 입력" },
];

interface CustomFood {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
  isPublic: boolean;
  copyCount: number;
  createdAt: string;
}

export default function AddFoodModal() {
  const c = useColors();
  const router = useRouter();
  const keyboardHeight = useKeyboardHeight();
  const params = useLocalSearchParams<{ mealType: MealType; snackCardId?: string; date?: string }>();
  const mealType = params.mealType ?? "breakfast";
  const snackCardId = params.snackCardId;
  const date = params.date;
  const { addFood } = useDietStore();
  const { favorites, fetchFavorites, addFavorite, removeFavorite, isFavorite } =
    useFavoriteStore();

  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState<any | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualAmount, setManualAmount] = useState("100");
  const [manualIsPublic, setManualIsPublic] = useState(false);

  const [myCustomFoods, setMyCustomFoods] = useState<CustomFood[]>([]);
  const [customFoodsLoading, setCustomFoodsLoading] = useState(false);

  type PadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setPadConfig({ value, decimal, suffix, onConfirm });

  useEffect(() => {
    fetchFavorites();
  }, []);

  const loadMyCustomFoods = useCallback(async () => {
    setCustomFoodsLoading(true);
    try {
      const res = await apiClient.get('/food/custom');
      setMyCustomFoods(res.data ?? []);
    } catch {
      // silent — favorites tab still shows
    } finally {
      setCustomFoodsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'favorites') loadMyCustomFoods();
  }, [tab]);

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    setSelected(null);
    setHasSearched(false);
    try {
      const res = await apiClient.get("/food/search", { params: { q } });
      setResults(res.data ?? []);
      setHasSearched(true);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || '알 수 없는 오류';
      console.error('[식품검색]', status, msg, e);
      if (status === 401) {
        showCuteAlert({ icon: 'alert', tone: 'danger', title: '인증 오류', message: '다시 로그인해주세요', buttons: [{ label: '확인', style: 'primary' }] });
      } else if (!e?.response) {
        showCuteAlert({ preset: 'network' });
      } else {
        showCuteAlert({ icon: 'alert', tone: 'danger', title: '검색 실패', message: msg, buttons: [{ label: '확인', style: 'primary' }] });
      }
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = (food: any, amt: number) => {
    const ratio = amt / 100;
    const item: FoodItem = {
      id: Date.now().toString(),
      name: food.name || food.foodName,
      calories: Math.round(food.calories * ratio),
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      amount: amt,
      unit: "g",
    };
    addFood(mealType, item, date, snackCardId);
    router.back();
  };

  const handleAddSearch = () => {
    if (!selected) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '식품을 선택해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showCuteAlert({ icon: 'pencil', tone: 'warn', title: '올바른 양을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    handleAddFood(selected, amt);
  };

  const handleToggleFavorite = async (food: any) => {
    if (isFavorite(food.name || food.foodName)) {
      const fav = favorites.find(
        (f) => f.foodName === (food.name || food.foodName)
      );
      if (fav) await removeFavorite(fav.id);
    } else {
      await addFavorite({
        foodName: food.name || food.foodName,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        amount: 100,
        unit: "g",
      });
    }
  };

  const handleCopyCustomFood = async (customFoodId: string, foodName: string) => {
    try {
      await apiClient.post(`/food/custom/${customFoodId}/copy`);
      showCuteAlert({ icon: 'check', tone: 'ok', title: '추가 완료', message: `"${foodName}"을(를) 내 식품에 추가했어요`, buttons: [{ label: '확인', style: 'primary' }] });
      if (tab === 'favorites') loadMyCustomFoods();
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '실패', message: '가져오기에 실패했어요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };

  const handleToggleCustomFoodPublic = async (food: CustomFood) => {
    try {
      const updated = await apiClient.patch(`/food/custom/${food.id}`, { isPublic: !food.isPublic });
      setMyCustomFoods(prev => prev.map(f => f.id === food.id ? { ...f, isPublic: updated.data.isPublic } : f));
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '실패', message: '공개 설정 변경에 실패했어요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };

  const handleDeleteCustomFood = (food: CustomFood) => {
    showCuteAlert({ icon: 'trash', tone: 'danger', title: '식품 삭제', message: `"${food.foodName}"을(를) 삭제할까요?`, buttons: [
      { label: '취소', style: 'soft' },
      { label: '삭제', style: 'primary', onPress: async () => {
        try {
          await apiClient.delete(`/food/custom/${food.id}`);
          setMyCustomFoods(prev => prev.filter(f => f.id !== food.id));
        } catch {
          showCuteAlert({ icon: 'alert', tone: 'danger', title: '실패', message: '삭제에 실패했어요', buttons: [{ label: '확인', style: 'primary' }] });
        }
      }},
    ]});
  };

  const pickImageFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showCuteAlert({ icon: 'alert', tone: 'warn', title: '권한 필요', message: '사진 접근 권한이 필요해요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      analyzePhoto(res.assets[0].base64 ?? '');
    }
  };

  const pickImageFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showCuteAlert({ icon: 'alert', tone: 'warn', title: '권한 필요', message: '카메라 접근 권한이 필요해요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      analyzePhoto(res.assets[0].base64 ?? '');
    }
  };

  const analyzePhoto = async (base64: string) => {
    if (!base64) return;
    setPhotoAnalyzing(true);
    setPhotoResult(null);
    try {
      const res = await apiClient.post('/food/analyze-image', { base64 });
      setPhotoResult({ ...res.data, amount: String(res.data.amount || 100) });
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'warn', title: '분석 실패', message: '음식을 인식하지 못했어요. 다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    } finally {
      setPhotoAnalyzing(false);
    }
  };

  const handleAddPhotoResult = () => {
    if (!photoResult) return;
    const food: FoodItem = {
      id: Date.now().toString(),
      name: photoResult.name,
      calories: Math.round(parseFloat(photoResult.calories) || 0),
      protein: parseFloat(photoResult.protein) || 0,
      carbs: parseFloat(photoResult.carbs) || 0,
      fat: parseFloat(photoResult.fat) || 0,
      amount: parseFloat(photoResult.amount) || 100,
      unit: photoResult.unit || 'g',
    };
    addFood(mealType, food, date);
    router.back();
  };

  const handleAddManual = async () => {
    if (!manualName.trim()) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '식품명을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const cal = parseFloat(manualCalories);
    if (isNaN(cal) || cal < 0) { showCuteAlert({ icon: 'pencil', tone: 'warn', title: '올바른 칼로리를 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const food: FoodItem = {
      id: Date.now().toString(),
      name: manualName,
      calories: Math.round(cal),
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      amount: parseFloat(manualAmount) || 100,
      unit: "g",
    };
    addFood(mealType, food, date);
    // Save to custom foods in background
    apiClient.post('/food/custom', {
      foodName: manualName,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      amount: food.amount,
      unit: food.unit,
      isPublic: manualIsPublic,
    }).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header
        title="식품 추가"
        subtitle={date ? `${date} · ${MEAL_LABELS[mealType]}` : MEAL_LABELS[mealType] + "에 추가"}
        showClose
        rightElement={
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-primary/20 px-3 py-[7px] rounded-[20px]"
            onPress={() =>
              router.push({
                pathname: "/modal/barcode-scan",
                params: { mealType },
              } as any)
            }>
            <Icon name="barcode" size={20} color={c.primary} />
            <Text className="text-sm font-bold text-primary">바코드</Text>
          </TouchableOpacity>
        }
      />

      <View className="px-5 flex-1">
        {/* 탭 */}
        <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 999, padding: 4, marginBottom: 16, gap: 4 }}>
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 999 },
                  isActive ? { backgroundColor: c.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 2 } : undefined,
                ]}
                onPress={() => setTab(t.key)}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? c.success : c.textMuted }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === "search" && (
          <>
            <View className="flex-row gap-2 mb-3 items-center">
              <RNTextInput
                className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 text-text-primary text-[15px]"
                placeholder="식품명 검색..."
                placeholderTextColor={c.textMuted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-diet rounded-2xl px-[18px] py-3 justify-center"
                onPress={handleSearch}>
                {loading ? (
                  <ActivityIndicator color={c.surface} size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">검색</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
              className="flex-1">
              {!hasSearched && !loading && (
                <View className="items-center mt-10 gap-3">
                  <BowlMascot size={64} />
                  <Text className="text-center text-text-muted text-sm leading-6">
                    먹은 걸 검색해볼까요?{"\n"}한글은 닭가슴살, 영어는 chicken
                  </Text>
                </View>
              )}
              {loading && (
                <View className="items-center mt-10 gap-3">
                  <ActivityIndicator size="large" color={c.primary} />
                  <Text className="text-sm text-text-muted">검색 중...</Text>
                </View>
              )}
              {hasSearched && !loading && results.length === 0 && (
                <View className="items-center mt-10 gap-3">
                  <EmptyMascot size={64} />
                  <Text className="text-center text-text-muted text-sm leading-6">
                    검색 결과가 없어요{"\n"}다른 이름으로 검색해보세요
                  </Text>
                </View>
              )}
              {results.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  onPress={() => setSelected(food)}
                  activeOpacity={0.7}>
                  <Card
                    className={[
                      "mb-2",
                      selected?.id === food.id ? "bg-diet/10" : "",
                    ].join(" ")}>
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap mb-0.5">
                          <Text className="text-[15px] font-semibold text-text-primary">
                            {food.name}
                          </Text>
                          {food.source === 'my' && (
                            <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: c.success }}>내 식품</Text>
                            </View>
                          )}
                          {food.source === 'custom' && (
                            <View style={{ backgroundColor: '#EDE9F8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#7C5CBF' }}>공유 식품</Text>
                            </View>
                          )}
                        </View>
                        {food.brand ? (
                          <Text className="text-xs text-primary mt-0.5">{food.brand}</Text>
                        ) : null}
                        <Text className="text-xs text-text-secondary mt-0.5">
                          단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g
                        </Text>
                      </View>
                      <View className="items-end gap-1 ml-2">
                        <Text className="text-sm font-bold text-diet">
                          {food.calories}kcal
                        </Text>
                        {food.source === 'custom' ? (
                          <TouchableOpacity
                            style={{ backgroundColor: '#EDE9F8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
                            onPress={() => handleCopyCustomFood(food.customFoodId, food.name)}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#7C5CBF' }}>가져오기</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => handleToggleFavorite(food)}>
                            <HeartIcon
                              filled={isFavorite(food.name)}
                              size={20}
                              color={isFavorite(food.name) ? c.secondary : c.textMuted}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selected && (
              <Card className="my-3">
                <Text className="text-sm text-text-secondary mb-2 font-semibold">
                  {selected.name} 양 입력
                </Text>
                <Stepper value={amount} onChange={setAmount} step={10} min={0} suffix="g" />
                <View className="flex-row gap-2 mt-3">
                  {[50, 100, 150, 200].map((g) => {
                    const on = amount === String(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        className={[
                          "flex-1 rounded-full py-2 items-center border",
                          on ? "bg-diet/10 border-diet" : "bg-surface-alt border-transparent",
                        ].join(" ")}
                        onPress={() => setAmount(String(g))}>
                        <Text className={on ? "text-diet font-bold text-xs" : "text-text-secondary font-semibold text-xs"}>
                          {g}g
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="text-base text-diet text-center font-extrabold mt-3">
                  {Math.round(
                    (selected.calories * parseFloat(amount || "0")) / 100
                  )}{" "}kcal
                </Text>
              </Card>
            )}
            <Button
              title="추가하기"
              onPress={handleAddSearch}
              fullWidth
              className="mt-2 mb-2"
            />
          </>
        )}

        {tab === "photo" && (
          <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }} className="flex-1">
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 8 }}
                onPress={pickImageFromCamera}
                activeOpacity={0.8}>
                <Icon name="camera" size={28} color={c.success} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.success }}>촬영하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: c.warning + '18', borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 8 }}
                onPress={pickImageFromGallery}
                activeOpacity={0.8}>
                <Icon name="gallery" size={28} color={c.warning} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: c.warning }}>갤러리</Text>
              </TouchableOpacity>
            </View>

            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={{ width: '100%', height: 200, borderRadius: 20, marginBottom: 16, backgroundColor: c.surfaceAlt }}
                resizeMode="cover"
              />
            )}

            {photoAnalyzing && (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary }}>AI가 음식을 분석 중이에요...</Text>
              </View>
            )}

            {photoResult && !photoAnalyzing && (
              <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: c.textSecondary, marginBottom: 12 }}>분석 결과 (수정 가능)</Text>

                {[
                  { label: '음식명', key: 'name', numeric: false },
                  { label: '칼로리 (kcal)', key: 'calories', numeric: true, suffix: 'kcal', decimal: false },
                  { label: '탄수화물 (g)', key: 'carbs', numeric: true, suffix: 'g' },
                  { label: '단백질 (g)', key: 'protein', numeric: true, suffix: 'g' },
                  { label: '지방 (g)', key: 'fat', numeric: true, suffix: 'g' },
                  { label: '양 (g)', key: 'amount', numeric: true, suffix: 'g' },
                ].map(({ label, key, numeric, suffix: fSuffix, decimal: fDecimal }) => (
                  <View key={key} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 4 }}>{label}</Text>
                    {numeric ? (
                      <TouchableOpacity
                        style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center' }}
                        onPress={() => openPad(String(photoResult[key] ?? ''), fDecimal !== false, fSuffix ?? '', v => setPhotoResult((p: any) => ({ ...p, [key]: v })))}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: photoResult[key] ? c.textPrimary : c.textMuted }}>
                          {photoResult[key] || '0'}{fSuffix ? <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>{' '}{fSuffix}</Text> : null}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <RNTextInput
                        style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 15, fontWeight: '700', color: c.textPrimary }}
                        value={String(photoResult[key] ?? '')}
                        onChangeText={v => setPhotoResult((p: any) => ({ ...p, [key]: v }))}
                      />
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={{ backgroundColor: c.primary, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
                  onPress={handleAddPhotoResult}
                  activeOpacity={0.8}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: c.onAccent }}>추가하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {!photoUri && !photoAnalyzing && (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
                <Icon name="camera" size={56} color={c.textMuted} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textMuted, textAlign: 'center' }}>
                  음식 사진을 찍거나 갤러리에서{'\n'}선택하면 AI가 영양성분을 분석해요
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {tab === "favorites" && (
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
            className="flex-1">
            {/* 내가 등록한 식품 섹션 */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary, marginBottom: 10 }}>
                내가 등록한 식품
              </Text>
              {customFoodsLoading ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : myCustomFoods.length === 0 ? (
                <Text style={{ fontSize: 13, color: c.textMuted, fontWeight: '600' }}>
                  직접 입력한 식품이 없어요
                </Text>
              ) : (
                myCustomFoods.map((food) => (
                  <Card key={food.id} className="mb-2">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-0.5">
                          <Text className="text-[15px] font-semibold text-text-primary">
                            {food.foodName}
                          </Text>
                          {food.isPublic && (
                            <View style={{ backgroundColor: '#EDE9F8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#7C5CBF' }}>
                                공개 · {food.copyCount}명 가져감
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-text-secondary">
                          단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>
                            {food.isPublic ? '공개 중' : '나만 보기'}
                          </Text>
                          <Switch
                            value={food.isPublic}
                            onValueChange={() => handleToggleCustomFoodPublic(food)}
                            trackColor={{ false: '#E7F0EE', true: '#A8D5C4' }}
                            thumbColor={food.isPublic ? c.success : c.textMuted}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                          />
                        </View>
                      </View>
                      <View className="items-end gap-2 ml-2">
                        <Text className="text-sm font-bold text-diet">{food.calories}kcal</Text>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            style={{ backgroundColor: c.surfaceAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
                            onPress={() => handleAddFood({ name: food.foodName, ...food }, food.amount)}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: c.success }}>추가</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ backgroundColor: '#FFE8E8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}
                            onPress={() => handleDeleteCustomFood(food)}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#E05C5C' }}>삭제</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </View>

            {/* 즐겨찾기 섹션 */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary, marginBottom: 10 }}>
              즐겨찾기
            </Text>
            {favorites.length === 0 ? (
              <View className="items-center mt-4 gap-3">
                <EmptyMascot size={64} />
                <Text className="text-center text-text-muted text-sm leading-6">
                  즐겨찾기한 식품이 아직 없어요{"\n"}검색 후 하트를 눌러 담아보세요
                </Text>
              </View>
            ) : (
              favorites.map((food) => (
                <Card key={food.id} className="flex-row justify-between items-center mb-2">
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-text-primary">
                      {food.foodName}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5">
                      단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-diet">
                      {food.calories}kcal
                    </Text>
                    <View className="flex-row gap-2 items-center">
                      <TouchableOpacity
                        className="bg-diet/30 rounded-xl px-3 py-1"
                        onPress={() =>
                          handleAddFood({ name: food.foodName, ...food }, food.amount)
                        }>
                        <Text className="text-xs text-diet font-bold">추가</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeFavorite(food.id)}>
                        <HeartIcon filled size={20} color={c.secondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {tab === "manual" && (
          <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}>
            <View className="gap-3 mb-4">
              <Input label="식품명 *" value={manualName} onChangeText={setManualName} placeholder="예: 삶은 계란" />
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary, marginBottom: 6 }}>칼로리 (kcal) *</Text>
                <TouchableOpacity
                  style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' }}
                  onPress={() => openPad(manualCalories, false, 'kcal', setManualCalories)}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: manualCalories ? c.textPrimary : c.textMuted }}>
                    {manualCalories || '0'}<Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>{' '}kcal</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
                {([
                  { label: '탄수화물 (g)', value: manualCarbs, set: setManualCarbs },
                  { label: '단백질 (g)', value: manualProtein, set: setManualProtein },
                  { label: '지방 (g)', value: manualFat, set: setManualFat },
                ] as const).map(({ label, value, set }) => (
                  <View key={label} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary, marginBottom: 6 }}>{label}</Text>
                    <TouchableOpacity
                      style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, paddingVertical: 12, alignItems: 'center' }}
                      onPress={() => openPad(value, true, 'g', set)}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: value ? c.textPrimary : c.textMuted }}>
                        {value || '0'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary, marginBottom: 6 }}>양 (g)</Text>
                <TouchableOpacity
                  style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' }}
                  onPress={() => openPad(manualAmount, false, 'g', setManualAmount)}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary }}>
                    {manualAmount || '100'}<Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>{' '}g</Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 공개 설정 */}
              <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary }}>
                    {manualIsPublic ? '다른 사람과 공유' : '나만 보기'}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>
                    {manualIsPublic ? '검색에서 다른 사용자도 볼 수 있어요' : '내 식품 목록에만 저장돼요'}
                  </Text>
                </View>
                <Switch
                  value={manualIsPublic}
                  onValueChange={setManualIsPublic}
                  trackColor={{ false: '#E7F0EE', true: '#A8D5C4' }}
                  thumbColor={manualIsPublic ? c.success : c.textMuted}
                />
              </View>
            </View>
            <Button title="추가하기" onPress={handleAddManual} fullWidth className="mb-2" />
          </ScrollView>
        )}
      </View>

      <NumberPad
        visible={padConfig !== null}
        value={padConfig?.value ?? '0'}
        decimal={padConfig?.decimal ?? true}
        suffix={padConfig?.suffix}
        onConfirm={v => { padConfig?.onConfirm(v); setPadConfig(null); }}
        onCancel={() => setPadConfig(null)}
      />
    </SafeAreaView>
  );
}
