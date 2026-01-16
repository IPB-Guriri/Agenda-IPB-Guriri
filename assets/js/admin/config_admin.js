// ========================================
// ARQUIVO: assets/js/admin/config_admin.js
// OBJETIVO: Gerenciar Configurações Gerais (SaaS + Simplificado)
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
    // --- MUDANÇA 1: Listener apenas para Cor Primária ---
    const el = document.getElementById('cfgCorPrimaria');
    if(el) {
        el.addEventListener('input', () => {
            const tempCfg = {
                corPrimaria: el.value
            };
            aplicarCoresPreview(tempCfg);
        });
    }
}

function carregarConfigTab() {
    // --- MUDANÇA 2: Caminho dinâmico (SaaS) ---
    pegarReferencia(`configuracoes/${anoTrabalho}`)
        .once('value').then(snap => {
            const cfg = snap.val() || {};
            
            // Campos de Texto
            setVal('cfgEntidadeTab', cfg.entidade);
            setVal('cfgTemaTab', cfg.tema);
            setVal('cfgVersiculoTab', cfg.versiculo);
            setVal('cfgLogoTab', cfg.logo);
            
            // --- MUDANÇA 3: Apenas Cor Primária ---
            setVal('cfgCorPrimaria', cfg.corPrimaria || "#074528");

            aplicarCoresPreview(cfg);
        });
}

function aplicarCoresPreview(cfg) {
    const root = document.documentElement;
    const cor = cfg.corPrimaria || "#074528";

    // Aplica a cor primária e usa ela para o botão também
    root.style.setProperty('--adm-primary', cor);
    root.style.setProperty('--adm-btn', cor);
}

function restaurarCoresPadrao() {
    if(confirm("Restaurar cor padrão (Verde IPB)?")) {
        const padrao = "#074528";
        setVal('cfgCorPrimaria', padrao);
        aplicarCoresPreview({ corPrimaria: padrao });
        showToast("Cor resetada.");
    }
}

async function salvarConfigTab() {
    // --- MUDANÇA 4: Objeto simplificado ---
    const dados = {
        entidade: getVal('cfgEntidadeTab'),
        tema: getVal('cfgTemaTab'),
        versiculo: getVal('cfgVersiculoTab'),
        logo: getVal('cfgLogoTab'),
        corPrimaria: getVal('cfgCorPrimaria') 
        // Demais cores removidas, o sistema usará o CSS padrão
    };

    try {
        // --- MUDANÇA 5: Salvamento dinâmico (SaaS) ---
        await pegarReferencia(`configuracoes/${anoTrabalho}`).set(dados);
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

// Utilitários
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

// ==========================================
// FUNÇÃO DE NAVEGAÇÃO (VOLTAR PRO MENU COM ID)
// ==========================================
function voltarParaMenu() {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    
    if (org) {
        window.location.href = `menu_admin.html?org=${org}`;
    } else {
        // Se por acaso não tiver org, volta pro menu normal
        window.location.href = 'menu_admin.html';
    }
}