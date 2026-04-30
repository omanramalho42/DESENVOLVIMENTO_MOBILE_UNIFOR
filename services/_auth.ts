import { db, getRequiredAuth } from "@/services/_firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { Platform } from "react-native";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail valido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const signUpSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome para criar a conta."),
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail valido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const resetPasswordSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail para recuperar a senha.")
  .email("Informe um e-mail valido.");

export class AuthServiceError extends Error {
  title: string;

  constructor(title: string, message: string) {
    super(message);
    this.name = "AuthServiceError";
    this.title = title;
  }
}

const getFirebaseErrorCode = (error: unknown) => {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }

  return "";
};

const getFirebaseErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return "";
};

export const getAuthErrorMessage = (error: unknown) => {
  const code = getFirebaseErrorCode(error);
  const rawMessage = getFirebaseErrorMessage(error);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "Informe um e-mail valido.";
    case "auth/email-already-in-use":
      return "Este e-mail ja esta em uso.";
    case "auth/weak-password":
      return "A senha e muito fraca. Use pelo menos 6 caracteres.";
    case "auth/missing-password":
      return "Informe uma senha para criar a conta.";
    case "auth/missing-email":
      return "Informe um e-mail para criar a conta.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha de conexao. Verifique sua internet.";
    case "auth/configuration-not-found":
      return "Ative o Firebase Authentication e o provedor Google no console do Firebase.";
    case "auth/operation-not-allowed":
      return "Este metodo de login ainda nao esta ativado no Firebase Authentication.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela do Google. Permita pop-ups para continuar.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Login com Google cancelado.";
    case "auth/unauthorized-domain":
      return "Adicione este dominio aos dominios autorizados do Firebase Authentication.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "As configuracoes do Firebase nao estao validas.";
    default:
      if (rawMessage) {
        return rawMessage
          .replace(/^Firebase:\s*/i, "")
          .replace(/\s*\(auth\/[^)]+\)\.?$/i, "")
          .trim();
      }

      return "Nao foi possivel entrar. Tente novamente.";
  }
};

export const getAuthAlertData = (error: unknown, fallbackTitle: string) => {
  if (error instanceof AuthServiceError) {
    return { title: error.title, message: error.message };
  }

  return {
    title: fallbackTitle,
    message: getAuthErrorMessage(error),
  };
};

const requireConfiguredAuth = (message: string) => {
  try {
    return getRequiredAuth();
  } catch {
    throw new AuthServiceError("Firebase nao configurado", message);
  }
};

export const loginWithEmail = async (email: string, senha: string) => {
  const parsed = loginSchema.safeParse({ email, senha });

  if (!parsed.success) {
    throw new AuthServiceError(
      "Dados invalidos",
      parsed.error.issues[0]?.message ?? "Verifique os dados informados.",
    );
  }

  const auth = requireConfiguredAuth(
    "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para usar o login.",
  );

  try {
    await signInWithEmailAndPassword(auth, parsed.data.email, parsed.data.senha);
  } catch (error) {
    throw new AuthServiceError("Erro no login", getAuthErrorMessage(error));
  }
};

export const resetPassword = async (email: string) => {
  const parsedEmail = resetPasswordSchema.safeParse(email);

  if (!parsedEmail.success) {
    throw new AuthServiceError(
      "Dados invalidos",
      parsedEmail.error.issues[0]?.message ?? "Informe o e-mail.",
    );
  }

  const auth = requireConfiguredAuth(
    "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para recuperar a senha.",
  );

  try {
    await sendPasswordResetEmail(auth, parsedEmail.data);
  } catch (error) {
    throw new AuthServiceError("Erro", getAuthErrorMessage(error));
  }
};

export const loginWithGoogle = async () => {
  const auth = requireConfiguredAuth(
    "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para usar o login com Google.",
  );

  if (Platform.OS !== "web") {
    throw new AuthServiceError(
      "Google no mobile",
      "No Android/iOS, o Google exige configuracao com expo-auth-session e IDs de cliente por plataforma.",
    );
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    await signInWithPopup(auth, provider);
  } catch (error) {
    throw new AuthServiceError("Erro no Google", getAuthErrorMessage(error));
  }
};

export const signUpEmail = async (
  email: string,
  password: string,
  name: string,
) => {
  const parsedInput = signUpSchema.safeParse({
    nome: name,
    email,
    senha: password,
  });

  if (!parsedInput.success) {
    throw new AuthServiceError(
      "Dados invalidos",
      parsedInput.error.issues[0]?.message ?? "Verifique os dados informados.",
    );
  }

  try {
    const auth = requireConfiguredAuth(
      "Preencha as variaveis EXPO_PUBLIC_FB_* no arquivo .env para criar a conta.",
    );
    const created = await createUserWithEmailAndPassword(
      auth,
      parsedInput.data.email,
      parsedInput.data.senha,
    );
    await updateProfile(created.user, { displayName: parsedInput.data.nome });

    if (db) {
      await setDoc(
        doc(db, "users", created.user.uid),
        {
          nome: parsedInput.data.nome,
          email: created.user.email ?? parsedInput.data.email,
          telefone: "",
          fotoPerfil: "",
          tipoUsuario: "Receptor",
        },
        { merge: true },
      ).catch((firestoreError) => {
        console.error("Erro ao criar perfil inicial no Firestore:", firestoreError);
      });
    }

    return created.user;
  } catch (error) {
    console.error("Erro no cadastro com Firebase Authentication:", error);
    throw new AuthServiceError("Erro no cadastro", getAuthErrorMessage(error));
  }
};
