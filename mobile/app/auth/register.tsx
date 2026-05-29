import React from "react";
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Button } from "../../components/ui";
import { Icon } from "../../components/AppIcons";

const SHADOW_SM = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 3,
};

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EFFAF4' }} edges={["bottom"]}>
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
        <TouchableOpacity
          style={[{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, SHADOW_SM]}
          onPress={() => router.back()}>
          <Icon name="chevronLeft" size={20} color="#7E9A90" />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#34514A' }}>회원가입</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 13, color: '#7E9A90', fontWeight: '700', textAlign: 'center', marginBottom: 28 }}>
            FitLog와 함께 건강한 루틴을 만들어요
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

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 14 }}
            onPress={() => router.back()}>
            <Text style={{ fontSize: 13, color: '#7E9A90' }}>
              이미 계정이 있으신가요?{'  '}
              <Text style={{ fontWeight: '800', color: '#2E9E83' }}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
