import { DonationCard } from "@/components";
import NotificacoesButton from "@/components/_notificacoes";
import { Box, Button, ButtonText, HStack, Text } from "@/components/ui";
import { listarDoacoes } from "@/services";
import { useLoading } from "@/store";
import { DonationDocumentWithId, DonationStatus } from "@/types";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/_firebase";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LOCATION_PERMISSION_KEY = "@location_permission_granted";

const baseCategories = ["Todas", "Prontos", "Frutas", "Verduras", "Pães"];

type Coordinates = {
  latitude: number;
  longitude: number;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const parseDateBR = (value: string): Date | null => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length !== 8) return null;
  const day = parseInt(cleaned.slice(0, 2), 10);
  const month = parseInt(cleaned.slice(2, 4), 10);
  const year = parseInt(cleaned.slice(4, 8), 10);
  const date = new Date(year, month - 1, day);
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }
  return date;
};

const isValidadeExpirada = (validade: string) => {
  const date = parseDateBR(validade);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const isNonEmpty = (value?: string | null): value is string =>
  Boolean(value && value.trim().length > 0);

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const precision = km < 10 ? 1 : 0;
  return `${km.toFixed(precision)} km`;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceMeters = (from: Coordinates, to: Coordinates) => {
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const buildLocationLabel = (
  address?: Location.LocationGeocodedAddress | null,
) => {
  if (!address) return "";

  const parts = [
    address.name,
    address.street,
    address.streetNumber,
    address.district,
    address.city,
    address.region,
  ].filter(isNonEmpty);

  return parts.join(", ");
};

type DonationCardItem = {
  id: string;
  title: string;
  weight: string;
  location: string;
  distanceMeters: number | null;
  distance: string;
  date: string;
  category: string;
  imageUri?: string | null;
  status: DonationStatus;
};

export default function Home() {
  const { startLoading, stopLoading } = useLoading();
  
  const addressCoordsRef = useRef<Map<string, Coordinates | null>>(new Map());
  const lastGeocodedLocationRef = useRef<string | null>(null);
  const userCoordsRef = useRef<Coordinates | null>(null);

  const [locationModalMode, setLocationModalMode] = useState<
    "permission" | "selection" | null
  >(null);
  const [locationValue, setLocationValue] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);

  userCoordsRef.current = userCoords;

  useEffect(() => {
    if (userCoords) {
      AsyncStorage.setItem("@user_last_coords", JSON.stringify(userCoords)).catch(() => {});
    }
  }, [userCoords]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setLocationModalMode(null);
      };
    }, [])
  );

  const [distanceByDonationId, setDistanceByDonationId] = useState<
    Record<string, number | null>
  >({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [donations, setDonations] = useState<DonationDocumentWithId[]>([]);
  const [donationsError, setDonationsError] = useState<string | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!db) {
        setSavedAddresses([]);
        return;
      }

      try {
        const userRef = doc(db, "users", "current");
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          setSavedAddresses([]);
          return;
        }

        const data = snapshot.data() as {
          endereco?: string | null;
          enderecos?: string[] | null;
        };

        const addresses = [data.endereco, ...(data.enderecos ?? [])]
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(isNonEmpty);

        setSavedAddresses(Array.from(new Set(addresses)));
      } catch (error) {
        console.log("Erro ao carregar endereços do perfil:", error);
        setSavedAddresses([]);
      }
    };

    void loadSavedAddresses();
  }, []);

  useEffect(() => {
    const trimmedLocation = locationValue.trim();

    if (!trimmedLocation) {
      setUserCoords(null);
      return;
    }

    const lastLocation = lastGeocodedLocationRef.current;
    if (
      lastLocation &&
      normalizeText(lastLocation) === normalizeText(trimmedLocation) &&
      userCoordsRef.current
    ) {
      return;
    }

    let active = true;

    const geocodeLocation = async () => {
      try {
        const [result] = await Location.geocodeAsync(trimmedLocation);

        if (!active) {
          return;
        }

        if (!result) {
          setUserCoords(null);
          setLocationError("Não foi possível localizar este endereço.");
          return;
        }

        setLocationError(null);
        setUserCoords({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        lastGeocodedLocationRef.current = trimmedLocation;
      } catch (error) {
        if (!active) {
          return;
        }
        console.log("Erro ao geocodificar endereço:", error);
        setUserCoords(null);
        setLocationError("Não foi possível localizar este endereço.");
      }
    };

    void geocodeLocation();

    return () => {
      active = false;
    };
  }, [locationValue]);

  const loadDonations = React.useCallback(
    async (isActive: () => boolean = () => true) => {
      startLoading();
      try {
        setDonationsError(null);
        const data = await listarDoacoes();
        if (isActive()) setDonations(data);
      } catch (error) {
        console.error("Erro ao carregar doações:", error);
        if (isActive()) {
          setDonationsError("Não foi possível carregar as doações.");
          setDonations([]);
        }
      } finally {
        if (isActive()) stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      loadDonations(() => active);
      return () => {
        active = false;
      };
    }, [loadDonations])
  );

  const loadGpsLocation = async (requestPermission: boolean) => {
    try {
      setLocationLoading(true);
      setLocationError(null);

      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (requestPermission) {
          setLocationError("Permissão de localização negada.");
        }
        return;
      }

      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, "true");

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync(current.coords);
      const label = buildLocationLabel(address);

      if (!label) {
        setLocationError("Não foi possível identificar o endereço.");
        return;
      }

      setLocationValue(label);
      setLocationInput(label);
      setUserCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      lastGeocodedLocationRef.current = label;
    } catch (error) {
      console.log("Erro ao obter localização:", error);
      setLocationError("Não foi possível obter a localização.");
    } finally {
      setLocationLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const alreadyAccepted = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (alreadyAccepted === "true" || status === "granted") {
        setLocationModalMode(null);
        await loadGpsLocation(false);
        return;
      }
      
      setLocationModalMode("permission");
    } catch (error) {
      console.log("Erro ao verificar localização:", error);
    }
  };

  const handleEnableLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, "true");
        setLocationModalMode(null);
        await loadGpsLocation(false);
      }
    } catch (error) {
      console.log("Erro ao solicitar localização:", error);
    }
  };

  const handleOpenLocationModal = () => {
    setLocationError(null);
    setLocationInput(locationValue);
    setLocationModalMode("selection");
  };

  const handleApplyLocation = () => {
    setLocationValue(locationInput.trim());
    setLocationModalMode(null);
  };

  const resolveAddressCoords = async (address: string) => {
    const normalized = normalizeText(address);

    if (!normalized) {
      return null;
    }

    if (addressCoordsRef.current.has(normalized)) {
      return addressCoordsRef.current.get(normalized) ?? null;
    }

    try {
      const [result] = await Location.geocodeAsync(address);
      if (!result) {
        addressCoordsRef.current.set(normalized, null);
        return null;
      }

      const coords = {
        latitude: result.latitude,
        longitude: result.longitude,
      };
      addressCoordsRef.current.set(normalized, coords);
      return coords;
    } catch (error) {
      console.log("Erro ao geocodificar doação:", error);
      addressCoordsRef.current.set(normalized, null);
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const loadDistances = async () => {
      if (!userCoords || donations.length === 0) {
        if (active) {
          setDistanceByDonationId({});
        }
        return;
      }

      const entries = await Promise.all(
        donations.map(async (donation) => {
          const hasCoords =
            typeof donation.latitude === "number" &&
            typeof donation.longitude === "number";

          const coords = hasCoords
            ? {
                latitude: donation.latitude as number,
                longitude: donation.longitude as number,
              }
            : donation.localizacao
              ? await resolveAddressCoords(donation.localizacao)
              : null;

          const distance = coords
            ? calculateDistanceMeters(userCoords, coords)
            : null;

          return [donation.id, distance] as const;
        }),
      );

      if (active) {
        setDistanceByDonationId(Object.fromEntries(entries));
      }
    };

    void loadDistances();

    return () => {
      active = false;
    };
  }, [donations, userCoords]);

  const categories = useMemo(() => {
    const fromData = donations.map((d) => d.categoria).filter(Boolean);
    return Array.from(new Set([...baseCategories, ...fromData]));
  }, [donations]);

  const donationCards = useMemo<DonationCardItem[]>(
    () =>
      donations.map((donation) => ({
        id: donation.id,
        title: donation.tipoAlimento,
        weight: donation.quantidade,
        location: donation.localizacao ?? "",
        distanceMeters: distanceByDonationId[donation.id] ?? null,
        distance:
          distanceByDonationId[donation.id] !== null &&
          distanceByDonationId[donation.id] !== undefined
            ? `${formatDistance(distanceByDonationId[donation.id] as number)} de você`
            : donation.localizacao
              ? `Local: ${donation.localizacao}`
              : "Localização não informada",
        date: donation.validade,
        category: donation.categoria,
        imageUri: donation.fotos?.[0]?.secureUrl ?? null,
        status: donation.status,
      })),
    [donations, distanceByDonationId]
  );

  const filteredDonations = useMemo(() => {
    const searchTerm = normalizeText(search);

    const filtered = donationCards.filter((item) => {
      const isAvailable = item.status === "disponivel";
      const notExpired = !isValidadeExpirada(item.date);

      const matchesCategory =
        selectedCategory === "Todas"
          ? true
          : item.category === selectedCategory;

      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm) ||
        item.weight.toLowerCase().includes(searchTerm) ||
        item.distance.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm);

      return isAvailable && notExpired && matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const distanceA = a.distanceMeters ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distanceMeters ?? Number.POSITIVE_INFINITY;

      if (distanceA === distanceB) {
        return a.title.localeCompare(b.title);
      }

      return distanceA - distanceB;
    });
  }, [donationCards, search, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <Box className="flex-1 bg-[#09090B] pt-12 px-4">
        {/* Header */}
        <HStack className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Text className="text-white text-2xl font-bold">Doações</Text>
          </View>
          <NotificacoesButton />
        </HStack>

        {/* Search */}
        <HStack className="flex-row items-center mb-6">
          <Box className="flex-1 flex-row items-center bg-black/30 rounded-2xl px-4 h-12 border border-[#27272A]">
            <FontAwesome5 name="search" size={16} color="#A1A1AA" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar doações..."
              placeholderTextColor="#71717A"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-white ml-3 text-[16px]"
              style={{ fontFamily: "System" }}
            />
          </Box>
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Box className="ml-3 bg-[#1C1C1E] rounded-2xl w-12 h-12 items-center justify-center">
                <FontAwesome5 name="times" size={18} color="white" />
              </Box>
            </TouchableOpacity>
          )}
        </HStack>

        {/* Categories */}
        <Box className="h-12 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Button
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`${
                    isSelected ? "bg-[#1E3A0A]" : "bg-[#27272A]"
                  } mr-2 px-6 rounded-xl h-10 border-0 items-center justify-center`}
                >
                  <ButtonText
                    className={`${
                      isSelected ? "text-[#84CC16] font-bold" : "text-gray-300"
                    } text-center text-sm`}
                  >
                    {cat}
                  </ButtonText>
                </Button>
              );
            })}
          </ScrollView>
        </Box>

        {/* Localização vigente */}
        <TouchableOpacity
          onPress={handleOpenLocationModal}
          activeOpacity={0.85}
          className="flex-row items-center bg-[#111312] border border-[#1E1E21] rounded-xl px-3 py-2.5 mb-3"
        >
          <FontAwesome5 name="map-marker-alt" size={12} color="#65A30D" />
          <Text className="text-[#A1A1AA] text-[13px] ml-2 flex-1" numberOfLines={1}>
            {locationValue.trim()
              ? locationValue.trim()
              : userCoords
                ? "Usando localização atual"
                : "Toque para definir sua localização"}
          </Text>
          <FontAwesome5 name="chevron-right" size={10} color="#71717A" />
        </TouchableOpacity>

        {/* Resultados */}
        <Text className="text-[#71717A] mb-4 text-sm">
          {filteredDonations.length} doação(ões) encontrada(s)
        </Text>

        {/* Lista */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {filteredDonations.length > 0 ? (
            filteredDonations.map((item) => (
              <DonationCard
                key={item.id}
                title={item.title}
                weight={item.weight}
                distance={item.distance}
                date={item.date}
                imageUri={item.imageUri}
                status={item.status}
                onPress={() => router.push(`/(tabs)/home/${item.id}` as any)}
              />
            ))
          ) : (
            <Box className="items-center justify-center mt-20">
              <Box className="bg-[#18181B] w-20 h-20 rounded-full items-center justify-center mb-4">
                <FontAwesome5 name="search" size={28} color="#71717A" />
              </Box>
              <Text className="text-white text-lg font-semibold mb-2">
                {donationsError ?? "Nenhuma doação encontrada"}
              </Text>
              <Text className="text-[#71717A] text-center px-8">
                {donationsError
                  ? "Tente novamente mais tarde."
                  : "Tente pesquisar outro alimento ou mudar a categoria."}
              </Text>
            </Box>
          )}
        </ScrollView>
      </Box>

      {/* Modal de localização */}
      <Modal
        visible={locationModalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalMode(null)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/60 px-6"
          onPress={() => setLocationModalMode(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-[#18181B] border border-[#27272A] rounded-[28px] overflow-hidden"
          >
            <View className="items-center pt-6">
              <View className="bg-[#1E3A0A] w-16 h-16 rounded-full items-center justify-center mb-4">
                <FontAwesome5
                  name={locationModalMode === "permission" ? "map-marker-alt" : "location-arrow"}
                  size={24}
                  color="#84CC16"
                />
              </View>
            </View>

            <View className="px-6 pb-2">
              {locationModalMode === "permission" ? (
                <>
                  <Text className="text-white text-xl font-bold text-center mb-3">
                    Habilitar localização
                  </Text>
                  <Text className="text-[#A1A1AA] text-center leading-6">
                    Precisamos da sua localização para mostrar doações próximas de você em tempo real.
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-xl font-bold text-center mb-3">
                    Sua localização
                  </Text>
                  <Text className="text-[#A1A1AA] text-center leading-6 mb-4">
                    Use o GPS ou digite outro endereço.
                  </Text>

                  <View className="flex-row items-center bg-black/30 rounded-2xl px-4 h-12 border border-[#27272A] mb-3">
                    <FontAwesome5 name="map-marker-alt" size={16} color="#65A30D" />
                    <TextInput
                      value={locationInput}
                      onChangeText={setLocationInput}
                      placeholder="Ex: Centro, Fortaleza - CE"
                      placeholderTextColor="#71717A"
                      keyboardType="default"
                      autoCapitalize="words"
                      autoCorrect={false}
                      className="flex-1 text-white ml-3 text-[16px]"
                      style={{ fontFamily: "System" }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => loadGpsLocation(true)}
                    className="bg-[#1E3A0A] w-full rounded-2xl h-12 mb-3 border border-[#2B5718] items-center justify-center"
                  >
                    {locationLoading ? (
                      <ActivityIndicator color="#84CC16" size="small" />
                    ) : (
                      <Text className="text-[#84CC16] font-semibold">Usar GPS</Text>
                    )}
                  </TouchableOpacity>

                  {savedAddresses.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-[#A1A1AA] text-sm mb-2">Endereços salvos</Text>
                      {savedAddresses.map((address) => {
                        const isSelected = normalizeText(address) === normalizeText(locationInput);
                        return (
                          <TouchableOpacity
                            key={address}
                            onPress={() => setLocationInput(address)}
                            activeOpacity={0.8}
                            className={`rounded-2xl border px-4 py-3 mb-2 ${
                              isSelected
                                ? "border-[#65A30D] bg-[#1B2A12]"
                                : "border-[#27272A] bg-[#111312]"
                            }`}
                          >
                            <Text className="text-white text-sm">{address}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {locationError && (
                    <Text className="text-[#F87171] text-center mb-3 text-sm">
                      {locationError}
                    </Text>
                  )}
                </>
              )}
            </View>

            <View className="flex-col pb-6 pt-4 px-6">
              {locationModalMode === "permission" ? (
                <>
                  <TouchableOpacity
                    onPress={handleEnableLocation}
                    activeOpacity={0.8}
                    className="bg-[#65A30D] w-full rounded-2xl h-12 mb-3 items-center justify-center"
                  >
                    <Text className="text-white font-semibold">Permitir acesso</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setLocationModalMode(null)}>
                    <Text className="text-[#A1A1AA] text-center">Agora não</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleApplyLocation}
                    activeOpacity={0.8}
                    className="bg-[#65A30D] w-full rounded-2xl h-12 mb-3 items-center justify-center"
                  >
                    <Text className="text-white font-semibold">Aplicar localização</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setLocationModalMode(null)}>
                    <Text className="text-[#A1A1AA] text-center">Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}