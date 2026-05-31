import React from "react";
import { View, ViewProps } from "react-native";
import { useColors } from "../../constants/colors";

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
  const c = useColors();
  const shadowStyle = shadow ? {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 4,
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
