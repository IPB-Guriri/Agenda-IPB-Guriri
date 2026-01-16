// ========================================
// ARQUIVO: assets/js/admin/menu_admin.js
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const anoAtual = new Date().getFullYear();
    const lblAno = document.getElementById('lblAnoFooter');
    if(lblAno) lblAno.innerText = anoAtual;

    monitorarAutenticacao();
    carregarTemaMenu(anoAtual);
});

// --- AUTENTICAÇÃO ---

function monitorarAutenticacao() {
    const overlay = document.getElementById('loginOverlay');
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Logado:", user.email);
            if(overlay) overlay.style.display = 'none';
            sessionStorage.setItem("adminLogado", "sim");
        } else {
            if(overlay) overlay.style.display = 'flex';
            sessionStorage.removeItem("adminLogado");
        }
    });
}

/* ARQUIVO: assets/js/admin/menu_admin.js */

/* ARQUIVO: assets/js/admin/menu_admin.js */

function fazerLogin(event) {
    // 1. BLOQUEIA RECARREGAMENTO (Se chamado via onsubmit ou button form)
    if(event) event.preventDefault();

    const emailInput = document.getElementById('emailInput');
    const senhaInput = document.getElementById('senhaInput');
    const btn = document.getElementById('btnLogin');
    
    // Limpeza agressiva de espaços
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim(); // Senha também pode ter espaço acidental
    const textoOriginal = btn.innerHTML; 

    // Pega a URL
    const params = new URLSearchParams(window.location.search);
    const orgURL = params.get('org');

    if (!orgURL) return alert("ERRO: O link não tem a igreja (?org=...)\nUse o link gerado no Super Admin.");
    if (!email || !senha) return showToast("Preencha e-mail e senha.", "error");

    btn.innerHTML = 'Conectando...';
    btn.disabled = true;

    console.log("--- INICIANDO LOGIN TÉCNICO ---");

    firebase.auth().signInWithEmailAndPassword(email, senha)
        .then(async (userCredential) => {
            const uid = userCredential.user.uid;
            console.log("Auth OK. UID:", uid);

            // Busca dados (Tenta UID, fallback para Email)
            let snap = await firebase.database().ref(`app_usuarios/${uid}`).once('value');
            let dados = snap.val();

            if (!dados) {
                // Fallback para chave antiga (email)
                const emailKey = email.replace(/\./g, '_').replace('@', '_');
                snap = await firebase.database().ref(`app_usuarios/${emailKey}`).once('value');
                dados = snap.val();
            }

            if (!dados) {
                alert(`ERRO DE DADOS:\nUsuário logado no Auth, mas sem perfil no Banco.\nUID: ${uid}\n\nSolução: Recriar usuário no Super Admin.`);
                throw { handled: true };
            }

            // --- A CORREÇÃO TÉCNICA (O PULO DO GATO) ---
            // Converte qualquer coisa que vier do banco para Array de Strings limpas
            let permissoesReais = [];
            
            if (Array.isArray(dados.permissoes)) {
                permissoesReais = dados.permissoes; // Já é array
            } else if (typeof dados.permissoes === 'object' && dados.permissoes !== null) {
                permissoesReais = Object.values(dados.permissoes); // Converte objeto {"0":"a"} para ["a"]
            }
            
            console.log("Permissões no Banco:", permissoesReais);
            console.log("Igreja na URL:", orgURL);

            // Verifica se existe (includes)
            if (permissoesReais.includes(orgURL)) {
                // SUCESSO
                showToast("Sucesso! Redirecionando...", "success");
                sessionStorage.setItem("adminLogado", "sim");
                sessionStorage.setItem("userCargo", dados.cargo || "admin");
                
                setTimeout(() => {
                    window.location.href = `admin.html?org=${orgURL}`;
                }, 500); // Redirecionamento rápido

            } else {
                alert(`ACESSO NEGADO TÉCNICO\n\nIgreja solicitada: ${orgURL}\nSuas permissões: ${JSON.stringify(permissoesReais)}\n\nA string não bateu ou a lista está vazia.`);
                throw { handled: true };
            }
        })
        .catch((error) => {
            console.error(error);
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            
            if (error.handled) return; // Erro já tratado acima

            firebase.auth().signOut();
            let msg = error.message;
            if (error.code === 'auth/wrong-password') msg = "Senha incorreta.";
            if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            showToast(msg, "error");
        });
    
    return false; // Garante que o form não envia
}

function fazerLogout() {
    firebase.auth().signOut().then(() => {
        showToast("Você saiu do sistema.", "success");
    });
}

// --- TEMA E NAVEGAÇÃO ---

function carregarTemaMenu(ano) {
    const loader = document.getElementById('globalLoader');

    if(typeof pegarReferencia !== 'function') {
        if(loader) loader.classList.add('hidden');
        return;
    }

    pegarReferencia(`configuracoes/${ano}`).once('value').then(snap => {
        const cfg = snap.val();
        if (cfg) {
            const elTitulo = document.getElementById('lblTituloMenu');
            const elSub = document.getElementById('lblSubtituloMenu');
            const elLogo = document.getElementById('imgLogoMenu');

            if(elTitulo && cfg.entidade) elTitulo.innerText = cfg.entidade;
            if(elSub && cfg.tema) elSub.innerText = cfg.tema;
            if(elLogo && cfg.logo) elLogo.src = cfg.logo;

            const root = document.documentElement;
            const cor = cfg.corPrimaria || "#074528";
            
            root.style.setProperty('--cor-primaria', cor);
            root.style.setProperty('--cor-botoes', cor);
            
            const loaderIcon = document.querySelector('.loader-spinner');
            if(loaderIcon) loaderIcon.style.borderTopColor = cor;
        }
        if(loader) loader.classList.add('hidden');

    }).catch(err => {
        console.error(err);
        if(loader) loader.classList.add('hidden');
    });
}

function navegarPara(pagina) {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    let destino = pagina;
    if (org) destino += `?org=${org}`;
    window.location.href = destino;
}

// --- TOAST ---
function showToast(msg, type="success") {
    const container = document.getElementById('toast-container');
    if(!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}