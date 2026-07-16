import React from "react";
import { View, ViewProps } from "react-native";

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
  // 유리처럼 떠 보이지 않게 — 옅은 검정 그림자로 바닥에 붙은 느낌
  const shadowStyle = shadow ? {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  } : undefined;

  return (
    <View
      className={[
        "bg-surface rounded-[30px]",
        bare ? "" : "p-4",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={[shadowStyle, style]}
      {...props}>
      {children}
    </View>
  );
}
