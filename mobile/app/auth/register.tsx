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
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header title="회원가입" showBack />
      <View style={s.formWrapper}>
      <Text style={s.subtitle}>FitLog와 함께 시작해요</Text>
      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="이름"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
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
          onPress={handleRegister}
          activeOpacity={0.8}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>회원가입</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s.linkBtn} onPress={() => router.back()}>
          <Text style={s.linkText}>이미 계정이 있으신가요? 로그인</Text>
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
