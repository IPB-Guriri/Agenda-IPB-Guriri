// ============================================
// ARQUIVO: assets/js/admin.js (COMPLETO)
// ============================================

// VARIÁVEIS GLOBAIS
let agendaData = [];
let tagsData = {}; 
const statusMsg = document.getElementById('statusMsg');
let editando = false;
let idEdicaoOriginal = null;

// ============================================
// 1. INICIALIZAÇÃO E CONEXÃO COM FIREBASE
// ============================================
function iniciarAdmin() {
    gerarGridDias();
    
    // Conexão com as TAGS (Cores)
    database.ref('tags').on('value', snap => {
        if(snap.exists()) {
            let val = snap.val();
            // Migração automática se vier como array antigo
            if(Array.isArray(val)) {
                tagsData = {};
                val.forEach(t => tagsData[t] = "#074528"); // Cor padrão verde
            } else {
                tagsData = val;
            }
        } else {
            tagsData = {};
        }
        atualizarSelectTags(); 
        renderizarTabelaTags(); 
    });

    // Conexão com a AGENDA (Eventos)
    database.ref('agenda2026').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) agendaData = Array.isArray(data) ? data : Object.values(data);
        else agendaData = criarEstruturaVazia();
        
        statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
        renderizarLista();
    });
}

// Gera os números de 01 a 31 no grid
function gerarGridDias() {
    const grid = document.getElementById('dayGrid');
    grid.innerHTML = '';
    for(let i=1; i<=31; i++) {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.textContent = i < 10 ? '0'+i : i; 
        btn.onclick = function() { this.classList.toggle('selected'); };
        grid.appendChild(btn);
    }
}

// Cria a estrutura vazia dos 12 meses
function criarEstruturaVazia() {
    return Array.from({length: 12}, (_, i) => ({ 
        mes: obterNomeMes(i), 
        eventos: [] 
    }));
}

// ============================================
// 2. GERENCIAMENTO DE TAGS
// ============================================
function atualizarSelectTags() {
    const selects = [document.getElementById('inputTag'), document.getElementById('recTag')];
    selects.forEach(sel => {
        if(!sel) return;
        const valorAtual = sel.value;
        sel.innerHTML = '<option value="">Nenhuma</option>';
        Object.keys(tagsData).sort().forEach(tagNome => {
            const opt = document.createElement('option');
            opt.value = tagNome; opt.textContent = tagNome; sel.appendChild(opt);
        });
        if(tagsData[valorAtual]) sel.value = valorAtual;
    });
}

