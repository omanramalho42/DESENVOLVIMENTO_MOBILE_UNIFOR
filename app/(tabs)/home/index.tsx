import { DonationCard } from "@/components";
import {
  Box,
  Button,
  ButtonText,
  HStack,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
} from "@/components/ui";
import useAuth from "@/hooks/_useAuth";
import { db } from "@/services/_firebase";
import { listarDoacoes } from "@/services";
import { useLoading } from "@/store";
import { DonationDocumentWithId, DonationStatus } from "@/types";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LOCATION_PERMISSION_KEY = "@location_permission_granted";
const baseCategories = ["Todas", "Prontos", "Frutas", "Verduras", "Pães"];
const MAX_ADDRESS_CACHE_SIZE = 200;

type Coordinates = {
  latitude: number;
  longitude: number;
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

const normalizeText = (value: string) => value.trim().toLowerCase();

const isNonEmpty = (value?: string | null): value is string =>
  Boolean(value && value.trim().length > 0);

const toRadians = (value: number) => (value * Math.PI) / 180;

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
};

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

const buildLocationLabel = (address?: Location.LocationGeocodedAddress | null) => {
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

export default function Home() {
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const addressCoordsRef = useRef<Map<string, Coordinates | null>>(new Map());
  const lastGeocodedLocationRef = useRef<string | null>(null);

  const [locationModalMode, setLocationModalMode] = useState<
    "permission" | "selection" | null
  >(null);
  const [locationValue, setLocationValue] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [distanceByDonationId, setDistanceByDonationId] = useState<Record<string, number | null>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [donations, setDonations] = useState<DonationDocumentWithId[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [donationsError, setDonationsError] = useState<string | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!user?.uid || !db) {
        setSavedAddresses([]);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
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
  }, [user?.uid]);

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
      userCoords
    ) {
      return;
    }

    let active = true;

    const geocodeLocation = async () => {
      try {
        const [result] = await Location.geocodeAsync(trimmedLocation);

        if (!active) return;

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
        if (!active) return;
        console.log("Erro ao geocodificar endereço:", error);
        setUserCoords(null);
        setLocationError("Não foi possível localizar este endereço.");
      }
    };

    void geocodeLocation();

    return () => {
      active = false;
    };
  }, [locationValue, userCoords]);

  useEffect(() => {
    let active = true;

    const loadDonations = async () => {
      startLoading();
      try {
        setLoadingDonations(true);
        setDonationsError(null);
        const data = await listarDoacoes();
        if (active) setDonations(data);
      } catch (error) {
        console.error("Erro ao carregar doações:", error);
        if (active) {
          setDonationsError("Não foi possível carregar as doações.");
          setDonations([]);
        }
      } finally {
        if (active) {
          setLoadingDonations(false);
          stopLoading();
        }
      }
    };

    void loadDonations();

    return () => {
      active = false;
    };
  }, []);

  const loadGpsLocation = async (requestPermission: boolean) => {
    try {
      setLocationLoading(true);
      setLocationError(null);

      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (requestPermission) setLocationError("Permissão de localização negada.");
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
        setLocationModalMode((current) => (current === "selection" ? current : null));
        await loadGpsLocation(false);
        return;
      }

      await loadGpsLocation(true);

      const { status: updatedStatus } = await Location.getForegroundPermissionsAsync();

      setLocationModalMode((current) => {
        if (current === "selection") return current;
        return updatedStatus === "granted" ? null : "permission";
      });
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
        return;
      }
      setLocationModalMode("permission");
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
    if (!normalized) return null;

    if (addressCoordsRef.current.has(normalized)) {
      return addressCoordsRef.current.get(normalized) ?? null;
    }

    try {
      const [result] = await Location.geocodeAsync(address);
      if (!result) {
        addressCoordsRef.current.set(normalized, null);
        return null;
      }

      const coords = { latitude: result.latitude, longitude: result.longitude };
      if (addressCoordsRef.current.size >= MAX_ADDRESS_CACHE_SIZE) {
        const firstKey = addressCoordsRef.current.keys().next().value;
        if (firstKey) addressCoordsRef.current.delete(firstKey);
      }
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
        if (active) setDistanceByDonationId({});
        return;
      }

      const entries: Array<readonly [string, number | null]> = [];
      for (const donation of donations) {
        const hasCoords =
          typeof donation.latitude === "number" &&
          typeof donation.longitude === "number" &&
          Number.isFinite(donation.latitude) &&
          Number.isFinite(donation.longitude);

        const coords = hasCoords
          ? {
              latitude: donation.latitude as number,
              longitude: donation.longitude as number,
            }
          : donation.localizacao
            ? await resolveAddressCoords(donation.localizacao)
            : null;

        const distance = coords ? calculateDistanceMeters(userCoords, coords) : null;
        entries.push([donation.id, distance] as const);
      }

      if (active) setDistanceByDonationId(Object.fromEntries(entries));
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
    [donations, distanceByDonationId],
  );

  const filteredDonations = useMemo(() => {
    const searchTerm = normalizeText(search);

    const filtered = donationCards.filter((item) => {
      const matchesCategory =
        selectedCategory === "Todas" ? true : item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm) ||
        item.weight.toLowerCase().includes(searchTerm) ||
        item.distance.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      const distanceA = a.distanceMeters ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distanceMeters ?? Number.POSITIVE_INFINITY;

      if (distanceA === distanceB) return a.title.localeCompare(b.title);
      return distanceA - distanceB;
    });
  }, [donationCards, search, selectedCategory]);

  const currentLocationLabel = locationValue.trim();
  const normalizedLocationInput = normalizeText(locationInput);

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <Box className="flex-1 bg-[#09090B] pt-12 px-4">
        <HStack className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-2xl font-bold">Doações</Text>
          <Box className="bg-[#1E3A0A] w-10 h-10 rounded-full items-center justify-center">
            <FontAwesome5 name="seedling" size={16} color="#84CC16" />
          </Box>
        </HStack>

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

        <Box className="h-12 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ alignItems: "center" }}
          >
            <Button
              onPress={handleOpenLocationModal}
              className="bg-[#1E3A0A] mr-2 px-4 rounded-xl h-10 border-0 items-center justify-center"
            >
              <FontAwesome5 name="location-arrow" size={16} color="#84CC16" />
            </Button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Button
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
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Box>

        <TouchableOpacity
          onPress={handleOpenLocationModal}
          className="flex-row items-center mb-3"
        >
          <FontAwesome5 name="map-marker-alt" size={12} color="#65A30D" />
          <Text className="text-[#A1A1AA] text-[13px] ml-2 flex-1" numberOfLines={1}>
            {currentLocationLabel
              ? currentLocationLabel
              : userCoords
                ? "Usando localização atual"
                : "Toque para definir sua localização"}
          </Text>
          <FontAwesome5 name="chevron-right" size={10} color="#71717A" />
        </TouchableOpacity>

        <Text className="text-[#71717A] mb-4 text-sm">
          {filteredDonations.length} doação(ões) encontrada(s)
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {loadingDonations ? (
            <Box className="items-center justify-center mt-20">
              <ActivityIndicator color="#65A30D" size="large" />
              <Text className="text-[#A1A1AA] text-center mt-4">Carregando doações...</Text>
            </Box>
          ) : filteredDonations.length > 0 ? (
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

      <Modal isOpen={locationModalMode !== null} onClose={() => setLocationModalMode(null)}>
        <ModalBackdrop />
        <ModalContent className="bg-[#18181B] border border-[#27272A] rounded-[28px] mx-6">
          <ModalHeader className="items-center pt-6">
            <Box className="bg-[#1E3A0A] w-16 h-16 rounded-full items-center justify-center mb-4">
              <FontAwesome5
                name={locationModalMode === "permission" ? "map-marker-alt" : "location-arrow"}
                size={24}
                color="#84CC16"
              />
            </Box>
          </ModalHeader>
          <ModalBody className="pb-2">
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
                <Text className="text-[#A1A1AA] text-center leading-6">
                  Use o GPS ou digite outro endereço.
                </Text>

                <View className="flex-row items-center bg-black/30 rounded-2xl px-4 h-12 border border-[#27272A] mt-4">
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
                  className="bg-[#1E3A0A] w-full rounded-2xl h-12 mt-4 border border-[#2B5718] items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Text className="text-[#84CC16] font-semibold">
                    {locationLoading ? "Carregando..." : "Usar GPS"}
                  </Text>
                </TouchableOpacity>

                {savedAddresses.length > 0 && (
                  <View className="mt-4">
                    <Text className="text-[#A1A1AA] text-sm mb-2">Endereços salvos</Text>
                    {savedAddresses.map((address) => {
                      const isSelected = normalizeText(address) === normalizedLocationInput;
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
                  <Text className="text-[#F87171] text-center mt-3 text-sm">{locationError}</Text>
                )}

                <Button
                  onPress={handleApplyLocation}
                  className="bg-[#65A30D] w-full rounded-2xl h-12 mt-4"
                >
                  <ButtonText className="text-white font-semibold">Aplicar localização</ButtonText>
                </Button>
              </>
            )}
          </ModalBody>
          <ModalFooter className="flex-col pb-6 pt-4">
            {locationModalMode === "permission" ? (
              <>
                <Button
                  onPress={handleEnableLocation}
                  className="bg-[#65A30D] w-full rounded-2xl h-12 mb-3"
                >
                  <ButtonText className="text-white font-semibold">Permitir acesso</ButtonText>
                </Button>
                <TouchableOpacity onPress={() => setLocationModalMode(null)}>
                  <Text className="text-[#A1A1AA] text-center">Agora não</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setLocationModalMode(null)}>
                <Text className="text-[#A1A1AA] text-center">Cancelar</Text>
              </TouchableOpacity>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
