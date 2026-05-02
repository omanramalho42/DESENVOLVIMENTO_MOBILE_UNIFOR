import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type SocialLoginButtonProps = {
  label: string;
  onPress: () => void;
  icon: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function SocialLoginButton({
  label,
  onPress,
  icon,
  disabled,
  className,
}: SocialLoginButtonProps) {
  return (
    <Pressable
      className={`h-[56px] bg-transparent border border-[#27272A] rounded-2xl flex-row items-center justify-center ${className ?? ""}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed && !disabled ? 0.86 : 1,
      })}
    >
      <View className="mr-3">{icon}</View>
      <Text className="text-white font-medium text-[16px]" style={{ fontFamily: "System" }}>
        {label}
      </Text>
    </Pressable>
  );
}
