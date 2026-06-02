import { Box, HStack, Text } from "@/components/ui";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import React from "react";
import { ActivityIndicator } from "react-native"; // 👈 Importamos o indicador nativo

type BadgeDistanceProps = {
  distance: string;
  isLoading?: boolean; // 👈 Adicionamos a propriedade opcional de loading
};

export const BadgeDistance = ({
  distance,
  isLoading = false,
}: BadgeDistanceProps) => (
  <Box className="bg-[#1E3A0A] px-3 py-1 rounded-full mb-2 min-w-[60px] justify-center">
    <HStack className="flex-row items-center">
      {isLoading ? (
        // Exibido enquanto a localização/distância está sendo calculada
        <ActivityIndicator
          size="small"
          color="#84CC16"
          style={{ transform: [{ scale: 0.7 }] }}
        />
      ) : (
        // Exibido normalmente após o cálculo
        <>
          <FontAwesome5 name="map-marker-alt" size={10} color="#84CC16" />
          <Text className="text-[#84CC16] text-xs font-semibold ml-2">
            {distance}
          </Text>
        </>
      )}
    </HStack>
  </Box>
);
