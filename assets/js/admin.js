// ============================================
// ARQUIVO: assets/js/admin.js (VERSÃO INTEGRAL ATUALIZADA)
// ============================================

// VARIÁVEIS GLOBAIS
let agendaData = [];
let tagsData = {}; 
let cargosData = [];
let editando = false;
let idEdicaoOriginal = null;

// Variáveis de controle de Membros
let editandoMembro = false;
let idMembroEdicao = null;

const statusMsg = document.getElementById('statusMsg');

// ============================================
// 1. INICIALIZAÇÃO E CONEXÃO FIREBASE
// ============================================
function iniciarAdmin() {
    gerarGridDias();
    
    // Conexão com Sociedades (Tags)
    database.ref('tags').on('value', snap => {
        if(snap.exists()) {
            let val = snap.val();
            if(Array.isArray(val)) {
                tagsData = {};
                val.forEach(t => tagsData[t] = "#074528");
            } else {
                tagsData = val;
            }
        } else {
            tagsData = {};
        }
        atualizarSelectSociedades(); 
        renderizarTabelaTags(); 
    });

    // Conexão com Cargos
    database.ref('cargos').on('value', snap => {
        cargosData = snap.val() || [];
        atualizarSelectCargos();
        renderizarTabelaCargos();
    });

    // Conexão com Agenda
    database.ref('agenda2026').on('value', (snapshot) => {
        const data = snapshot.val();
        agendaData = data ? (Array.isArray(data) ? data : Object.values(data)) : criarEstruturaVazia();
        if(statusMsg) statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
        renderizarLista();
    });

    // Conexão com Liderança
    database.ref('lideranca').on('value', (snapshot) => {
        carregarLideranca(snapshot.val());
    });
}

// ============================================
// 2. SISTEMA DE LOGIN
// ============================================
function verificarAcesso() {
    const input = document.getElementById("senhaInput");
    const msg = document.getElementById("msgErro");
    const overlay = document.getElementById("loginOverlay");
    const senhaCorreta = "Presbiteriana2023"; 

    if (input.value === senhaCorreta) {
        sessionStorage.setItem("adminLogado", "sim");
        overlay.style.display = "none";
    } else {
        msg.style.display = "block";
        input.style.border = "1px solid red";
        input.value = "";
        input.focus();
    }
}

// ============================================
// 3. ABAS E MODAIS
// ============================================
function trocarAba(aba) {
    const secaoAgenda = document.getElementById('secaoAgenda');
    const secaoLideranca = document.getElementById('secaoLideranca');
    const acoesAgenda = document.getElementById('acoesAgenda');
    const btnAgenda = document.getElementById('tabAgenda');
    const btnLideranca = document.getElementById('tabLideranca');

    if (aba === 'lideranca') {
        secaoAgenda.style.display = 'none';
        acoesAgenda.style.display = 'none';
        secaoLideranca.style.display = 'block';
        btnAgenda.classList.remove('active');
        btnLideranca.classList.add('active');
    } else {
        secaoAgenda.style.display = 'block';
        acoesAgenda.style.display = 'flex';
        secaoLideranca.style.display = 'none';
        btnAgenda.classList.add('active');
        btnLideranca.classList.remove('active');
    }
}

function abrirModalTags() { document.getElementById('modalTags').style.display = 'flex'; }
function abrirModalCargos() { document.getElementById('modalCargos').style.display = 'flex'; }
function abrirModalRecorrencia() { document.getElementById('modalRecorrencia').style.display = 'flex'; }
function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }

// ============================================
// 4. LÓGICA DE SOCIEDADES E CARGOS
// ============================================
function atualizarSelectSociedades() {
    const ids = ['inputTag', 'recTag', 'membroSociedade'];
    ids.forEach(id => {
        const sel = document.getElementById(id);
        if(!sel) return;
        const valorAtual = sel.value;
        sel.innerHTML = '<option value="">Nenhuma</option>';
        Object.keys(tagsData).sort().forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag; opt.textContent = tag;
            sel.appendChild(opt);
        });
        sel.value = valorAtual;
    });
}

