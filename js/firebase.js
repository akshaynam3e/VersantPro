import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
export const firebaseConfig={apiKey:'AIzaSyASKI0u0KBCPz0vg5ro0XhJlSSuWxrW8OU',authDomain:'versantpro-7a2af.firebaseapp.com',projectId:'versantpro-7a2af',storageBucket:'versantpro-7a2af.firebasestorage.app',messagingSenderId:'1032992540620',appId:'1:1032992540620:web:49d9ff4238223a08edff69',measurementId:'G-TN5TJE64YZ'};
export const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
export const cleanText=(s,max=150)=>String(s||'').replace(/[<>]/g,'').trim().slice(0,max);
export const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
