import type { Donation } from "@/models/Donation";
import { auth, db } from "@/services/_firebase";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#65C90F";

const formatarData = (text: string) => {
  const numeros = text.replace(/\D/g, "");

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;

  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4, 8)}`;
};

const dataValida = (data: string) => {
  const partes = data.split("/");
  if (partes.length !== 3) return false;

  const dia = Number(partes[0]);
  const mes = Number(partes[1]);
  const ano = Number(partes[2]);

  if (!dia || !mes || !ano) return false;
  if (mes < 1 || mes > 12) return false;

  const ultimoDia = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > ultimoDia) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const informada = new Date(ano, mes - 1, dia);
  informada.setHours(0, 0, 0, 0);

  return informada >= hoje;
};

export default function DoarScreen() {
  const [fotos, setFotos] = useState<string[]>([]);
  const [nomeAlimento, setNomeAlimento] = useState("");
  const [categoria, setCategoria] = useState("Prontos");
  const [quantidade, setQuantidade] = useState("");
  const [tipoAlimento, setTipoAlimento] = useState("Não perecível");
  const [validade, setValidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [retirada, setRetirada] = useState<"doador" | "buscador">("doador");
  const [dataRetirada, setDataRetirada] = useState("");
  const [horario, setHorario] = useState("");
  const [endereco, setEndereco] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);

  const adicionarFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const novasFotos = result.assets.map((asset) => asset.uri);
      setFotos((atual) => [...atual, ...novasFotos].slice(0, 3));
    }
  };

  const removerFoto = (index: number) => {
    setFotos((atual) => atual.filter((_, i) => i !== index));
  };

  const validarCampos = () => {
    if (!nomeAlimento.trim()) return "Informe o nome do alimento.";
    if (!categoria.trim()) return "Informe a categoria.";
    if (!quantidade.trim()) return "Informe a quantidade.";
    if (!tipoAlimento.trim()) return "Informe o tipo do alimento.";
    if (!validade.trim()) return "Informe a validade.";
    if (validade.length !== 10) return "Informe a validade no formato DD/MM/AAAA.";
    if (!dataValida(validade)) return "Informe uma validade real e que não esteja vencida.";
    if (!dataRetirada.trim()) return "Informe a data disponível para retirada.";
    if (!horario.trim()) return "Informe o horário disponível.";
    if (!endereco.trim()) return "Informe o endereço de retirada.";
    if (!aceitouTermos) return "Aceite os termos e condições para continuar.";
    return null;
  };

  const limparFormulario = () => {
    setFotos([]);
    setNomeAlimento("");
    setCategoria("Prontos");
    setQuantidade("");
    setTipoAlimento("Não perecível");
    setValidade("");
    setDescricao("");
    setRetirada("doador");
    setDataRetirada("");
    setHorario("");
    setEndereco("");
    setAceitouTermos(false);
  };

  const salvarDoacao = async () => {
    const erro = validarCampos();

    if (erro) {
      Alert.alert("Campos obrigatórios", erro);
      return;
    }

    if (!db) {
      Alert.alert("Erro", "Firebase não está configurado.");
      return;
    }

    try {
      setLoading(true);

      const donation: Donation & {
        fotos: string[];
        categoria: string;
        tipoRetirada: string;
        dataRetirada: string;
        horario: string;
      } = {
        tipoAlimento: nomeAlimento.trim(),
        quantidade: quantidade.trim(),
        descricao: descricao.trim(),
        validade: validade.trim(),
        localizacao: endereco.trim(),
        disponibilidade: `${dataRetirada.trim()} - ${horario.trim()}`,
        perecivel: tipoAlimento === "Perecível",
        observacoes: "",
        status: "disponivel",
        donorId: auth?.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
        fotos,
        categoria,
        tipoRetirada: retirada,
        dataRetirada,
        horario,
      };

      await addDoc(collection(db, "donations"), donation);

      limparFormulario();
      Alert.alert("Sucesso", "Doação cadastrada com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível cadastrar a doação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 130 }}
        >
          <View className="px-5 pt-5">
            <View className="flex-row items-center justify-between mb-5">
              <View>
                <Text className="text-white text-3xl font-bold">
                  Cadastrar doação
                </Text>
                <Text className="text-[#A3A3A3] text-[14px] mt-1">
                  Preencha as informações sobre o alimento.
                </Text>
              </View>

              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={18}
                  color={GREEN}
                />
                <Text className="text-[#A3A3A3] text-[13px] ml-1">
                  Ambiente seguro
                </Text>
              </View>
            </View>

            <Section title="Fotos do alimento" subtitle="Adicione fotos reais do alimento">
              <View className="flex-row gap-3">
                {fotos.map((foto, index) => (
                  <View key={foto} className="relative">
                    <Image
                      source={{ uri: foto }}
                      className="w-[92px] h-[92px] rounded-2xl"
                    />
                    <TouchableOpacity
                      onPress={() => removerFoto(index)}
                      className="absolute -top-2 -right-2 bg-[#1F2937] w-7 h-7 rounded-full items-center justify-center"
                    >
                      <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                {fotos.length < 3 && (
                  <TouchableOpacity
                    onPress={adicionarFoto}
                    className="w-[92px] h-[92px] rounded-2xl border border-dashed border-[#365a25] items-center justify-center bg-[#101810]"
                  >
                    <MaterialCommunityIcons
                      name="camera-outline"
                      size={28}
                      color={GREEN}
                    />
                    <Text className="text-[#A3A3A3] text-[12px] mt-2">
                      Adicionar foto
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Section>

            <Section title="Informações do alimento">
              <Campo
                label="Nome do alimento"
                value={nomeAlimento}
                onChangeText={setNomeAlimento}
                placeholder="Ex: Refeição pronta"
                maxLength={60}
              />

              <View className="flex-row gap-3">
                <SelectBox
                  label="Categoria"
                  value={categoria}
                  icon="silverware-fork-knife"
                  options={["Prontos", "Frutas", "Verduras", "Pães"]}
                  onChange={setCategoria}
                />

                <Campo
                  label="Quantidade"
                  value={quantidade}
                  onChangeText={setQuantidade}
                  placeholder="Ex: 1,5 kg"
                  icon="weight-kilogram"
                  containerClassName="flex-1"
                />
              </View>

              <View className="flex-row gap-3">
                <SelectBox
                  label="Tipo de alimento"
                  value={tipoAlimento}
                  icon="leaf"
                  options={["Perecível", "Não perecível"]}
                  onChange={setTipoAlimento}
                />

                <Campo
                  label="Validade"
                  value={validade}
                  onChangeText={(text) => setValidade(formatarData(text))}
                  placeholder="DD/MM/AAAA"
                  icon="calendar-outline"
                  keyboardType="numeric"
                  maxLength={10}
                  containerClassName="flex-1"
                />
              </View>

              <Campo
                label="Descrição"
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descreva detalhes do alimento"
                multiline
                obrigatorio={false}
                maxLength={200}
              />
            </Section>

            <Section title="Retirada">
              <View className="flex-row gap-3 mb-4">
                <OptionCard
                  active={retirada === "doador"}
                  icon="account-group-outline"
                  title="Retirada pelo doador"
                  subtitle="Eu levo até o local"
                  onPress={() => setRetirada("doador")}
                />

                <OptionCard
                  active={retirada === "buscador"}
                  icon="car-outline"
                  title="Buscador retira"
                  subtitle="O buscador vem até mim"
                  onPress={() => setRetirada("buscador")}
                />
              </View>

              <View className="flex-row gap-3">
                <Campo
                  label="Data disponível"
                  value={dataRetirada}
                  onChangeText={(text) => setDataRetirada(formatarData(text))}
                  placeholder="DD/MM/AAAA"
                  icon="calendar-outline"
                  keyboardType="numeric"
                  maxLength={10}
                  containerClassName="flex-1"
                />

                <Campo
                  label="Horário"
                  value={horario}
                  onChangeText={setHorario}
                  placeholder="08:00 - 18:00"
                  icon="clock-outline"
                  containerClassName="flex-1"
                />
              </View>

              <Campo
                label="Endereço de retirada"
                value={endereco}
                onChangeText={setEndereco}
                placeholder="Rua, número, bairro e cidade"
                icon="map-marker-outline"
              />
            </Section>

            <Section title="Informações adicionais">
              <TouchableOpacity
                onPress={() => setAceitouTermos((atual) => !atual)}
                className="flex-row items-center justify-between bg-[#111827] border border-[#1F2937] rounded-2xl px-4 py-4"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-7 h-7 rounded-lg items-center justify-center mr-3 ${
                      aceitouTermos ? "bg-[#65C90F]" : "bg-[#0B0F0C]"
                    }`}
                  >
                    {aceitouTermos && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color="#FFFFFF"
                      />
                    )}
                  </View>

                  <Text className="text-[#D4D4D4] flex-1">
                    Aceito os{" "}
                    <Text className="text-[#65C90F] font-semibold">
                      termos e condições
                    </Text>{" "}
                    da plataforma
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#A3A3A3"
                />
              </TouchableOpacity>
            </Section>

            <TouchableOpacity
              activeOpacity={0.86}
              disabled={loading}
              onPress={salvarDoacao}
              className="mt-2"
            >
              <LinearGradient
                colors={loading ? ["#3F7F2C", "#2B641F"] : ["#65C90F", "#4CAF0D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 62,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="gift-outline"
                      size={25}
                      color="#FFFFFF"
                    />
                    <Text className="text-white text-[20px] font-bold ml-3">
                      Cadastrar doação
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View className="flex-row justify-center items-center mt-4">
              <MaterialCommunityIcons
                name="lock-outline"
                size={16}
                color={GREEN}
              />
              <Text className="text-[#A3A3A3] text-[13px] ml-2">
                Seus dados estão protegidos com segurança
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-[#0F1512] border border-[#1F2937] rounded-3xl p-4 mb-4">
      <Text className="text-white text-[20px] font-bold">{title}</Text>
      {subtitle && (
        <Text className="text-[#A3A3A3] text-[14px] mt-1 mb-4">{subtitle}</Text>
      )}
      {!subtitle && <View className="h-4" />}
      {children}
    </View>
  );
}

function Campo({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  multiline = false,
  obrigatorio = true,
  keyboardType = "default",
  maxLength,
  containerClassName = "",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  multiline?: boolean;
  obrigatorio?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
  containerClassName?: string;
}) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      <Text className="text-[#A3A3A3] text-[13px] font-semibold mb-2">
        {label}
        {obrigatorio ? <Text className="text-[#65C90F]"> *</Text> : null}
      </Text>

      <View className="flex-row bg-[#111827] border border-[#1F2937] rounded-2xl px-4">
        {icon && (
          <View
            className="mr-3"
            style={{
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "flex-start",
            }}
          >
            <MaterialCommunityIcons name={icon} size={20} color="#65C90F" />
          </View>
        )}

<TextInput
  value={value}
  onChangeText={onChangeText}
  placeholder={placeholder}
  placeholderTextColor="#6B7280"
  multiline={multiline}
  textAlignVertical={multiline ? "top" : "center"}
  keyboardType={keyboardType}
  maxLength={maxLength}
  className="flex-1 text-white text-[15px]"
  style={[
    {
      minHeight: multiline ? 96 : 56,
      paddingTop: multiline ? 14 : 0,
      paddingBottom: multiline ? 14 : 0,
    },
    Platform.OS === "web"
      ? ({ outlineStyle: "none" } as any)
      : null,
  ]}
/>
        {maxLength && value.length > 0 && (
          <View className="justify-center ml-2">
            <Text className="text-[#A3A3A3] text-[12px]">
              {value.length}/{maxLength}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function SelectBox({
  label,
  value,
  icon,
  options,
  onChange,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1 mb-4">
      <Text className="text-[#A3A3A3] text-[13px] font-semibold mb-2">
        {label} <Text className="text-[#65C90F]">*</Text>
      </Text>

      <TouchableOpacity
        onPress={() => setOpen((atual) => !atual)}
        className="flex-row items-center bg-[#111827] border border-[#1F2937] rounded-2xl px-4 h-[56px]"
      >
        <MaterialCommunityIcons name={icon} size={20} color="#65C90F" />
        <Text className="text-white text-[15px] ml-3 flex-1">{value}</Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={24}
          color="#A3A3A3"
        />
      </TouchableOpacity>

      {open && (
        <View className="bg-[#111827] border border-[#1F2937] rounded-2xl mt-2 overflow-hidden">
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              className="px-4 py-3 border-b border-[#1F2937]"
            >
              <Text className="text-white">{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function OptionCard({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 rounded-2xl border px-3 py-4 ${
        active ? "bg-[#132011] border-[#65C90F]" : "bg-[#111827] border-[#1F2937]"
      }`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={26}
        color={active ? "#65C90F" : "#A3A3A3"}
      />
      <Text className="text-white font-bold mt-2 text-[14px]">{title}</Text>
      <Text className="text-[#A3A3A3] text-[12px] mt-1">{subtitle}</Text>
    </TouchableOpacity>
  );
}