// ============================================
// ARQUIVO: assets/js/admin.js (VERSÃO INTEGRAL)
// ============================================

// VARIÁVEIS GLOBAIS (Preservando a sua estrutura original)
let agendaData = [];
let tagsData = {}; 
let cargosData = [];
let editando = false;
let idEdicaoOriginal = null;
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

    // Conexão com Agenda (Lógica original de 12 meses)
    database.ref('agenda2026').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            agendaData = Array.isArray(data) ? data : Object.values(data);
        } else {
            agendaData = criarEstruturaVazia();
        }
        
        if(statusMsg) statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
        renderizarLista();
    });

    // Conexão com Liderança
    database.ref('lideranca').on('value', (snapshot) => {
        carregarLideranca(snapshot.val());
    });
}

// ============================================
// 2. SISTEMA DE LOGIN (ORIGINAL RESTAURADO)
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
// 3. ABAS E MODAIS (CONTROLO DE EXIBIÇÃO)
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

function abrirModalTags() { 
    const m = document.getElementById('modalTags');
    m.classList.add('active'); 
    m.style.display = 'flex'; 
}

function abrirModalCargos() { 
    const m = document.getElementById('modalCargos');
    m.classList.add('active'); 
    m.style.display = 'flex'; 
}

function abrirModalRecorrencia() { 
    const m = document.getElementById('modalRecorrencia');
    m.classList.add('active'); 
    m.style.display = 'flex'; 
}

function fecharModais() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
        m.style.display = 'none';
    });
}

// ============================================
// 4. LÓGICA DE SOCIEDADES E CARGOS (DINÂMICO)
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
        sel.innerHTML += `<option value="${cargo}">${cargo}</option>`;
    });
}

function criarTagNoModal() {
    const nome = document.getElementById('newTagName').value.trim().toUpperCase();
    const cor = document.getElementById('newTagColor').value;
    if(!nome) return alert("Digite um nome!");
    database.ref(`tags/${nome}`).set(cor).then(() => document.getElementById('newTagName').value = "");
}

function criarCargoNoModal() {
    const input = document.getElementById('newCargoName');
    const nome = input.value.trim();
    if(!nome) return alert("Digite o nome do cargo!");
    if(cargosData.includes(nome)) return alert("Cargo já existe!");
    cargosData.push(nome);
    database.ref('cargos').set(cargosData).then(() => input.value = "");
}

