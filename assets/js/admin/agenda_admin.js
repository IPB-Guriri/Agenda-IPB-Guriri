// ========================================
// ARQUIVO: assets/js/admin/agenda_admin.js
// OBJETIVO: Gerenciar Eventos, Modal e Tags (Sociedades) com suporte a múltiplas igrejas
// ========================================

// Variáveis Globais de Estado
let agendaData = [];
let tagsData = {};
let anoTrabalho = new Date().getFullYear().toString();
let refAgendaAnterior = null;
let tagEditandoOldName = null;
let tagParaExcluir = null;

// Variáveis de Controle de Edição
let editandoIndexMes = null;
let editandoIndexEvento = null;
let modoEdicao = false; 

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    iniciarAdmin();
    setTimeout(() => {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.classList.add('hidden');
    }, 1000);
});

function iniciarAdmin() {
    popularSelectAnos();

    const selectAno = document.getElementById('filtroAnoAdmin');
    if (selectAno) selectAno.value = anoTrabalho;

    // --- MUDANÇA 1: Listener de Tags usando pegarReferencia ---
    pegarReferencia('tags').on('value', snap => {
        tagsData = snap.val() || {};
        atualizarSelects();
        renderizarTabelaTags();
    });

    carregarAgendaDoAno(anoTrabalho);
}

// ========================================
// 2. LÓGICA DE DADOS (FIREBASE)
// ========================================

function carregarAgendaDoAno(ano) {
    if (refAgendaAnterior) refAgendaAnterior.off();
    anoTrabalho = ano;

    // --- MUDANÇA 2: Carregar Agenda usando pegarReferencia ---
    const ref = pegarReferencia(`agenda/${ano}`);
    refAgendaAnterior = ref;

    ref.on('value', snap => {
        const data = snap.val();
        agendaData = data ? (Array.isArray(data) ? data : Object.values(data)) : criarEstruturaVazia();
        renderizarListaAgenda();

        const status = document.getElementById('statusMsg');
        if (status) status.innerText = `Ano: ${ano}`;
    });
}

// ========================================
// 3. MODAL UNIFICADO (CRIAR E EDITAR)
// ========================================

function abrirModalEvento(mIdx = null, eIdx = null) {
    const modal = document.getElementById('modalEvento');
    const titulo = document.getElementById('modalEventoTitulo');
    const grid = document.getElementById('dayGridModal');

    gerarGridDiasNoModal();
    atualizarSelects(); 

    if (mIdx !== null && eIdx !== null) {
        // MODO EDIÇÃO
        modoEdicao = true;
        editandoIndexMes = mIdx;
        editandoIndexEvento = eIdx;
        titulo.innerText = "Editar Evento";

        const ev = agendaData[mIdx].eventos[eIdx];
        const mesNome = agendaData[mIdx].mes;

        document.getElementById('evtAno').value = anoTrabalho; 
        document.getElementById('evtMes').value = mesNome;
        document.getElementById('evtNome').value = ev.nome;
        document.getElementById('evtHorario').value = ev.horario || "";
        document.getElementById('evtDescricao').value = ev.descricao || "";
        document.getElementById('evtTag').value = ev.tag || "Nenhuma";

        const diasArray = ev.dia.split(',').map(d => d.trim());
        const botoesDias = grid.querySelectorAll('.day-btn');
        botoesDias.forEach(btn => {
            if (diasArray.includes(btn.innerText)) {
                btn.classList.add('selected');
            }
        });

    } else {
        // MODO CRIAÇÃO
        modoEdicao = false;
        editandoIndexMes = null;
        editandoIndexEvento = null;
        titulo.innerText = "Novo Evento";

        document.getElementById('formModalEvento').reset();
        document.getElementById('evtAno').value = anoTrabalho; 
        grid.querySelectorAll('.selected').forEach(b => b.classList.remove('selected'));
    }

    modal.style.display = 'flex';
}

