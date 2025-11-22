import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// TODO: Add your Firebase configuration here
const firebaseConfig = {
  apiKey: "AIzaSyAwSMtDIHxYyQVfs8uvzdFId2OXX4LWa4E",
  authDomain: "shomaj-817b0.firebaseapp.com",
  projectId: "shomaj-817b0",
  storageBucket: "shomaj-817b0.firebasestorage.app",
  messagingSenderId: "531309434570",
  appId: "1:531309434570:web:c4daf065cc332af5df0633"
};

// Initialize Firebase only if config is available
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : null;

// Initialize Firebase Authentication and get a reference to the service
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export default app;