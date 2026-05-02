import useAuth from "@/hooks/_useAuth";
import { auth, db, storage } from "@/services";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  type StorageReference,
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserProfile = {
  nome: string;
  email: string;
  telefone: string;
  fotoPerfil: string;
  tipoUsuario: string;
};

const impactMetrics = [
  { icon: "gift-outline", value: "28", label: "doações feitas" },
  { icon: "leaf", value: "126 kg", label: "alimentos doados" },
  { icon: "account-group-outline", value: "63", label: "pessoas ajudadas" },
] as const;

const menuItems = [
  {
    icon: "gift-outline",
    title: "Minhas doações",
    subtitle: "Histórico de alimentos doados",
    route: undefined,
  },
  {
    icon: "archive-outline",
    title: "Minhas solicitações",
    subtitle: "Acompanhe suas solicitações",
    route: undefined,
  },
  {
    icon: "map-marker-outline",
    title: "Endereços salvos",
    subtitle: "Gerencie seus endereços",
    route: undefined,
  },
  {
    icon: "heart-outline",
    title: "Favoritos",
    subtitle: "Alimentos e doadores favoritados",
    route: undefined,
  },
  {
    icon: "star-outline",
    title: "Avaliações",
    subtitle: "Avalie doações e doadores",
    route: undefined,
  },
  {
    icon: "help-circle-outline",
    title: "Central de ajuda",
    subtitle: "Dúvidas frequentes e suporte",
    route: undefined,
  },
  {
    icon: "information-outline",
    title: "Sobre o Alimenta+",
    subtitle: "Saiba mais sobre o app",
    route: undefined,
  },
  {
    icon: "shield-check-outline",
    title: "Termos de uso e privacidade",
    subtitle: "Consulte as regras da plataforma",
    route: "/(auth)/terms",
  },
] as const;

const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const userPhotoPath = (uid: string) => `profilePhotos/${uid}.jpg`;

const normalizeTipoUsuario = (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "doador") {
    return "Doador";
  }

  if (normalized === "receptor") {
    return "Receptor";
  }

  return value ? value : "Receptor";
};

const buildFallbackProfile = (
  displayName: string | null | undefined,
  email: string | null | undefined
): UserProfile => ({
  nome: displayName?.trim() || email?.split("@")[0] || "Meu perfil",
  email: email?.trim() || "",
  telefone: "",
  fotoPerfil: "",
  tipoUsuario: "Receptor",
});

const imagePickerMediaTypes = ["images"] as ImagePicker.MediaType[];

const getFirebaseErrorCode = (error: unknown) => {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as FirebaseError).code);
  }

  return "";
};

