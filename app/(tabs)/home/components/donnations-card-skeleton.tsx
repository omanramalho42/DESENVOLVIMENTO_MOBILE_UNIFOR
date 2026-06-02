import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { ActivityIndicator } from "react-native";
import { BadgeDistance } from "./badge-distance";

const DonationCardSkeleton: React.FC = () => {
  return (
    <Box className="bg-[#141416] rounded-[24px] p-3 border border-[#1E1E21] mb-3 opacity-60">
      <HStack className="flex-row items-center">
        {/* Placeholder da Imagem */}
        <Box className="w-[100px] h-[100px] rounded-[20px] bg-[#1E1E21] items-center justify-center">
          <ActivityIndicator size="small" color="#65A30D" />
        </Box>

        <VStack className="ml-4 flex-1 items-start gap-y-2">
          {/* Placeholders de Texto */}
          <Box className="w-3/4 h-5 bg-[#1E1E21] rounded-md" />
          <Box className="w-1/2 h-4 bg-[#1E1E21] rounded-md" />

          {/* O próprio Badge de distância em loading */}
          <BadgeDistance isLoading={true} distance="" />

          <Box className="w-2/3 h-4 bg-[#1E1E21] rounded-md" />
        </VStack>
      </HStack>

      {/* Botão inferior em modo placeholder */}
      <Box className="border border-[#27272A] bg-[#1E1E21]/20 rounded-2xl h-10 flex-row items-center justify-center mt-3">
        <Box className="w-24 h-4 bg-[#1E1E21] rounded-md" />
      </Box>
    </Box>
  );
};

export default DonationCardSkeleton;
