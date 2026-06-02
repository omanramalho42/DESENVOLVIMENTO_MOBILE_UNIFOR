import { Box, HStack, Text } from "@/components/ui";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import React from "react";

type BadgeDistanceProps = {
  distance: string;
};

export const BadgeDistance = ({ distance }: BadgeDistanceProps) => (
  <Box className="bg-[#1E3A0A] px-3 py-1 rounded-full mb-2">
    <HStack className="flex-row items-center">
      <FontAwesome5 name="map-marker-alt" size={10} color="#84CC16" />
      <Text className="text-[#84CC16] text-xs font-semibold ml-2">
        {distance}
      </Text>
    </HStack>
  </Box>
);
