import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../AppIcons";
import { useRouter } from "expo-router";
import { useColors } from "../../constants/colors";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showClose?: boolean;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
}

/**
 * Renders a header with a title, optional subtitle, navigation control, and custom right-side content.
 *
 * @param title - The header title.
 * @param subtitle - Optional secondary text displayed below the title.
 * @param showBack - Whether to display a back navigation control.
 * @param showClose - Whether to display a close control when back navigation is not shown.
 * @param rightElement - Optional content displayed on the right side.
 * @param onBack - Optional handler for the back control; navigation back is used by default.
 * @param onClose - Optional handler for the close control; navigation back is used by default.
 */
export function Header({
  title,
  subtitle,
  showBack = false,
  showClose = false,
  rightElement,
  onBack,
  onClose,
}: HeaderProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());
  const handleClose = onClose ?? (() => router.back());

  const hasLeft = showBack || showClose;
  const hasRight = Boolean(rightElement);

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 10,
      paddingTop: insets.top + 6,
      backgroundColor: c.background,
      minHeight: 56,
    }}>
      {/* 왼쪽: 뒤로가기 또는 닫기 */}
      <View style={{ width: 56, alignItems: "flex-start", justifyContent: "center" }}>
        {showBack && (
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: c.surfaceAlt }}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="chevronLeft" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        )}
        {showClose && !showBack && (
          <TouchableOpacity activeOpacity={0.8}
            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: c.surfaceAlt }}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={18} color={c.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 중앙: 타이틀 */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: c.textPrimary }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 오른쪽: 커스텀 */}
      <View style={{ width: 56, alignItems: "flex-end", justifyContent: "center" }}>
        {hasRight ? rightElement : hasLeft ? <View style={{ width: 40 }} /> : null}
      </View>
    </View>
  );
}