const ProfileScreen = () => {
  const { user, initializing } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoOptionsVisible, setPhotoOptionsVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const displayProfile = useMemo(() => {
    if (!profile) {
      return null;
    }

    return {
      ...profile,
      tipoUsuario: normalizeTipoUsuario(profile.tipoUsuario),
    };
  }, [profile]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2600);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const loadProfile = async () => {
      if (initializing) {
        return;
      }

      if (!user) {
        setProfile(null);
        setLoading(false);
        router.replace("/(auth)/login");
        return;
      }

      if (!db) {
        setError("Firebase não está configurado para carregar o perfil.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSyncWarning(null);

      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        const fallback = buildFallbackProfile(user.displayName, user.email);

        if (!snapshot.exists()) {
          await setDoc(userRef, fallback, { merge: true });
          setProfile(fallback);
          return;
        }

        const data = snapshot.data() as Partial<UserProfile>;
        setProfile({
          nome: data.nome?.trim() || fallback.nome,
          email: data.email?.trim() || fallback.email,
          telefone: data.telefone?.trim() || "",
          fotoPerfil: data.fotoPerfil?.trim() || "",
          tipoUsuario: data.tipoUsuario?.trim() || fallback.tipoUsuario,
        });
      } catch (loadError) {
        const errorCode = getFirebaseErrorCode(loadError);
        const fallback = buildFallbackProfile(user.displayName, user.email);
        setProfile(fallback);
        setSyncWarning(
          errorCode === "permission-denied"
            ? "O Firestore bloqueou a leitura do perfil deste usuário."
            : "Alguns dados do perfil não puderam ser sincronizados agora."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [initializing, reloadToken, user]);

  const getUserProfileRef = () => {
    if (!user || !db) {
      throw new Error("Perfil indisponível.");
    }

    return doc(db, "users", user.uid);
  };

  const mergeProfile = async (fields: Partial<UserProfile>) => {
    const userRef = getUserProfileRef();
    const fallback = buildFallbackProfile(user?.displayName, user?.email);

    await setDoc(userRef, fields, { merge: true });
    setProfile((current) => ({ ...(current ?? fallback), ...fields }));
  };

  const uriToBlob = async (uri: string) => {
    const response = await fetch(uri);
    return response.blob();
  };

  const uploadProfilePhoto = async (assetUri: string) => {
    if (!user || !storage || !db) {
      Alert.alert("Erro", "Firebase não está configurado para salvar a foto no perfil.");
      return;
    }

    setPhotoLoading(true);

    let uploadedFileRef: StorageReference | null = null;

    try {
      const fileRef = storageRef(storage, userPhotoPath(user.uid));
      uploadedFileRef = fileRef;
      const blob = await uriToBlob(assetUri);
      await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
      const downloadUrl = await getDownloadURL(fileRef);
      await mergeProfile({ fotoPerfil: downloadUrl });
      setSuccessMessage("Foto do perfil atualizada.");
    } catch (photoError) {
      const errorCode = getFirebaseErrorCode(photoError);

      if (uploadedFileRef) {
        await deleteObject(uploadedFileRef).catch(() => undefined);
      }

      const message =
        errorCode === "storage/unauthorized"
          ? "O Storage bloqueou a gravação da foto para este usuário."
          : Platform.OS === "web"
            ? "No navegador, o upload da foto foi bloqueado pelo Firebase Storage. Falta liberar CORS do bucket para http://localhost:8083."
          : "Não foi possível atualizar a foto do perfil.";

      Alert.alert("Erro", message);
    } finally {
      setPhotoLoading(false);
    }
  };

  const removeProfilePhoto = async () => {
    if (!user || !storage || !db) {
      return;
    }

    setPhotoOptionsVisible(false);
    setPhotoLoading(true);

    try {
      await deleteObject(storageRef(storage, userPhotoPath(user.uid))).catch(() => undefined);
      await mergeProfile({ fotoPerfil: "" });
      setSuccessMessage("Foto do perfil removida.");
    } catch {
      Alert.alert("Erro", "Não foi possível remover a foto do perfil.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const pickFromLibrary = async () => {
    setPhotoOptionsVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso à galeria para trocar a foto."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imagePickerMediaTypes,
      quality: 0.92,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const takeNewPhoto = async () => {
    setPhotoOptionsVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso à câmera para tirar uma nova foto."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.92,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const choosePhoto = () => {
    if (photoLoading) {
      return;
    }

    setPhotoOptionsVisible(true);
  };

  const openPhoneEditor = () => {
    if (!displayProfile || phoneSaving) {
      return;
    }

    setPhoneDraft(displayProfile.telefone || "");
    setPhoneModalVisible(true);
  };

  const savePhone = async () => {
    if (!user || !db || phoneSaving) {
      return;
    }

    setPhoneSaving(true);

    try {
      await mergeProfile({ telefone: phoneDraft.trim() });
      setPhoneModalVisible(false);
      setSuccessMessage(
        phoneDraft.trim() ? "Telefone atualizado." : "Telefone removido."
      );
    } catch (phoneError) {
      const errorCode = getFirebaseErrorCode(phoneError);
      const message =
        errorCode === "permission-denied"
          ? "O Firestore bloqueou a atualização do telefone deste usuário."
          : "Não foi possível atualizar o telefone.";

      Alert.alert("Erro", message);
    } finally {
      setPhoneSaving(false);
    }
  };

  const becomeDonor = () => {
    router.push("/(tabs)/become-donor" as any);
  };

  const handleLogout = async () => {
    if (!auth) {
      router.replace("/(auth)/login");
      return;
    }

    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Erro", "Não foi possível sair da conta.");
    }
  };

  const handleMenuPress = (route?: string) => {
    if (!route) {
      return;
    }

    router.push(route);
  };

  if (initializing || loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#050807]">
        <StatusBar style="light" />
        <LinearGradient
          colors={["rgba(101,201,15,0.12)", "rgba(5,8,7,0)"]}
          style={absoluteFill}
        />
        <ActivityIndicator size="large" color="#65C90F" />
      </SafeAreaView>
    );
  }

  if (error && !displayProfile) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-[#050807] px-5">
        <StatusBar style="light" />
        <View className="rounded-[24px] border border-white/10 bg-[#111827] p-6">
          <Text className="text-2xl font-semibold text-white">Erro ao carregar perfil</Text>
          <Text className="mt-2 text-[#A3A3A3]">{error}</Text>
          <Pressable
            onPress={() => setReloadToken((current) => current + 1)}
            className="mt-6 h-12 items-center justify-center rounded-full bg-[#65C90F]"
          >
            <Text className="font-semibold text-[#050807]">Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayProfile) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-[#050807] px-5">
        <StatusBar style="light" />
        <View className="rounded-[24px] border border-white/10 bg-[#111827] p-6">
          <Text className="text-2xl font-semibold text-white">Perfil indisponível</Text>
          <Text className="mt-2 text-[#A3A3A3]">
            Não foi possível montar os dados do perfil agora.
          </Text>
          <Pressable
            onPress={() => setReloadToken((current) => current + 1)}
            className="mt-6 h-12 items-center justify-center rounded-full bg-[#65C90F]"
          >
            <Text className="font-semibold text-[#050807]">Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#050807]">
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(12,20,12,0.96)", "rgba(5,8,7,1)", "rgba(5,8,7,1)"]}
        style={absoluteFill}
      />
      <View
        className="absolute -left-20 top-0 h-[260px] w-[260px] rounded-full"
        style={{ backgroundColor: "rgba(101,201,15,0.035)" }}
      />
      <View
        className="absolute right-[-90px] top-[220px] h-[180px] w-[180px] rounded-full"
        style={{ backgroundColor: "rgba(34,197,94,0.025)" }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 152 }}
        className="flex-1"
      >
        <View className="px-5 pt-3">
          <View className="mb-7 flex-row items-center justify-between">
            <Text className="text-[28px] font-semibold leading-[34px] tracking-[-0.4px] text-white">
              Meu perfil
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable className="h-10 w-10 items-center justify-center">
                <Feather name="settings" size={23} color="#FFFFFF" />
              </Pressable>
              <View>
                <Pressable className="h-10 w-10 items-center justify-center">
                  <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                </Pressable>
                <View className="absolute right-[5px] top-[7px] h-[8px] w-[8px] rounded-full border border-black bg-[#65C90F]" />
              </View>
            </View>
          </View>

          {syncWarning ? (
            <View className="mb-4 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
              <Text className="text-[13px] text-[#C7C7C7]">{syncWarning}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View className="mb-4 rounded-[18px] border border-[#65C90F]/25 bg-[#65C90F]/10 px-4 py-3">
              <Text className="font-medium text-[#B8F973]">{successMessage}</Text>
            </View>
          ) : null}

          <View className="mb-6 flex-row items-center">
            <View className="relative mr-5">
              <Pressable
                onPress={choosePhoto}
                disabled={photoLoading}
                hitSlop={12}
                className="h-[104px] w-[104px] overflow-hidden rounded-full bg-[#D8D1C2]"
                style={{ zIndex: 1 }}
              >
                {displayProfile.fotoPerfil ? (
                  <Image
                    source={{ uri: displayProfile.fotoPerfil }}
                    contentFit="cover"
                    transition={180}
                    style={{ width: "100%", height: "100%", borderRadius: 999 }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center rounded-full bg-[#D8D1C2]">
                    <MaterialCommunityIcons name="account" size={46} color="#23410C" />
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={choosePhoto}
                disabled={photoLoading}
                hitSlop={16}
                className="absolute -bottom-1 -right-1 h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#050807] bg-[#65C90F]"
                style={{ zIndex: 30, elevation: 12 }}
              >
                {photoLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="edit-3" size={17} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <View className="flex-1 pr-3">
              <Text className="text-[25px] font-semibold leading-[30px] text-white">
                {displayProfile.nome}
              </Text>
              <View className="mt-2 self-start flex-row items-center justify-center rounded-full bg-[#18340D] pl-2 pr-3 py-[4px]">
                <MaterialCommunityIcons name="check-decagram" size={14} color="#65C90F" />
                <Text className="ml-1 text-[13px] font-medium text-[#7DE11B]">
                  {displayProfile.tipoUsuario}
                </Text>
              </View>
              <Text className="mt-3 text-[14px] text-[#CFCFCF] tracking-[-0.2px]">
                {displayProfile.email}
              </Text>
              <Pressable
                onPress={openPhoneEditor}
                hitSlop={8}
                className="mt-1 self-start"
              >
                <Text className="text-[14px] text-[#B6B6B6]">
                  {displayProfile.telefone ? displayProfile.telefone : "Adicionar telefone"}
                </Text>
              </Pressable>
            </View>

            <Feather name="chevron-right" size={24} color="#A3A3A3" />
          </View>

          {displayProfile.tipoUsuario === "Receptor" ? (
            <Pressable
            onPress={becomeDonor}
            className="mb-6 overflow-hidden rounded-[22px]"
          >
            <LinearGradient
              colors={["#7DE11B", "#58B50B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-[56px] items-center justify-center rounded-[22px]"
            >
              <Text className="text-[16px] font-semibold text-[#081106]">
                Tornar-se doador
              </Text>
            </LinearGradient>
          </Pressable>
          ) : null}

          <View className="mb-6 overflow-hidden rounded-[24px] border border-[#2B4F17] bg-[#101A0F] px-4 py-4">
            <LinearGradient
              colors={["rgba(101,201,15,0.09)", "rgba(16,26,15,0.92)", "rgba(8,14,9,0.97)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={absoluteFill}
            />
            <View className="relative">
              <Text className="ml-1 text-[16px] font-semibold text-white">Meu impacto</Text>
              <Text className="ml-1 mt-1 text-[13px] text-[#B3B3B3]">
                Juntos, transformamos vidas!
              </Text>

              <View className="mt-5 flex-row items-stretch px-1">
                {impactMetrics.map((item, index) => (
                  <View key={item.label} className="flex-1 items-center px-1">
                    <View className="mb-3 h-[48px] w-[48px] items-center justify-center rounded-full border border-[#2B5718] bg-[#19340E]">
                      <MaterialCommunityIcons name={item.icon} size={22} color="#65C90F" />
                    </View>
                    <Text className="text-[21px] font-semibold text-white">{item.value}</Text>
                    <Text className="mt-[2px] max-w-[80px] text-center text-[12px] leading-[15px] text-[#A3A3A3]">
                      {item.label}
                    </Text>
                    {index < impactMetrics.length - 1 ? (
                      <View className="absolute right-0 top-2 bottom-2 w-[1px] bg-white/10" />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="mb-6 overflow-hidden rounded-[24px] border border-white/5 bg-[#101514]">
            {menuItems.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => handleMenuPress(item.route)}
                className="px-5 py-[15px]"
              >
                <View className="flex-row items-center">
                  <MaterialCommunityIcons name={item.icon} size={24} color="#65C90F" />
                  <View className="ml-4 flex-1 pr-4">
                    <Text className="text-[15px] font-semibold text-[#F0F0F0]">{item.title}</Text>
                    <Text className="mt-[2px] text-[12px] leading-[16px] text-[#A3A3A3]">
                      {item.subtitle}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#8A8A8A" />
                </View>
                {index < menuItems.length - 1 ? (
                  <View className="ml-[54px] mt-[16px] h-px bg-white/5" />
                ) : null}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleLogout}
            className="mb-4 h-[64px] flex-row items-center justify-center rounded-[18px] border border-white/5 bg-[#111311]"
          >
            <Feather name="log-out" size={20} color="#F87171" />
            <Text className="ml-3 text-[16px] font-medium text-[#F87171]">
              Sair da conta
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={photoOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoOptionsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-4 pb-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => setPhotoOptionsVisible(false)}
          />
          <View className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111615]">
            <View className="px-5 pb-2 pt-5">
              <Text className="text-[18px] font-semibold text-white">Foto do perfil</Text>
              <Text className="mt-1 text-[13px] text-[#A3A3A3]">
                Adicione, altere ou remova sua foto quando quiser.
              </Text>
            </View>

            <Pressable
              onPress={pickFromLibrary}
              className="border-t border-white/5 px-5 py-4"
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#1C3010]">
                  <Feather name="image" size={18} color="#65C90F" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-semibold text-white">
                    {displayProfile.fotoPerfil ? "Alterar pela galeria" : "Adicionar da galeria"}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#A3A3A3]">
                    Escolha uma imagem salva no dispositivo.
                  </Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={takeNewPhoto}
              className="border-t border-white/5 px-5 py-4"
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#1C3010]">
                  <Feather name="camera" size={18} color="#65C90F" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-semibold text-white">Tirar nova foto</Text>
                  <Text className="mt-1 text-[12px] text-[#A3A3A3]">
                    Abra a câmera e atualize seu avatar.
                  </Text>
                </View>
              </View>
            </Pressable>

            {displayProfile.fotoPerfil ? (
              <Pressable
                onPress={removeProfilePhoto}
                className="border-t border-white/5 px-5 py-4"
              >
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-[#341616]">
                    <Feather name="trash-2" size={18} color="#F87171" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-[15px] font-semibold text-[#F87171]">
                      Remover foto
                    </Text>
                    <Text className="mt-1 text-[12px] text-[#A3A3A3]">
                      Volte a usar o avatar padrão do aplicativo.
                    </Text>
                  </View>
                </View>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setPhotoOptionsVisible(false)}
              className="border-t border-white/5 px-5 py-4"
            >
              <Text className="text-center text-[15px] font-medium text-[#D5D5D5]">
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-4 pb-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => !phoneSaving && setPhoneModalVisible(false)}
          />
          <View className="overflow-hidden rounded-[24px] border border-white/10 bg-[#111615] px-5 pb-5 pt-5">
            <Text className="text-[18px] font-semibold text-white">Telefone</Text>
            <Text className="mt-1 text-[13px] text-[#A3A3A3]">
              Adicione ou atualize o número de telefone do seu perfil.
            </Text>

            <View className="mt-4 rounded-[18px] border border-white/10 bg-[#0D120F] px-4 py-1">
              <TextInput
                value={phoneDraft}
                onChangeText={setPhoneDraft}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                editable={!phoneSaving}
                className="h-12 text-[15px] text-white"
              />
            </View>

            <Pressable
              onPress={savePhone}
              disabled={phoneSaving}
              className="mt-4 overflow-hidden rounded-[18px]"
            >
              <LinearGradient
                colors={["#7DE11B", "#58B50B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="h-12 items-center justify-center rounded-[18px]"
              >
                {phoneSaving ? (
                  <ActivityIndicator size="small" color="#081106" />
                ) : (
                  <Text className="text-[15px] font-semibold text-[#081106]">Salvar telefone</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setPhoneModalVisible(false)}
              disabled={phoneSaving}
              className="mt-3 h-12 items-center justify-center rounded-[18px] border border-white/10 bg-transparent"
            >
              <Text className="text-[15px] font-medium text-[#D5D5D5]">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;
