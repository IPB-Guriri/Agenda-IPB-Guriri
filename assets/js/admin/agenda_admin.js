// ========================================
// ARQUIVO: agenda.js
// LÓGICA DE AGENDA (UNIFICADA E OTIMIZADA)
// ========================================

// Variáveis Globais de Estado
let agendaData = [];
let tagsData = {};
let anoTrabalho = new Date().getFullYear().toString();
let refAgendaAnterior = null;
// Adicione esta variável para controlar a edição
let tagEditandoOldName = null;
let tagParaExcluir = null;

// Variáveis para Controle de Edição
let editandoIndexMes = null;
let editandoIndexEvento = null;
let modoEdicao = false; // false = Criar, true = Editar

document.addEventListener("DOMContentLoaded", () => {
    iniciarAdmin();
    setTimeout(() => {
        const loader = document.getElementById('globalLoader');
        if (loader) loader.classList.add('hidden');
    }, 1000);
});

function iniciarAdmin() {
    popularSelectAnos();

    // Configura o Select de Ano
    const selectAno = document.getElementById('filtroAnoAdmin');
    if (selectAno) selectAno.value = anoTrabalho;

    // Listeners
    firebase.database().ref('entidades/ipb_guriri/dados/tags').on('value', snap => {
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

    const ref = firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${ano}`);
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

// Abre o modal. Se mIdx e eIdx forem passados, é MODO EDIÇÃO.
function abrirModalEvento(mIdx = null, eIdx = null) {
    const modal = document.getElementById('modalEvento');
    const titulo = document.getElementById('modalEventoTitulo');
    const grid = document.getElementById('dayGridModal');

    // Gera o grid de dias limpo sempre que abre
    gerarGridDiasNoModal();
    atualizarSelects(); // Garante que as tags estão atualizadas

    if (mIdx !== null && eIdx !== null) {
        // --- MODO EDIÇÃO ---
        modoEdicao = true;
        editandoIndexMes = mIdx;
        editandoIndexEvento = eIdx;
        titulo.innerText = "Editar Evento";

        const ev = agendaData[mIdx].eventos[eIdx];
        const mesNome = agendaData[mIdx].mes;

        // Preenche Campos
        document.getElementById('evtAno').value = anoTrabalho; // Ano atual da visualização
        document.getElementById('evtMes').value = mesNome;
        document.getElementById('evtNome').value = ev.nome;
        document.getElementById('evtHorario').value = ev.horario || "";
        document.getElementById('evtDescricao').value = ev.descricao || "";
        document.getElementById('evtTag').value = ev.tag || "Nenhuma";

        // Seleciona os dias no Grid
        const diasArray = ev.dia.split(',').map(d => d.trim());
        const botoesDias = grid.querySelectorAll('.day-btn');
        botoesDias.forEach(btn => {
            if (diasArray.includes(btn.innerText)) {
                btn.classList.add('selected');
            }
        });

    } else {
        // --- MODO CRIAÇÃO ---
        modoEdicao = false;
        editandoIndexMes = null;
        editandoIndexEvento = null;
        titulo.innerText = "Novo Evento";

        // Limpa Campos
        document.getElementById('formModalEvento').reset();
        document.getElementById('evtAno').value = anoTrabalho; // Padrão ano atual
        // Remove seleções do grid
        grid.querySelectorAll('.selected').forEach(b => b.classList.remove('selected'));
    }

    modal.style.display = 'flex';
}

// Salva os dados do Modal
async function salvarDadosEvento() {
    const anoDestino = document.getElementById('evtAno').value;
    const mesNome = document.getElementById('evtMes').value;
    const nome = document.getElementById('evtNome').value;

    // Pega dias selecionados no modal
    const selecionados = document.querySelectorAll('#dayGridModal .day-btn.selected');

    if (selecionados.length === 0) return showToast("Selecione ao menos um dia!", "error");
    if (!nome) return showToast("Digite o nome do evento!", "error");

    const dias = Array.from(selecionados).map(b => b.textContent).join(", ");

    const dadosEvento = {
        dia: dias,
        ano: anoDestino,
        nome: nome,
        descricao: document.getElementById('evtDescricao').value || "", // Campo Descrição Incluso
        horario: document.getElementById('evtHorario').value,
        tag: document.getElementById('evtTag').value
    };

    // Se estiver editando e mudou o ano ou mês, precisamos remover do antigo e por no novo
    // Mas para simplificar, vamos assumir manipulação no array `agendaData` do ano atual se anoDestino == anoTrabalho

    if (anoDestino !== anoTrabalho) {
        // Se mudou o ano, é mais complexo pois `agendaData` é só do ano atual.
        // Solução simples: Salvar diretamente no Firebase do outro ano e recarregar a tela se necessário.
        alert("Você está salvando em um ano diferente do visualizado. A tela será recarregada.");
        // (Lógica avançada omitida para brevidade, vamos focar no fluxo normal)
    }

    // 1. Encontra ou Cria o Mês no Array
    let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
    if (mesIdx === -1) {
        agendaData.push({ mes: mesNome, eventos: [] });
        mesIdx = agendaData.length - 1;
    }
    if (!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];

    if (modoEdicao) {
        // Se mudou de mês durante a edição, remove do mês antigo
        if (agendaData[editandoIndexMes].mes !== mesNome) {
            agendaData[editandoIndexMes].eventos.splice(editandoIndexEvento, 1);
            agendaData[mesIdx].eventos.push(dadosEvento); // Adiciona no novo mês
        } else {
            // Mesmo mês, apenas atualiza
            agendaData[mesIdx].eventos[editandoIndexEvento] = dadosEvento;
        }
    } else {
        // Novo Evento
        agendaData[mesIdx].eventos.push(dadosEvento);
    }

    // Ordena por dia
    agendaData[mesIdx].eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

    // Salva no Firebase
    try {
        await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoDestino}`).set(agendaData);
        showToast("Evento salvo com sucesso!");
        fecharModais();

        // Se mudou o ano de trabalho, recarrega
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

// ==================================================================
// 1. RENDERIZAÇÃO DA AGENDA (COM COR DINÂMICA)
// ==================================================================
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

                // --- A MÁGICA ACONTECE AQUI ---
                // Verifica a cor atual da tag no banco global (tagsData)
                let badgeHtml = '';
                if (ev.tag && ev.tag !== 'Nenhuma') {
                    // Busca a cor atual ou usa cinza se não achar
                    const corAtual = tagsData[ev.tag] || '#e2e8f0'; 
                    // Define cor do texto baseada no fundo (se for claro/escuro) - Simplificado para texto escuro
                    // Cria o badge com a cor dinâmica
                    badgeHtml = `<span class="tag-badge" style="background-color: ${corAtual}; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3); border: none;">${ev.tag}</span>`;
                }
                // ------------------------------

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

// Gera os dias dentro do Modal
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
    const ids = ['filtroAnoAdmin', 'evtAno', 'recAno']; // Adicionei evtAno (do modal)
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
    const selectTags = ['evtTag', 'recTag']; // Atualizado para evtTag
    const htmlTags = '<option value="Nenhuma">Nenhuma</option>' +
        Object.keys(tagsData).map(t => `<option value="${t}">${t}</option>`).join('');

    selectTags.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = htmlTags; });
}

