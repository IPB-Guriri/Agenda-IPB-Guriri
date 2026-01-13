// ========================================
// ARQUIVO: config_admin.js (8 CORES OK)
// ========================================

let anoTrabalho = new Date().getFullYear().toString();

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (typeof firebase === 'undefined') throw new Error("Firebase SDK ausente.");
        iniciarConfig();
    } catch (erro) {
        console.error("Erro:", erro);
    }
    
    setTimeout(() => {
        const loader = document.getElementById('globalLoader');
        if(loader) loader.classList.add('hidden');
    }, 800);
});

function iniciarConfig() {
    popularSelectAnos();
    const selectAno = document.getElementById('cfgAnoInterno');
    if(selectAno) selectAno.value = anoTrabalho;

    carregarConfigTab();
    configurarListenersCores();
}

function configurarListenersCores() {
    const inputs = [
        // Bloco 1 (Fundos)
        'cfgCorPrimaria', 'cfgCorSecundaria', 'cfgCorCardBg', 'cfgCorInputBg',
        // Bloco 2 (Elementos)
        'cfgCorTerciaria', 'cfgCorTitulos', 'cfgCorSubtitulos', 'cfgCorBotoes'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => {
                const tempCfg = {
                    corPrimaria: getVal('cfgCorPrimaria'),
                    corSecundaria: getVal('cfgCorSecundaria'),
                    corCardBg: getVal('cfgCorCardBg'),
                    corInputBg: getVal('cfgCorInputBg'),
                    corTerciaria: getVal('cfgCorTerciaria'),
                    corTitulos: getVal('cfgCorTitulos'),
                    corSubtitulos: getVal('cfgCorSubtitulos'),
                    corBotoes: getVal('cfgCorBotoes')
                };
                aplicarCoresPreview(tempCfg);
            });
        }
    });
}

function carregarConfigTab() {
    firebase.database().ref(`entidades/ipb_guriri/dados/configuracoes/${anoTrabalho}`)
        .once('value').then(snap => {
            const cfg = snap.val() || {};
            
            setVal('cfgEntidadeTab', cfg.entidade);
            setVal('cfgTemaTab', cfg.tema);
            setVal('cfgVersiculoTab', cfg.versiculo);
            setVal('cfgLogoTab', cfg.logo);
            
            // Cores Bloco 1
            setVal('cfgCorPrimaria', cfg.corPrimaria || "#074528");
            setVal('cfgCorSecundaria', cfg.corSecundaria || "#f4f7f6");
            setVal('cfgCorCardBg', cfg.corCardBg || "#ffffff"); // Cor 3
            setVal('cfgCorInputBg', cfg.corInputBg || "#ffffff"); // Cor 4 (Padrão branco)

            // Cores Bloco 2
            setVal('cfgCorTerciaria', cfg.corTerciaria || "#888888");
            setVal('cfgCorTitulos', cfg.corTitulos || "#333333");
            setVal('cfgCorSubtitulos', cfg.corSubtitulos || "#64748b");
            setVal('cfgCorBotoes', cfg.corBotoes || "#074528");

            aplicarCoresPreview(cfg);
        });
}

function aplicarCoresPreview(cfg) {
    const root = document.documentElement;

    root.style.setProperty('--adm-primary', cfg.corPrimaria || "#074528");
    root.style.setProperty('--adm-bg', cfg.corSecundaria || "#f4f7f6");
    
    // --- SEPARAÇÃO CRÍTICA AQUI ---
    root.style.setProperty('--adm-card-bg', cfg.corCardBg || "#ffffff");  // COR 3
    root.style.setProperty('--adm-input-bg', cfg.corInputBg || "#ffffff"); // COR 4
    
    root.style.setProperty('--adm-icons', cfg.corTerciaria || "#888888");
    root.style.setProperty('--adm-text-main', cfg.corTitulos || "#333333");
    root.style.setProperty('--adm-text-sub', cfg.corSubtitulos || "#64748b");
    root.style.setProperty('--adm-btn', cfg.corBotoes || "#074528");
}

function restaurarCoresPadrao() {
    if(confirm("Restaurar cores padrão?")) {
        const padrao = {
            corPrimaria: "#074528", 
            corSecundaria: "#f4f7f6",
            corCardBg: "#ffffff",
            corInputBg: "#ffffff",
            corTerciaria: "#888888", 
            corTitulos: "#333333",
            corSubtitulos: "#64748b", 
            corBotoes: "#074528"
        };
        
        Object.keys(padrao).forEach(k => {
            setVal('cfg' + k.charAt(0).toUpperCase() + k.slice(1), padrao[k]);
        });
        
        aplicarCoresPreview(padrao);
        showToast("Cores resetadas.");
    }
}

async function salvarConfigTab() {
    const dados = {
        entidade: getVal('cfgEntidadeTab'),
        tema: getVal('cfgTemaTab'),
        versiculo: getVal('cfgVersiculoTab'),
        logo: getVal('cfgLogoTab'),
        corPrimaria: getVal('cfgCorPrimaria'),
        corSecundaria: getVal('cfgCorSecundaria'),
        corCardBg: getVal('cfgCorCardBg'),
        corInputBg: getVal('cfgCorInputBg'),
        corTerciaria: getVal('cfgCorTerciaria'),
        corTitulos: getVal('cfgCorTitulos'),
        corSubtitulos: getVal('cfgCorSubtitulos'),
        corBotoes: getVal('cfgCorBotoes')
    };

    try {
        await firebase.database().ref(`entidades/ipb_guriri/dados/configuracoes/${anoTrabalho}`).set(dados);
        aplicarCoresPreview(dados);
        showToast("Configurações Salvas!");
    } catch (e) {
        console.error(e);
        showToast("Erro ao salvar.", "error");
    }
}

function mudarAnoAdmin(novoAno) {
    anoTrabalho = novoAno;
    carregarConfigTab();
}

function setVal(id, v) { const el = document.getElementById(id); if(el) el.value = v || ""; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ""; }
function showToast(msg, tipo="success") {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    if(tipo === "error") t.style.borderLeftColor = "red";
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}
function popularSelectAnos() {
    const s = document.getElementById('cfgAnoInterno');
    if(!s) return;
    const atual = new Date().getFullYear();
    let h = "";
    for(let i=-1; i<5; i++) h+=`<option value="${atual+i}">${atual+i}</option>`;
    s.innerHTML = h;
}
