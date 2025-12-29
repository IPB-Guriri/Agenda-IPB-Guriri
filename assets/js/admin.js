
let agendaData = [];
let tagsData = ["SAF", "UMP", "UCP", "IGREJA", "EBD"]; 
const statusMsg = document.getElementById('statusMsg');
let editando = false;
let idEdicaoOriginal = null; 

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

function iniciarAdmin() {
    gerarGridDias();
    database.ref('tags').on('value', snap => {
        if(snap.exists()) tagsData = snap.val();
        else database.ref('tags').set(tagsData);
        atualizarSelectTags();
    });
    database.ref('agenda2026').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) agendaData = Array.isArray(data) ? data : Object.values(data);
        else agendaData = criarEstruturaVazia();
        statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
        renderizarLista();
    });
}

function criarEstruturaVazia() {
    return [
        { mes: "Janeiro", eventos: [] }, { mes: "Fevereiro", eventos: [] },
        { mes: "Março", eventos: [] }, { mes: "Abril", eventos: [] },
        { mes: "Maio", eventos: [] }, { mes: "Junho", eventos: [] },
        { mes: "Julho", eventos: [] }, { mes: "Agosto", eventos: [] },
        { mes: "Setembro", eventos: [] }, { mes: "Outubro", eventos: [] },
        { mes: "Novembro", eventos: [] }, { mes: "Dezembro", eventos: [] }
    ];
}

function atualizarSelectTags() {
    const select = document.getElementById('inputTag');
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Sem Tag</option>';
    tagsData.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag; opt.textContent = tag; select.appendChild(opt);
    });
    select.value = valorAtual;
}

function criarNovaTag() {
    const nova = prompt("Nome da nova Tag (ex: Coral):");
    if(nova && !tagsData.includes(nova.toUpperCase())) {
        tagsData.push(nova.toUpperCase());
        database.ref('tags').set(tagsData);
    }
}

function processarEvento() {
    const mesNome = document.getElementById('inputMes').value;
    const nome = document.getElementById('inputNome').value;
    const horario = document.getElementById('inputHorario').value;
    const local = document.getElementById('inputLocal').value;
    const tag = document.getElementById('inputTag').value;
    const botoes = document.querySelectorAll('.day-btn.selected');

    if(botoes.length === 0) { alert("Selecione os dias."); return; }
    if(!nome) { alert("Nome é obrigatório."); return; }

    let diasArray = Array.from(botoes).map(b => b.textContent);
    let diasString = diasArray.join(", ");

    if (editando && idEdicaoOriginal) {
        let m = idEdicaoOriginal.m;
        let e = idEdicaoOriginal.e;
        let evs = Array.isArray(agendaData[m].eventos) ? agendaData[m].eventos : Object.values(agendaData[m].eventos);
        evs.splice(e, 1);
        agendaData[m].eventos = evs;
    }

    let mesIndex = agendaData.findIndex(m => m.mes === mesNome);
    if(mesIndex === -1) { agendaData.push({ mes: mesNome, eventos: [] }); mesIndex = agendaData.length - 1; }
    if(!agendaData[mesIndex].eventos) agendaData[mesIndex].eventos = [];
    
    let eventosArr = Array.isArray(agendaData[mesIndex].eventos) ? agendaData[mesIndex].eventos : Object.values(agendaData[mesIndex].eventos);
    eventosArr.push({ dia: diasString, nome, horario, local, tag });
    eventosArr.sort((a, b) => parseInt(a.dia.substring(0,2)) - parseInt(b.dia.substring(0,2)));
    agendaData[mesIndex].eventos = eventosArr;

    salvarNoFirebase();
    limparFormulario();
}

function prepararEdicao(mIndex, eIndex) {
    let eventos = Array.isArray(agendaData[mIndex].eventos) ? agendaData[mIndex].eventos : Object.values(agendaData[mIndex].eventos);
    let ev = eventos[eIndex];

    document.getElementById('inputMes').value = agendaData[mIndex].mes;
    document.getElementById('inputNome').value = ev.nome;
    document.getElementById('inputHorario').value = ev.horario || '';
    document.getElementById('inputLocal').value = ev.local || '';
    document.getElementById('inputTag').value = ev.tag || '';

    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('selected'));
    let diasSalvos = ev.dia.split(',').map(s => s.trim());
    diasSalvos.forEach(dia => {
        let btn = Array.from(document.querySelectorAll('.day-btn')).find(b => b.textContent === dia);
        if(btn) btn.classList.add('selected');
    });

    editando = true;
    idEdicaoOriginal = { m: mIndex, e: eIndex };
    
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = "🔄 Atualizar Evento";
    btnSalvar.classList.add('updating');
    
    document.getElementById('btnCancelar').style.display = 'block';
    document.getElementById('formTitle').textContent = "Editando Evento...";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() { limparFormulario(); }

function limparFormulario() {
    document.getElementById('inputNome').value = '';
    document.getElementById('inputLocal').value = '';
    document.getElementById('inputHorario').value = '';
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    editando = false; idEdicaoOriginal = null;
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = "💾 Salvar Evento";
    btnSalvar.classList.remove('updating');
    document.getElementById('btnCancelar').style.display = 'none';
    document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
}

// --- AQUI ESTÁ A ATUALIZAÇÃO DOS BOTÕES ---
function renderizarLista() {
    const listaDiv = document.getElementById('listaPreview');
    listaDiv.innerHTML = '';

    agendaData.forEach((mesData, mesIndex) => {
        let eventos = mesData.eventos ? (Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos)) : [];
        
        if(eventos.length > 0) {
            const mesBlock = document.createElement('div');
            mesBlock.className = 'month-block';
            
            let header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = mesData.mes;
            mesBlock.appendChild(header);

            eventos.forEach((ev, i) => {
                let info = [];
                if(ev.horario) info.push(`🕒 ${ev.horario}`);
                if(ev.local) info.push(`📍 ${ev.local}`);
                
                let tagHtml = ev.tag ? `<span class="event-tag" style="background:var(--accent); color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:5px;">${ev.tag}</span>` : '';

                const row = document.createElement('div');
                row.className = 'event-row';
                row.innerHTML = `
                    <div class="event-info">
                        <strong>Dia ${ev.dia}</strong> - ${ev.nome} ${tagHtml}
                        <span class="event-meta" style="display:block; font-size:0.85rem; color:#666;">${info.join(' | ')}</span>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="prepararEdicao(${mesIndex}, ${i})" title="Editar">
                            <i class="fas fa-pen"></i> <span>Editar</span>
                        </button>
                        <button class="btn-icon btn-delete" onclick="removerEvento(${mesIndex}, ${i})" title="Excluir">
                            <i class="fas fa-trash"></i> <span>Excluir</span>
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
    if(confirm("Tem certeza que deseja apagar este evento?")) {
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

iniciarAdmin();
