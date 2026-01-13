// ========================================
// ARQUIVO: assets/js/louvor/agenda.js
// ========================================

// ========================================
// 1. VARIÁVEIS GLOBAIS DE ESTADO
// ========================================
let dadosGlobais = null; 
let filtroAtualTempo = 'todos'; 
let filtroAtualSociedade = 'todas'; 
let anoExibicao = new Date().getFullYear(); // Guarda o ano que está sendo exibido

// ========================================
// 2. PALETA DE CORES DAS SOCIEDADES (Fixas para as tags)
// ========================================
const CORES_TAGS = {
    'SAF': '#d63031',      
    'UPH': '#0984e3',      
    'UMP': '#e17055',      
    'UCP': '#00cec9',      
    'IGREJA': '#27ae60',   
    'EBD': '#27ae60',      
    'CONSELHO': '#636e72', 
    'DEFAULT': '#2d3436'   
};

// ========================================
// 3. CARREGAMENTO INICIAL
// ========================================
document.addEventListener('DOMContentLoaded', carregarAgenda);

function carregarAgenda() {
    const container = document.getElementById('agenda-container');
    
    // 1. Detecta o ano atual automaticamente
    anoExibicao = new Date().getFullYear(); 

    // 2. Carrega o Visual (Tema, Cores e Textos) do ano detectado
    carregarTemaVisual(anoExibicao);

    // Mostra indicador de carregamento
    container.innerHTML = `<div style="text-align:center; padding: 50px; color:#888; grid-column: 1/-1;">
        <i class="fas fa-spinner fa-spin"></i> Carregando agenda de ${anoExibicao}...
    </div>`;

    // 3. Busca os eventos na pasta do ano específico (SaaS)
    const agendaRef = pegarReferencia(`agenda/${anoExibicao}`);
    
    // Listener em tempo real
    agendaRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // Normaliza: se vier como Objeto, converte para Array
        dadosGlobais = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        
        // Aplica os filtros e renderiza
        aplicarFiltros();
    });
}

// ========================================
// 4. APLICAÇÃO DO TEMA VISUAL (SISTEMA 6 CORES)
// ========================================
// ========================================
// 4. APLICAÇÃO DO TEMA VISUAL + REMOÇÃO DO LOADER
// ========================================
function carregarTemaVisual(ano) {
    const loader = document.getElementById('globalLoader');

    pegarReferencia(`configuracoes/${ano}`).once('value').then(snap => {
        const cfg = snap.val();
        
        // Se tiver configuração, aplica tudo
        if (cfg) {
            // A. TEXTOS E LOGO
            if(cfg.entidade) setTexto('txtEntidadePublica', cfg.entidade);
            if(cfg.tema) setTexto('txtTemaPublico', cfg.tema);
            
            const elVersiculo = document.getElementById('txtVersiculoPublico');
            if(elVersiculo) {
                elVersiculo.innerText = cfg.versiculo || "";
                elVersiculo.style.display = cfg.versiculo ? "block" : "none";
            }
            if(cfg.logo && document.getElementById('imgLogoPublica')) {
                document.getElementById('imgLogoPublica').src = cfg.logo;
            }

            // B. APLICANDO AS 6 CORES
            const root = document.documentElement;
            root.style.setProperty('--cor-primaria', cfg.corPrimaria || "#074528");
            root.style.setProperty('--cor-secundaria', cfg.corSecundaria || "#f4f7f6");
            root.style.setProperty('--cor-terciaria', cfg.corTerciaria || "#888888");
            root.style.setProperty('--cor-titulos', cfg.corTitulos || "#ffffff");
            root.style.setProperty('--cor-subtitulos', cfg.corSubtitulos || "#e0e0e0");
            root.style.setProperty('--cor-botoes', cfg.corBotoes || "#074528");
        }

        // C. FINALMENTE: ESCONDE O LOADER (Com pequeno delay para garantir a pintura)
        // Isso garante que o usuário só veja quando estiver tudo pronto
        setTimeout(() => {
            if(loader) loader.classList.add('hidden');
        }, 300); // 300ms de segurança
        
    }).catch(err => {
        console.error("Erro ao carregar tema:", err);
        // Mesmo se der erro, temos que esconder o loader para não travar a tela
        if(loader) loader.classList.add('hidden');
    });
}

