import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Cast import.meta to any to avoid TypeScript errors if types are missing
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

let db: any;
try {
    const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
    db = firebase.firestore();
} catch (error) {
    console.error("Firebase init fail:", error);
}

export const isConfigured = !!db;

export const COLLS = {
    DRESSES: 'dresses',
    BOOKINGS: 'bookings',
    SALES: 'sale_orders',
    FINANCE: 'finance',
    CUSTOMERS: 'customers',
    USERS: 'users',
    LOGS: 'audit_logs',
    PERSONAL: 'personal_finance',
    METADATA: 'metadata'
};

export const cloudDb = {
    subscribe: (collectionName: string, callback: (data: any[]) => void) => {
        if (!db) return () => {};
        try {
            return db.collection(collectionName).onSnapshot((snapshot: any) => {
                const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));
                callback(data);
            });
        } catch (e) {
            return () => {};
        }
    },
    getDoc: async (collectionName: string, id: string) => {
        if (!db) throw new Error("Firestore down");
        const docRef = db.collection(collectionName).doc(id);
        const docSnap = await docRef.get();
        return docSnap.exists ? { ...docSnap.data(), id: docSnap.id } : null;
    },
    add: async (collectionName: string, data: any) => {
        if (!db) throw new Error("Firestore down");
        const docRef = await db.collection(collectionName).add(data);
        return docRef.id;
    },
    update: async (collectionName: string, id: string, data: any) => {
        if (!db) throw new Error("Firestore down");
        const docRef = db.collection(collectionName).doc(id);
        await docRef.set(data, { merge: true });
    },
    delete: async (collectionName: string, id: string) => {
        if (!db) throw new Error("Firestore down");
        await db.collection(collectionName).doc(id).delete();
    },
    clearAll: async () => {
        if (!db) return;
        // Nuclear cleanup
        for (const collName of Object.values(COLLS)) {
            const snapshot = await db.collection(collName).get();
            const deletePromises = snapshot.docs.map((d: any) => db.collection(collName).doc(d.id).delete());
            await Promise.all(deletePromises);
        }
        // Re-seed master admin
        await db.collection(COLLS.USERS).add({
          name: 'مدير النظام',
          username: 'admin',
          password: '123',
          role: 'ADMIN',
          permissions: ['ALL'],
          firstLogin: true
        });
    },
    COLLS
};