import React, { useRef } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
  Animated,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  horizontalMargin?: number;
}

const container: Record<ButtonVariant, string> = {
  primary: "bg-primary items-center justify-center flex-row rounded-3xl",
  secondary:
    "bg-surface border border-border items-center justify-center flex-row rounded-3xl",
  danger: "bg-danger/10 items-center justify-center flex-row rounded-3xl",
  ghost: "items-center justify-center flex-row rounded-3xl",
};

const label: Record<ButtonVariant, string> = {
  primary: "text-white font-bold",
  secondary: "text-text-primary font-bold",
  danger: "text-danger font-bold",
  ghost: "text-primary font-bold",
};

const padding: Record<ButtonSize, string> = {
  sm: "py-2 px-4",
  md: "py-3 px-6",
  lg: "py-4 px-8",
};

const fontSize: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

const spinnerColor: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  secondary: "#6FD3B6",
  danger: "#FF9DB0",
  ghost: "#6FD3B6",
};

export function Button({
  title,
  variant = "primary",
  size = "lg",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  onPressIn: externalPressIn,
  onPressOut: externalPressOut,
  horizontalMargin,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (!isDisabled) {
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        damping: 15,
        stiffness: 400,
      }).start();
    }
    externalPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 400,
    }).start();
    externalPressOut?.(e);
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth
          ? {
              alignSelf: "stretch" as const,
              marginHorizontal: horizontalMargin ?? 10,
            }
          : { alignSelf: "flex-start" as const },
      ]}>
      <TouchableOpacity
        className={[
          container[variant],
          padding[size],
          fullWidth ? "self-stretch" : "",
          isDisabled ? "opacity-50" : "opacity-100",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        activeOpacity={0.9}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}>
        {loading ? (
          <ActivityIndicator color={spinnerColor[variant]} size="small" />
        ) : (
          <>
            {leftIcon && <View className="mr-2">{leftIcon}</View>}
            <Text className={[label[variant], fontSize[size]].join(" ")}>
              {title}
            </Text>
            {rightIcon && <View className="ml-2">{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