async function salvarDadosEvento() {
    const anoDestino = document.getElementById('evtAno').value;
    const mesNome = document.getElementById('evtMes').value;
    const nome = document.getElementById('evtNome').value;

    const selecionados = document.querySelectorAll('#dayGridModal .day-btn.selected');

    if (selecionados.length === 0) return showToast("Selecione ao menos um dia!", "error");
    if (!nome) return showToast("Digite o nome do evento!", "error");

    const dias = Array.from(selecionados).map(b => b.textContent).join(", ");

    const dadosEvento = {
        dia: dias,
        ano: anoDestino,
        nome: nome,
        descricao: document.getElementById('evtDescricao').value || "", 
        horario: document.getElementById('evtHorario').value,
        tag: document.getElementById('evtTag').value
    };

    if (anoDestino !== anoTrabalho) {
        alert("Você está salvando em um ano diferente do visualizado. A tela será recarregada.");
    }

    let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
    if (mesIdx === -1) {
        agendaData.push({ mes: mesNome, eventos: [] });
        mesIdx = agendaData.length - 1;
    }
    if (!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];

    if (modoEdicao) {
        if (agendaData[editandoIndexMes].mes !== mesNome) {
            agendaData[editandoIndexMes].eventos.splice(editandoIndexEvento, 1);
            agendaData[mesIdx].eventos.push(dadosEvento); 
        } else {
            agendaData[mesIdx].eventos[editandoIndexEvento] = dadosEvento;
        }
    } else {
        agendaData[mesIdx].eventos.push(dadosEvento);
    }

    agendaData[mesIdx].eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

    try {
        // --- MUDANÇA 3: Salvar Agenda usando pegarReferencia ---
        await pegarReferencia(`agenda/${anoDestino}`).set(agendaData);
        
        showToast("Evento salvo com sucesso!");
        fecharModais();

        if (anoDestino !== anoTrabalho) {
            document.getElementById('filtroAnoAdmin').value = anoDestino;
            carregarAgendaDoAno(anoDestino);
        }

    } catch (error) {
        console.error(error);
        showToast("Erro ao salvar.", "error");
    }
}

// ========================================
// 4. RENDERIZAÇÃO E UTILITÁRIOS
// ========================================

function renderizarListaAgenda() {
    const div = document.getElementById('listaPreview');
    div.innerHTML = '';
    let temEventos = false;

    agendaData.forEach((mes, mIdx) => {
        if (mes.eventos && mes.eventos.length > 0) {
            temEventos = true;

            const h = document.createElement('div');
            h.className = "month-header";
            h.innerHTML = mes.mes;
            div.appendChild(h);

            mes.eventos.forEach((ev, eIdx) => {
                const card = document.createElement('div');
                card.className = "event-card";

                let badgeHtml = '';
                if (ev.tag && ev.tag !== 'Nenhuma') {
                    const corAtual = tagsData[ev.tag] || '#e2e8f0'; 
                    badgeHtml = `<span class="tag-badge" style="background-color: ${corAtual}; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3); border: none;">${ev.tag}</span>`;
                }

                const descIcon = ev.descricao ? `<i class="fas fa-align-left" title="${ev.descricao}" style="margin-left:5px; color:#cbd5e1; font-size:0.8rem;"></i>` : '';

                card.innerHTML = `
                    <div>
                        <strong style="font-size:1.05rem;">Dia ${ev.dia} - ${ev.nome} ${descIcon}</strong>
                        <div style="margin-top:5px; display: flex; align-items: center;">
                            ${badgeHtml}
                            ${ev.horario ? `<span style="margin-left:8px; color:#64748b; font-size:0.9rem;"><i class="far fa-clock"></i> ${ev.horario}</span>` : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn-icon btn-edit" onclick="abrirModalEvento(${mIdx}, ${eIdx})" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn-icon btn-delete" onclick="removerEvento(${mIdx}, ${eIdx})" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                div.appendChild(card);
            });
        }
    });

    if (!temEventos) {
        div.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-style:italic;">Nenhum evento cadastrado para este ano.</div>`;
    }
}

function gerarGridDiasNoModal() {
    const grid = document.getElementById('dayGridModal');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        const btn = document.createElement('div');
        btn.className = 'day-btn';
        btn.innerText = i < 10 ? '0' + i : i;
        btn.onclick = () => btn.classList.toggle('selected');
        grid.appendChild(btn);
    }
}

function popularSelectAnos() {
    const ids = ['filtroAnoAdmin', 'evtAno', 'recAno']; 
    const anoAtual = new Date().getFullYear();
    let html = "";
    for (let i = -1; i < 5; i++) {
        const ano = anoAtual + i;
        html += `<option value="${ano}">${ano}</option>`;
    }
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = html; el.value = anoTrabalho; }
    });
}