function renderizarTabelaTags() {
    const tbody = document.getElementById('listaTagsEditaveis');
    if(!tbody) return;
    tbody.innerHTML = '';

    Object.entries(tagsData).forEach(([nome, cor]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${nome}</td>
            <td style="text-align:center">
                <input type="color" value="${cor}" onchange="atualizarCorTag('${nome}', this.value)">
            </td>
            <td style="text-align:right">
                <button class="btn-delete-tag-table" onclick="excluirTag('${nome}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function criarTagNoModal() {
    const nomeInput = document.getElementById('newTagName');
    const corInput = document.getElementById('newTagColor');
    const nome = nomeInput.value.trim().toUpperCase();
    const cor = corInput.value;

    if(!nome) return alert("Digite um nome!");
    if(tagsData[nome]) return alert("Essa tag já existe!");

    tagsData[nome] = cor;
    salvarTagsNoFirebase();
    nomeInput.value = '';
}

function atualizarCorTag(nome, novaCor) {
    tagsData[nome] = novaCor;
    salvarTagsNoFirebase();
}

function excluirTag(nome) {
    if(confirm(`Excluir a tag "${nome}"?`)) {
        delete tagsData[nome];
        salvarTagsNoFirebase();
    }
}

function salvarTagsNoFirebase() {
    database.ref('tags').set(tagsData);
}

// ============================================
// 3. RECORRÊNCIA (COM ANO E DESCRIÇÃO)
// ============================================
function toggleRecMode() {
    const tipo = document.querySelector('input[name="recType"]:checked').value;
    document.getElementById('optSemanal').classList.toggle('active', tipo === 'semanal');
    document.getElementById('optMensal').classList.toggle('active', tipo === 'mensal');
}

function gerarEventosRecorrentes() {
    // 1. Coleta Dados
    const nome = document.getElementById('recNome').value;
    const descricao = document.getElementById('recDescricao').value;
    const horario = document.getElementById('recHorario').value;
    const tag = document.getElementById('recTag').value;
    const ano = document.getElementById('recAno').value || "2026"; // Pega o ano
    
    const mesInicio = parseInt(document.getElementById('recMesInicio').value);
    const mesFim = parseInt(document.getElementById('recMesFim').value);
    const tipoRecorrencia = document.querySelector('input[name="recType"]:checked').value;

    if(!nome) return alert("Preencha o nome do evento.");
    if(mesInicio > mesFim) return alert("O mês de início deve ser antes do fim.");

    let contadorAdicionados = 0;

    // 2. Loop pelos meses
    for (let mesIdx = mesInicio; mesIdx <= mesFim; mesIdx++) {
        // Garante estrutura
        if(!agendaData[mesIdx]) agendaData[mesIdx] = { mes: obterNomeMes(mesIdx), eventos: [] };
        if(!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];
        
        let eventosDoMes = Array.isArray(agendaData[mesIdx].eventos) ? agendaData[mesIdx].eventos : Object.values(agendaData[mesIdx].eventos);
        
        // Calcula dias com base no ANO escolhido
        const totalDiasNoMes = new Date(parseInt(ano), mesIdx + 1, 0).getDate();

        // --- LÓGICA SEMANAL ---
        if (tipoRecorrencia === 'semanal') {
            const checkboxes = document.querySelectorAll('.week-days-selector input:checked');
            const diasEscolhidos = Array.from(checkboxes).map(cb => parseInt(cb.value));
            
            if(diasEscolhidos.length === 0) return alert("Selecione dias da semana.");

            for (let dia = 1; dia <= totalDiasNoMes; dia++) {
                // Verifica dia da semana usando o ano correto
                const dataObj = new Date(parseInt(ano), mesIdx, dia);
                if (diasEscolhidos.includes(dataObj.getDay())) {
                    adicionarEventoNoArray(eventosDoMes, dia, nome, descricao, horario, tag, ano);
                    contadorAdicionados++;
                }
            }
        } 
        // --- LÓGICA MENSAL ---
        else if (tipoRecorrencia === 'mensal') {
            const ordem = parseInt(document.getElementById('recMensalOrdem').value);
            const diaSemanaAlvo = parseInt(document.getElementById('recMensalDia').value);

            let ocorrencias = [];
            for (let d = 1; d <= totalDiasNoMes; d++) {
                let checkDate = new Date(parseInt(ano), mesIdx, d);
                if(checkDate.getDay() === diaSemanaAlvo) ocorrencias.push(d);
            }

            let diaFinal = null;
            if(ordem === 5) {
                // Último
                if(ocorrencias.length > 0) diaFinal = ocorrencias[ocorrencias.length - 1];
            } else {
                // 1º, 2º, 3º, 4º
                if(ocorrencias[ordem - 1]) diaFinal = ocorrencias[ordem - 1];
            }

            if(diaFinal) {
                adicionarEventoNoArray(eventosDoMes, diaFinal, nome, descricao, horario, tag, ano);
                contadorAdicionados++;
            }
        }
        
        // Ordena por dia
        eventosDoMes.sort((a, b) => parseInt(a.dia.substring(0,2)) - parseInt(b.dia.substring(0,2)));
        agendaData[mesIdx].eventos = eventosDoMes;
    }

    salvarNoFirebase();
    alert(`Sucesso! ${contadorAdicionados} eventos gerados.`);
    fecharModais();
}

// Helper para adicionar ao array
function adicionarEventoNoArray(arrayEventos, diaInt, nome, desc, hora, tag, ano) {
    const diaFormatado = diaInt < 10 ? '0' + diaInt : '' + diaInt;
    arrayEventos.push({
        dia: diaFormatado,
        ano: ano,
        nome: nome,
        descricao: desc,
        horario: hora,
        local: "",
        tag: tag
    });
}

function obterNomeMes(i) {
    return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i];
}

// ============================================
// 4. FUNÇÕES DE MODAL
// ============================================
function abrirModalTags() { document.getElementById('modalTags').classList.add('active'); }
function abrirModalRecorrencia() { document.getElementById('modalRecorrencia').classList.add('active'); }
function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }

