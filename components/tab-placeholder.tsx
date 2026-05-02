import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabPlaceholderProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TabPlaceholder = ({ title, subtitle, icon }: TabPlaceholderProps) => {
  return (
    <SafeAreaView className="flex-1 bg-[#050807]">
      <LinearGradient
        colors={["rgba(101,201,15,0.10)", "rgba(5,8,7,0)", "rgba(0,0,0,0.18)"]}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
      />
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center rounded-[28px] border border-white/10 bg-[#111827] px-8 py-10">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border border-[#65C90F]/25 bg-[#65C90F]/15">
            <MaterialCommunityIcons name={icon} size={30} color="#65C90F" />
          </View>
          <Text className="text-center text-2xl font-bold text-white">{title}</Text>
          <Text className="mt-2 max-w-xs text-center text-[#A3A3A3]">{subtitle}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TabPlaceholder;