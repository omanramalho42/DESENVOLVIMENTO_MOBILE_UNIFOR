import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

interface ForgotPassowrdDialogProps {
  onSuccessCallback: () => void;
  trigger?: React.ReactNode;
  open: boolean;
  setOpen: (value: boolean) => void;
}

const ForgotPasswordDialog: React.FC<ForgotPassowrdDialogProps> = ({
  trigger,
  open,
  setOpen,
  onSuccessCallback,
}) => {
  return (
    <>
      {trigger || null}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-center bg-black/70 px-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar modal"
          />

          <View className="rounded-[24px] border border-[#1F2937] bg-[#111827] px-6 py-5">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[20px] font-semibold text-white"
                style={{ fontFamily: "System" }}
              >
                Recuperar senha
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setOpen(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
              >
                <Text className="text-[22px] text-[#A3A3A3]">x</Text>
              </Pressable>
            </View>

            <Text
              className="mt-3 text-[15px] leading-6 text-[#A3A3A3]"
              style={{ fontFamily: "System" }}
            >
              Vamos enviar o link de recuperacao para o e-mail preenchido na tela
              de login.
            </Text>

            <View className="mt-6 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-2xl border border-[#27303A] px-4 py-4"
                onPress={() => setOpen(false)}
                style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
              >
                <Text
                  className="text-[15px] font-medium text-white"
                  style={{ fontFamily: "System" }}
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 items-center justify-center rounded-2xl bg-[#65C90F] px-4 py-4"
                onPress={() => {
                  setOpen(false);
                  onSuccessCallback();
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text
                  className="text-[15px] font-semibold text-[#071100]"
                  style={{ fontFamily: "System" }}
                >
                  Enviar link
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ForgotPasswordDialog;