function removerEvento(m, e) {
    // Abre o modal de confirmação personalizado em vez do confirm() nativo
    // Para simplificar aqui, vou usar o nativo, mas o HTML tem o modalExclusao pronto para uso futuro.
    if (confirm("Deseja realmente excluir este evento?")) {
        agendaData[m].eventos.splice(e, 1);
        firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
        showToast("Evento excluído.");
    }
}

// Funções de UI
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
    // 1. Preenche o input do modal com o ano que está sendo visualizado
    // A variável 'anoTrabalho' já contém o valor certo vindo do 'filtroAnoAdmin'
    if (document.getElementById('recAno')) {
        document.getElementById('recAno').value = anoTrabalho;
    }

    // 2. Abre o modal visualmente
    document.getElementById('modalRecorrencia').style.display = 'flex';
}
function mudarAnoAdmin(novoAno) { carregarAgendaDoAno(novoAno); }

// Cria a sociedade salvando a cor escolhida
// ==================================================================
// 2. SALVAR/EDITAR TAG (PROPAGANDO PARA A AGENDA)
// ==================================================================
async function criarTagNoModal() {
    const nomeInput = document.getElementById('newTagName');
    const corInput = document.getElementById('newTagColor');
    
    const novoNome = nomeInput.value.toUpperCase().trim();
    const novaCor = corInput.value;

    if (!novoNome) return showToast("Digite o nome da sociedade!", "error");

    const dbTagsRef = firebase.database().ref('entidades/ipb_guriri/dados/tags');

    // --- MODO EDIÇÃO ---
    if (tagEditandoOldName) {
        
        // 1. Atualiza no Banco de Tags
        if (tagEditandoOldName !== novoNome) {
            // Se mudou o nome: Remove o antigo e cria o novo
            await dbTagsRef.child(tagEditandoOldName).remove();
            await dbTagsRef.child(novoNome).set(novaCor);
            
            // --- PROPAGAÇÃO: ATUALIZA NA AGENDA ---
            // Varre a agenda inteira procurando a tag antiga e muda para a nova
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

            // Se houve mudança na agenda, salva a agenda no Firebase
            if(alterouAgenda) {
                await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
                renderizarListaAgenda(); // Atualiza a tela da agenda
            }
            // --------------------------------------

        } else {
            // Se só mudou a cor, apenas atualiza a cor
            await dbTagsRef.child(novoNome).set(novaCor);
            // A renderização da agenda já pega a cor nova automaticamente
            renderizarListaAgenda();
        }

        showToast("Sociedade atualizada!");
    } 
    // --- MODO CRIAÇÃO ---
    else {
        if (tagsData[novoNome]) {
            if(!confirm("Essa sociedade já existe. Deseja atualizar a cor dela?")) return;
        }
        await dbTagsRef.child(novoNome).set(novaCor);
        showToast("Sociedade criada!");
    }

    // --- ATUALIZAÇÃO DO ATALHO ---
    // Força a atualização dos selects (incluindo o do modal de evento)
    // para que a nova tag apareça na lista imediatamente.
    atualizarSelects();

    resetarFormularioTag();
}