function atualizarSelects() {
    const selectTags = ['evtTag', 'recTag']; 
    const htmlTags = '<option value="Nenhuma">Nenhuma</option>' +
        Object.keys(tagsData).map(t => `<option value="${t}">${t}</option>`).join('');

    selectTags.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = htmlTags; });
}

function removerEvento(m, e) {
    if (confirm("Deseja realmente excluir este evento?")) {
        agendaData[m].eventos.splice(e, 1);
        // --- MUDANÇA 4: Salvar exclusão usando pegarReferencia ---
        pegarReferencia(`agenda/${anoTrabalho}`).set(agendaData);
        showToast("Evento excluído.");
    }
}

function showToast(msg, tipo = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = tipo === "error" ? `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${msg}` : `<i class="fas fa-check-circle" style="color:#166534"></i> ${msg}`;
    if (tipo === "error") toast.style.borderLeftColor = "#ef4444";
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function abrirModalTags() { document.getElementById('modalTags').style.display = 'flex'; }
function abrirModalRecorrencia() {
    if (document.getElementById('recAno')) {
        document.getElementById('recAno').value = anoTrabalho;
    }
    document.getElementById('modalRecorrencia').style.display = 'flex';
}
function mudarAnoAdmin(novoAno) { carregarAgendaDoAno(novoAno); }

// ==================================================================
// 5. GERENCIAMENTO DE TAGS (SOCIEDADES)
// ==================================================================

async function criarTagNoModal() {
    const nomeInput = document.getElementById('newTagName');
    const corInput = document.getElementById('newTagColor');
    
    const novoNome = nomeInput.value.toUpperCase().trim();
    const novaCor = corInput.value;

    if (!novoNome) return showToast("Digite o nome da sociedade!", "error");

    // --- MUDANÇA 5: Referência para Tags ---
    const dbTagsRef = pegarReferencia('tags');

    if (tagEditandoOldName) {
        
        if (tagEditandoOldName !== novoNome) {
            await dbTagsRef.child(tagEditandoOldName).remove();
            await dbTagsRef.child(novoNome).set(novaCor);
            
            let alterouAgenda = false;
            agendaData.forEach(mes => {
                if(mes.eventos) {
                    mes.eventos.forEach(ev => {
                        if(ev.tag === tagEditandoOldName) {
                            ev.tag = novoNome;
                            alterouAgenda = true;
                        }
                    });
                }
            });

            if(alterouAgenda) {
                // --- MUDANÇA 6: Salvar Agenda após editar Tag ---
                await pegarReferencia(`agenda/${anoTrabalho}`).set(agendaData);
                renderizarListaAgenda();
            }

        } else {
            await dbTagsRef.child(novoNome).set(novaCor);
            renderizarListaAgenda();
        }

        showToast("Sociedade atualizada!");
    } 
    else {
        if (tagsData[novoNome]) {
            if(!confirm("Essa sociedade já existe. Deseja atualizar a cor dela?")) return;
        }
        await dbTagsRef.child(novoNome).set(novaCor);
        showToast("Sociedade criada!");
    }

    atualizarSelects();
    resetarFormularioTag();
}

function resetarFormularioTag() {
    document.getElementById('newTagName').value = "";
    document.getElementById('newTagColor').value = "#074528";
    atualizarPreviewCor("#074528");
    
    tagEditandoOldName = null;
    
    const btn = document.querySelector('#modalTags .btn-primary');
    btn.innerHTML = "Criar";
    btn.style.backgroundColor = ""; 
}

function atualizarPreviewCor(cor) {
    const box = document.getElementById('colorPreviewBox');
    if(box) box.style.backgroundColor = cor;
}

function renderizarTabelaTags() {
    const tb = document.getElementById('listaTagsEditaveis');
    if (!tb) return;
    
    tb.innerHTML = '';
    const tagsOrdenadas = Object.keys(tagsData || {}).sort();

    tagsOrdenadas.forEach(nomeTag => {
        const corTag = tagsData[nomeTag] || "#333"; 

        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td style="padding: 15px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                <div style="display: flex; align-items: center;">
                    <span style="
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        background-color: ${corTag};
                        border-radius: 50%;
                        margin-right: 15px;
                        border: 2px solid rgba(0,0,0,0.1);
                        flex-shrink: 0;
                    "></span>
                    <span style="font-size: 1rem; font-weight: 600; color: #333;">${nomeTag}</span>
                </div>
            </td>
            
            <td style="padding: 15px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle;">
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="prepararEdicaoTag('${nomeTag}', '${corTag}')" style="width: 42px; height: 42px; border-radius: 10px; border: none; background-color: #e0f2fe; color: #0284c7; cursor: pointer;" title="Editar"><i class="fas fa-pen"></i></button>
                    <button type="button" onclick="solicitarExclusaoTag('${nomeTag}')" style="width: 42px; height: 42px; border-radius: 10px; border: none; background-color: #fee2e2; color: #dc2626; cursor: pointer;" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        tb.appendChild(tr);
    });
}

function prepararEdicaoTag(nome, cor) {
    document.getElementById('newTagName').value = nome;
    document.getElementById('newTagColor').value = cor;
    
    const preview = document.getElementById('colorPreviewBox');
    if(preview) preview.style.backgroundColor = cor;
    
    tagEditandoOldName = nome;

    const btn = document.querySelector('#modalTags .btn-primary');
    if(btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar'; 
        btn.style.backgroundColor = "#0284c7"; 
    }
}

function removerTag(tag) { 
    // --- MUDANÇA 7: Excluir Tag ---
    pegarReferencia(`tags/${tag}`).remove(); 
}
function criarEstruturaVazia() { return ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map(m => ({ mes: m, eventos: [] })); }

function toggleRecMode() {
    const radios = document.getElementsByName('recType');
    let tipo = 'semanal';
    for (let r of radios) { if (r.checked) tipo = r.value; }
    document.getElementById('optSemanal').style.display = (tipo === 'semanal') ? 'block' : 'none';
    document.getElementById('optMensal').style.display = (tipo === 'mensal') ? 'block' : 'none';
}

document.getElementById('btnConfirmarExclusao').onclick = function() {
    if (tagParaExcluir) {
        // --- MUDANÇA 8: Exclusão com confirmação ---
        pegarReferencia(`tags/${tagParaExcluir}`).remove()
        .then(() => {
            showToast("Sociedade excluída com sucesso.");
            fecharModais(); 
            if (tagEditandoOldName === tagParaExcluir) {
                resetarFormularioTag();
            }
            tagParaExcluir = null;
        })
        .catch(erro => {
            showToast("Erro ao excluir: " + erro.message, "error");
        });
    }
};

async function gerarEventosRecorrentes(e) {
    if (e) e.preventDefault(); 

    const nome = document.getElementById('recNome').value;
    const horario = document.getElementById('recHorario').value;
    const tag = document.getElementById('recTag').value;

    const anoRec = document.getElementById('recAno').value;
    const mesInicioIdx = parseInt(document.getElementById('recMesInicio').value);
    const mesFimIdx = parseInt(document.getElementById('recMesFim').value);

    if (!nome || !anoRec) return showToast("Preencha o nome e o ano!", "error");
    if (mesInicioIdx > mesFimIdx) return showToast("O mês final deve ser depois do inicial.", "error");

    let dataAtual = new Date(anoRec, mesInicioIdx, 1, 12, 0, 0);
    const dataFinal = new Date(anoRec, mesFimIdx + 1, 0, 12, 0, 0);

    const radios = document.getElementsByName('recType');
    let tipoRec = 'semanal';
    for (let r of radios) { if (r.checked) tipoRec = r.value; }

    const diasSemanaSelecionados = [];
    if (tipoRec === 'semanal') {
        document.querySelectorAll('#optSemanal input[type="checkbox"]:checked').forEach(cb => {
            diasSemanaSelecionados.push(parseInt(cb.value));
        });
        if (diasSemanaSelecionados.length === 0) return showToast("Selecione os dias da semana!", "error");
    }

    let eventosAdicionados = 0;
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    while (dataAtual <= dataFinal) {

        let adicionar = false;

        if (tipoRec === 'semanal') {
            if (diasSemanaSelecionados.includes(dataAtual.getDay())) {
                adicionar = true;
            }
        }
        
        if (adicionar) {
            const anoLoop = dataAtual.getFullYear().toString();

            if (anoLoop === anoTrabalho) {
                const mesNome = nomesMeses[dataAtual.getMonth()];
                const diaFormatado = dataAtual.getDate().toString().padStart(2, '0');

                let mesObj = agendaData.find(m => m.mes === mesNome);

                if (!mesObj) {
                    agendaData.push({ mes: mesNome, eventos: [] });
                    mesObj = agendaData.find(m => m.mes === mesNome);
                }
                if (!mesObj.eventos) mesObj.eventos = [];

                mesObj.eventos.push({
                    dia: diaFormatado,
                    ano: anoLoop,
                    nome: nome,
                    horario: horario,
                    tag: tag,
                    descricao: "Recorrência gerada"
                });

                mesObj.eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));
                eventosAdicionados++;
            }
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    if (eventosAdicionados > 0) {
        try {
            // --- MUDANÇA 9: Salvar Recorrência ---
            await pegarReferencia(`agenda/${anoTrabalho}`).set(agendaData);
            showToast(`${eventosAdicionados} eventos criados com sucesso!`);
            fecharModais();
            renderizarListaAgenda();
        } catch (err) {
            console.error(err);
            showToast("Erro ao salvar no banco.", "error");
        }
    } else {
        showToast("Nenhum dia correspondente encontrado no período.", "warning");
    }
}

function solicitarExclusaoTag(tagName) {
    tagParaExcluir = tagName; 
    
    const modal = document.getElementById('modalExclusao');
    const texto = document.getElementById('textoExclusao');
    
    if (texto) {
        texto.innerHTML = `Tem certeza que deseja apagar a sociedade <strong style="color: #dc2626;">${tagName}</strong>?<br>Ela será removida de <strong>TODOS</strong> os eventos associados.`;
    }
    
    if (modal) modal.style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", () => {
    const btnConfirm = document.getElementById('btnConfirmarExclusao');
    if(btnConfirm) {
        const novoBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
        novoBtn.addEventListener('click', executarExclusaoReal);
    }
});

