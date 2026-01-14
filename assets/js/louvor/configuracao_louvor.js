document.addEventListener('DOMContentLoaded', () => {
    
    // Elementos do HTML
    const btnSalvar = document.getElementById('btn-save-settings');
    const inputIp = document.getElementById('setting-holyrics-ip');
    const inputPort = document.getElementById('setting-holyrics-port');
    const inputToken = document.getElementById('setting-holyrics-token'); // Novo campo Token

    const STORAGE_KEY = 'louvor_config_data';

    // 1. CARREGAR DADOS
    function carregarConfiguracoes() {
        const dadosSalvos = localStorage.getItem(STORAGE_KEY);
        
        if (dadosSalvos) {
            const config = JSON.parse(dadosSalvos);
            if (inputIp) inputIp.value = config.holyricsIp || '';
            if (inputPort) inputPort.value = config.holyricsPort || '8091';
            if (inputToken) inputToken.value = config.holyricsToken || ''; // Carrega o token
        }
    }

    // 2. SALVAR DADOS
    if (btnSalvar) {
        btnSalvar.addEventListener('click', (e) => {
            e.preventDefault();

            const novaConfig = {
                holyricsIp: inputIp.value.trim(),
                holyricsPort: inputPort.value.trim() || '8091',
                holyricsToken: inputToken.value.trim() // Salva o token
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(novaConfig));

            const originalText = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            btnSalvar.style.background = '#10b981';
            
            setTimeout(() => {
                btnSalvar.innerHTML = originalText;
                btnSalvar.style.background = '';
            }, 2000);
        });
    }

    carregarConfiguracoes();
});