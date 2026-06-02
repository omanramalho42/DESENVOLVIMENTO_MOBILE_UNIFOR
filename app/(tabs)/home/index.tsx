import { DonationCard } from "@/components";
import { Box, Button, ButtonText, HStack, Text } from "@/components/ui";
import { listarDoacoes } from "@/services";
import { useLoading } from "@/store";
import { DonationDocumentWithId, DonationStatus } from "@/types";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DonationCardSkeleton from "./components/donnations-card-skeleton";
import LocalizationModal from "./components/Locazilaztion-modal";
const baseCategories = ["Todas", "Prontos", "Frutas", "Verduras", "Pães"];

type DonationCardItem = {
  id: string;
  title: string;
  weight: string;
  distance: string;
  date: string;
  category: string;
  imageUri?: string | null;
  status: DonationStatus;
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const { startLoading, stopLoading } = useLoading();
  const [donations, setDonations] = useState<DonationDocumentWithId[]>([]);
  const [donationsError, setDonationsError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== "granted") return;

        const location = await Location.getCurrentPositionAsync({});

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error(error);
      }
    };

    getUserLocation();
  }, []);
  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    let active = true;

    const loadDonations = async () => {
      setLoading(true);
      startLoading();

      try {
        setDonationsError(null);

        const data = await listarDoacoes();

        if (active) {
          setDonations(data);
        }
      } catch (error) {
        console.error("Erro ao carregar doações:", error);

        if (active) {
          setDonationsError("Não foi possível carregar as doações.");
          setDonations([]);
        }
      } finally {
        if (active) {
          stopLoading();
          setLoading(false);
        }
      }
    };

    loadDonations();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const fromData = donations.map((d) => d.categoria).filter(Boolean);
    return Array.from(new Set([...baseCategories, ...fromData]));
  }, [donations]);

  const donationCards = useMemo(
    () =>
      donations.map((donation) => {
        let distance = "Distância indisponível";
        // console.log(donation, "🔥");
        // console.log(userLocation, donation.latitude, donation.longitude, "🗺️");
        if (userLocation && donation.latitude && donation.longitude) {
          const distanceStr = calculateDistance(
            userLocation?.latitude,
            userLocation?.longitude,
            donation.latitude, // 👈 Mudou aqui (acessa direto da raiz)
            donation.longitude, // 👈 Mudou aqui (acessa direto da raiz)
          );

          distance = `${distanceStr.toFixed(1)} km`;
        }

        return {
          id: donation.id,
          title: donation.tipoAlimento,
          weight: donation.quantidade,
          distance:
            distance !== "Distância indisponível"
              ? distance
              : donation.localizacao, // 👈 Se falhar, usa o texto puro da localização
          date: donation.validade,
          category: donation.categoria,
          imageUri: donation.fotos?.[0]?.secureUrl ?? null,
          status: donation.status,
        };
      }),
    [donations, userLocation],
  );

  const filteredDonations = useMemo(() => {
    return donationCards.filter((item) => {
      const matchesCategory =
        selectedCategory === "Todas"
          ? true
          : item.category === selectedCategory;
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm) ||
        item.weight.toLowerCase().includes(searchTerm) ||
        item.distance.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [donationCards, search, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <Box className="flex-1 bg-[#09090B] pt-12 px-4">
        {/* Header */}
        <HStack className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-2xl font-bold">Doações</Text>
          <Box className="bg-[#1E3A0A] w-10 h-10 rounded-full items-center justify-center">
            <FontAwesome5 name="seedling" size={16} color="#84CC16" />
          </Box>
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
          {loading ? (
            <>
              <DonationCardSkeleton />
              <DonationCardSkeleton />
              <DonationCardSkeleton />
              <DonationCardSkeleton />
            </>
          ) : donationsError ? (
            <Box className="items-center justify-center mt-20 px-6">
              <Box className="bg-[#18181B] w-20 h-20 rounded-full items-center justify-center mb-4">
                <FontAwesome5
                  name="exclamation-triangle"
                  size={28}
                  color="#EF4444"
                />
              </Box>

              <Text className="text-white text-lg font-semibold mb-2 text-center">
                Erro ao carregar
              </Text>

              <Text className="text-[#71717A] text-center">
                {donationsError}
              </Text>
            </Box>
          ) : donations.length === 0 ? (
            <Box className="items-center justify-center mt-20 px-6">
              <Box className="bg-[#18181B] w-20 h-20 rounded-full items-center justify-center mb-4">
                <FontAwesome5 name="box-open" size={28} color="#71717A" />
              </Box>

              <Text className="text-white text-lg font-semibold mb-2 text-center">
                Nenhuma doação cadastrada
              </Text>

              <Text className="text-[#71717A] text-center">
                Ainda não existem doações disponíveis.
              </Text>
            </Box>
          ) : filteredDonations.length === 0 ? (
            <Box className="items-center justify-center mt-20 px-6">
              <Box className="bg-[#18181B] w-20 h-20 rounded-full items-center justify-center mb-4">
                <FontAwesome5 name="search" size={28} color="#71717A" />
              </Box>

              <Text className="text-white text-lg font-semibold mb-2 text-center">
                Nenhum resultado encontrado
              </Text>

              <Text className="text-[#71717A] text-center">
                Tente alterar a busca ou selecionar outra categoria.
              </Text>
            </Box>
          ) : (
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
          )}
        </ScrollView>
      </Box>

      {/* Modal de localização */}
      <LocalizationModal />
    </SafeAreaView>
  );
}
