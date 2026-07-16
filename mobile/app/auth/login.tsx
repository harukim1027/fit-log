import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, AppState } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "../../store/authStore";
import { showCuteAlert } from "../../components/CuteAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Button } from "../../components/ui";
import { LogoMark, Icon } from "../../components/AppIcons";

WebBrowser.maybeCompleteAuthSession();

/**
 * Renders the login screen with credential and Google authentication options.
 */
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
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) {
        loginWithGoogle(accessToken)
          .then(() => router.replace("/(tabs)"))
          .catch((e: any) => showCuteAlert({ preset: 'network', message: e.message }))
          .finally(() => setSocialLoading(null));
      } else {
        setSocialLoading(null);
      }
    } else {
      // cancel / dismiss / error / locked — 모두 로딩 해제
      setSocialLoading(null);
    }
  }, [googleResponse]);

  // 앱 포그라운드 복귀 시 로딩 상태 안전망 초기화
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setSocialLoading(null);
    });
    return () => sub.remove();
  }, []);

  const handleLogin = async () => {
    if (!email || !password)
      return showCuteAlert({ preset: 'emptyInput' });
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (!e.status) {
        showCuteAlert({ preset: 'network', onPrimary: handleLogin });
      } else {
        showCuteAlert({ preset: 'loginFail' });
      }
    }
  };

  const handleGooglePress = async () => {
    setSocialLoading("google");
    await googlePromptAsync();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={180}
        extraHeight={180}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32 }}
        style={{ flex: 1 }}>
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
            disabled={!email.trim() || !password}
            fullWidth
            className="mt-2"
          />
          <TouchableOpacity activeOpacity={0.8}
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
          <TouchableOpacity activeOpacity={0.8}
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
          <TouchableOpacity activeOpacity={0.8}
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
          <TouchableOpacity activeOpacity={0.8}
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
      </KeyboardAwareScrollView>
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
  return <Icon name="chat" size={18} color="#3A1D1D" />;
}

function NaverIcon() {
  return (
    <View style={{ width: 20, height: 20, backgroundColor: "#03C75A", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13, lineHeight: 14 }}>N</Text>
    </View>
  );
}