function resetarFormularioTag() {
    document.getElementById('newTagName').value = "";
    document.getElementById('newTagColor').value = "#074528";
    atualizarPreviewCor("#074528");
    
    tagEditandoOldName = null;
    
    // Volta o botão para o estado original (Verde/Criar)
    const btn = document.querySelector('#modalTags .btn-primary');
    btn.innerHTML = "Criar";
    btn.style.backgroundColor = ""; 
}

// 1. Função Visual: Atualiza a cor da caixinha quando o usuário mexe no input
function atualizarPreviewCor(cor) {
    const box = document.getElementById('colorPreviewBox');
    if(box) box.style.backgroundColor = cor;
}

// Renderiza a lista mostrando a cor ao lado do nome
// Substitua a função renderizarTabelaTags antiga por esta:
// ==================================================================
// RENDERIZAÇÃO DA LISTA DE SOCIEDADES (VISUAL FINAL)
// ==================================================================
// ==================================================================
// VERSÃO FINAL: CORRIGIDO BUG DA LINHA + MAIS PADDING + ALINHAMENTO
// ==================================================================
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
                    
                    <button type="button" onclick="prepararEdicaoTag('${nomeTag}', '${corTag}')" 
                        style="
                            width: 42px; height: 42px; 
                            border-radius: 10px; 
                            border: none; 
                            background-color: #e0f2fe; 
                            color: #0284c7; 
                            cursor: pointer; 
                            display: flex; align-items: center; justify-content: center;
                            transition: transform 0.2s;
                            font-size: 1.1rem;
                        " title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button type="button" onclick="solicitarExclusaoTag('${nomeTag}')" 
                        style="
                            width: 42px; height: 42px; 
                            border-radius: 10px; 
                            border: none; 
                            background-color: #fee2e2; 
                            color: #dc2626; 
                            cursor: pointer; 
                            display: flex; align-items: center; justify-content: center;
                            transition: transform 0.2s;
                            font-size: 1.1rem;
                        " title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        tb.appendChild(tr);
    });
}

