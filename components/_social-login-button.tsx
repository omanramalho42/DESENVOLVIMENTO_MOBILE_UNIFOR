import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
    <TouchableOpacity
      className={`h-[56px] bg-transparent border border-[#27272A] rounded-2xl flex-row items-center justify-center ${className ?? ""}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="mr-3">{icon}</View>
      <Text className="text-white font-medium text-[16px]" style={{ fontFamily: "System" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
