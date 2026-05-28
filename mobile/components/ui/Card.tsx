import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** 패딩 없는 카드 */
  bare?: boolean;
  /** 그림자 강도 */
  shadow?: boolean;
}

export function Card({
  children,
  bare = false,
  shadow = true,
  className,
  style,
  ...props
}: CardProps) {
  return (
    <View
      className={[
        "bg-surface rounded-2xl",
        bare ? "" : "p-4",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={[shadow && styles.shadow, style]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#B4A0D8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
});
