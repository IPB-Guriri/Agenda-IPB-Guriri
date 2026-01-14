// ========================================
// ARQUIVO: assets/js/admin.js
// LÓGICA COMPLETA DO PAINEL ADMINISTRATIVO (CORRIGIDO)
// ========================================

// Variáveis Globais de Estado
let agendaData = [];
let tagsData = {};
let cargosData = [];
let anoTrabalho = new Date().getFullYear().toString(); // Começa com o ano atual
let refAgendaAnterior = null; // Para limpar listeners antigos ao trocar de ano

// ========================================
// 1. INICIALIZAÇÃO
// ========================================
document.addEventListener("DOMContentLoaded", () => {
    // Verifica se já está logado
    if (sessionStorage.getItem("adminLogado") === "sim") {
        document.getElementById("loginOverlay").style.display = "none";
    }

    iniciarAdmin();
    
    // Remove a tela de carregamento após 1 segundo
    setTimeout(() => {
        const loader = document.getElementById('globalLoader');
        if(loader) loader.classList.add('hidden');
    }, 1000);
});

function iniciarAdmin() {
    popularSelectAnos();
    gerarGridDias();
    
    // Configura o filtro de ano visual para o ano atual
    const selectAno = document.getElementById('filtroAnoAdmin');
    if(selectAno) selectAno.value = anoTrabalho;

    // --- LISTENERS EM TEMPO REAL (FIREBASE) ---

    // 1. Tags (Sociedades)
    firebase.database().ref('entidades/ipb_guriri/dados/tags').on('value', snap => {
        tagsData = snap.val() || {};
        atualizarSelects();
        renderizarTabelaTags();
    });

    // 2. Cargos
    firebase.database().ref('entidades/ipb_guriri/dados/cargos').on('value', snap => {
        cargosData = snap.val() || [];
        atualizarSelects();
        renderizarTabelaCargos();
    });

    // 3. Liderança (Caminho Absoluto - Sem Ano)
    firebase.database().ref('entidades/ipb_guriri/dados/lideranca').on('value', snap => {
        carregarLideranca(snap.val());
    });

    // 4. Agenda e Configurações (Dependem do Ano Selecionado)
    carregarAgendaDoAno(anoTrabalho);
}

// ========================================
// 2. AGENDA & EVENTOS
// ========================================

// Carrega dados do ano específico
// Carrega dados do ano específico
function carregarAgendaDoAno(ano) {
    // 1. Limpa conexão anterior do Firebase para não misturar ouvintes (listeners)
    if (refAgendaAnterior) {
        refAgendaAnterior.off();
    }
    
    // 2. Atualiza a variável global do ano
    anoTrabalho = ano;
    
    // 3. Atualiza configurações visuais (se a função existir)
    if (typeof carregarConfigTab === 'function') {
        carregarConfigTab();
    }

    // 4. Conecta no Firebase na pasta do ano selecionado
    const ref = firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${ano}`);
    
    // Guarda a referência para poder desligar depois (no passo 1)
    refAgendaAnterior = ref;

    // 5. Ouve as alterações em tempo real
    ref.on('value', snap => {
        const data = snap.val();
        
        // Se não tiver dados, cria estrutura vazia. Se tiver, garante que é array.
        agendaData = data ? (Array.isArray(data) ? data : Object.values(data)) : criarEstruturaVazia();
        
        // Renderiza a tabela/lista da agenda
        renderizarListaAgenda();
        
        // --- ATUALIZAÇÃO DO STATUS (CORREÇÃO) ---
        const status = document.getElementById('statusMsg');
        if(status) {
            // Ao alterar o innerText, o CSS ::before (a bolinha verde) 
            // continuará aparecendo automaticamente ao lado do texto.
            status.innerText = `Editando: ${ano}`;
        }
    });
}

// Salvar Novo Evento
async function processarEvento() {
    const anoDestino = document.getElementById('inputAno').value;
    const mesNome = document.getElementById('inputMes').value;
    const nome = document.getElementById('inputNome').value;
    
    // Verifica dias selecionados
    const selecionados = document.querySelectorAll('#dayGrid .day-btn.selected'); 
    
    if (selecionados.length === 0) return showToast("Selecione pelo menos um dia!", "error");
    if (!nome) return showToast("Digite o nome do evento!", "error");

    const dias = Array.from(selecionados).map(b => b.textContent).join(", ");
    
    const novoEvento = { 
        dia: dias, 
        ano: anoDestino, 
        nome: nome, 
        descricao: document.getElementById('inputDescricao').value, 
        horario: document.getElementById('inputHorario').value, 
        local: document.getElementById('inputLocal').value, 
        tag: document.getElementById('inputTag').value 
    };

    // Adiciona ao array local
    let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
    if (mesIdx === -1) { 
        // Se o mês não existir (caso raro), cria
        agendaData.push({ mes: mesNome, eventos: [] }); 
        mesIdx = agendaData.length - 1; 
    }
    if (!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];

    agendaData[mesIdx].eventos.push(novoEvento);
    
    // Ordena por dia
    agendaData[mesIdx].eventos.sort((a,b) => parseInt(a.dia) - parseInt(b.dia));

    // Salva no Firebase
    try {
        await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoDestino}`).set(agendaData);
        showToast("Evento salvo com sucesso!");
        limparFormularioEvento();
    } catch (error) {
        console.error(error);
        showToast("Erro ao salvar.", "error");
    }
}

