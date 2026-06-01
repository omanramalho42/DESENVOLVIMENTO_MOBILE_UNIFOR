import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

const DonationCardSkeleton: React.FC = () => {
  return (
    <Box className="bg-[#18181B] rounded-2xl p-4 mb-4 border border-[#27272A]">
      <HStack space="md">
        <Skeleton variant="rounded" className="w-24 h-24 rounded-xl" />

        <Box className="flex-1">
          <SkeletonText className="h-5 w-3/4 mb-2" _lines={1} />

          <SkeletonText className="h-4 w-1/2 mb-2" _lines={1} />

          <SkeletonText className="h-4 w-2/3 mb-2" _lines={1} />

          <SkeletonText className="h-4 w-1/3" _lines={1} />
        </Box>
      </HStack>
    </Box>
  );
};

export default DonationCardSkeleton;
