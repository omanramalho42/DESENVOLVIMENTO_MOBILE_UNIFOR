import {
  CloudinaryServiceError,
  deleteByToken,
  uploadImages,
} from "@/services/_cloudinary";
import { db } from "@/services/_firebase";
import { settings } from "@/settings";
import {
  CloudinaryImageUploadResult,
  DonationDocument,
  DonorData,
  SalvarDoacaoParams,
} from "@/types";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export class FirestoreServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreServiceError";
  }
}

export const salvarDoador = async (
  uid: string,
  data: Omit<DonorData, "tipoUsuario" | "atualizadoEm">
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError(
      "Banco de dados não configurado. Verifique as variáveis de ambiente do Firebase."
    );
  }

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...data,
        tipoUsuario: "doador",
        atualizadoEm: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Erro ao salvar doador:", error);
    throw new FirestoreServiceError(
      "Não foi possível salvar os dados. Tente novamente."
    );
  }
};

export const verificarSeUsuarioEhDoador = async (
  uid?: string | null
): Promise<boolean> => {
  if (!uid || !db) {
    return false;
  }

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const data = userSnap.data();

    return String(data?.tipoUsuario || "").trim().toLowerCase() === "doador";
  } catch (error) {
    console.error("Erro ao validar doador:", error);
    return false;
  }
};

const buildDonationFolder = (userId: string | null) =>
  `alimenta-mais/donations/${userId ?? "anonymous"}`;

const rollbackCloudinaryUploads = async (
  uploads: CloudinaryImageUploadResult[]
) => {
  await Promise.allSettled(
    uploads.map((upload) =>
      upload.deleteToken ? deleteByToken(upload.deleteToken) : Promise.resolve()
    )
  );
};

export const salvarDoacao = async ({
  userId,
  fotos,
  nomeAlimento,
  categoria,
  quantidade,
  tipoAlimento,
  validade,
  descricao,
  retirada,
  dataRetirada,
  horarioInicio,
  horarioFim,
  endereco,
}: SalvarDoacaoParams): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError(
      "Banco de dados não configurado. Verifique as variáveis de ambiente do Firebase."
    );
  }

  if (fotos.length > 0 && !settings.hasCloudinarySettings) {
    throw new CloudinaryServiceError(
      "Cloudinary não está configurado. Preencha EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME e EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const uploadedPhotos =
    fotos.length > 0
      ? await uploadImages(fotos, {
          folder: buildDonationFolder(userId),
        })
      : [];

  const donation: DonationDocument = {
    tipoAlimento: nomeAlimento.trim(),
    quantidade: quantidade.trim(),
    descricao: descricao.trim(),
    validade: validade.trim(),
    localizacao: endereco.trim(),
    disponibilidade: `${dataRetirada.trim()} - ${horarioInicio.trim()} até ${horarioFim.trim()}`,
    perecivel: tipoAlimento === "Perecível",
    observacoes: "",
    status: "disponivel",
    donorId: userId,
    createdAt: serverTimestamp(),
    fotos: uploadedPhotos.map((photo) => ({
      secureUrl: photo.secureUrl,
      publicId: photo.publicId,
      assetId: photo.assetId,
    })),
    categoria,
    tipoRetirada: retirada,
    dataRetirada,
    horarioInicio,
    horarioFim,
  };

  try {
    await addDoc(collection(db, "donations"), donation);
  } catch (error) {
    await rollbackCloudinaryUploads(uploadedPhotos).catch((rollbackError) => {
      console.error("Erro ao reverter uploads no Cloudinary:", rollbackError);
    });
    console.error("Erro ao cadastrar doação:", error);
    throw new FirestoreServiceError(
      "Não foi possível cadastrar a doação. Tente novamente."
    );
  }
};

import { getDocs, orderBy, query, where } from "firebase/firestore";
// Certifique-se de importar o seu 'db' do arquivo de configuração do Firebase

export interface DonationItem {
  id: string;
  title: string;
  weight: string;
  distance: string; // Como o cálculo de distância depende de GPS, usaremos um valor padrão por enquanto
  date: string;
  category: string;
  imageUri: string;
}

export const buscarDoacoes = async (): Promise<DonationItem[]> => {
  if (!db) {
    throw new Error("Banco de dados não configurado.");
  }

  try {
    // Busca apenas as doações que estão com status disponível, ordenando pelas mais recentes
    const q = query(
      collection(db, "donations"),
      where("status", "==", "disponivel"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const donationsList: DonationItem[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Captura a primeira imagem enviada ao Cloudinary se houver, caso contrário usa um placeholder seguro
      const imageUri = data.fotos && data.fotos.length > 0 
        ? data.fotos[0].secureUrl 
        : "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=300";

      donationsList.push({
        id: doc.id,
        title: data.tipoAlimento || "Alimento Sem Nome",
        weight: data.quantidade || "Quantidade não especificada",
        distance: "Próximo a você", // Aqui futuramente você poderá calcular a distância real com a Geolocalização
        date: data.validade || "Não informada",
        category: data.categoria || "Todas",
        imageUri: imageUri,
      });
    });

    return donationsList;
  } catch (error) {
    console.error("Erro ao buscar doações do Firestore:", error);
    throw error;
  }
};