import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCgUEG7h2k78J25x39t1L3Ql2mD_r0jo6I",
  authDomain: "telana-builder.firebaseapp.com",
  projectId: "telana-builder",
  storageBucket: "telana-builder.firebasestorage.app",
  messagingSenderId: "1003486255742",
  appId: "1:1003486255742:web:be2636f0f96cb7e821562f"
};

if (!firebaseConfig.apiKey) {
  console.error("Faltan las variables de entorno de Firebase. Revisa el archivo .env");
  alert("Error de configuración: Faltan las claves de Firebase en el archivo .env");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
