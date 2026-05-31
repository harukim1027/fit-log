import React from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Button } from "../../components/ui";
import { LogoMark } from "../../components/AppIcons";

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
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="absolute -top-12 -right-10 w-52 h-52 rounded-full bg-primary/10" />
      <View className="absolute top-40 -left-12 w-40 h-40 rounded-full bg-warning/10" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
