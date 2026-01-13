// ARQUIVO: config.js

// 1. SUAS CHAVES (Mantidas iguais)
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

// 2. INICIALIZAÇÃO (Mantida igual)
// Verifica se já existe uma instancia para não dar erro de duplicidade
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 3. LÓGICA DO SAAS (A Mágica acontece aqui) ---

// Define qual igreja está usando o sistema. 
// Se não tiver nada salvo no navegador, assume 'ipb_guriri' (para seus testes).
const ENTIDADE_ATUAL = localStorage.getItem('entidade_id') || 'ipb_guriri';

console.log('Sistema configurado para a organização:', ENTIDADE_ATUAL);

/**
 * FUNÇÃO GLOBAL: pegarReferencia(nomeDaPasta)
 * * Use essa função em vez de usar 'database.ref()' diretamente nos outros arquivos.
 * Ela garante que você sempre pegue ou salve dados na igreja certa.
 * * Exemplo de uso: 
 * Ao invés de: database.ref('agenda')
 * Use:         pegarReferencia('agenda')
 */
function pegarReferencia(caminho) {
    if (!caminho) {
        // Retorna a raiz de dados da igreja
        return database.ref(`entidades/${ENTIDADE_ATUAL}/dados`);
    }
    // Retorna o caminho específico (ex: entidades/ipb_guriri/dados/agenda)
    return database.ref(`entidades/${ENTIDADE_ATUAL}/dados/${caminho}`);
}