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

      {/* 오른쪽: 커스텀.
          회귀 방지: width 고정이 아니라 minWidth다. rightElement에 아이콘 버튼을
          2개 이상 넣는 화면(통계: 테마토글+프로필+로그아웃 ≈ 116pt)이 있어서
          56pt로 고정하면 마지막 버튼이 화면 밖으로 잘린다. 가운데 타이틀이
          flex:1이라 이 슬롯이 늘어난 만큼 알아서 줄어든다. */}
      <View style={{ minWidth: 56, alignItems: "flex-end", justifyContent: "center" }}>
        {hasRight ? rightElement : hasLeft ? <View style={{ width: 40 }} /> : null}
      </View>
    </View>
  );
}
