import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header, Input, Button } from "../../components/ui";
import { LogoMark } from "../../components/AppIcons";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password)
      return Alert.alert("모든 항목을 입력해주세요");
    try {
      await register(email, password, name);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("회원가입 실패", e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header title="회원가입" showBack />
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-3">
          <View style={{ transform: [{ rotate: "-5deg" }] }}>
            <LogoMark size={68} />
          </View>
        </View>
        <Text className="text-base text-text-secondary text-center mb-10">
          FitLog와 함께 시작해요
        </Text>
        <Input placeholder="이름" value={name} onChangeText={setName} />
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
          title="회원가입"
          onPress={handleRegister}
          loading={isLoading}
          fullWidth
          className="mt-2"
        />
        <TouchableOpacity className="items-center mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-text-secondary">
            이미 계정이 있으신가요? <Text className="text-primary font-bold">로그인</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
