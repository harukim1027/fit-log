import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { showCuteAlert } from "../../components/CuteAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGoBack } from "../../hooks/useGoBack";
import { useState, useEffect } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Icon } from "../../components/AppIcons";
import { useDietStore } from "../../store/dietStore";
import { Button, Header, IconButton } from "../../design-system";
import { useLocalSearchParams } from "expo-router";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";
import { useColors } from "../../constants/colors";

// 카메라 위 오버레이용. index.tsx / routine-manage.tsx와 같은 값·같은 관례.
const SCRIM = "rgba(0,0,0,0.5)";

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
  // 앱 내 진입점은 add-food 뿐이지만, 폴백 상황에는 그 화면도 스택에 없다.
  // 파라미터(mealType·date) 없이 add-food 를 새로 여는 것은 "뒤로"가 아니라
  // "앞으로"라 홈으로 보낸다.
  const goBack = useGoBack("/");
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
      showCuteAlert({ icon: 'check', tone: 'ok', title: '추가 완료', message: food.name + '이(가) 추가됐어요!', buttons: [{ label: '확인', style: 'primary', onPress: goBack }] });
    } catch {
      showCuteAlert({ icon: 'wifi', tone: 'muted', title: '찾을 수 없어요', message: '해당 바코드의 식품 정보를 찾지 못했어요', buttons: [{ label: '닫기', style: 'soft', onPress: goBack }, { label: '다시 시도', style: 'primary', onPress: () => setScanned(false) }] });
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
          {/* 카메라 위에 얹는 닫기 버튼. IconButton의 filled 기본 배경(surfaceAlt)은
              카메라 화면에서 보이지 않으므로 스크림으로 덮는다.
              박스는 42 → 44(+2), 우측 여백은 mr-5(17.33) → 20(+2.67). 둘 다
              onLayout 실측값이다. 계획서의 "이미 44"는 p-2를 8로 본 오산이었다 —
              NativeWind rem이 14라 p-2는 7이고 mr-5는 17.5다. */}
          <IconButton
            accessibilityLabel="바코드 스캔 닫기"
            onPress={goBack}
            variant="filled"
            style={{
              alignSelf: "flex-end",
              marginRight: 20,
              backgroundColor: SCRIM,
              borderRadius: 20,
            }}>
            <Icon name="close" size={28} color={c.surface} />
          </IconButton>

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
