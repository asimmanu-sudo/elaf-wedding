
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, 
  doc, setDoc, addDoc, deleteDoc, getDoc as firestoreGetDoc,
  getDocs, query, Firestore 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCmMFroJp5aHg3HGhrdn8T-lf08YIiLxdU",
  authDomain: "elaf-for-wedding-dresses.firebaseapp.com",
  projectId: "elaf-for-wedding-dresses",
  storageBucket: "elaf-for-wedding-dresses.firebasestorage.app",
  messagingSenderId: "177838569788",
  appId: "1:177838569788:web:b5cb0bed7a37776daa8639",
};

let db: Firestore;
try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
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
    LOGS: 'audit_logs'
};

export const cloudDb = {
    subscribe: (collectionName: string, callback: (data: any[]) => void) => {
        if (!db) return () => {};
        try {
            const q = query(collection(db, collectionName));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                callback(data);
            });
        } catch (e) {
            return () => {};
        }
    },
    getDoc: async (collectionName: string, id: string) => {
        if (!db) throw new Error("Firestore down");
        const docRef = doc(db, collectionName, id);
        const docSnap = await firestoreGetDoc(docRef);
        return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
    },
    add: async (collectionName: string, data: any) => {
        if (!db) throw new Error("Firestore down");
        const docRef = await addDoc(collection(db, collectionName), data);
        return docRef.id;
    },
    update: async (collectionName: string, id: string, data: any) => {
        if (!db) throw new Error("Firestore down");
        const docRef = doc(db, collectionName, id);
        await setDoc(docRef, data, { merge: true });
    },
    delete: async (collectionName: string, id: string) => {
        if (!db) throw new Error("Firestore down");
        await deleteDoc(doc(db, collectionName, id));
    },
    clearAll: async () => {
        if (!db) return;
        // Nuclear cleanup
        for (const collName of Object.values(COLLS)) {
            const q = query(collection(db, collName));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collName, d.id)));
            await Promise.all(deletePromises);
        }
        // Re-seed master admin
        await addDoc(collection(db, COLLS.USERS), {
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
