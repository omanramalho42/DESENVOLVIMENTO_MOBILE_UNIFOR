import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
// 1. CORREÇÃO PRINCIPAL: Importar o Location do Expo
import { FontAwesome5 } from "@expo/vector-icons";
import {
    Box,
    Button,
    ButtonText,
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Text
} from "@gluestack-ui/themed";
import * as Location from "expo-location";

const LOCATION_PERMISSION_KEY = "@location_permission_granted";

const LocalizationModal: React.FC = () => {
  // Corrigido o nome do estado para bater com o JSX abaixo
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const alreadyAccepted = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
      
      // Agora o TypeScript reconhece o método corretamente
      const { status } = await Location.getForegroundPermissionsAsync();

      if (alreadyAccepted === "true" || status === "granted") {
        return;
      }

      setIsOpen(true);
    } catch (error) {
      console.log("Erro ao verificar localização:", error);
    }
  };

  const handleEnableLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, "true");
        setIsOpen(false);
      }
    } catch (error) {
      console.log("Erro ao solicitar localização:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <ModalBackdrop />

      <ModalContent className="bg-[#18181B] border border-[#27272A] rounded-[28px] mx-6">
        <ModalHeader className="items-center pt-6">
          <Box className="bg-[#1E3A0A] w-16 h-16 rounded-full items-center justify-center mb-4">
            <FontAwesome5 name="map-marker-alt" size={24} color="#84CC16" />
          </Box>
        </ModalHeader>

        <ModalBody className="pb-2">
          <Text className="text-white text-xl font-bold text-center mb-3">
            Habilitar localização
          </Text>

          <Text className="text-[#A1A1AA] text-center leading-6">
            Precisamos da sua localização para mostrar doações próximas de você em tempo real.
          </Text>
        </ModalBody>

        <ModalFooter className="flex-col pb-6 pt-4">
          <Button
            onPress={handleEnableLocation}
            className="bg-[#65A30D] w-full rounded-2xl h-12 mb-3"
          >
            <ButtonText className="text-white font-semibold">
              Permitir acesso
            </ButtonText>
          </Button>

          {/* Substituído TouchableOpacity por um Button com variante plain/link do Gluestack */}
          <Button
            onPress={() => setIsOpen(false)}
            className="p-0 h-auto"
          >
            <ButtonText className="text-[#A1A1AA] font-normal size-sm">
              Agora não
            </ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LocalizationModal;