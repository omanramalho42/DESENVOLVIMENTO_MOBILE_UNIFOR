import { buscarDoacoes, DonationItem } from "@/services/_firestore";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import {
  Box,
  Button,
  ButtonText,
  HStack,
  Spinner // Importado para dar feedback visual de carregamento
  ,



  Text
} from "@gluestack-ui/themed";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DonationCard from "./components/card-donnation";
const categories = ["Todas", "Frutas", "Verduras", "Pães"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  
  // Estados para gerenciar as doações vindas do Firebase
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Função isolada para carregar os dados
  const loadDonations = async () => {
    try {
      const data = await buscarDoacoes();
      setDonations(data);
    } catch (error) {
      console.log("Erro na tela Home ao carregar doações:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carrega as informações ao montar a tela
  useEffect(() => {
    loadDonations();
  }, []);

  // Função disparada quando o usuário arrasta a tela para baixo para atualizar
  const onRefresh = () => {
    setIsRefreshing(true);
    loadDonations();
  };

  const filteredDonations = useMemo(() => {
    return donations.filter((item) => {
      const matchesCategory =
        selectedCategory === "Todas"
          ? true
          : item.category === selectedCategory;

      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.weight.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, donations]);

  return (
    <SafeAreaView className="flex-1 bg-[#0B0F0C]">
      <Box className="flex-1 bg-[#09090B] pt-12 px-4">
        {/* Header */}
        <HStack className="flex-row items-center justify-between mb-6">
          <TouchableOpacity>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-xl font-semibold">
            Buscar doações
          </Text>

          <Box className="w-6" />
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

          {/* Botão limpar filtro */}
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }} 
          >
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

        {/* Resultados descritivos */}
        {!isLoading && (
          <Text className="text-[#71717A] mb-4 text-sm">
            {filteredDonations.length} doação(ões) encontrada(s)
          </Text>
        )}

        {/* Donation List / Loader */}
        {isLoading ? (
          <Box className="flex-1 items-center justify-center mb-20">
            <Spinner size="large" color="#84CC16" />
            <Text className="text-[#71717A] mt-4">Carregando doações reais...</Text>
          </Box>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#84CC16" />
            }
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
                />
              ))
            ) : (
              <Box className="items-center justify-center mt-20">
                <Box className="bg-[#18181B] w-20 h-20 rounded-full items-center justify-center mb-4">
                  <FontAwesome5 name="search" size={28} color="#71717A" />
                </Box>

                <Text className="text-white text-lg font-semibold mb-2">
                  Nenhuma doação encontrada
                </Text>

                <Text className="text-[#71717A] text-center px-8">
                  Tente pesquisar outro alimento ou mudar a categoria.
                </Text>
              </Box>
            )}
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}