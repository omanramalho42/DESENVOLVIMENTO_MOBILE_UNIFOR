import { db } from "@/services/_firebase";
import { AppNotificationDocument, TipoNotificacao } from "@/types";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { FirestoreServiceError } from "./_firestore";

export const criarNotificacao = async (
  params: Omit<AppNotificationDocument, "criadoEm" | "lida">
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  try {
    await addDoc(collection(db, "notificacoes"), {
      ...params,
      lida: false,
      criadoEm: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    throw new FirestoreServiceError("Não foi possível criar a notificação.");
  }
};

export const buscarNotificacoesDoUsuario = async (
  userId: string
): Promise<(AppNotificationDocument & { id: string })[]> => {
  if (!db) {
    return [];
  }

  try {
    const q = query(
      collection(db, "notificacoes"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);

    const notificacoes = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as AppNotificationDocument),
    }));

    // ordena no cliente para evitar índice composto
    return notificacoes.sort((a, b) => {
      const aTime = a.criadoEm?.toMillis?.() ?? 0;
      const bTime = b.criadoEm?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return [];
  }
};

export const contarNotificacoesNaoLidas = async (
  userId: string
): Promise<number> => {
  if (!db) return 0;

  try {
    const q = query(
      collection(db, "notificacoes"),
      where("userId", "==", userId),
      where("lida", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.length;
  } catch {
    return 0;
  }
};

export const marcarNotificacaoComoLida = async (
  notificacaoId: string
): Promise<void> => {
  if (!db) return;

  try {
    await updateDoc(doc(db, "notificacoes", notificacaoId), {
      lida: true,
    });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
  }
};

export const criarNotificacaoReivindicacao = async (
  doadorId: string,
  solicitanteNome: string,
  doacaoTitulo: string,
  doacaoId: string,
  solicitacaoId: string
): Promise<void> => {
  await criarNotificacao({
    userId: doadorId,
    tipo: "reivindicacao",
    titulo: "Nova reivindicação",
    mensagem: `${solicitanteNome} reivindicou sua doação "${doacaoTitulo}"`,
    doacaoId,
    solicitacaoId,
  });
};

export const criarNotificacaoAprovada = async (
  solicitanteId: string,
  doacaoTitulo: string,
  doacaoId: string,
  solicitacaoId: string
): Promise<void> => {
  await criarNotificacao({
    userId: solicitanteId,
    tipo: "aprovada",
    titulo: "Solicitação aprovada",
    mensagem: `Sua solicitação para "${doacaoTitulo}" foi aprovada`,
    doacaoId,
    solicitacaoId,
  });
};

export const criarNotificacaoRejeitada = async (
  solicitanteId: string,
  doacaoTitulo: string,
  motivoRecusa: string,
  doacaoId: string,
  solicitacaoId: string
): Promise<void> => {
  await criarNotificacao({
    userId: solicitanteId,
    tipo: "rejeitada",
    titulo: "Solicitação rejeitada",
    mensagem: `Sua solicitação para "${doacaoTitulo}" foi rejeitada`,
    doacaoId,
    solicitacaoId,
    motivoRecusa,
  });
};

export const criarNotificacaoConcluida = async (
  doadorId: string,
  doacaoTitulo: string,
  doacaoId: string,
  solicitacaoId: string
): Promise<void> => {
  await criarNotificacao({
    userId: doadorId,
    tipo: "concluida",
    titulo: "Doação concluída",
    mensagem: `A doação "${doacaoTitulo}" foi marcada como concluída`,
    doacaoId,
    solicitacaoId,
  });
};