function renderizarTabelaTags() {
    const tbody = document.getElementById('listaTagsEditaveis');
    if(!tbody) return;
    tbody.innerHTML = Object.entries(tagsData).map(([nome, cor]) => `
        <tr>
            <td>${nome}</td>
            <td style="text-align:center"><input type="color" value="${cor}" onchange="database.ref('tags/${nome}').set(this.value)"></td>
            <td style="text-align:right"><button class="btn-delete-tag-table" onclick="database.ref('tags/${nome}').remove()"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('');
}

function renderizarTabelaCargos() {
    const tbody = document.getElementById('listaCargosEditaveis');
    if(!tbody) return;
    tbody.innerHTML = cargosData.map((cargo, i) => `
        <tr>
            <td>${cargo}</td>
            <td style="text-align:right"><button class="btn-delete-tag-table" onclick="excluirCargo(${i})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('');
}

function excluirCargo(i) { cargosData.splice(i, 1); database.ref('cargos').set(cargosData); }

// ============================================
// 5. LÓGICA DE LIDERANÇA
// ============================================
function salvarMembro() {
    const nome = document.getElementById('membroNome').value;
    const sociedade = document.getElementById('membroSociedade').value;
    const cargo = document.getElementById('membroCargoSelect').value;
    if(!nome || !sociedade || !cargo) return alert("Preencha todos os campos!");
    database.ref('lideranca').push({ nome, sociedade, cargo }).then(() => {
        alert("Liderança salva!");
        document.getElementById('membroNome').value = "";
    });
}

function carregarLideranca(dados) {
    const listaDiv = document.getElementById('listaLideranca');
    if(!listaDiv) return;
    if(!dados) return listaDiv.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Nenhum membro cadastrado.</p>";
    
    let html = '<table class="tags-table"><thead><tr><th>NOME</th><th>SOCIEDADE</th><th>CARGO</th><th style="text-align:right">AÇÃO</th></tr></thead><tbody>';
    Object.entries(dados).forEach(([id, m]) => {
        const cor = tagsData[m.sociedade] || '#074528';
        html += `<tr>
            <td style="font-weight:600">${m.nome}</td>
            <td><span class="tag" style="background:${cor}">${m.sociedade}</span></td>
            <td>${m.cargo}</td>
            <td style="text-align:right"><button class="btn-delete-tag-table" onclick="database.ref('lideranca/${id}').remove()"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
    listaDiv.innerHTML = html + "</tbody></table>";
}

// ============================================
// 6. LÓGICA ORIGINAL DA AGENDA (MANTIDA 100%)
// ============================================
function criarEstruturaVazia() {
    return Array.from({length: 12}, (_, i) => ({ mes: obterNomeMes(i), eventos: [] }));
}

function obterNomeMes(i) {
    return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i];
}

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
                row.innerHTML = `
                    <div class="event-preview-info">
                        <strong>Dia ${ev.dia} - ${ev.nome}</strong>
                        <span class="event-preview-date">
                            ${ev.horario ? '<i class="far fa-clock"></i> ' + ev.horario : ''} 
                            ${ev.tag ? `<span class="tag" style="background:${corTag}">${ev.tag}</span>` : ''}
                        </span>
                    </div>
                    <div class="event-actions-group">
                        <button class="btn-icon-small btn-edit-icon" onclick="prepararEdicao(${mesIndex}, ${i})"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon-small btn-delete-icon" onclick="removerEvento(${mesIndex}, ${i})"><i class="fas fa-trash"></i></button>
                    </div>`;
                mesBlock.appendChild(row);
            });
            listaDiv.appendChild(mesBlock);
        }
    });
}

function processarEvento() {
    const mesNome = document.getElementById('inputMes').value;
    const ano = document.getElementById('inputAno').value || "2026";
    const nome = document.getElementById('inputNome').value;
    const selecionados = document.querySelectorAll('.day-btn.selected');
    
    if(selecionados.length === 0 || !nome) return alert("Selecione os dias e dê um nome!");

    if(editando && idEdicaoOriginal) {
        agendaData[idEdicaoOriginal.m].eventos.splice(idEdicaoOriginal.e, 1);
    }

    let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
    let dias = Array.from(selecionados).map(b => b.textContent).join(", ");

    agendaData[mesIdx].eventos.push({
        dia: dias, ano, nome,
        descricao: document.getElementById('inputDescricao').value,
        horario: document.getElementById('inputHorario').value,
        local: document.getElementById('inputLocal').value,
        tag: document.getElementById('inputTag').value
    });

    agendaData[mesIdx].eventos.sort((a,b) => parseInt(a.dia) - parseInt(b.dia));
    database.ref('agenda2026').set(agendaData).then(() => limparFormulario());
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
    
    document.querySelectorAll('.day-btn').forEach(b => {
        b.classList.toggle('selected', ev.dia.split(', ').includes(b.textContent));
    });

    editando = true;
    idEdicaoOriginal = { m, e };
    document.getElementById('btnSalvar').innerHTML = "🔄 Atualizar Evento";
    document.getElementById('btnCancelar').style.display = 'block';
    window.scrollTo({top:0, behavior:'smooth'});
}

// --- CORREÇÃO DO CANCELAR EDIÇÃO ---
function cancelarEdicao() {
    limparFormulario();
    // Força o reset visual do botão e título
    const btnSalvar = document.getElementById('btnSalvar');
    if (btnSalvar) {
        btnSalvar.innerHTML = "💾 Salvar Evento";
        btnSalvar.classList.remove('updating');
    }
    const formTitle = document.getElementById('formTitle');
    if (formTitle) formTitle.textContent = "Adicionar Novo Evento";
    
    document.getElementById('btnCancelar').style.display = 'none';
    editando = false;
    idEdicaoOriginal = null;
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// --- CORREÇÃO DA RECORRÊNCIA MENSAL ---
function toggleRecMode() {
    const radios = document.getElementsByName("recType");
    let tipo = "semanal";
    radios.forEach(r => { if(r.checked) tipo = r.value; });

    document.getElementById('optSemanal').style.display = (tipo === 'semanal') ? 'block' : 'none';
    document.getElementById('optMensal').style.display = (tipo === 'mensal') ? 'block' : 'none';
}

// --- FUNÇÃO PARA LIMPAR FORMULÁRIO COMPLETA ---
function limparFormulario() {
    const campos = ['inputNome', 'inputDescricao', 'inputLocal', 'inputHorario'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
}

function removerEvento(m, e) { if(confirm("Apagar?")) { agendaData[m].eventos.splice(e, 1); database.ref('agenda2026').set(agendaData); } }

// ============================================
// 7. FINALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("adminLogado") === "sim") {
        document.getElementById("loginOverlay").style.display = "none";
    }
    const campoSenha = document.getElementById("senhaInput");
    if (campoSenha) {
        campoSenha.addEventListener("keypress", (e) => { if (e.key === "Enter") verificarAcesso(); });
    }
    iniciarAdmin();
});