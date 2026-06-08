import { LoadingProvider } from "@/components/_loading";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import useAuth from "@/hooks/_useAuth";
import { verificarSeUsuarioEhDoador } from "@/services";
import { useUser } from "@/store";
import "@/styles/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { useEffect } from "react";

function UserProfileWatcher() {
  const { user, initializing } = useAuth();
  const { setIsDoador, reset } = useUser();

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      reset();
      return;
    }
    reset();
    verificarSeUsuarioEhDoador(user.uid).then(setIsDoador);
  }, [user?.uid, initializing, setIsDoador, reset]);

  return null;
}

const queryClient = new QueryClient();

const RootLayout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode="dark">
        <LoadingProvider>
          <UserProfileWatcher />
          <Slot />
        </LoadingProvider>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
};

export default RootLayout;
