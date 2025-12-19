
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, 
  doc, setDoc, addDoc, deleteDoc, 
  query, updateDoc, orderBy
} from 'firebase/firestore';
import { User } from '../types';

/**
 * للحصول على البيانات أدناه:
 * 1. اذهب إلى https://console.firebase.google.com/
 * 2. أنشئ مشروعاً جديداً باسم "ElafWedding"
 * 3. من القائمة الجانبية Build اذهب إلى Firestore Database وأنشئ قاعدة بيانات (اختر Start in test mode)
 * 4. اذهب إلى Project Settings (أيقونة الترس) -> General -> أضف تطبيق Web
 * 5. انسخ الكائن firebaseConfig وضعه هنا بدلاً من البيانات الموجودة بالأسفل
 */
const firebaseConfig = {
  apiKey: "AIzaSyCmMFroJp5aHg3HGhrdn8T-lf08YIiLxdU",
  authDomain: "elaf-for-wedding-dresses.firebaseapp.com",
  projectId: "elaf-for-wedding-dresses",
  storageBucket: "elaf-for-wedding-dresses.firebasestorage.app",
  messagingSenderId: "177838569788",
  appId: "1:177838569788:web:b5cb0bed7a37776daa8639",
};

// نعتبر التطبيق غير مهيأ إذا لم يتم تغيير المفاتيح الافتراضية
export const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let db: any;

if (isConfigured) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } catch (e) {
        console.error("Firebase Initialization Error:", e);
    }
}

const COLLS = {
    DRESSES: 'dresses',
    BOOKINGS: 'bookings',
    SALES: 'sale_orders',
    FINANCE: 'finance',
    CUSTOMERS: 'customers',
    USERS: 'users',
    LOGS: 'audit_logs'
};

export const cloudDb = {
    // الاستماع للتغييرات بشكل حي (مهم للمزامنة بين الأجهزة)
    subscribe: (collectionName: string, callback: (data: any[]) => void) => {
        if (!db) return () => {};
        try {
            const q = query(collection(db, collectionName));
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                callback(data);
            }, (error) => {
                console.error(`Subscription error for ${collectionName}:`, error);
            });
        } catch (e) {
            console.error("CloudDB Subscribe Error:", e);
            return () => {};
        }
    },

    // إضافة مستند جديد
    add: async (collectionName: string, data: any) => {
        if (!db) throw new Error("Firebase is not configured");
        try {
            // إذا كان هناك ID محدد نستخدمه، وإلا نترك Firestore ينشئ واحداً
            if (data.id && !data.id.startsWith('0.')) {
                const docRef = doc(db, collectionName, data.id);
                await setDoc(docRef, data, { merge: true });
                return data.id;
            } else {
                const { id, ...rest } = data;
                const docRef = await addDoc(collection(db, collectionName), rest);
                return docRef.id;
            }
        } catch (e) {
            console.error("CloudDB Add Error:", e);
            throw e;
        }
    },

    // تحديث بيانات مستند
    update: async (collectionName: string, id: string, data: any) => {
        if (!db) throw new Error("Firebase is not configured");
        try {
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, data, { merge: true });
        } catch (e) {
            console.error("CloudDB Update Error:", e);
            throw e;
        }
    },

    // حذف مستند
    delete: async (collectionName: string, id: string) => {
        if (!db) throw new Error("Firebase is not configured");
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (e) {
            console.error("CloudDB Delete Error:", e);
            throw e;
        }
    },

    // نظام تسجيل العمليات السحابي
    log: async (user: User, action: string, details: string) => {
        if (!db) return;
        try {
            await addDoc(collection(db, COLLS.LOGS), {
                action,
                userId: user.id,
                username: user.username,
                timestamp: new Date().toISOString(),
                details
            });
        } catch (e) {
            console.error("CloudDB Logging Error:", e);
        }
    },

    COLLS
};
