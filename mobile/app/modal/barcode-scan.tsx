import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { showCuteAlert } from "../../components/CuteAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Icon } from "../../components/AppIcons";
import { useDietStore } from "../../store/dietStore";
import { Button, Header } from "../../design-system";
import { useLocalSearchParams } from "expo-router";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";
import { useColors } from "../../constants/colors";

const CORNER = 24;

export default function BarcodeScanModal() {
  const c = useColors();
  const cornerBase = {
    position: 'absolute' as const,
    width: CORNER,
    height: CORNER,
    borderColor: c.surface,
    borderWidth: 3,
  };
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType: MealType }>();
  const mealType = params.mealType ?? "breakfast";
  const { addFood } = useDietStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const res = await apiClient.get("/food/barcode/" + data);
      const food = res.data;
      const item: FoodItem = {
        id: Date.now().toString(),
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        amount: 100,
        unit: "g",
      };
      addFood(mealType, item);
      showCuteAlert({ icon: 'check', tone: 'ok', title: '추가 완료', message: food.name + '이(가) 추가됐어요!', buttons: [{ label: '확인', style: 'primary', onPress: () => router.back() }] });
    } catch {
      showCuteAlert({ icon: 'wifi', tone: 'muted', title: '찾을 수 없어요', message: '해당 바코드의 식품 정보를 찾지 못했어요', buttons: [{ label: '닫기', style: 'soft', onPress: () => router.back() }, { label: '다시 시도', style: 'primary', onPress: () => setScanned(false) }] });
    } finally {
      setLoading(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-background">
        <Header title="바코드 스캔" showClose />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-text-primary text-center mb-5 mt-10">
            카메라 권한이 필요해요
          </Text>
          {/* 8곳 중 유일하게 전체 폭이 아닌 버튼. 새 Button은 전체 폭이
              기본이라 alignSelf로 되돌리고, 기존 px-8(32)과 맞춰 좌우 패딩을
              준다. 부모가 items-center라 alignSelf 없이는 stretch가 이긴다. */}
          <Button
            onPress={requestPermission}
            style={{ alignSelf: "center", paddingHorizontal: 32 }}>
            권한 허용
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        className="flex-1"
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
        }}>
        <SafeAreaView
          style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 40 }}
          edges={["top", "bottom"]}>
          <TouchableOpacity activeOpacity={0.8}
            className="self-end mr-5 bg-black/50 rounded-[20px] p-2"
            onPress={() => router.back()}>
            <Icon name="close" size={28} color={c.surface} />
          </TouchableOpacity>

          <View style={{ width: 260, height: 160, position: 'relative' }}>
            <View style={[cornerBase, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }]} />
            <View style={[cornerBase, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }]} />
            <View style={[cornerBase, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }]} />
            <View style={[cornerBase, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }]} />
          </View>

          <Text className="text-white text-sm text-center bg-black/50 px-5 py-2 rounded-[20px]">
            {loading
              ? "식품 정보 불러오는 중..."
              : "바코드를 스캔 영역에 맞춰주세요"}
          </Text>

          {scanned && !loading && (
            <TouchableOpacity activeOpacity={0.8}
              className="bg-primary rounded-2xl px-8 py-3"
              onPress={() => setScanned(false)}>
              <Text className="text-white text-[15px] font-bold">다시 스캔</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