// Renderiza a lista de eventos na tela
function renderizarListaAgenda() {
    const div = document.getElementById('listaPreview');
    div.innerHTML = '';
    
    let temEventos = false;

    agendaData.forEach((mes, mIdx) => {
        // Mostra o mês se tiver eventos OU (opcional) se quiser mostrar meses vazios, retire a condição
        if(mes.eventos && mes.eventos.length > 0) {
            temEventos = true;
            
            // --- [AQUI ESTAVA O PROBLEMA] ---
            // Cabeçalho do Mês (Agora com a classe correta do CSS novo)
            const h = document.createElement('div');
            h.className = "month-header"; // Mudado de 'admin-divider' para 'month-header'
            h.innerHTML = mes.mes;        // Nome do mês direto
            div.appendChild(h);

            // Cards dos Eventos
            mes.eventos.forEach((ev, eIdx) => {
                const card = document.createElement('div');
                card.className = "event-card"; // Garante que usa a classe do CSS novo
                
                // Conteúdo do Card
                card.innerHTML = `
                    <div>
                        <strong>Dia ${ev.dia} - ${ev.nome}</strong>
                        <small>
                            ${ev.tag && ev.tag !== 'Nenhuma' ? `<span class="tag-badge">${ev.tag}</span>` : ''} 
                            ${ev.horario ? `<span style="margin-left:8px">⏰ ${ev.horario}</span>` : ''}
                        </small>
                    </div>
                    <div>
                        <button class="btn-icon btn-edit" onclick="prepararEdicaoEvento(${mIdx}, ${eIdx})" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon btn-delete" onclick="removerEvento(${mIdx}, ${eIdx})" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                div.appendChild(card);
            });
        }
    });

    if(!temEventos) {
        div.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-style:italic;">Nenhum evento cadastrado para este ano ainda.</div>`;
    }
}

// Abre Modal de Edição de Evento
function prepararEdicaoEvento(mIdx, eIdx) {
    const ev = agendaData[mIdx].eventos[eIdx];
    const corpo = document.getElementById('corpoEdicaoEvento');
    const modal = document.getElementById('modalEdicaoEvento');

    // Monta o formulário dentro do modal
    corpo.innerHTML = `
        <div class="form-group">
            <label>Nome do Evento</label>
            <input type="text" id="editEvNome" class="form-control" value="${ev.nome}">
        </div>
        <div class="row-fields">
            <div class="form-group">
                <label>Dias (Ex: 01, 05)</label>
                <input type="text" id="editEvDia" class="form-control" value="${ev.dia}">
            </div>
            <div class="form-group">
                <label>Horário</label>
                <input type="time" id="editEvHora" class="form-control" value="${ev.horario || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>Descrição</label>
            <textarea id="editEvDesc" class="form-control" rows="2">${ev.descricao || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Sociedade</label>
            <select id="editEvTag" class="form-control">${document.getElementById('inputTag').innerHTML}</select>
        </div>
        <div class="form-actions right">
            <button class="btn-primary" onclick="salvarEdicaoEvento(${mIdx}, ${eIdx})">Atualizar Evento</button>
        </div>
    `;
    
    // Seleciona a tag correta
    document.getElementById('editEvTag').value = ev.tag || "Nenhuma";
    
    // Abre o modal (display: flex conforme CSS novo)
    modal.style.display = 'flex';
}

// Salva a edição do modal
async function salvarEdicaoEvento(mIdx, eIdx) {
    // Atualiza o objeto local
    agendaData[mIdx].eventos[eIdx].nome = document.getElementById('editEvNome').value;
    agendaData[mIdx].eventos[eIdx].dia = document.getElementById('editEvDia').value;
    agendaData[mIdx].eventos[eIdx].horario = document.getElementById('editEvHora').value;
    agendaData[mIdx].eventos[eIdx].descricao = document.getElementById('editEvDesc').value;
    agendaData[mIdx].eventos[eIdx].tag = document.getElementById('editEvTag').value;

    // Envia para o Firebase
    await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
    
    fecharModais();
    showToast("Evento atualizado!");
}

// Excluir Evento
function removerEvento(m, e) {
    if(confirm("Tem certeza que deseja excluir este evento?")) {
        agendaData[m].eventos.splice(e, 1);
        firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
        showToast("Evento excluído.");
    }
}

// ========================================
// 3. LIDERANÇA
// ========================================

// Salvar Novo Membro
function salvarMembro() {
    console.log("1. Função iniciada");

    // Vamos tentar pegar os elementos. Se um deles for null, vai dar erro aqui.
    var elNome = document.getElementById('membroNome');
    var elSociedade = document.getElementById('membroSociedade');
    var elCargo = document.getElementById('membroCargoSelect');
    var elTelefone = document.getElementById('membroTelefone');

    // Verificação de segurança
    if (!elNome) return console.error("ERRO: Não achei o input com id='membroNome'");
    if (!elSociedade) return console.error("ERRO: Não achei o input com id='membroSociedade'");
    if (!elCargo) return console.error("ERRO: Não achei o select com id='membroCargoSelect'");
    if (!elTelefone) return console.error("ERRO: Não achei o input com id='membroTelefone'");

    console.log("2. Todos os elementos foram encontrados!");

    const nome = elNome.value.trim();
    const sociedade = elSociedade.value;
    const cargo = elCargo.value;
    const telefone = elTelefone.value.trim();

    if (!nome || !cargo || !sociedade) {
        console.log("3. Campos obrigatórios vazios");
        return showToast("Preencha todos os campos obrigatórios!", "error");
    }

    const dadosMembro = { nome, sociedade, cargo, telefone };
    console.log("4. Tentando salvar no Firebase...", dadosMembro);

    // Verifique se o firebase está ativo
    if(typeof firebase === 'undefined') return console.error("ERRO CRÍTICO: O Firebase não foi carregado/iniciado.");

    const dbRef = firebase.database().ref('entidades/ipb_guriri/dados/membros');

    dbRef.push(dadosMembro).then(() => {
        console.log("5. Sucesso!");
        showToast("Membro cadastrado com sucesso!");
        elNome.value = "";
        elTelefone.value = "";
    }).catch((error) => {
        console.error("ERRO NO FIREBASE:", error);
        showToast("Erro ao salvar: " + error.message, "error");
    });
}

// Carregar Lista de Membros
function carregarLideranca(dados) {
    const tbody = document.getElementById('listaLideranca');
    tbody.innerHTML = '';
    
    if(!dados) return;

    // Converte para array
    let lista = Object.entries(dados).map(([id, m]) => ({ id, ...m }));

    // Ordena por Nome
    lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    lista.forEach((m) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.nome}</strong></td>
            <td><span class="tag-badge">${m.sociedade}</span></td>
            <td>${m.cargo}</td>
            <td class="text-right">
                <button class="btn-icon btn-edit" onclick="prepararEdicaoMembro('${m.id}', ${JSON.stringify(m).replace(/"/g, '&quot;')})" title="Editar"><i class="fas fa-pen"></i></button>
                <button class="btn-icon btn-delete" onclick="removerMembro('${m.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Excluir Membro
function removerMembro(id) {
    if(confirm("Excluir este membro da liderança?")) {
        firebase.database().ref(`entidades/ipb_guriri/dados/lideranca/${id}`).remove();
        showToast("Membro removido.");
    }
}

// Abrir Modal de Edição de Membro
function prepararEdicaoMembro(id, m) {
    const corpo = document.getElementById('corpoEdicaoMembro');
    const modal = document.getElementById('modalEdicaoMembro');

    // Reutiliza os selects já carregados na página
    const optionsCargos = document.getElementById('membroCargoSelect').innerHTML;
    const optionsTags = document.getElementById('membroSociedade').innerHTML;

    corpo.innerHTML = `
        <div class="form-group">
            <label>Nome Completo</label>
            <input type="text" id="editMemNome" class="form-control" value="${m.nome}">
        </div>
        <div class="row-fields">
            <div class="form-group">
                <label>Sociedade</label>
                <select id="editMemSociedade" class="form-control">${optionsTags}</select>
            </div>
            <div class="form-group">
                <label>WhatsApp</label>
                <input type="tel" id="editMemTelefone" class="form-control" value="${m.telefone || ''}">
            </div>
        </div>
        <div class="form-group">
            <label>Cargo</label>
            <select id="editMemCargo" class="form-control">${optionsCargos}</select>
        </div>
        <div class="form-actions right">
            <button class="btn-primary" onclick="confirmarEdicaoMembro('${id}')">Salvar Alterações</button>
        </div>
    `;

    // Define os valores selecionados
    document.getElementById('editMemSociedade').value = m.sociedade;
    document.getElementById('editMemCargo').value = m.cargo;

    modal.style.display = 'flex';
}

// Salvar Edição de Membro
async function confirmarEdicaoMembro(id) {
    const dados = {
        nome: document.getElementById('editMemNome').value,
        sociedade: document.getElementById('editMemSociedade').value,
        telefone: document.getElementById('editMemTelefone').value,
        cargo: document.getElementById('editMemCargo').value
    };

    await firebase.database().ref(`entidades/ipb_guriri/dados/lideranca/${id}`).update(dados);
    fecharModais();
    showToast("Membro atualizado!");
}

// ========================================
// 4. CONFIGURAÇÕES E CORES
// ========================================

function carregarConfigTab() {
    // Carrega dados da pasta do ano de trabalho
    firebase.database().ref(`entidades/ipb_guriri/dados/configuracoes/${anoTrabalho}`).once('value').then(snap => {
        const cfg = snap.val() || {};
        
        // Textos
        if(document.getElementById('cfgEntidadeTab')) document.getElementById('cfgEntidadeTab').value = cfg.entidade || "";
        if(document.getElementById('cfgTemaTab')) document.getElementById('cfgTemaTab').value = cfg.tema || "";
        if(document.getElementById('cfgVersiculoTab')) document.getElementById('cfgVersiculoTab').value = cfg.versiculo || "";
        if(document.getElementById('cfgLogoTab')) document.getElementById('cfgLogoTab').value = cfg.logo || "";
        
        // Cores (Inputs)
        document.getElementById('cfgCorPrimaria').value   = cfg.corPrimaria   || "#074528";
        document.getElementById('cfgCorSecundaria').value = cfg.corSecundaria || "#f4f7f6";
        document.getElementById('cfgCorTerciaria').value  = cfg.corTerciaria  || "#888888";
        document.getElementById('cfgCorTitulos').value    = cfg.corTitulos    || "#ffffff";
        document.getElementById('cfgCorSubtitulos').value = cfg.corSubtitulos || "#e0e0e0";
        document.getElementById('cfgCorBotoes').value     = cfg.corBotoes     || "#074528";

        // Aplica o preview no próprio painel admin
        aplicarCoresPreview(cfg);
    });
}

// Pinta o painel admin com as cores configuradas (Preview em tempo real)
function aplicarCoresPreview(cfg) {
    const root = document.documentElement;
    const corPrimaria = cfg.corPrimaria || "#074528";
    
    // Atualiza cabeçalho e bordas
    root.style.setProperty('--adm-primary', corPrimaria);
    root.style.setProperty('--adm-btn', cfg.corBotoes || "#074528");
    
    // Ajusta o header dinamicamente
    const header = document.getElementById('dinamicHeader');
    if(header) header.style.backgroundColor = corPrimaria;
}

// Botão "Restaurar Padrão"
function restaurarCoresPadrao() {
    if(confirm("Deseja restaurar as cores oficiais da IPB (Verde)?")) {
        document.getElementById('cfgCorPrimaria').value = "#074528";
        document.getElementById('cfgCorSecundaria').value = "#f4f7f6";
        document.getElementById('cfgCorTerciaria').value = "#888888";
        document.getElementById('cfgCorTitulos').value = "#ffffff";
        document.getElementById('cfgCorSubtitulos').value = "#e0e0e0";
        document.getElementById('cfgCorBotoes').value = "#074528";
        
        showToast("Cores resetadas. Clique em 'Salvar Tema' para confirmar.");
    }
}

// Salvar Configurações
async function salvarConfigTab() {
    const dadosConfig = {
        entidade: document.getElementById('cfgEntidadeTab').value,
        tema: document.getElementById('cfgTemaTab').value,
        versiculo: document.getElementById('cfgVersiculoTab').value,
        logo: document.getElementById('cfgLogoTab').value,
        // Cores
        corPrimaria: document.getElementById('cfgCorPrimaria').value,
        corSecundaria: document.getElementById('cfgCorSecundaria').value,
        corTerciaria: document.getElementById('cfgCorTerciaria').value,
        corTitulos: document.getElementById('cfgCorTitulos').value,
        corSubtitulos: document.getElementById('cfgCorSubtitulos').value,
        corBotoes: document.getElementById('cfgCorBotoes').value
    };

    await firebase.database().ref(`entidades/ipb_guriri/dados/configuracoes/${anoTrabalho}`).set(dadosConfig);
    aplicarCoresPreview(dadosConfig);
    showToast("Configurações e Cores Salvas!");
}

// ========================================
// 5. UTILITÁRIOS & UI
// ========================================

// Trocar Abas
function trocarAba(aba) {
    // Esconde todas as seções
    document.getElementById('secaoAgenda').style.display = 'none';
    document.getElementById('secaoLideranca').style.display = 'none';
    document.getElementById('secaoConfig').style.display = 'none';
    
    // Remove classe ativa dos botões
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Ativa a selecionada
    document.getElementById('tab' + aba.charAt(0).toUpperCase() + aba.slice(1)).classList.add('active');
    document.getElementById('secao' + aba.charAt(0).toUpperCase() + aba.slice(1)).style.display = 'block';

    // Se for config, recarrega para garantir
    if(aba === 'config') carregarConfigTab();
}

// Login
function verificarAcesso() {
    const senha = document.getElementById("senhaInput").value;
    // Senha simples, ideal seria autenticação Firebase Auth
    if (senha === "Presbiteriana2023") {
        sessionStorage.setItem("adminLogado", "sim");
        document.getElementById("loginOverlay").style.display = "none";
        showToast("Bem-vindo!");
    } else {
        document.getElementById("msgErro").style.display = "block";
    }
}

// Toast Notification
function showToast(msg, tipo="success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    if(tipo === "error") toast.style.borderLeftColor = "red";
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Popula Select de Anos
function popularSelectAnos() {
    const ids = ['filtroAnoAdmin', 'inputAno', 'cfgAnoInterno', 'recAno'];
    const anoAtual = new Date().getFullYear();
    let html = "";
    
    for(let i = -1; i < 5; i++) {
        const ano = anoAtual + i;
        html += `<option value="${ano}">${ano}</option>`;
    }

    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = html;
            el.value = anoTrabalho;
        }
    });
}

