import React, { forwardRef } from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    rightElement,
    leftElement,
    className,
    ...props
  },
  ref
) {
  const hasError = Boolean(error);

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-text-secondary text-xs font-bold mb-1.5">
          {label}
        </Text>
      )}

      <View
        className={[
          "flex-row items-center bg-surface-alt rounded-2xl px-3",
          hasError ? "border border-danger" : "border border-transparent",
        ].join(" ")}>
        {leftElement && <View className="mr-2">{leftElement}</View>}

        <TextInput
          ref={ref}
          className={[
            "flex-1 py-3 text-text-primary text-base",
            className ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          placeholderTextColor="#B4CFC5"
          {...props}
        />

        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>

      {(error || hint) && (
        <Text
          className={[
            "text-xs mt-1 ml-1",
            hasError ? "text-danger" : "text-text-muted",
          ].join(" ")}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});
