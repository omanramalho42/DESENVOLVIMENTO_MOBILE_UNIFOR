import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import {
    Box,
    HStack,
    Text,
    VStack,
} from "@gluestack-ui/themed";
import { Image } from "react-native";

const DonationCard = ({ title, weight, distance, date, imageUri }: any) => (
  <Box className="bg-[#141416] rounded-[24px] p-3 mb-3 flex-row items-center border border-[#1E1E21]">
    <Image
      source={{ uri: imageUri }}
      className="w-[100px] h-[100px] rounded-[20px]"
      resizeMode="cover"
    />

    <VStack className="ml-4 flex-1 items-start">
      <Text className="text-white font-semibold text-lg leading-tight mb-0.5">
        {title}
      </Text>

      <Text className="text-[#A1A1AA] text-sm mb-2">{weight}</Text>

      <HStack className="flex-row items-center mb-1">
        <FontAwesome5 name="map-marker-alt" size={12} color="#65A30D" />

        <Text className="text-[#A1A1AA] text-[13px] ml-2">{distance}</Text>
      </HStack>

      <HStack className="flex-row items-center">
        <FontAwesome5 name="clock" size={12} color="#65A30D" />

        <Text className="text-[#A1A1AA] text-[13px] ml-2">
          Validade: {date}
        </Text>
      </HStack>
    </VStack>
  </Box>
);

export default DonationCard;