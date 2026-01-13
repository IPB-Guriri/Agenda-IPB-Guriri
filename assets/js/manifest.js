// ========================================
// VARIÁVEIS GLOBAIS
// ========================================
let deferredPrompt; 
const installBtn = document.getElementById('btn-install-app'); 
const iosModal = document.getElementById('ios-install-modal'); 

// ========================================
// DETECTA SE É CELULAR OU TABLET (Geral)
// ========================================
function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Verifica strings comuns de dispositivos móveis
    const mobileRegex = /android|avantgo|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|smartphone|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i;
    
    // Retorna TRUE se for mobile, FALSE se for PC
    return mobileRegex.test(userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document); 
}

// ========================================
// DETECTA SE O DISPOSITIVO É ESPECIFICAMENTE iOS
// ========================================
function isIOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    // Checagem para iPad OS 13+ (que finge ser Mac)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

// ========================================
// LÓGICA PARA ANDROID/CHROME/EDGE
// ========================================
window.addEventListener('beforeinstallprompt', (e) => {
    // 1. Impede a barra padrão
    e.preventDefault();
    // 2. Guarda o evento
    deferredPrompt = e;
    
    // 3. VERIFICAÇÃO EXTRA: Só mostra o botão se for Mobile
    if (isMobile()) {
        installBtn.style.display = 'flex';
    } else {
        console.log('App instalável detectado, mas ocultado pois é Desktop.');
    }
});

// ========================================
// LÓGICA PARA iOS/SAFARI
// ========================================
const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

// Aqui já usamos isIOS(), que por natureza já filtra PCs (exceto Macs, que tratamos no isIOS)
if (isIOS() && !isInStandaloneMode) {
    installBtn.style.display = 'flex';
}

// ========================================
// EVENTO DE CLIQUE NO BOTÃO
// ========================================
installBtn.addEventListener('click', async () => {
    
    if (isIOS()) {
        iosModal.style.display = 'flex';
    } else if (deferredPrompt) {
        deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário escolheu: ${outcome}`); 
        
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
});

// ========================================
// FECHA O MODAL
// ========================================
function closeIosModal() {
    iosModal.style.display = 'none';
}