// Gera Grid de Dias (1-31)
function gerarGridDias() {
    const grid = document.getElementById('dayGrid');
    grid.innerHTML = '';
    for(let i=1; i<=31; i++) {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.innerText = i < 10 ? '0'+i : i;
        btn.onclick = () => btn.classList.toggle('selected');
        grid.appendChild(btn);
    }
}

// Limpar Form Agenda
function limparFormularioEvento() {
    document.getElementById('formEvento').reset();
    document.querySelectorAll('.day-btn.selected').forEach(b => b.classList.remove('selected'));
    // Restaura o ano do input para o ano de trabalho atual
    document.getElementById('inputAno').value = anoTrabalho;
}

// Atualizar Selects de Tags e Cargos
function atualizarSelects() {
    const selectTags = ['inputTag', 'membroSociedade', 'recTag'];
    const htmlTags = '<option value="Nenhuma">Nenhuma</option>' + 
        Object.keys(tagsData).map(t => `<option value="${t}">${t}</option>`).join('');
    
    selectTags.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = htmlTags;
    });

    const selectCargos = document.getElementById('membroCargoSelect');
    if(selectCargos) {
        selectCargos.innerHTML = '<option value="">Selecione...</option>' + 
            cargosData.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

// Funções de Modal (Tags e Cargos)
function abrirModalTags() { document.getElementById('modalTags').style.display = 'flex'; }
function abrirModalCargos() { document.getElementById('modalCargos').style.display = 'flex'; }
function abrirModalRecorrencia() { document.getElementById('modalRecorrencia').style.display = 'flex'; }
function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }

