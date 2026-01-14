// ========================================
// ARQUIVO: assets/js/menu.js
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const anoAtual = new Date().getFullYear();
    const lblAno = document.getElementById('lblAnoFooter');
    if(lblAno) lblAno.innerText = anoAtual;

    carregarTemaIndex(anoAtual);
});

function carregarTemaIndex(ano) {
    const loader = document.getElementById('globalLoader');

    // Tenta usar a função global 'pegarReferencia' (definida no config.js ou admin.js)
    // Se não existir, usa o caminho manual padrão
    let dbRef;
    if (typeof pegarReferencia === 'function') {
        dbRef = pegarReferencia(`configuracoes/${ano}`);
    } else {
        console.warn("Função pegarReferencia não encontrada. Usando caminho manual.");
        dbRef = firebase.database().ref(`ipb_guriri/dados/configuracoes/${ano}`);
    }

    dbRef.once('value').then(snap => {
        const cfg = snap.val();
        
        if (cfg) {
            // 1. TEXTOS E LOGO (Com verificação de segurança)
            const elTitulo = document.getElementById('lblTituloMenu');
            const elSub = document.getElementById('lblSubtituloMenu');
            const elLogo = document.getElementById('imgLogoMenu');

            if(elTitulo && cfg.entidade) elTitulo.innerText = cfg.entidade;
            if(elSub && cfg.tema) elSub.innerText = cfg.tema;
            
            if(elLogo && cfg.logo && cfg.logo.trim() !== "") {
                elLogo.src = cfg.logo;
            }

            // 2. APLICAR CORES NAS VARIÁVEIS CSS
            const root = document.documentElement;

            // Cores do Firebase
            const cPrimaria = cfg.corPrimaria || "#074528";
            const cSecundaria = cfg.corSecundaria || "#f4f7f6";
            const cTerciaria = cfg.corTerciaria || "#888888";
            const cBotoes = cfg.corBotoes || "#074528";
            // Nota: No menu não usamos cTitulos/cSubtitulos separadamente, 
            // mapeamos para Primária e Terciária para manter simples.

            root.style.setProperty('--cor-primaria', cPrimaria);
            root.style.setProperty('--cor-secundaria', cSecundaria);
            root.style.setProperty('--cor-terciaria', cTerciaria);
            root.style.setProperty('--cor-botoes', cBotoes);
            
            console.log("Tema carregado para o Hub:", ano);
        } else {
            console.log("Nenhuma configuração encontrada para", ano, "- Usando padrão.");
        }

        // 3. REMOVE LOADER
        setTimeout(() => {
            if(loader) loader.classList.add('hidden');
        }, 500); // Meio segundo para garantir a transição

    }).catch(err => {
        console.error("Erro ao carregar tema do menu:", err);
        // Remove loader mesmo com erro para não travar a tela
        if(loader) loader.classList.add('hidden');
    });
}