function executarExclusaoReal() {
    if (!tagParaExcluir) return;

    const nomeDaTag = tagParaExcluir; 

    // --- MUDANÇA 10: Exclusão com varredura ---
    pegarReferencia(`tags/${nomeDaTag}`).remove()
    .then(async () => {
        
        let houveMudanca = false;

        agendaData.forEach(mes => {
            if (mes.eventos && Array.isArray(mes.eventos)) {
                mes.eventos.forEach(ev => {
                    if (ev.tag === nomeDaTag) {
                        ev.tag = "Nenhuma"; 
                        houveMudanca = true; 
                    }
                });
            }
        });

        if (houveMudanca) {
            // Salvar alteração na agenda
            await pegarReferencia(`agenda/${anoTrabalho}`).set(agendaData);
            renderizarListaAgenda(); 
            showToast("Sociedade excluída e removida dos eventos!");
        } else {
            showToast("Sociedade excluída (nenhum evento afetado).");
            renderizarTabelaTags(); 
        }

        fecharModalExclusao();;
        
        if (typeof tagEditandoOldName !== 'undefined' && tagEditandoOldName === nomeDaTag) {
            resetarFormularioTag();
        }
        
        tagParaExcluir = null;
    })
    .catch(err => {
        console.error(err);
        showToast("Erro ao excluir: " + err.message, "error");
    });
}

function fecharModalTags() {
    document.getElementById('modalTags').style.display = 'none';
}

function fecharModalExclusao() {
    document.getElementById('modalExclusao').style.display = 'none';
}

function fecharModais() { 
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
}

// ==========================================
// FUNÇÃO DE NAVEGAÇÃO (VOLTAR PRO MENU COM ID)
// ==========================================
function voltarParaMenu() {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    
    if (org) {
        window.location.href = `menu_admin.html?org=${org}`;
    } else {
        // Se por acaso não tiver org, volta pro menu normal
        window.location.href = 'menu_admin.html';
    }
}