function criarTagNoModal() {
    const nome = document.getElementById('newTagName').value.toUpperCase();
    if(!nome) return;
    firebase.database().ref(`entidades/ipb_guriri/dados/sociedades/${nome}`).set("#074528");
    document.getElementById('newTagName').value = "";
}

function criarCargoNoModal() {
    const nome = document.getElementById('newCargoName').value;
    if(!nome) return;
    cargosData.push(nome);
    firebase.database().ref('entidades/ipb_guriri/dados/cargos').set(cargosData);
    document.getElementById('newCargoName').value = "";
}

function renderizarTabelaTags() {
    const tb = document.getElementById('listaTagsEditaveis');
    if (!tb) return; // Segurança caso o elemento não exista

    tb.innerHTML = ''; // Limpa

    if (!tagsData || Object.keys(tagsData).length === 0) {
        tb.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:15px; color:#999;">Nenhuma sociedade.</td></tr>';
        return;
    }

    Object.keys(tagsData).forEach(t => {
        // Cria a linha da tabela
        const novaLinha = `
            <tr>
                <td style="text-align: left; padding-left: 10px;"><strong>${t}</strong></td>
                
                <td style="text-align: right; width: 50px;">
                    <button type="button" class="btn-icon btn-delete" onclick="removerTag('${t}')" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
        tb.innerHTML += novaLinha;
    });
}

function renderizarTabelaCargos() {
    const tb = document.getElementById('listaCargosEditaveis');
    tb.innerHTML = '';
    cargosData.forEach((c, i) => {
        tb.innerHTML += `<tr><td>${c}</td><td class="text-right"><button class="btn-icon" onclick="removerCargo(${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}

function removerTag(tag) { firebase.database().ref(`entidades/ipb_guriri/dados/tags/${tag}`).remove(); }
function removerCargo(idx) { 
    cargosData.splice(idx, 1);
    firebase.database().ref('entidades/ipb_guriri/dados/cargos').set(cargosData);
}

// Handler de mudança de ano
function mudarAnoAdmin(novoAno) {
    carregarAgendaDoAno(novoAno);
}

// Estrutura vazia de meses
function criarEstruturaVazia() {
    return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
        .map(m => ({ mes: m, eventos: [] }));
}

// Lógica de Recorrência (UI)
function toggleRecMode() {
    const tipo = document.querySelector('input[name="recType"]:checked').value;
    document.getElementById('optSemanal').style.display = (tipo === 'semanal') ? 'block' : 'none';
    document.getElementById('optMensal').style.display = (tipo === 'mensal') ? 'block' : 'none';
}

function mostrarSenha() {
    var inputPass = document.getElementById('senha');
    var btnShowPass = document.getElementById('btn-senha');

    if (inputPass.type === 'password') {
        inputPass.setAttribute('type', 'text');
        btnShowPass.innerText = 'visibility_off'; // Troca o desenho para "olho riscado"
    } else {
        inputPass.setAttribute('type', 'password');
        btnShowPass.innerText = 'visibility'; // Troca de volta para "olho normal"
    }
}