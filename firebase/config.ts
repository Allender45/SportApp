import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey:            "AIzaSyAFbB8Pw-MQygqGQ47MzmRbgKrBi3HM00E",
    authDomain:        "trainingprogrammapp.firebaseapp.com",
    projectId:         "trainingprogrammapp",
    storageBucket:     "trainingprogrammapp.firebasestorage.app",
    messagingSenderId: "154168226441",
    appId:             "1:154168226441:web:34885845a4a23c3a6ecc58",
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);