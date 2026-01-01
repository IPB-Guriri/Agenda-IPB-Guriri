// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let dadosGlobais = null; // Armazena tudo do Firebase
let filtroAtualTempo = 'todos';
let filtroAtualSociedade = 'todas';

// Cores (Mantidas)
const CORES_TAGS = {
    'SAF': '#d63031', 'UPH': '#0984e3', 'UMP': '#e17055', 
    'UCP': '#00cec9', 'IGREJA': '#27ae60', 'EBD': '#27ae60', 
    'CONSELHO': '#636e72', 'DEFAULT': '#2d3436'
};

function carregarAgenda() {
    const container = document.getElementById('agenda-container');
    container.innerHTML = '<p style="text-align:center; padding: 50px;">Carregando...</p>';

    const agendaRef = database.ref('agenda2026');
    
    agendaRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // 1. Guarda os dados na memória global
        // Se vier como Objeto, transforma em Array
        dadosGlobais = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        
        // 2. Aplica os filtros iniciais (que é mostrar tudo)
        aplicarFiltros();
    });
}

// --- FUNÇÃO CENTRAL DE FILTRAGEM ---
function aplicarFiltros() {
    const container = document.getElementById('agenda-container');
    container.innerHTML = '';

    if (!dadosGlobais || dadosGlobais.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:50px;">Nenhuma programação encontrada.</p>';
        return;
    }

    // Datas de referência para cálculo de tempo
    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0 a 11
    
    // Filtra e Renderiza
    dadosGlobais.forEach((mesData, indexMes) => {
        if (!mesData || !mesData.eventos) return;

        // --- FILTRO DE TEMPO (LÓGICA) ---
        let mostrarMes = false;
        
        if (filtroAtualTempo === 'todos') {
            mostrarMes = true;
        } 
        else if (filtroAtualTempo === 'mes') {
            // Mostra apenas o índice do mês atual
            // OBS: Assume que indexMes 0 = Janeiro. Se o Firebase salvar diferente, ajuste.
            if (indexMes === mesAtual) mostrarMes = true;
        } 
        else if (filtroAtualTempo === 'trimestre') {
            // Mês atual + próximos 2
            if (indexMes >= mesAtual && indexMes <= mesAtual + 2) mostrarMes = true;
        } 
        else if (filtroAtualTempo === 'semestre') {
            // 1º Semestre (0-5) ou 2º Semestre (6-11) baseado em hoje
            const semestreAtual = mesAtual < 6 ? 1 : 2;
            if (semestreAtual === 1 && indexMes < 6) mostrarMes = true;
            if (semestreAtual === 2 && indexMes >= 6) mostrarMes = true;
        }

        if (!mostrarMes) return; // Pula o mês se não atender ao tempo

        // --- FILTRO DE SOCIEDADE ---
        // Pega eventos do mês e filtra pela tag
        let eventos = Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos);
        
        if (filtroAtualSociedade !== 'todas') {
            eventos = eventos.filter(ev => 
                ev.tag && ev.tag.toLowerCase() === filtroAtualSociedade
            );
        }

        // Se após filtrar sociedade, o mês ficar vazio, não mostra o card
        if (eventos.length === 0) return;

        // --- RENDERIZAÇÃO DO CARD (Código Visual) ---
        const card = document.createElement('div');
        card.className = 'month-card';

        const header = document.createElement('div');
        header.className = 'month-title';
        header.innerText = mesData.mes;
        card.appendChild(header);

        const listaEventos = document.createElement('ul');
        listaEventos.className = 'events-list';

        eventos.sort((a, b) => parseInt(a.dia.substring(0,2)) - parseInt(b.dia.substring(0,2)));

        eventos.forEach(evento => {
            const li = document.createElement('li');
            li.className = 'event-item';
            li.onclick = () => abrirModal(evento, mesData.mes);

            // Cores e Formatação
            const tagKey = evento.tag ? evento.tag.toUpperCase() : 'DEFAULT';
            const corSolida = CORES_TAGS[tagKey] || CORES_TAGS['DEFAULT'];
            const corFundoData = hexToRgba(corSolida, 0.12);
            const dataFormatada = formatarDataIntervalo(evento.dia);

            li.innerHTML = `
                <div class="event-date-box" style="background-color: ${corFundoData}; color: ${corSolida}; border-color: ${hexToRgba(corSolida, 0.3)}">
                    ${dataFormatada}
                </div>
                <div class="event-details">
                    <span class="event-name">${evento.nome}</span>
                    <div class="event-meta">
                        ${evento.horario ? `<div class="event-time"><i class="far fa-clock"></i> ${evento.horario}</div>` : ''}
                        ${evento.tag ? `<div class="tag-badge" style="background-color: ${corSolida};">${evento.tag}</div>` : ''}
                    </div>
                </div>
            `;
            listaEventos.appendChild(li);
        });

        card.appendChild(listaEventos);
        container.appendChild(card);
    });
}

