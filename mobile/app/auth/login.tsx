import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Button } from "../../components/ui";
import { LogoMark } from "../../components/AppIcons";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) {
        loginWithGoogle(accessToken)
          .then(() => router.replace("/(tabs)"))
          .catch((e: any) => Alert.alert("Google 로그인 실패", e.message))
          .finally(() => setSocialLoading(null));
      }
    } else if (googleResponse?.type === "error" || googleResponse?.type === "dismiss") {
      setSocialLoading(null);
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("이메일과 비밀번호를 입력해주세요");
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("로그인 실패", e.message);
    }
  };

  const handleGooglePress = async () => {
    setSocialLoading("google");
    await googlePromptAsync();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <BackgroundBlobs />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <View className="items-center mb-3">
            <View style={{ transform: [{ rotate: "-5deg" }] }}>
              <LogoMark size={88} />
            </View>
          </View>
          <Text className="text-[30px] font-extrabold text-text-primary text-center">
            FitLog
          </Text>
          <Text className="text-base text-text-secondary text-center mb-10">
            식단과 운동을 한 번에
          </Text>
          <Input
            placeholder="이메일"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            placeholder="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            title="로그인"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            className="mt-2"
          />
          <TouchableOpacity
            className="items-center mt-4"
            onPress={() => router.push("/auth/register" as any)}>
            <Text className="text-sm text-text-secondary">
              계정이 없으신가요? <Text className="text-primary font-bold">회원가입</Text>
            </Text>
          </TouchableOpacity>

          {/* 소셜 로그인 구분선 */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border" />
            <Text className="mx-4 text-sm text-text-secondary">또는</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Google 로그인 */}
          <TouchableOpacity
            onPress={handleGooglePress}
            disabled={socialLoading === "google"}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#dadce0",
              borderRadius: 12,
              paddingVertical: 13,
              marginBottom: 12,
              opacity: socialLoading === "google" ? 0.6 : 1,
            }}>
            <GoogleIcon />
            <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: "600", color: "#3c4043" }}>
              {socialLoading === "google" ? "연결 중..." : "Google로 계속하기"}
            </Text>
          </TouchableOpacity>

          {/* Kakao 로그인 (준비 중) */}
          <TouchableOpacity
            disabled
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FEE500",
              borderRadius: 12,
              paddingVertical: 13,
              marginBottom: 12,
              opacity: 0.45,
            }}>
            <KakaoIcon />
            <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: "600", color: "#3C1E1E" }}>
              카카오로 계속하기
            </Text>
          </TouchableOpacity>

          {/* Naver 로그인 (준비 중) */}
          <TouchableOpacity
            disabled
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#03C75A",
              borderRadius: 12,
              paddingVertical: 13,
              marginBottom: 8,
              opacity: 0.45,
            }}>
            <NaverIcon />
            <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: "600", color: "#fff" }}>
              네이버로 계속하기
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20 }}>
      <Text style={{ fontSize: 17 }}>G</Text>
    </View>
  );
}

function KakaoIcon() {
  return <Text style={{ fontSize: 18 }}>💬</Text>;
}

function NaverIcon() {
  return (
    <View style={{ width: 20, height: 20, backgroundColor: "#03C75A", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13, lineHeight: 14 }}>N</Text>
    </View>
  );
}
