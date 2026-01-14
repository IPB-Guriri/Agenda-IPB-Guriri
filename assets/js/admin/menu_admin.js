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

function fazerLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const senha = document.getElementById('senhaInput').value;
    const btn = document.getElementById('btnLogin');
    const textoOriginal = btn.innerHTML; 

    if (!email || !senha) return showToast("Digite seu e-mail e senha.", "error");

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';
    btn.disabled = true;

    firebase.auth().signInWithEmailAndPassword(email, senha)
        .then(() => {
            showToast("Login realizado!", "success");
        })
        .catch((error) => {
            console.error("Código do Erro:", error.code); // Mantive para debug se precisar
            
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            
            let msg = "";

            // --- LÓGICA CORRIGIDA ---
            if (
                error.code === 'auth/wrong-password' || 
                error.code === 'auth/invalid-credential' || 
                error.code === 'auth/user-not-found'
            ) {
                msg = "E-mail ou senha incorretos.";
            } 
            else if (error.code === 'auth/invalid-email') {
                msg = "Formato de e-mail inválido.";
            }
            else if (error.code === 'auth/too-many-requests') {
                msg = "Muitas tentativas. Aguarde um pouco.";
            }
            else if (error.code === 'auth/network-request-failed') {
                msg = "Sem conexão com a internet.";
            }
            else {
                // Se der o erro interno (ou qualquer outro não listado), 
                // assumimos que foi erro de digitação para não assustar o usuário.
                msg = "Falha ao entrar. Verifique seus dados.";
            }
            
            showToast(msg, "error");
        });
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