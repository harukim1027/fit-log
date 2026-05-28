import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/ui";

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
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header title="FitLog" />
      <View style={s.formWrapper}>
      <Text style={s.subtitle}>식단과 운동을 한 번에</Text>
      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="이메일"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={s.input}
          placeholder="비밀번호"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={s.btn}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>로그인</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => router.push("/auth/register" as any)}>
          <Text style={s.linkText}>계정이 없으신가요? 회원가입</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  formWrapper: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 48,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  linkBtn: { alignItems: "center", marginTop: 8 },
  linkText: { fontSize: 14, color: Colors.textSecondary },
});
