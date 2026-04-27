import React, { useState } from "react";

import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { z } from "zod";
import { Button, ButtonText } from "./ui/button";
import { Heading } from "./ui/heading";
import { CloseIcon, Icon } from "./ui/icon";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Insira um endereço de e-mail válido"),
});

interface ForgotPassowrdDialogProps {
  trigger: React.ReactNode;
}

const ForgotPasswordDialog: React.FC<ForgotPassowrdDialogProps> = () => {
  const [open, setOpen] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: any) => {
    console.log("Validado com sucesso:", data.email);
    // Aqui entra sua lógica de chamada de API
  };
  return (
    <>
      <Button onPress={() => setOpen(true)}>
        <ButtonText>Open Modal</ButtonText>
      </Button>
      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
        }}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Recuperar senha</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text>Recupere sua senha aqui preenchendo o email.</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              className="mr-3"
              onPress={() => {
                setOpen(false);
              }}
            >
              <ButtonText>Cancelar</ButtonText>
            </Button>
            <Button
              onPress={() => {
                setOpen(false);
              }}
            >
              <ButtonText>Salvar</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ForgotPasswordDialog;
