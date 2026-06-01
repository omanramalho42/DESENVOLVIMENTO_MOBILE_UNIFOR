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
import { listarDoacoes } from "@/services";
import { useLoading } from "@/store";
import { DonationDocumentWithId, DonationStatus } from "@/types";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LOCATION_PERMISSION_KEY = "@location_permission_granted";
const SAVED_LOCATIONS_KEY = "@saved_locations";

const baseCategories = ["Todas", "Prontos", "Frutas", "Verduras", "Pães"];

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationModalMode = "permission" | "selection";

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

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
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

  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const buildLocationLabel = (address?: Location.LocationGeocodedAddress | null) => {
  if (!address) return "";

  return [
    address.name,
    address.street,
    address.streetNumber,
    address.district,
    address.city,
    address.region,
  ]
    .filter(isNonEmpty)
    .join(", ");
};

export default function Home() {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalMode, setLocationModalMode] =
    useState<LocationModalMode>("permission");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const [savedLocations, setSavedLocations] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  const { startLoading, stopLoading } = useLoading();
  const [donations, setDonations] = useState<DonationDocumentWithId[]>([]);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [donationCoordsById, setDonationCoordsById] = useState<
    Record<string, Coordinates | null>
  >({});

  const addressCoordsRef = useRef<Record<string, Coordinates>>({});

  const persistSavedLocations = async (locations: string[]) => {
    const sanitized = Array.from(
      new Set(locations.map((item) => item.trim()).filter(Boolean)),
    );

    setSavedLocations(sanitized);
    await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(sanitized));
  };

  const prependSavedLocation = async (locationLabel: string) => {
    const normalized = locationLabel.trim();
    if (!normalized) return;

    await persistSavedLocations([normalized, ...savedLocations]);
  };

  const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
    const key = normalizeText(address);
    if (!key) return null;

    const fromCache = addressCoordsRef.current[key];
    if (fromCache) return fromCache;

    try {
      const geocoded = await Location.geocodeAsync(address);
      const first = geocoded[0];
      if (!first) return null;

      const parsed = {
        latitude: first.latitude,
        longitude: first.longitude,
      };

      addressCoordsRef.current[key] = parsed;
      return parsed;
    } catch {
      return null;
    }
  };

  const refreshCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setUserCoords(coords);

      const reverse = await Location.reverseGeocodeAsync(coords);
      const label = buildLocationLabel(reverse[0] ?? null);

      if (label) {
        setSelectedLocationLabel(label);
        await prependSavedLocation(label);
      }
    } catch (error) {
      console.log("Erro ao obter localização atual:", error);
    } finally {
      setLocationLoading(false);
    }
  };

  const initializeLocationSelection = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_LOCATIONS_KEY);
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      const sanitized = Array.from(
        new Set(parsed.map((item) => item.trim()).filter(Boolean)),
      );
      setSavedLocations(sanitized);

      if (!selectedLocationLabel && sanitized.length > 0) {
        setSelectedLocationLabel(sanitized[0]);
        const coords = await geocodeAddress(sanitized[0]);
        if (coords) setUserCoords(coords);
      }
    } catch {
      setSavedLocations([]);
    }

    await refreshCurrentLocation();
  };

  useEffect(() => {
    let active = true;

    const checkLocationPermission = async () => {
      try {
        const alreadyAccepted = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
        const { status } = await Location.getForegroundPermissionsAsync();

        if (!active) return;

        if (alreadyAccepted === "true" || status === "granted") {
          setLocationModalMode("selection");
          await initializeLocationSelection();
          return;
        }

        setLocationModalMode("permission");
        setShowLocationModal(true);
      } catch (error) {
        console.log("Erro ao verificar localização:", error);
      }
    };

    checkLocationPermission();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    const loadDonations = async () => {
      startLoading();
      try {
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
        if (active) stopLoading();
      }
    };

    loadDonations();

    return () => {
      active = false;
    };
  }, [startLoading, stopLoading]);

  useEffect(() => {
    let active = true;

    const hydrateDonationCoords = async () => {
      const next: Record<string, Coordinates | null> = {};

      await Promise.all(
        donations.map(async (donation) => {
          if (
            typeof donation.latitude === "number" &&
            typeof donation.longitude === "number"
          ) {
            next[donation.id] = {
              latitude: donation.latitude,
              longitude: donation.longitude,
            };
            return;
          }

          if (!donation.localizacao) {
            next[donation.id] = null;
            return;
          }

          next[donation.id] = await geocodeAddress(donation.localizacao);
        }),
      );

      if (active) setDonationCoordsById(next);
    };

    hydrateDonationCoords();

    return () => {
      active = false;
    };
  }, [donations]);

  const handleEnableLocation = async () => {
    setRequestingPermission(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, "true");
        setLocationModalMode("selection");
        await initializeLocationSelection();
      }
    } catch (error) {
      console.log("Erro ao solicitar localização:", error);
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleOpenLocationModal = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      setLocationModalMode("selection");
      setShowLocationModal(true);
      return;
    }

    setLocationModalMode("permission");
    setShowLocationModal(true);
  };

  const handleSelectSavedLocation = async (locationLabel: string) => {
    const coords = await geocodeAddress(locationLabel);
    if (coords) setUserCoords(coords);
    setSelectedLocationLabel(locationLabel);
    setShowLocationModal(false);
  };

  const categories = useMemo(() => {
    const fromData = donations.map((d) => d.categoria).filter(Boolean);
    return Array.from(new Set([...baseCategories, ...fromData]));
  }, [donations]);

  const donationCards = useMemo<DonationCardItem[]>(
    () =>
      donations.map((donation) => {
        const coords = donationCoordsById[donation.id] ?? null;
        const distanceMeters =
          userCoords && coords ? calculateDistanceMeters(userCoords, coords) : null;

        const locationText = donation.localizacao
          ? `Local: ${donation.localizacao}`
          : "Localização não informada";

        return {
          id: donation.id,
          title: donation.tipoAlimento,
          weight: donation.quantidade,
          location: donation.localizacao ?? "",
          distanceMeters,
          distance:
            distanceMeters !== null
              ? `${formatDistance(distanceMeters)} • ${locationText}`
              : locationText,
          date: donation.validade,
          category: donation.categoria,
          imageUri: donation.fotos?.[0]?.secureUrl ?? null,
          status: donation.status,
        };
      }),
    [donations, donationCoordsById, userCoords],
  );

  const filteredDonations = useMemo(() => {
    const searchTerm = search.toLowerCase();

    return donationCards
      .filter((item) => {
        const matchesCategory =
          selectedCategory === "Todas" ? true : item.category === selectedCategory;

        const matchesSearch =
          item.title.toLowerCase().includes(searchTerm) ||
          item.weight.toLowerCase().includes(searchTerm) ||
          item.distance.toLowerCase().includes(searchTerm) ||
          item.location.toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (a.distanceMeters === null && b.distanceMeters === null) return 0;
        if (a.distanceMeters === null) return 1;
        if (b.distanceMeters === null) return -1;
        return a.distanceMeters - b.distanceMeters;
      });
  }, [donationCards, search, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <Box className="flex-1 bg-[#09090B] pt-12 px-4">
        <HStack className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-2xl font-bold">Doações</Text>
          <TouchableOpacity onPress={handleOpenLocationModal} activeOpacity={0.8}>
            <Box className="bg-[#1E3A0A] px-3 h-10 rounded-full flex-row items-center justify-center">
              {locationLoading ? (
                <ActivityIndicator size="small" color="#84CC16" />
              ) : (
                <>
                  <FontAwesome5 name="map-marker-alt" size={14} color="#84CC16" />
                  <Text className="text-[#84CC16] text-xs ml-2" numberOfLines={1}>
                    {selectedLocationLabel ? "Local ativo" : "Local"}
                  </Text>
                </>
              )}
            </Box>
          </TouchableOpacity>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Button
                  className={`${
                    selectedCategory === cat ? "bg-[#1E3A0A]" : "bg-[#27272A]"
                  } mr-2 px-6 rounded-xl h-10 border-0 items-center justify-center`}
                >
                  <ButtonText
                    className={`${
                      selectedCategory === cat
                        ? "text-[#84CC16] font-bold"
                        : "text-gray-300"
                    } text-center text-sm`}
                  >
                    {cat}
                  </ButtonText>
                </Button>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Box>

        <Text className="text-[#71717A] mb-2 text-sm">
          {filteredDonations.length} doação(ões) encontrada(s)
        </Text>

        {!!selectedLocationLabel && (
          <Text className="text-[#A1A1AA] mb-4 text-xs" numberOfLines={1}>
            Ordenado por proximidade de: {selectedLocationLabel}
          </Text>
        )}

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

      <Modal isOpen={showLocationModal}>
        <ModalBackdrop />
        <ModalContent className="bg-[#18181B] border border-[#27272A] rounded-[28px] mx-6">
          <ModalHeader className="items-center pt-6">
            <Box className="bg-[#1E3A0A] w-16 h-16 rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="map-marker-alt" size={24} color="#84CC16" />
            </Box>
          </ModalHeader>

          {locationModalMode === "permission" ? (
            <>
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
                  disabled={requestingPermission}
                >
                  <ButtonText className="text-white font-semibold">
                    {requestingPermission ? "Solicitando..." : "Permitir acesso"}
                  </ButtonText>
                </Button>
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <Text className="text-[#A1A1AA] text-center">Agora não</Text>
                </TouchableOpacity>
              </ModalFooter>
            </>
          ) : (
            <>
              <ModalBody className="pb-2">
                <Text className="text-white text-xl font-bold text-center mb-3">
                  Selecione sua localização
                </Text>
                <Text className="text-[#A1A1AA] text-center leading-6 mb-4">
                  Use seu GPS ou um endereço salvo para calcular proximidade das doações.
                </Text>

                <Button
                  onPress={async () => {
                    await refreshCurrentLocation();
                    setShowLocationModal(false);
                  }}
                  className="bg-[#1E3A0A] w-full rounded-2xl h-12 mb-3"
                >
                  <ButtonText className="text-[#84CC16] font-semibold">
                    Usar localização atual (GPS)
                  </ButtonText>
                </Button>

                {savedLocations.length > 0 && (
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                    {savedLocations.map((locationLabel) => (
                      <TouchableOpacity
                        key={locationLabel}
                        activeOpacity={0.8}
                        onPress={() => handleSelectSavedLocation(locationLabel)}
                      >
                        <Box className="bg-[#101012] border border-[#27272A] rounded-2xl px-4 py-3 mb-2">
                          <Text
                            className={`text-sm ${
                              selectedLocationLabel === locationLabel
                                ? "text-[#84CC16]"
                                : "text-[#D4D4D8]"
                            }`}
                            numberOfLines={2}
                          >
                            {locationLabel}
                          </Text>
                        </Box>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </ModalBody>

              <ModalFooter className="flex-col pb-6 pt-2">
                <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                  <Text className="text-[#A1A1AA] text-center">Fechar</Text>
                </TouchableOpacity>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
