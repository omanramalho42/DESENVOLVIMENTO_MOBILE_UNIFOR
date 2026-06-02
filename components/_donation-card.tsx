import { BadgeDistance } from "@/app/(tabs)/home/components/badge-distance";
import { Box, HStack, Text, VStack } from "@/components/ui";
import { DonationStatus } from "@/types";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import React from "react";
import { Image, TouchableOpacity } from "react-native";

const fallbackImage = require("@/assets/images/pao.jpg");

type DonationCardProps = {
  title: string;
  weight: string;
  distance: string;
  date: string;
  imageUri?: string | null;
  status: DonationStatus;
  onPress: () => void;
};

export const DonationCard = ({
  title,
  weight,
  distance,
  date,
  imageUri,
  onPress,
}: DonationCardProps) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="mb-3">
    <Box className="bg-[#141416] rounded-[24px] p-3 border border-[#1E1E21]">
      <HStack className="flex-row items-center">
        <Image
          source={imageUri ? { uri: imageUri } : fallbackImage}
          className="w-[100px] h-[100px] rounded-[20px]"
          resizeMode="cover"
        />

        <VStack className="ml-4 flex-1 items-start">
          <Text className="text-white font-semibold text-lg leading-tight mb-0.5">
            {title}
          </Text>

          <Text className="text-[#A1A1AA] text-sm mb-2">{weight}</Text>

          <BadgeDistance distance={distance} />

          <HStack className="flex-row items-center">
            <FontAwesome5 name="clock" size={12} color="#65A30D" />
            <Text className="text-[#A1A1AA] text-[13px] ml-2">
              Validade: {date}
            </Text>
          </HStack>
        </VStack>
      </HStack>

      <Box className="border border-[#65A30D] rounded-2xl h-10 flex-row items-center justify-center mt-3">
        <FontAwesome5 name="eye" size={13} color="#65A30D" />
        <Text className="text-[#65A30D] font-semibold text-sm ml-2">
          Ver detalhes
        </Text>
      </Box>
    </Box>
  </TouchableOpacity>
);