// ============================================
// 5. CRUD PADRÃO (COM ANO E DESCRIÇÃO)
// ============================================
function processarEvento() {
    const mesNome = document.getElementById('inputMes').value;
    const ano = document.getElementById('inputAno').value || "2026"; // Pega o ano
    const nome = document.getElementById('inputNome').value;
    const descricao = document.getElementById('inputDescricao').value; // Pega descrição
    const horario = document.getElementById('inputHorario').value;
    const local = document.getElementById('inputLocal').value;
    const tag = document.getElementById('inputTag').value;
    const botoes = document.querySelectorAll('.day-btn.selected');

    if(botoes.length === 0) { alert("Selecione os dias."); return; }
    if(!nome) { alert("Nome é obrigatório."); return; }

    let diasArray = Array.from(botoes).map(b => b.textContent);
    let diasString = diasArray.join(", ");

    // Remove anterior se estiver editando
    if (editando && idEdicaoOriginal) {
        let m = idEdicaoOriginal.m;
        let e = idEdicaoOriginal.e;
        let evs = Array.isArray(agendaData[m].eventos) ? agendaData[m].eventos : Object.values(agendaData[m].eventos);
        evs.splice(e, 1);
        agendaData[m].eventos = evs;
    }

    let mesIndex = agendaData.findIndex(m => m.mes === mesNome);
    if(mesIndex === -1) { 
        agendaData.push({ mes: mesNome, eventos: [] });
        mesIndex = agendaData.length - 1;
    }
    if(!agendaData[mesIndex].eventos) agendaData[mesIndex].eventos = [];
    
    let eventosArr = Array.isArray(agendaData[mesIndex].eventos) ? agendaData[mesIndex].eventos : Object.values(agendaData[mesIndex].eventos);
    
    // Adiciona novo objeto completo
    eventosArr.push({ 
        dia: diasString, 
        ano: ano,
        nome, 
        descricao, 
        horario, 
        local, 
        tag 
    });
    
    eventosArr.sort((a, b) => parseInt(a.dia.substring(0,2)) - parseInt(b.dia.substring(0,2)));
    agendaData[mesIndex].eventos = eventosArr;

    salvarNoFirebase();
    limparFormulario();
}

