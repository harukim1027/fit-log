import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../AppIcons";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/colors";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showClose?: boolean;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  showClose = false,
  rightElement,
  onBack,
  onClose,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());
  const handleClose = onClose ?? (() => router.back());

  const hasLeft = showBack || showClose;
  const hasRight = Boolean(rightElement);

  return (
    <View style={[s.container, { paddingTop: insets.top + 6 }]}>
      {/* 왼쪽: 뒤로가기 또는 닫기 */}
      <View style={s.side}>
        {showBack && (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevronLeft" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showClose && !showBack && (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18, color: Colors.textPrimary, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 중앙: 타이틀 */}
      <View style={s.center}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 오른쪽: 커스텀 */}
      <View style={[s.side, s.right]}>
        {hasRight ? rightElement : hasLeft ? <View style={s.placeholder} /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    minHeight: 56,
  },
  side: {
    width: 56,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  right: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
