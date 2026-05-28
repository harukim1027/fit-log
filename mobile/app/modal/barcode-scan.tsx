import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useDietStore } from "../../store/dietStore";
import { Header } from "../../components/ui";
import { useLocalSearchParams } from "expo-router";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";

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
      <View style={[s.container, { backgroundColor: Colors.background }]}>
        <Header title="바코드 스캔" showClose />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={s.permText}>카메라 권한이 필요해요</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>권한 허용</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CameraView
        style={s.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"],
        }}>
        <SafeAreaView style={s.overlay} edges={["top", "bottom"]}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={s.scanArea}>
            <View style={[s.corner, s.topLeft]} />
            <View style={[s.corner, s.topRight]} />
            <View style={[s.corner, s.bottomLeft]} />
            <View style={[s.corner, s.bottomRight]} />
          </View>

          <Text style={s.hint}>
            {loading
              ? "식품 정보 불러오는 중..."
              : "바코드를 스캔 영역에 맞춰주세요"}
          </Text>

          {scanned && !loading && (
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => setScanned(false)}>
              <Text style={s.retryText}>다시 스캔</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const CORNER = 24;
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginRight: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  scanArea: { width: 260, height: 160, position: "relative" },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#fff",
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  permText: {
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 40,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignSelf: "center",
  },
  permBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
