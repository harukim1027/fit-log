import React from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Button } from "../../components/ui";
import { Icon, FaceAvatar } from "../../components/AppIcons";

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EFFAF4' }} edges={["bottom"]}>
      {/* 배경 블롭 */}
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#CFF3E7', top: -60, right: -50, opacity: 0.5 }} />
      <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFE6CC', bottom: 200, left: -40, opacity: 0.4 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          {/* 민트 로고 */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={[{
              width: 72, height: 72, borderRadius: 26, backgroundColor: '#6FD3B6',
              alignItems: 'center', justifyContent: 'center',
              transform: [{ rotate: '-5deg' }], marginBottom: 14,
            }, SHADOW]}>
              <Icon name="dumbbell" size={34} color="#fff" />
            </View>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#34514A', letterSpacing: -0.5 }}>FitLog</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#7E9A90', marginTop: 5 }}>식단과 운동을 한 번에</Text>
          </View>

          {/* 인풋 */}
          <View style={{ gap: 0 }}>
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
          </View>

          <Button
            title="로그인"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            className="mt-2"
          />

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 14 }}
            onPress={() => router.push("/auth/register" as any)}>
            <Text style={{ fontSize: 13, color: '#7E9A90' }}>
              계정이 없으신가요?{'  '}
              <Text style={{ fontWeight: '800', color: '#2E9E83' }}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
