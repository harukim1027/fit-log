import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Icon } from "../../components/AppIcons";
import { useDietStore } from "../../store/dietStore";
import { Header, Button } from "../../components/ui";
import { useLocalSearchParams } from "expo-router";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";

const CORNER = 24;
const cornerBase = {
  position: 'absolute' as const,
  width: CORNER,
  height: CORNER,
  borderColor: '#fff',
  borderWidth: 3,
};

export default function BarcodeScanModal() {
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
      Alert.alert("추가 완료", food.name + "이(가) 추가됐어요!", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("찾을 수 없어요", "해당 바코드의 식품 정보를 찾지 못했어요", [
        { text: "다시 시도", onPress: () => setScanned(false) },
        { text: "닫기", onPress: () => router.back() },
      ]);
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
          <Button title="권한 허용" onPress={requestPermission} />
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
          <TouchableOpacity
            className="self-end mr-5 bg-black/50 rounded-[20px] p-2"
            onPress={() => router.back()}>
            <Text style={{ fontSize: 22, color: '#fff', fontWeight: '700' }}>✕</Text>
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
            <TouchableOpacity
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