function atualizarSelectCargos() {
    const sel = document.getElementById('membroCargoSelect');
    if(!sel) return;
    sel.innerHTML = '<option value="">Selecione...</option>';
    cargosData.sort().forEach(cargo => {
        const opt = document.createElement('option');
        opt.value = cargo; opt.textContent = cargo;
        sel.appendChild(opt);
    });
}

function criarTagNoModal() {
    const nome = document.getElementById('newTagName').value.trim().toUpperCase();
    const cor = document.getElementById('newTagColor').value;
    if(!nome) return showToast("Digite um nome!", "error");
    database.ref(`tags/${nome}`).set(cor).then(() => document.getElementById('newTagName').value = "");
}

function criarCargoNoModal() {
    const input = document.getElementById('newCargoName');
    const nome = input.value.trim();
    if(!nome) return showToast("Digite o nome do cargo!", "error");
    if(cargosData.includes(nome)) return showToast("Cargo já existe!", "error");
    cargosData.push(nome);
    database.ref('cargos').set(cargosData).then(() => input.value = "");
}

function renderizarTabelaTags() {
    const tbody = document.getElementById('listaTagsEditaveis');
    if(!tbody) return;
    tbody.innerHTML = '';
    Object.entries(tagsData).forEach(([nome, cor]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${nome}</td><td style="text-align:center"><input type="color" value="${cor}" onchange="database.ref('tags/${nome}').set(this.value)"></td><td style="text-align:right"><button class="btn-delete-tag-table" onclick="database.ref('tags/${nome}').remove()"><i class="fas fa-trash"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function renderizarTabelaCargos() {
    const tbody = document.getElementById('listaCargosEditaveis');
    if(!tbody) return;
    tbody.innerHTML = '';
    cargosData.forEach((cargo, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${cargo}</td><td style="text-align:right"><button class="btn-delete-tag-table" onclick="excluirCargo(${i})"><i class="fas fa-trash"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function excluirCargo(i) { cargosData.splice(i, 1); database.ref('cargos').set(cargosData); }

// ============================================
// 5. LÓGICA DE LIDERANÇA (ATUALIZADA)
// ============================================
function salvarMembro() {
    const nome = document.getElementById('membroNome').value.trim();
    const sociedade = document.getElementById('membroSociedade').value;
    const cargo = document.getElementById('membroCargoSelect').value;
    const telefone = document.getElementById('membroTelefone').value.trim();

    if (!nome || !cargo || !sociedade) {
        showToast("⚠️ Preencha nome, sociedade e cargo!", "error");
        return;
    }

    const dadosMembro = { nome, sociedade, cargo, telefone };

    if (editandoMembro && idMembroEdicao) {
        database.ref(`lideranca/${idMembroEdicao}`).update(dadosMembro)
            .then(() => {
                showToast("✅ Membro atualizado!");
                cancelarEdicaoMembro();
            });
    } else {
        database.ref('lideranca').push(dadosMembro)
            .then(() => {
                showToast("✅ Membro cadastrado!");
                limparCamposMembro();
            });
    }
}

function carregarLideranca(dados) {
    const tbody = document.getElementById('listaLideranca');
    if(!tbody) return;
    tbody.innerHTML = '';

    if(!dados) return;

    Object.entries(dados).forEach(([id, m]) => {
        const tr = document.createElement('tr');

        // Célula Nome + Telefone
        const tdInfo = document.createElement('td');
        const divInfo = document.createElement('div');
        divInfo.className = 'membro-info-cell';
        const strong = document.createElement('strong');
        strong.textContent = m.nome;
        divInfo.appendChild(strong);
        if (m.telefone) {
            const spanTel = document.createElement('span');
            spanTel.className = 'membro-tel-small';
            spanTel.textContent = m.telefone;
            divInfo.appendChild(spanTel);
        }
        tdInfo.appendChild(divInfo);

        // Célula Sociedade
        const tdSoc = document.createElement('td');
        const spanTag = document.createElement('span');
        spanTag.className = 'tag';
        spanTag.style.backgroundColor = tagsData[m.sociedade] || '#074528';
        spanTag.textContent = m.sociedade;
        tdSoc.appendChild(spanTag);

        // Célula Cargo
        const tdCargo = document.createElement('td');
        tdCargo.textContent = m.cargo;

// ... dentro do Object.entries(dados).forEach ...

        // Coluna Ações
        const tdAcoes = document.createElement('td');
        const divAcoes = document.createElement('div');
        divAcoes.className = 'acoes-lideranca'; // Aplicando a classe do CSS acima

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-icon-small btn-edit-icon';
        btnEdit.innerHTML = '<i class="fas fa-pen"></i>';
        btnEdit.onclick = () => prepararEdicaoMembro(id, m);

        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon-small btn-delete-tag-table';
        btnDel.innerHTML = '<i class="fas fa-trash"></i>';
        btnDel.onclick = () => { if(confirm("Excluir membro?")) database.ref(`lideranca/${id}`).remove(); };

        divAcoes.appendChild(btnEdit);
        divAcoes.appendChild(btnDel);
        tdAcoes.appendChild(divAcoes); // Adiciona a div com os dois botões na célula

        tr.appendChild(tdInfo);
        tr.appendChild(tdSoc);
        tr.appendChild(tdCargo);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
    });
}

function prepararEdicaoMembro(id, m) {
    document.getElementById('membroNome').value = m.nome;
    document.getElementById('membroSociedade').value = m.sociedade;
    document.getElementById('membroCargoSelect').value = m.cargo;
    document.getElementById('membroTelefone').value = m.telefone || '';
    
    editandoMembro = true;
    idMembroEdicao = id;
    
    document.getElementById('btnSalvarMembro').textContent = "🔄 Atualizar Membro";
    document.getElementById('btnCancelarMembro').style.display = 'inline-block';
    document.getElementById('tituloMembro').textContent = "Editando Membro...";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicaoMembro() {
    limparCamposMembro();
    editandoMembro = false;
    idMembroEdicao = null;
    document.getElementById('btnSalvarMembro').textContent = "💾 Salvar na Liderança";
    document.getElementById('btnCancelarMembro').style.display = 'none';
    document.getElementById('tituloMembro').textContent = "Cadastrar Liderança / Membro";
}

function limparCamposMembro() {
    document.getElementById('membroNome').value = '';
    document.getElementById('membroTelefone').value = '';
}

// ============================================
// 6. LÓGICA DA AGENDA
// ============================================
function criarEstruturaVazia() { return Array.from({length: 12}, (_, i) => ({ mes: obterNomeMes(i), eventos: [] })); }
function obterNomeMes(i) { return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i]; }

function gerarGridDias() {
    const grid = document.getElementById('dayGrid');
    if(!grid) return;
    grid.innerHTML = '';
    for(let i=1; i<=31; i++) {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.textContent = i < 10 ? '0'+i : i; 
        btn.onclick = function() { this.classList.toggle('selected'); };
        grid.appendChild(btn);
    }
}

function renderizarLista() {
    const listaDiv = document.getElementById('listaPreview');
    if(!listaDiv) return;
    listaDiv.innerHTML = '';
    agendaData.forEach((mesData, mesIndex) => {
        let eventos = mesData.eventos ? (Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos)) : [];
        if(eventos.length > 0) {
            const mesBlock = document.createElement('div');
            mesBlock.className = 'month-block';
            mesBlock.innerHTML = `<div class="month-header">${mesData.mes}</div>`;
            eventos.forEach((ev, i) => {
                const corTag = tagsData[ev.tag] || '#074528';
                const row = document.createElement('div');
                row.className = 'event-preview-item'; 
                row.innerHTML = `<div class="event-preview-info"><strong>Dia ${ev.dia} - ${ev.nome}</strong><span class="event-preview-date">${ev.horario ? '<i class="far fa-clock"></i> ' + ev.horario : ''} ${ev.tag ? `<span class="tag" style="background:${corTag}">${ev.tag}</span>` : ''}</span></div><div class="event-actions-group"><button class="btn-icon-small btn-edit-icon" onclick="prepararEdicao(${mesIndex}, ${i})"><i class="fas fa-pen"></i></button><button class="btn-icon-small btn-delete-icon" onclick="removerEvento(${mesIndex}, ${i})"><i class="fas fa-trash"></i></button></div>`;
                mesBlock.appendChild(row);
            });
            listaDiv.appendChild(mesBlock);
        }
    });
}

function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function processarEvento() {
    const mesNome = document.getElementById('inputMes').value;
    const ano = document.getElementById('inputAno').value || "2026";
    const nome = document.getElementById('inputNome').value;
    const selecionados = document.querySelectorAll('.day-btn.selected');
    if (selecionados.length === 0 || !nome) return showToast("⚠️ Selecione os dias e o nome!", "error");

    let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
    if (mesIdx === -1) { agendaData.push({ mes: mesNome, eventos: [] }); mesIdx = agendaData.length - 1; }
    if (!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];

    if (editando && idEdicaoOriginal) agendaData[idEdicaoOriginal.m].eventos.splice(idEdicaoOriginal.e, 1);

    const dias = Array.from(selecionados).map(b => b.textContent).join(", ");
    agendaData[mesIdx].eventos.push({ dia: dias, ano, nome, descricao: document.getElementById('inputDescricao').value, horario: document.getElementById('inputHorario').value, local: document.getElementById('inputLocal').value, tag: document.getElementById('inputTag').value });
    agendaData[mesIdx].eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

    const btn = document.getElementById('btnSalvar');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Salvando...";
    btn.disabled = true;

    database.ref('agenda2026').set(agendaData).then(() => {
        showToast(editando ? "Evento atualizado!" : "Evento cadastrado!");
        setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; limparFormulario(); }, 1000);
    }).catch(() => { showToast("Erro ao conectar ao Firebase", "error"); btn.innerHTML = txtOriginal; btn.disabled = false; });
}

function prepararEdicao(m, e) {
    const ev = agendaData[m].eventos[e];
    document.getElementById('inputMes').value = agendaData[m].mes;
    document.getElementById('inputAno').value = ev.ano || "2026";
    document.getElementById('inputNome').value = ev.nome;
    document.getElementById('inputDescricao').value = ev.descricao || '';
    document.getElementById('inputHorario').value = ev.horario || '';
    document.getElementById('inputLocal').value = ev.local || '';
    document.getElementById('inputTag').value = ev.tag || '';
    document.querySelectorAll('.day-btn').forEach(b => b.classList.toggle('selected', ev.dia.split(', ').includes(b.textContent)));
    editando = true; idEdicaoOriginal = { m, e };
    document.getElementById('btnSalvar').innerHTML = "🔄 Atualizar Evento";
    document.getElementById('btnCancelar').style.display = 'block';
    window.scrollTo({top:0, behavior:'smooth'});
}

function cancelarEdicao() {
    limparFormulario();
    document.getElementById('btnSalvar').innerHTML = "💾 Salvar Evento";
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
    editando = false; idEdicaoOriginal = null;
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleRecMode() {
    const tipo = document.querySelector('input[name="recType"]:checked').value;
    document.getElementById('optSemanal').style.display = (tipo === 'semanal') ? 'block' : 'none';
    document.getElementById('optMensal').style.display = (tipo === 'mensal') ? 'block' : 'none';
}

function limparFormulario() {
    editando = false; idEdicaoOriginal = null;
    document.getElementById('inputNome').value = ""; document.getElementById('inputDescricao').value = ""; document.getElementById('inputHorario').value = ""; document.getElementById('inputLocal').value = ""; document.getElementById('inputTag').value = "";
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btnSalvar').innerHTML = "💾 Salvar Evento";
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
}

function removerEvento(m, e) { if(confirm("Apagar?")) { agendaData[m].eventos.splice(e, 1); database.ref('agenda2026').set(agendaData); } }

// ============================================
// 7. FINALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("adminLogado") === "sim") document.getElementById("loginOverlay").style.display = "none";
    const campoSenha = document.getElementById("senhaInput");
    if (campoSenha) campoSenha.addEventListener("keypress", (e) => { if (e.key === "Enter") verificarAcesso(); });
    iniciarAdmin();
});