function prepararEdicao(mIndex, eIndex) {
    let eventos = Array.isArray(agendaData[mIndex].eventos) ? agendaData[mIndex].eventos : Object.values(agendaData[mIndex].eventos);
    let ev = eventos[eIndex];

    document.getElementById('inputMes').value = agendaData[mIndex].mes;
    document.getElementById('inputAno').value = ev.ano || "2026"; // Carrega ano
    document.getElementById('inputNome').value = ev.nome;
    document.getElementById('inputDescricao').value = ev.descricao || ''; // Carrega descrição
    document.getElementById('inputHorario').value = ev.horario || '';
    document.getElementById('inputLocal').value = ev.local || '';
    document.getElementById('inputTag').value = ev.tag || '';

    // Marca dias no calendário
    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected'));
    let diasSalvos = ev.dia.split(',').map(s => s.trim());
    diasSalvos.forEach(dia => {
        let btn = Array.from(document.querySelectorAll('.day-btn')).find(b => b.textContent === dia);
        if(btn) btn.classList.add('selected');
    });

    editando = true;
    idEdicaoOriginal = { m: mIndex, e: eIndex };
    
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = "🔄 Atualizar";
    btnSalvar.classList.add('updating');
    
    document.getElementById('btnCancelar').style.display = 'block';
    document.getElementById('formTitle').textContent = "Editando Evento...";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() { limparFormulario(); }

function limparFormulario() {
    document.getElementById('inputNome').value = '';
    document.getElementById('inputDescricao').value = ''; // Limpa descrição
    document.getElementById('inputLocal').value = '';
    document.getElementById('inputHorario').value = '';
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    
    editando = false;
    idEdicaoOriginal = null;
    
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = "💾 Salvar Evento";
    btnSalvar.classList.remove('updating');
    
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
}

// =================================================================
// SUBSTITUA APENAS ESTA FUNÇÃO NO SEU ARQUIVO assets/js/admin.js
// =================================================================

function renderizarLista() {
    const listaDiv = document.getElementById('listaPreview');
    listaDiv.innerHTML = '';

    agendaData.forEach((mesData, mesIndex) => {
        // Garante que é um array
        let eventos = mesData.eventos ? (Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos)) : [];
        
        if(eventos.length > 0) {
            const mesBlock = document.createElement('div');
            mesBlock.className = 'month-block';
            mesBlock.innerHTML = `<div class="month-header">${mesData.mes}</div>`;

            eventos.forEach((ev, i) => {
                let corTag = tagsData[ev.tag] || '#074528'; // Pega a cor real ou verde padrão
                
                // HTML da Tag (se existir)
                let tagHtml = ev.tag ? `<span class="tag" style="background-color: ${corTag}; color: white;">${ev.tag}</span>` : '';

                const row = document.createElement('div');
                
                // AQUI ESTÁ O SEGREDO: Usamos a classe nova do CSS (admin.css)
                row.className = 'event-preview-item'; 
                
                // AQUI ESTÁ A ESTRUTURA NOVA (Texto na esquerda, botões na direita)
                row.innerHTML = `
                    <div class="event-preview-info">
                        <strong>Dia ${ev.dia} - ${ev.nome}</strong>
                        <span class="event-preview-date">
                            ${ev.horario ? '<i class="far fa-clock"></i> ' + ev.horario : ''} 
                            ${tagHtml}
                        </span>
                    </div>

                    <div class="event-actions-group">
                        <button class="btn-icon-small btn-edit-icon" onclick="prepararEdicao(${mesIndex}, ${i})" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon-small btn-delete-icon" onclick="removerEvento(${mesIndex}, ${i})" title="Apagar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                mesBlock.appendChild(row);
            });
            listaDiv.appendChild(mesBlock);
        }
    });

    if(listaDiv.innerHTML === '') {
        listaDiv.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Nenhum evento cadastrado.</p>';
    }
}

function removerEvento(m, e) {
    if(confirm("Tem certeza que deseja apagar?")) {
        let evs = Array.isArray(agendaData[m].eventos) ? agendaData[m].eventos : Object.values(agendaData[m].eventos);
        evs.splice(e, 1);
        agendaData[m].eventos = evs;
        salvarNoFirebase();
    }
}

function salvarNoFirebase() {
    statusMsg.innerHTML = "Salvando...";
    database.ref('agenda2026').set(agendaData).then(() => {
        statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
    });
}

// Inicia
iniciarAdmin();

// ============================================
// SISTEMA DE LOGIN (SENHA ÚNICA)
// ============================================

// 1. Ao carregar a página, verifica se já está logado
document.addEventListener("DOMContentLoaded", () => {
    // Tenta pegar o registro do navegador
    const jaLogado = sessionStorage.getItem("adminLogado");
    
    // Se a pessoa já digitou a senha antes (sem fechar o navegador), libera
    if (jaLogado === "sim") {
        const overlay = document.getElementById("loginOverlay");
        if(overlay) overlay.style.display = "none";
    }
});

// 2. Função chamada ao clicar no botão "ENTRAR"
function verificarAcesso() {
    const input = document.getElementById("senhaInput");
    const msg = document.getElementById("msgErro");
    const overlay = document.getElementById("loginOverlay");
    
    // AQUI VOCÊ DEFINE A SENHA
    const senhaCorreta = "Presbiteriana2023"; 

    if (input.value === senhaCorreta) {
        // Senha certa: Salva na sessão e esconde o bloqueio
        sessionStorage.setItem("adminLogado", "sim");
        overlay.style.display = "none";
    } else {
        // Senha errada: Mostra mensagem de erro
        msg.style.display = "block";
        input.style.border = "1px solid red";
        input.value = ""; // Limpa o campo
        input.focus();    // Coloca o cursor de volta no campo
    }
}

// 3. Permite apertar a tecla "Enter" para entrar
const campoSenha = document.getElementById("senhaInput");
if (campoSenha) {
    campoSenha.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            verificarAcesso();
        }
    });
}