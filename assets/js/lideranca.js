// ========================================
// ARQUIVO: assets/js/lideranca.js
// ========================================

const anoTema = 2026; // Apenas para buscar as cores do tema

document.addEventListener('DOMContentLoaded', () => {
    carregarTemaVisual(anoTema);
    carregarLiderancaAbsoluta();
});

// 1. CARREGAR TEMA (Visual)
function carregarTemaVisual(ano) {
    const loader = document.getElementById('globalLoader');
    
    // Tenta usar o caminho padrão para configurações
    // Se não funcionar, tente ajustar para 'entidades/ipb_guriri/dados/configuracoes/' + ano
    let dbRef = firebase.database().ref(`entidades/ipb_guriri/dados/configuracoes/${ano}`);

    dbRef.once('value').then(snap => {
        const cfg = snap.val();
        if (cfg) {
            if(cfg.entidade) setTexto('txtEntidadePublica', cfg.entidade);
            if(cfg.tema) setTexto('txtTemaPublico', cfg.tema);
            if(cfg.logo && document.getElementById('imgLogoPublica')) {
                document.getElementById('imgLogoPublica').src = cfg.logo;
            }
            const elV = document.getElementById('txtVersiculoPublico');
            if(elV && cfg.versiculo) { elV.innerText = cfg.versiculo; elV.style.display = "block"; }

            // Aplica Cores
            const root = document.documentElement.style;
            root.setProperty('--cor-primaria', cfg.corPrimaria || "#074528");
            root.setProperty('--cor-secundaria', cfg.corSecundaria || "#f4f7f6");
            root.setProperty('--cor-terciaria', cfg.corTerciaria || "#888");
            root.setProperty('--cor-titulos', cfg.corTitulos || "#fff");
            root.setProperty('--cor-subtitulos', cfg.corSubtitulos || "#e0e0e0");
            root.setProperty('--cor-botoes', cfg.corBotoes || "#074528");
        }
        setTimeout(() => { if(loader) loader.classList.add('hidden'); }, 500);
    }).catch(err => {
        console.warn("Erro ao carregar tema:", err);
        // Esconde loader mesmo com erro para não travar
        setTimeout(() => { if(loader) loader.classList.add('hidden'); }, 500);
    });
}

// 2. BUSCAR DADOS (Caminho Absoluto Correto)
function carregarLiderancaAbsoluta() {
    const container = document.getElementById('grupos-container');
    
    // CAMINHO EXATO DO SEU PRINT:
    const caminho = `entidades/ipb_guriri/dados/lideranca`;
    
    console.log("Tentando ler dados de:", caminho);
    const dbRef = firebase.database().ref(caminho);

    dbRef.on('value', snap => {
        const data = snap.val();
        
        // Debug no console do navegador (F12)
        console.log("Dados recebidos:", data);

        if (!data) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <h3>Nenhuma liderança encontrada</h3>
                    <p>Verifique se o caminho no banco de dados está correto:<br><strong>${caminho}</strong></p>
                </div>`;
            return;
        }

        // Converte Objeto Firebase em Array
        const listaBruta = Object.keys(data).map(key => data[key]);
        
        // Agrupar por Sociedade
        const grupos = {};

        listaBruta.forEach(membro => {
            // Pega o nome do grupo ou usa "Geral"
            // Remove espaços e deixa maiúsculo para garantir que "SAF" e "saf" fiquem juntos
            let nomeGrupo = (membro.sociedade || membro.grupo || "Geral").trim().toUpperCase();
            
            if(nomeGrupo === "" || nomeGrupo === "NENHUMA" || nomeGrupo === "SELECIONE...") nomeGrupo = "OUTROS";

            if (!grupos[nomeGrupo]) {
                grupos[nomeGrupo] = [];
            }
            grupos[nomeGrupo].push(membro);
        });

        renderizarGavetas(grupos);
    });
}

// 3. RENDERIZAR GAVETAS (Acordeão de Grupos)
function renderizarGavetas(grupos) {
    const container = document.getElementById('grupos-container');
    container.innerHTML = "";

    // Ordena nomes dos grupos (Conselho primeiro, depois A-Z)
    const nomesGrupos = Object.keys(grupos).sort();

    nomesGrupos.forEach(nomeGrupo => {
        const listaMembros = grupos[nomeGrupo];
        
        // Define Ícone e Título Bonito
        let iconClass = "fas fa-users";
        let tituloBonito = nomeGrupo;

        if(nomeGrupo.includes("CONSELHO")) { iconClass = "fas fa-gavel"; tituloBonito = "Conselho"; }
        else if(nomeGrupo.includes("DIAC") || nomeGrupo.includes("JUNTA")) { iconClass = "fas fa-hands-helping"; tituloBonito = "Junta Diaconal"; }
        else if(nomeGrupo.includes("SAF")) { iconClass = "fas fa-female"; tituloBonito = "SAF - Sociedade Feminina"; }
        else if(nomeGrupo.includes("UPH")) { iconClass = "fas fa-male"; tituloBonito = "UPH - Homens"; }
        else if(nomeGrupo.includes("UMP")) { iconClass = "fas fa-fire"; tituloBonito = "UMP - Mocidade"; }
        else if(nomeGrupo.includes("TESTE")) { iconClass = "fas fa-flask"; tituloBonito = "Grupo de Teste"; }

        // Ordena membros por nome
        listaMembros.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));

        // Cria o HTML da Gaveta
        const div = document.createElement('div');
        div.className = 'group-card'; // Classe CSS que criamos

        // Monta a lista interna de membros
        let htmlMembros = `<div class="members-grid">`;
        listaMembros.forEach(m => {
            htmlMembros += `
                <div class="member-simple-card">
                    <div class="m-icon"><i class="fas fa-user"></i></div>
                    <div class="m-info">
                        <h4>${m.nome}</h4>
                        <p>${m.cargo || "Membro"}</p>
                        ${m.telefone ? `
                            <a href="https://wa.me/55${m.telefone.replace(/\D/g,'')}" target="_blank" class="btn-msg-small">
                                <i class="fab fa-whatsapp"></i> Zap
                            </a>` : ''}
                    </div>
                </div>
            `;
        });
        htmlMembros += `</div>`;

        // Monta a Gaveta completa
        div.innerHTML = `
            <div class="group-header" onclick="toggleGroup(this)">
                <div class="gh-left">
                    <div class="gh-icon"><i class="${iconClass}"></i></div>
                    <div class="gh-info">
                        <h3>${tituloBonito}</h3>
                        <span>${listaMembros.length} Membros</span>
                    </div>
                </div>
                <div class="gh-arrow"><i class="fas fa-chevron-down"></i></div>
            </div>
            <div class="group-body">
                <div class="group-inner">
                    ${htmlMembros}
                </div>
            </div>
        `;

        container.appendChild(div);
    });
}

// 4. INTERAÇÃO (Abrir/Fechar)
window.toggleGroup = function(header) {
    const card = header.parentElement;
    const body = card.querySelector('.group-body');
    const isActive = card.classList.contains('active');

    // Fecha outros (efeito sanfona)
    document.querySelectorAll('.group-card').forEach(c => {
        if(c !== card) {
            c.classList.remove('active');
            c.querySelector('.group-body').style.maxHeight = null;
        }
    });

    // Abre/Fecha o atual
    if (isActive) {
        card.classList.remove('active');
        body.style.maxHeight = null;
    } else {
        card.classList.add('active');
        body.style.maxHeight = body.scrollHeight + "px";
    }
}

// Auxiliar
function setTexto(id, txt) { 
    const el = document.getElementById(id); 
    if(el) el.innerText = txt; 
}