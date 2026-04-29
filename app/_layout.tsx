import "@/styles/global.css";
import { Slot } from "expo-router";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

const RootLayout = () => {
  return
    <GluestackUIProvider mode="dark">
      <Slot />
    </GluestackUIProvider>
    ;
};

export default RootLayout;
