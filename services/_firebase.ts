import { settings } from "@/settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
// @ts-ignore getReactNativePersistence works in React Native runtime despite TS false-positive in some setups.
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

const { FB_API_KEY, FB_AUTH_DOMAIN, FB_PROJECT_ID, FB_STORAGE_BUCKET } =
  settings;

const firebaseConfig = {
  apiKey: FB_API_KEY,
  authDomain: FB_AUTH_DOMAIN,
  projectId: FB_PROJECT_ID,
  storageBucket: FB_STORAGE_BUCKET,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (settings.hasFirebaseSettings) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }

    db = getFirestore(app);
  } catch {
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db };