// --- FUNÇÕES DE CONTROLE DOS BOTÕES ---

function filtrarTempo(tipo, btn) {
    filtroAtualTempo = tipo;
    
    // Atualiza visual dos botões do grupo Tempo
    const grupo = btn.parentElement;
    grupo.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    aplicarFiltros();
}

function filtrarSociedade(tag, btn) {
    filtroAtualSociedade = tag;

    // Atualiza visual dos botões do grupo Sociedade
    const grupo = btn.parentElement;
    grupo.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    aplicarFiltros();
}

// --- MODAL COM DESCRIÇÃO ---
// ... (Mantenha o resto do código, substitua apenas a função abrirModal) ...

function abrirModal(evento, nomeMes) {
    const modal = document.getElementById('modalDetalhes');
    const modalHeader = document.querySelector('.modal-header');
    
    // 1. Pega a cor correta
    const tagKey = evento.tag ? evento.tag.toUpperCase() : 'DEFAULT';
    const corTema = CORES_TAGS[tagKey] || CORES_TAGS['DEFAULT'];

    // 2. Pinta o Cabeçalho
    modalHeader.style.backgroundColor = corTema;
    
    // 3. Preenche os Textos
    document.getElementById('modalTitulo').innerText = evento.nome;
    
    // Formata a data (Ex: "03 de Janeiro")
    const diaTexto = evento.dia.includes(',') || evento.dia.includes('-') ? evento.dia : evento.dia;
    document.getElementById('modalData').innerText = `${diaTexto} de ${nomeMes}`;
    
    document.getElementById('modalHora').innerText = evento.horario || '--:--';
    document.getElementById('modalLocal').innerText = evento.local || 'Igreja';

    // 4. Descrição
    const divDesc = document.getElementById('modalDescricaoContainer');
    const txtDesc = document.getElementById('modalDescricao');
    
    if (evento.descricao && evento.descricao.trim() !== "") {
        divDesc.style.display = 'block';
        txtDesc.innerText = evento.descricao;
        txtDesc.style.borderLeftColor = corTema; // Detalhe visual
    } else {
        divDesc.style.display = 'none';
    }

    // 5. Botão Grande da Tag (Igual ao print "UMP")
    const tagContainer = document.getElementById('modalTagContainer');
    tagContainer.innerHTML = ''; // Limpa
    
    if(evento.tag) {
        const btn = document.createElement('div');
        btn.className = 'tag-pill-large'; // Classe do CSS novo
        btn.innerText = evento.tag;
        btn.style.backgroundColor = corTema; // Pinta o botão
        tagContainer.appendChild(btn);
    }

    // Mostra o modal
    modal.classList.add('active');
}

// Funções auxiliares (HexToRgba, FormatData, fecharModal) mantidas iguais...
function formatarDataIntervalo(diaString) {
    if (!diaString) return "--";
    if (diaString.includes(',')) {
        const partes = diaString.replace(/\s/g, '').split(',');
        return `${partes[0]}-${partes[partes.length - 1]}`;
    }
    return diaString;
}

function fecharModal() {
    document.getElementById('modalDetalhes').classList.remove('active');
}

document.getElementById('modalDetalhes').addEventListener('click', (e) => {
    if (e.target.id === 'modalDetalhes') fecharModal();
});

function hexToRgba(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){ c= [c[0], c[0], c[1], c[1], c[2], c[2]]; }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
}

document.addEventListener('DOMContentLoaded', carregarAgenda);