// ========================================
// 5. LÓGICA DE FILTRAGEM E RENDERIZAÇÃO
// ========================================
function aplicarFiltros() {
    const container = document.getElementById('agenda-container');
    container.innerHTML = ''; 

    // Validação: se não houver dados
    if (!dadosGlobais || dadosGlobais.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#888; grid-column: 1/-1;">
            <i class="far fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px; display:block"></i>
            Nenhuma programação cadastrada para ${anoExibicao} ainda.
        </div>`;
        return;
    }

    const hoje = new Date();
    const mesAtual = hoje.getMonth(); 
    let encontrouAlgumEvento = false;

    dadosGlobais.forEach((mesData, indexMes) => {
        if (!mesData || !mesData.eventos) return; 

        // --- FILTRO DE TEMPO ---
        let mostrarMes = false;
        if (filtroAtualTempo === 'todos') {
            mostrarMes = true; 
        } else if (filtroAtualTempo === 'mes') {
            if (indexMes === mesAtual) mostrarMes = true;
        } else if (filtroAtualTempo === 'trimestre') {
            if (indexMes >= mesAtual && indexMes <= mesAtual + 2) mostrarMes = true;
        } 

        if (!mostrarMes) return; 

        // --- FILTRO DE SOCIEDADE ---
        let eventos = Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos);
        
        if (filtroAtualSociedade !== 'todas') {
            eventos = eventos.filter(ev => 
                ev.tag && ev.tag.toLowerCase() === filtroAtualSociedade
            );
        }

        if (eventos.length === 0) return;

        encontrouAlgumEvento = true;

        // --- RENDERIZAÇÃO DO CARD DO MÊS ---
        const card = document.createElement('div');
        card.className = 'month-card';

        // Cabeçalho do Mês
        const header = document.createElement('div');
        header.className = 'month-title';
        header.innerText = mesData.mes;
        card.appendChild(header);

        // Lista de Eventos
        const listaEventos = document.createElement('ul');
        listaEventos.className = 'events-list';

        // Ordena por dia
        eventos.sort((a, b) => parseInt(a.dia.split(/[-,]/)[0]) - parseInt(b.dia.split(/[-,]/)[0]));

        eventos.forEach(evento => {
            const li = document.createElement('li');
            li.className = 'event-item';
            li.onclick = () => abrirModal(evento, mesData.mes); 

            // Tag para cor visual (opcional, ou usa a cor do tema)
            const tagKey = evento.tag ? evento.tag.toUpperCase() : 'DEFAULT';
            
            // Formatando data
            const dataFormatada = formatarDataIntervalo(evento.dia);

            li.innerHTML = `
                <div class="event-date-box">
                    ${dataFormatada}
                </div>
                <div class="event-details">
                    <span class="event-name">${evento.nome}</span>
                    <div class="event-meta">
                        ${evento.horario ? `<span><i class="far fa-clock"></i> ${evento.horario}</span>` : ''}
                        ${evento.tag ? `<span class="tag-badge">${evento.tag}</span>` : ''}
                    </div>
                </div>
            `;
            listaEventos.appendChild(li);
        });

        card.appendChild(listaEventos);
        container.appendChild(card); 
    });

    // Se filtrou tudo e não sobrou nada
    if (!encontrouAlgumEvento) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#888; grid-column: 1/-1;">
            Nenhum evento encontrado com os filtros atuais.
        </div>`;
    }
}

// ========================================
// 6. CONTROLES DE INTERFACE E MODAIS
// ========================================

// Modal de Detalhes
function abrirModal(evento, nomeMes) {
    const modal = document.getElementById('modalDetalhes');
    if(!modal) return;

    // Preenche dados
    setTexto('modalTitulo', evento.nome);
    setTexto('modalData', `${evento.dia} de ${nomeMes}`);
    setTexto('modalHora', evento.horario || '--:--');
    setTexto('modalLocal', evento.local || 'Local não informado');

    // Descrição
    const divDesc = document.getElementById('modalDescricaoContainer');
    const txtDesc = document.getElementById('modalDescricao');
    
    if (evento.descricao && evento.descricao.trim() !== "") {
        divDesc.style.display = 'block';
        txtDesc.innerText = evento.descricao;
    } else {
        divDesc.style.display = 'none'; 
    }

    // Tag no rodapé
    const tagContainer = document.getElementById('modalTagContainer');
    tagContainer.innerHTML = ''; 
    
    if(evento.tag) {
        const btn = document.createElement('div');
        btn.className = 'tag-pill-large'; 
        btn.innerText = evento.tag;
        tagContainer.appendChild(btn);
    }
    
    modal.classList.add('active');
}

function fecharModal() {
    document.getElementById('modalDetalhes').classList.remove('active');
}

// Fecha ao clicar fora
document.getElementById('modalDetalhes')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalDetalhes') fecharModal();
});

// Funções de Filtro (Botões)
function filtrarTempo(tipo, btn) {
    filtroAtualTempo = tipo; 
    atualizarBotoes(btn);
    aplicarFiltros(); 
}

function filtrarSociedade(tag, btn) {
    filtroAtualSociedade = tag; 
    atualizarBotoes(btn);
    aplicarFiltros(); 
}

function atualizarBotoes(btn) {
    const grupo = btn.parentElement;
    grupo.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ========================================
// 7. UTILITÁRIOS
// ========================================

// Define texto de um elemento com segurança
function setTexto(id, texto) {
    const el = document.getElementById(id);
    if(el) el.innerText = texto;
}

// Formata data 10,11,12 -> 10-12
function formatarDataIntervalo(diaString) {
    if (!diaString) return "--";
    if (diaString.includes(',')) {
        const partes = diaString.replace(/\s/g, '').split(',');
        return `${partes[0]}-${partes[partes.length - 1]}`;
    }
    return diaString;
}