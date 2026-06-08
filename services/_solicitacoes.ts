import { db } from "@/services/_firebase";
import { MotivoRecusa, SolicitacaoComId } from "@/types";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { FirestoreServiceError } from "./_firestore";

export const buscarSolicitacoesRecebidasDoDoador = async (
  doadorId: string
): Promise<SolicitacaoComId[]> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  try {
    const q = query(
      collection(db, "solicitacoes"),
      where("doadorId", "==", doadorId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SolicitacaoComId, "id">),
    }));
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    throw new FirestoreServiceError(
      "Não foi possível carregar as solicitações. Tente novamente."
    );
  }
};

export const aceitarSolicitacao = async (
  solicitacaoId: string,
  doacaoId: string
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  const doacaoRef = doc(db, "donations", doacaoId);

  const solicitacaoSnap = await getDoc(solicitacaoRef);
  const doacaoSnap = await getDoc(doacaoRef);
  const solicitanteId = solicitacaoSnap.data()?.solicitanteId as string;
  const doacaoTitulo = (doacaoSnap.data()?.tipoAlimento as string) || "Doação";

  await runTransaction(db, async (transaction) => {
    const doacaoSnapTx = await transaction.get(doacaoRef);

    if (!doacaoSnapTx.exists()) {
      throw new FirestoreServiceError("Doação não encontrada.");
    }

    const solicitacoesSnapshot = await getDocs(
      query(
        collection(db!, "solicitacoes"),
        where("doacaoId", "==", doacaoId),
        where("status", "==", "em_analise")
      )
    );

    transaction.update(solicitacaoRef, {
      status: "aprovada",
      atualizadoEm: serverTimestamp(),
    });

    transaction.update(doacaoRef, {
      status: "rejeitada",
    });

    solicitacoesSnapshot.docs.forEach((d) => {
      if (d.id !== solicitacaoId) {
        transaction.update(d.ref, {
          status: "rejeitada",
          motivoRecusa: "Doação já realizada",
          atualizadoEm: serverTimestamp(),
        });
      }
    });
  });

  // notificar o receptor
  const { criarNotificacaoAprovada } = await import("@/services/_notificacoes");
  await criarNotificacaoAprovada(solicitanteId, doacaoTitulo, doacaoId, solicitacaoId);
};

export const recusarSolicitacao = async (
  solicitacaoId: string,
  doacaoId: string,
  motivo: MotivoRecusa
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  const doacaoRef = doc(db, "donations", doacaoId);

  const solicitacaoSnap = await getDoc(solicitacaoRef);
  const solicitanteId = solicitacaoSnap.data()?.solicitanteId as string;
  const doacaoTitulo = ((await getDoc(doacaoRef)).data()?.tipoAlimento as string) || "Doação";

  await updateDoc(solicitacaoRef, {
    status: "rejeitada",
    motivoRecusa: motivo,
    atualizadoEm: serverTimestamp(),
  });

  await updateDoc(doacaoRef, {
    status: "disponivel",
    reivindicadoPor: null,
  });

  // notificar o receptor
  const { criarNotificacaoRejeitada } = await import("@/services/_notificacoes");
  await criarNotificacaoRejeitada(solicitanteId, doacaoTitulo, motivo, doacaoId, solicitacaoId);
};
export const marcarColetaReceptor = async (
  solicitacaoId: string
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  const snap = await getDoc(solicitacaoRef);
  const data = snap.data();
  const doadorId = data?.doadorId as string;
  const doacaoId = data?.doacaoId as string;

  await updateDoc(solicitacaoRef, {
    coletadoPeloReceptor: true,
    status: "concluida",
    atualizadoEm: serverTimestamp(),
  });

  // notificar o doador
  const doacaoSnap = await getDoc(doc(db!, "donations", doacaoId));
  const doacaoTitulo = (doacaoSnap.data()?.tipoAlimento as string) || "Doação";

  const { criarNotificacaoConcluida } = await import("@/services/_notificacoes");
  await criarNotificacaoConcluida(doadorId, doacaoTitulo, doacaoId, solicitacaoId);
};

export const marcarEntregaDoador = async (
  solicitacaoId: string
): Promise<void> => {
  if (!db) {
    throw new FirestoreServiceError("Banco de dados não configurado.");
  }

  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  const snap = await getDoc(solicitacaoRef);

  if (!snap.exists()) {
    throw new FirestoreServiceError("Solicitação não encontrada.");
  }

  const data = snap.data();

  if (!data.coletadoPeloReceptor) {
    throw new FirestoreServiceError(
      "O receptor ainda não confirmou a coleta."
    );
  }

  await updateDoc(solicitacaoRef, {
    coletadoPeloDoador: true,
    status: "concluida",
    atualizadoEm: serverTimestamp(),
  });
};
