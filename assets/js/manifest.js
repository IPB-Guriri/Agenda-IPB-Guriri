let deferredPrompt; // Variável para guardar o evento do Android
const installBtn = document.getElementById('btn-install-app');
const iosModal = document.getElementById('ios-install-modal');

// === FUNÇÃO 1: Detectar se é iPhone/iPad (iOS) ===
function isIOS() {
    return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
    ].includes(navigator.platform)
  // iPad no iOS 13+ detecta como Mac, então checamos o touch
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

// === LÓGICA PARA ANDROID (Chrome/Edge) ===
window.addEventListener('beforeinstallprompt', (e) => {
  // 1. Impede o mini-infobar padrão do Chrome
    e.preventDefault();
  // 2. Guarda o evento para usar depois
    deferredPrompt = e;
  // 3. Mostra o botão para o usuário
    installBtn.style.display = 'flex';
});

// === LÓGICA PARA IOS ===
// Se for iOS e não estiver rodando como app (standalone), mostra o botão
const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIOS() && !isInStandaloneMode) {
    installBtn.style.display = 'flex';
}

// === O QUE ACONTECE AO CLICAR NO BOTÃO ===
installBtn.addEventListener('click', async () => {
    
    if (isIOS()) {
    // Se for iPhone, abre o modal de instruções
    iosModal.style.display = 'flex';
    } else if (deferredPrompt) {
    // Se for Android, dispara o prompt nativo
    deferredPrompt.prompt();
    
    // Espera a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuário escolheu: ${outcome}`);
    
    // Limpa a variável (só pode usar uma vez)
    deferredPrompt = null;
    // Oculta o botão pois já instalou ou recusou
    installBtn.style.display = 'none';
    }
});

// Função para fechar o modal do iPhone
function closeIosModal() {
    iosModal.style.display = 'none';
}