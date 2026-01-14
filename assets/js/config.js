// ARQUIVO: assets/js/config.js

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

// 2. INICIALIZAÇÃO
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- 3. LÓGICA DO SAAS (MULTI-TENANCY INTELIGENTE) ---

/**
 * Define qual entidade (Igreja) será carregada.
 * Ordem de Prioridade:
 * 1º - Parâmetro na URL (ex: ?org=ipb_central) -> Link enviado pelo Super Admin
 * 2º - Memória do Navegador (localStorage) -> Usuário que já acessou antes
 * 3º - Padrão do Sistema (Fallback) -> Caso seja o primeiro acesso sem link
 */

function getEntidadeID() {
    // 1. Tenta ler da URL
    const urlParams = new URLSearchParams(window.location.search);
    const orgUrl = urlParams.get('org');

    if (orgUrl) {
        // Se veio link, salvamos no navegador para as próximas vezes
        localStorage.setItem('entidade_id', orgUrl);
        return orgUrl;
    }

    // 2. Tenta ler do Cache Local
    const orgLocal = localStorage.getItem('entidade_id');
    if (orgLocal) {
        return orgLocal;
    }

    // 3. Fallback (Padrão para testes)
    return 'ipb_guriri'; 
}

const ENTIDADE_ATUAL = getEntidadeID();

console.log('--- SISTEMA INICIADO ---');
console.log('Organização:', ENTIDADE_ATUAL);

/**
 * FUNÇÃO GLOBAL: pegarReferencia(caminho)
 * Use isso em todo o app para garantir que está lendo/escrevendo no lugar certo.
 */
function pegarReferencia(caminho) {
    if (!caminho) {
        return database.ref(`entidades/${ENTIDADE_ATUAL}/dados`);
    }
    return database.ref(`entidades/${ENTIDADE_ATUAL}/dados/${caminho}`);
}

/**
 * HELPERS GLOBAIS (Opcional - Útil para usar nas páginas internas)
 */

// Gera o link para compartilhar esta entidade
function gerarLinkCompartilhamento() {
    const origin = window.location.origin; 
    // Ajuste o caminho se necessário (ex: se for mandar para o app do membro, use index.html)
    const path = window.location.pathname; 
    
    return `${origin}${path}?org=${ENTIDADE_ATUAL}`;
}