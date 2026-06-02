"use client";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";

const LOCATION_PERMISSION_KEY = "@location_permission_granted";

const LocalizationModal: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  // console.log("[LocalizationModal] Renderizou");
  // console.log("[LocalizationModal] Modal aberto?", open);

  // const checkLocationPermission = async () => {
  //   // console.log("[LocalizationModal] Iniciando verificação de permissões...");

  //   try {
  //     const alreadyAccepted = await AsyncStorage.getItem(
  //       LOCATION_PERMISSION_KEY,
  //     );

  //     // console.log(
  //     //   "[LocalizationModal] Valor salvo no AsyncStorage:",
  //     //   alreadyAccepted,
  //     // );

  //     const permission = await Location.getForegroundPermissionsAsync();

  //     // console.log("[LocalizationModal] Permissão atual:", permission);

  //     // if (alreadyAccepted === "true" || permission.status === "granted") {
  //     //   console.log(
  //     //     "[LocalizationModal] Permissão já concedida. Modal não será exibido.",
  //     //   );
  //     //   return;
  //     // }

  //     // console.log(
  //     //   "[LocalizationModal] Permissão não concedida. Abrindo modal.",
  //     // );

  //     setOpen(true);
  //   } catch (error) {
  //     console.error(
  //       "[LocalizationModal] Erro ao verificar localização:",
  //       error,
  //     );
  //   }
  // };

  // useEffect(() => {
  //   console.log("[LocalizationModal] Componente montado");
  //   checkLocationPermission();
  // }, []);

  const handleEnableLocation = async () => {
    // console.log("[LocalizationModal] Usuário clicou em 'Permitir acesso'");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      // console.log("[LocalizationModal] Resultado da solicitação:", permission);

      if (permission.status === "granted") {
        // console.log(
        //   "[LocalizationModal] Permissão concedida. Salvando no AsyncStorage...",
        // );

        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, "true");

        // console.log("[LocalizationModal] Permissão salva com sucesso.");

        setOpen(false);
      } else {
        // console.log("[LocalizationModal] Usuário negou a permissão.");
      }
    } catch (error) {
      console.error(
        "[LocalizationModal] Erro ao solicitar localização:",
        error,
      );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        // console.log("[LocalizationModal] Modal fechado");
        setOpen(false);
      }}
    >
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
            Precisamos da sua localização para mostrar doações próximas de você
            em tempo real.
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

          <TouchableOpacity
            onPress={() => {
              // console.log("[LocalizationModal] Usuário clicou em 'Agora não'");
              setOpen(false);
            }}
          >
            <Text className="text-[#A1A1AA] text-center">Agora não</Text>
          </TouchableOpacity>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LocalizationModal;
