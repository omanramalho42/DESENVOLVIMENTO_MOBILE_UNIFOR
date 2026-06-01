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
  DonationDocumentWithId,
  DonorData,
  SalvarDoacaoParams,
  UserProfile,
} from "@/types";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import * as Location from "expo-location";

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

  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    const [geoResult] = await Location.geocodeAsync(endereco.trim());
    if (geoResult) {
      latitude = geoResult.latitude;
      longitude = geoResult.longitude;
    }
  } catch (geoError) {
    console.log("Erro ao geocodificar endereço da doação:", geoError);
  }

  const donation: DonationDocument = {
    tipoAlimento: nomeAlimento.trim(),
    quantidade: quantidade.trim(),
    descricao: descricao.trim(),
    validade: validade.trim(),
    localizacao: endereco.trim(),
    latitude,
    longitude,
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

export const solicitarDoacao = async (
  donationId: string,
  userId: string,
  dadosDoacao: {
    titulo: string;
    quantidade: string;
    validade: string;
    categoria: string;
    doadorId: string;
    solicitanteNome: string;
    solicitanteAvatar: string | null;
  },
  dataAgendada: string,
  horarioAgendado: string,
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError(
      "Banco de dados não configurado. Verifique as variáveis de ambiente do Firebase."
    );
  }

  const donationRef = doc(db, "donations", donationId);

  await runTransaction(db, async (transaction) => {
    const donationSnap = await transaction.get(donationRef);

    if (!donationSnap.exists()) {
      throw new FirestoreServiceError("Doação não encontrada.");
    }

    const data = donationSnap.data() as DonationDocument;

    if (data.status !== "disponivel") {
      throw new FirestoreServiceError(
        "Esta doação já foi reivindicada por outro usuário."
      );
    }

    transaction.update(donationRef, {
      status: "indisponivel"
    });

    const solicitacaoRef = doc(collection(db!, "solicitacoes"));
    transaction.set(solicitacaoRef, {
      doacaoId: donationId,
      doadorId: dadosDoacao.doadorId,
      solicitanteId: userId,
      solicitanteNome: dadosDoacao.solicitanteNome,
      solicitanteAvatar: dadosDoacao.solicitanteAvatar,
      dataAgendada,
      horarioAgendado,
      status: "pendente",
      motivoRecusa: null,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  });
};

export const buscarDoacao = async (
  id: string
): Promise<DonationDocumentWithId | null> => {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "donations", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as DonationDocument) };
  } catch {
    return null;
  }
};

export const listarDoacoes = async (): Promise<DonationDocumentWithId[]> => {
  if (!db) {
    throw new FirestoreServiceError(
      "Banco de dados não configurado. Verifique as variáveis de ambiente do Firebase."
    );
  }

  try {
    const donationsQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(donationsQuery);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as DonationDocument),
    }));
  } catch (error) {
    console.error("Erro ao carregar doações:", error);
    throw new FirestoreServiceError(
      "Não foi possível carregar as doações. Tente novamente."
    );
  }
};

export const buscarPerfilUsuario = async (
  uid: string
): Promise<UserProfile | null> => {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<UserProfile>;
    return {
      nome: data.nome?.trim() ?? "",
      email: data.email?.trim() ?? "",
      telefone: data.telefone?.trim() ?? "",
      fotoPerfil: data.fotoPerfil?.trim() ?? "",
      tipoUsuario: data.tipoUsuario?.trim() ?? "",
    };
  } catch {
    return null;
  }
};
