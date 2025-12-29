// ARQUIVO: config.js
// Cole aqui as chaves que você pegou no console do Firebase

const firebaseConfig = {
  apiKey: "AIzaSyBa0ICeDwICnzTnfu97IYyfaAgcVsAqM0o",
  authDomain: "agenda-igreja-6cf95.firebaseapp.com",
  databaseURL: "https://agenda-igreja-6cf95-default-rtdb.firebaseio.com",
  projectId: "agenda-igreja-6cf95",
  storageBucket: "agenda-igreja-6cf95.firebasestorage.app",
  messagingSenderId: "70791774750",
  appId: "1:70791774750:web:a064d61e263e1bef8d640f",
  measurementId: "G-RQTQ8F0MX4"
};

// Inicializa o Firebase (não mexa aqui)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();