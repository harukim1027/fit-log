import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header, Input, Button } from "../../components/ui";

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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header title="FitLog" />
      <View className="flex-1 justify-center px-8">
        <Text className="text-base text-text-secondary text-center mb-12">
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
          className="items-center mt-3"
          onPress={() => router.push("/auth/register" as any)}>
          <Text className="text-sm text-text-secondary">
            계정이 없으신가요? 회원가입
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
