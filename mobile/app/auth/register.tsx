import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { showCuteAlert } from "../../components/CuteAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header, Input } from "../../components/ui";
import { Button } from "../../design-system";
import { LogoMark } from "../../components/AppIcons";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password)
      return showCuteAlert({ preset: 'emptyInput', message: '이름, 이메일, 비밀번호를\n모두 입력해 주세요.' });
    try {
      await register(email, password, name);
      showCuteAlert({ preset: 'signupSuccess', onPrimary: () => router.replace("/(tabs)" as any) });
    } catch (e: any) {
      if (e.status === 409) {
        showCuteAlert({ preset: 'emailDup', onSecondary: () => router.push("/auth/login" as any) });
      } else if (!e.status) {
        showCuteAlert({ preset: 'network', onPrimary: handleRegister });
      } else {
        showCuteAlert({ icon: 'alert', tone: 'danger', title: '회원가입 실패', message: e.message, buttons: [{ label: '확인', style: 'primary' }] });
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header title="회원가입" showBack />
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={180}
        extraHeight={180}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
        style={{ flex: 1 }}>
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
            onPress={handleRegister}
            loading={isLoading}
            disabled={!name.trim() || !email.trim() || !password}
            style={{ marginTop: 8 }}>
            회원가입
          </Button>
          <TouchableOpacity activeOpacity={0.8} className="items-center mt-4" onPress={() => router.back()}>
            <Text className="text-sm text-text-secondary">
              이미 계정이 있으신가요? <Text className="text-primary font-bold">로그인</Text>
            </Text>
          </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