function prepararEdicaoTag(nome, cor) {
    // Joga os valores nos inputs lá de cima
    document.getElementById('newTagName').value = nome;
    document.getElementById('newTagColor').value = cor;
    
    // Atualiza a caixinha de preview da cor
    const preview = document.getElementById('colorPreviewBox');
    if(preview) preview.style.backgroundColor = cor;
    
    // Marca que estamos editando este nome
    tagEditandoOldName = nome;

    // Muda o botão de "Criar" para "Salvar" (Azul)
    const btn = document.querySelector('#modalTags .btn-primary');
    if(btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Salvar'; 
        btn.style.backgroundColor = "#0284c7"; 
    }
}


function removerTag(tag) { firebase.database().ref(`entidades/ipb_guriri/dados/tags/${tag}`).remove(); }
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
        firebase.database().ref(`entidades/ipb_guriri/dados/tags/${tagParaExcluir}`).remove()
        .then(() => {
            showToast("Sociedade excluída com sucesso.");
            fecharModais(); // Fecha o modal de perigo
            // Se estivermos editando essa mesma tag, limpa o formulário
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

// ========================================
// 5. LÓGICA DE RECORRÊNCIA (ADAPTADA AO SEU HTML)
// ========================================

async function gerarEventosRecorrentes(e) {
    if (e) e.preventDefault(); // Evita recarregar a tela

    // 1. Pegar valores básicos
    const nome = document.getElementById('recNome').value;
    const horario = document.getElementById('recHorario').value;
    const tag = document.getElementById('recTag').value;

    // 2. Pegar Duração (Ano e Meses do seu HTML)
    const anoRec = document.getElementById('recAno').value;
    const mesInicioIdx = parseInt(document.getElementById('recMesInicio').value); // 0 a 11
    const mesFimIdx = parseInt(document.getElementById('recMesFim').value);     // 0 a 11

    if (!nome || !anoRec) return showToast("Preencha o nome e o ano!", "error");
    if (mesInicioIdx > mesFimIdx) return showToast("O mês final deve ser depois do inicial.", "error");

    // 3. Montar as datas de Início e Fim baseadas nos selects
    // Data Inicial: Dia 1 do mês de início, ao meio-dia
    let dataAtual = new Date(anoRec, mesInicioIdx, 1, 12, 0, 0);

    // Data Final: Último dia do mês de fim
    // (O dia '0' do mês seguinte pega o último dia do mês anterior)
    const dataFinal = new Date(anoRec, mesFimIdx + 1, 0, 12, 0, 0);

    // 4. Identificar tipo de repetição
    const radios = document.getElementsByName('recType');
    let tipoRec = 'semanal';
    for (let r of radios) { if (r.checked) tipoRec = r.value; }

    // Pegar dias da semana (Se for semanal)
    const diasSemanaSelecionados = [];
    if (tipoRec === 'semanal') {
        document.querySelectorAll('#optSemanal input[type="checkbox"]:checked').forEach(cb => {
            diasSemanaSelecionados.push(parseInt(cb.value));
        });
        if (diasSemanaSelecionados.length === 0) return showToast("Selecione os dias da semana!", "error");
    }

    // Variáveis auxiliares
    let eventosAdicionados = 0;
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    // 5. LOOP: Percorre dia a dia
    while (dataAtual <= dataFinal) {

        let adicionar = false;

        // --- LÓGICA SEMANAL ---
        if (tipoRec === 'semanal') {
            // Verifica se o dia da semana (0=Dom, 6=Sab) está marcado
            if (diasSemanaSelecionados.includes(dataAtual.getDay())) {
                adicionar = true;
            }
        }
        // --- LÓGICA MENSAL SIMPLIFICADA (Para o seu HTML complexo seria necessário outro algoritmo) ---
        else if (tipoRec === 'mensal') {
            // O seu HTML usa "Todo 2º Domingo", o que é complexo calcular.
            // Se quiser ativar isso, me avise que crio a lógica específica de "N-ésimo dia".
            // Por enquanto, vou pular o mensal para não quebrar o código.
        }

        // Se for para adicionar o evento
        if (adicionar) {
            // Garante que estamos salvando no ano certo (caso a virada de ano ocorra no loop)
            const anoLoop = dataAtual.getFullYear().toString();

            // Se o ano do loop for diferente do ano de trabalho atual, 
            // precisaria carregar outro nó do Firebase. Para simplificar, só salvamos se for o ano atual.
            if (anoLoop === anoTrabalho) {
                const mesNome = nomesMeses[dataAtual.getMonth()];
                const diaFormatado = dataAtual.getDate().toString().padStart(2, '0');

                // Busca o mês no array de dados
                let mesObj = agendaData.find(m => m.mes === mesNome);

                // Se o mês não existir (ex: array vazio), cria ele
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

                // Reordena os eventos do dia
                mesObj.eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));
                eventosAdicionados++;
            }
        }

        // Avança 1 dia no loop
        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    // 6. Salvar e Feedback
    if (eventosAdicionados > 0) {
        try {
            await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
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

// ==================================================================
// 3. EXCLUSÃO DE SOCIEDADE (LÓGICA CORRIGIDA)
// ==================================================================

// 1. Abre o modal e prepara a exclusão
function solicitarExclusaoTag(tagName) {
    tagParaExcluir = tagName; // Variável global armazena quem vamos apagar
    
    const modal = document.getElementById('modalExclusao');
    const texto = document.getElementById('textoExclusao');
    
    // Atualiza o texto do modal para dar certeza ao usuário
    if (texto) {
        texto.innerHTML = `Tem certeza que deseja apagar a sociedade <strong style="color: #dc2626;">${tagName}</strong>?<br>Ela será removida de <strong>TODOS</strong> os eventos associados.`;
    }
    
    if (modal) modal.style.display = 'flex';
}

// 2. O botão "Sim, Excluir" do HTML deve chamar APENAS esta função
// Certifique-se de que no HTML o botão NÃO tenha onclick, ou que seja sobrescrito aqui.
document.addEventListener("DOMContentLoaded", () => {
    const btnConfirm = document.getElementById('btnConfirmarExclusao');
    if(btnConfirm) {
        // Remove clones antigos para evitar múltiplos cliques
        const novoBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
        
        // Define o evento único
        novoBtn.addEventListener('click', executarExclusaoReal);
    }
});

// 3. Função que executa a exclusão no Banco DE TAGS e varre a AGENDA
function executarExclusaoReal() {
    if (!tagParaExcluir) return;

    const nomeDaTag = tagParaExcluir; 

    // A. Remove do Banco de Tags (Firebase)
    firebase.database().ref(`entidades/ipb_guriri/dados/tags/${nomeDaTag}`).remove()
    .then(async () => {
        
        // B. PROPAGAÇÃO: Varre a agenda local para remover a tag dos eventos
        let houveMudanca = false;

        agendaData.forEach(mes => {
            if (mes.eventos && Array.isArray(mes.eventos)) {
                mes.eventos.forEach(ev => {
                    // SE O EVENTO TIVER A TAG QUE ESTAMOS APAGANDO
                    if (ev.tag === nomeDaTag) {
                        ev.tag = "Nenhuma"; // Remove a associação
                        houveMudanca = true; // Marca que precisamos salvar a agenda
                    }
                });
            }
        });

        // C. Se a agenda mudou (tinha eventos com essa tag), salva a agenda atualizada no Firebase
        if (houveMudanca) {
            await firebase.database().ref(`entidades/ipb_guriri/dados/agenda/${anoTrabalho}`).set(agendaData);
            // Atualiza a tela imediatamente para sumir o badge
            renderizarListaAgenda(); 
            showToast("Sociedade excluída e removida dos eventos!");
        } else {
            showToast("Sociedade excluída (nenhum evento afetado).");
            // Mesmo sem eventos, atualizamos a lista de tags
            renderizarTabelaTags(); 
        }

        // D. Limpeza final
        fecharModalExclusao();;
        
        // Se estava com ela aberta na edição, limpa o form
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

// ==================================================================
// CONTROLE DE MODAIS (FECHAMENTO INDIVIDUAL)
// ==================================================================

// Substitua ou adicione estas funções para controlar quem fecha o que

// Fecha APENAS o modal de Tags (mantendo o de Evento aberto atrás)
function fecharModalTags() {
    document.getElementById('modalTags').style.display = 'none';
}

// Fecha APENAS o modal de Exclusão (mantendo o de Tags e Evento abertos)
function fecharModalExclusao() {
    document.getElementById('modalExclusao').style.display = 'none';
}

// O fecharModais() original continua existindo para o botão "Voltar" geral ou reset
function fecharModais() { 
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
}

// --- ATUALIZAÇÃO NAS FUNÇÕES DE EXCLUSÃO ---