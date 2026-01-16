// ========================================
// ARQUIVO: assets/js/admin/igreja_admin.js
// OBJETIVO: Gestão de Membros e EBD (SaaS Multi-igreja)
// ========================================

// === VARIÁVEIS GLOBAIS ===
let cacheSociedades = {}; 
let cacheSalas = {};      
let cacheCargos = []; 
let membrosLocais = [];
let cargosTemporarios = []; 
let idMembroEdicao = null;

// Controles de Edição/Exclusão
let editandoTipo = null;
let editandoIdOriginal = null;
let itemParaExcluir = null;
let tipoParaExcluir = null;

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    carregarConfiguracoesTema();
    carregarDadosAuxiliares();
    listarMembros();
    setupAutocompleteCargos();
});

function carregarConfiguracoesTema() {
    const loader = document.getElementById('globalLoader');
    
    // --- MUDANÇA 1: Tema dinâmico ---
    pegarReferencia('configuracoes/temaColor').on('value', (snapshot) => {
        const cor = snapshot.val();
        if (cor) {
            document.documentElement.style.setProperty('--adm-primary', cor);
            document.documentElement.style.setProperty('--adm-btn', cor);
        }
        if(loader) setTimeout(() => loader.classList.add('hidden'), 500);
    });
}

function carregarDadosAuxiliares() {
    // 1. SOCIEDADES (Antigas Tags)
    // --- MUDANÇA 2: pegarReferencia ---
    pegarReferencia('sociedades').on('value', snap => {
        cacheSociedades = snap.val() || {};
        atualizarSelectSociedades();
        renderizarListaGerenciar('sociedade');
        if(membrosLocais.length) renderizarTabelaMembros(membrosLocais);
    });

    // 2. SALAS
    pegarReferencia('salas').on('value', snap => {
        cacheSalas = snap.val() || {};
        atualizarSelectSalas();
        renderizarListaGerenciar('sala');
        if(membrosLocais.length) renderizarTabelaMembros(membrosLocais);
    });

    // 3. CARGOS
    pegarReferencia('cargos').on('value', snap => {
        cacheCargos = [];
        if(snap.exists()) {
            snap.forEach(child => {
                const val = child.val();
                if(val && val.nome) {
                    cacheCargos.push({ key: child.key, nome: val.nome });
                }
            });
        }
        cacheCargos.sort((a, b) => a.nome.localeCompare(b.nome));
        renderizarListaGerenciar('cargo');
    });
}

// === LISTAGEM E FILTRO DE MEMBROS ===
function listarMembros() {
    // --- MUDANÇA 3: Listagem de Membros ---
    pegarReferencia('membros').on('value', snap => {
        membrosLocais = [];
        if (snap.exists()) {
            snap.forEach(child => {
                const val = child.val();
                if (val && typeof val === 'object') {
                    membrosLocais.push({ id: child.key, ...val });
                }
            });
        }
        
        // Ordenação por nome
        membrosLocais.sort((a, b) => {
            const nomeA = (a.nome || '').toLowerCase();
            const nomeB = (b.nome || '').toLowerCase();
            return nomeA.localeCompare(nomeB);
        });

        // Mantém filtro ativo se houver busca
        const termoBusca = document.getElementById('buscaMembro').value;
        if (termoBusca.trim() !== "") {
            filtrarMembros();
        } else {
            renderizarTabelaMembros(membrosLocais);
        }
    });
}

function filtrarMembros() {
    const input = document.getElementById('buscaMembro');
    if (!input) return;
    const v = input.value.toLowerCase();
    
    const listaFiltrada = membrosLocais.filter(m => {
        const nomeMembro = (m.nome || '').toLowerCase();
        return nomeMembro.includes(v);
    });
    renderizarTabelaMembros(listaFiltrada);
}

function renderizarTabelaMembros(lista) {
    const tbody = document.getElementById('listaMembros');
    const empty = document.getElementById('emptyState');
    tbody.innerHTML = "";

    if (lista.length === 0) {
        if(empty) empty.style.display = 'block';
        return;
    }
    if(empty) empty.style.display = 'none';

    lista.forEach(m => {
        const idSociedade = m.sociedadeId;
        const corSociedade = cacheSociedades[idSociedade] || '#64748b'; 

        let badgeHtml = '-';
        if (idSociedade && idSociedade !== 'Nenhuma') {
            badgeHtml = `<span class="badge-sociedade" style="background-color: ${corSociedade}; color: white;">${idSociedade}</span>`;
        }

        const salaNome = cacheSalas[m.salaId] ? cacheSalas[m.salaId].nome : '-';
        const cargosStr = (m.cargos && m.cargos.length) ? m.cargos.join(', ') : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.nome}</strong></td>
            <td>${badgeHtml}</td>
            <td style="color:#666;">${salaNome}</td>
            <td class="tag-list-mini">${cargosStr}</td>
            <td style="text-align: right;">
                <div class="acoes-direita">
                    <button class="btn-icon btn-edit" onclick="abrirModalMembro('${m.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon btn-delete" onclick="prepararExclusao('membro', '${m.id}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// === GERENCIADORES (SALVAR DADOS NO NOVO CAMINHO) ===

// 1. SOCIEDADES
function abrirModalGerenciarSociedades() {
    resetarFormGerenciador('sociedade');
    renderizarListaGerenciar('sociedade');
    document.getElementById('modalGerenciarSociedades').style.display = 'flex';
}
function salvarTagSociedade() {
    const nome = document.getElementById('tagSocNome').value.toUpperCase().trim();
    const cor = document.getElementById('tagSocCor').value;
    if(!nome) return mostrarToast("Nome obrigatório", "error");

    // --- MUDANÇA 4: Salvar Sociedade ---
    const db = pegarReferencia('sociedades');

    if(editandoTipo === 'sociedade' && editandoIdOriginal) {
        if(editandoIdOriginal !== nome) {
            db.child(editandoIdOriginal).remove();
            atualizarVinculoMembros('sociedadeId', editandoIdOriginal, nome);
        }
        db.child(nome).set(cor).then(() => {
            mostrarToast("Sociedade Salva!");
            resetarFormGerenciador('sociedade');
        });
    } else {
        if(cacheSociedades[nome]) return mostrarToast("Já existe!", "error");
        db.child(nome).set(cor).then(() => {
            mostrarToast("Sociedade Criada!");
            resetarFormGerenciador('sociedade');
        });
    }
}

// 2. SALAS
function abrirModalGerenciarSalas() {
    resetarFormGerenciador('sala');
    renderizarListaGerenciar('sala');
    document.getElementById('modalGerenciarSalas').style.display = 'flex';
}
function salvarTagSala() {
    const nome = document.getElementById('tagSalaNome').value.trim();
    if(!nome) return mostrarToast("Nome obrigatório", "error");

    // --- MUDANÇA 5: Salvar Sala ---
    const db = pegarReferencia('salas');

    if(editandoTipo === 'sala' && editandoIdOriginal) {
        db.child(editandoIdOriginal).update({ nome: nome }).then(() => {
            mostrarToast("Sala Atualizada!");
            resetarFormGerenciador('sala');
        });
    } else {
        db.push({ nome: nome }).then(() => {
            mostrarToast("Sala Criada!");
            resetarFormGerenciador('sala');
        });
    }
}

// 3. CARGOS
function abrirModalGerenciarCargos() {
    resetarFormGerenciador('cargo');
    renderizarListaGerenciar('cargo');
    document.getElementById('modalGerenciarCargos').style.display = 'flex';
}
function salvarTagCargo() {
    const nome = document.getElementById('tagCargoNome').value.trim();
    if(!nome) return mostrarToast("Nome obrigatório", "error");

    // --- MUDANÇA 6: Salvar Cargo ---
    const db = pegarReferencia('cargos');

    if(editandoTipo === 'cargo' && editandoIdOriginal) {
        const cargoAntigo = cacheCargos.find(c => c.key === editandoIdOriginal);
        if(cargoAntigo) atualizarVinculoMembros('cargoNome', cargoAntigo.nome, nome);
        
        db.child(editandoIdOriginal).update({ nome: nome }).then(() => {
            mostrarToast("Cargo Atualizado!");
            resetarFormGerenciador('cargo');
        });
    } else {
        db.push({ nome: nome }).then(() => {
            mostrarToast("Cargo Criado!");
            resetarFormGerenciador('cargo');
        });
    }
}

// === AUTOCOMPLETE CARGOS ===
function setupAutocompleteCargos() {
    const input = document.getElementById('inputBuscaCargo');
    const lista = document.getElementById('listaSugestoesCargos');

    input.addEventListener('input', function() {
        const valor = this.value.toLowerCase().trim();
        lista.innerHTML = '';
        if (!valor) { lista.style.display = 'none'; return; }

        const filtrados = cacheCargos.filter(c => c.nome.toLowerCase().includes(valor));

        if (filtrados.length > 0) {
            filtrados.forEach(cargo => {
                if(cargosTemporarios.includes(cargo.nome)) return; 
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.textContent = cargo.nome;
                div.onclick = () => {
                    adicionarCargoDireto(cargo.nome);
                    input.value = '';
                    lista.style.display = 'none';
                    input.focus();
                };
                lista.appendChild(div);
            });
            lista.style.display = (lista.children.length > 0) ? 'block' : 'none';
        } else {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `<em>Criar "${this.value}"...</em>`;
            div.onclick = () => {
                salvarNovoCargoRapido(this.value);
                input.value = '';
                lista.style.display = 'none';
            };
            lista.appendChild(div);
            lista.style.display = 'block';
        }
    });
    document.addEventListener('click', e => {
        if(e.target !== input && e.target !== lista) lista.style.display = 'none';
    });
}
function adicionarCargoDireto(nome) {
    if(!cargosTemporarios.includes(nome)) {
        cargosTemporarios.push(nome);
        renderizarTagsCargos();
    }
}
function salvarNovoCargoRapido(nomeOriginal) {
    const nome = nomeOriginal.trim();
    // --- MUDANÇA 7: Novo Cargo Rápido ---
    pegarReferencia('cargos').push({ nome: nome }).then(() => {
        adicionarCargoDireto(nome);
        mostrarToast("Cargo criado e adicionado!");
    });
}

// === EXCLUSÃO GENÉRICA ===
function prepararExclusao(tipo, id) {
    tipoParaExcluir = tipo;
    itemParaExcluir = id;
    
    const h3 = document.getElementById('tituloExclusao');
    const p = document.getElementById('textoExclusao');

    if(tipo === 'membro') {
        h3.innerText = "Excluir Membro?";
        p.innerText = "Essa ação é irreversível.";
    } else {
        h3.innerText = "Excluir Item?";
        p.innerHTML = "O item será removido.<br>Membros que o utilizam ficarão sem essa informação.";
    }
    document.getElementById('modalExclusao').style.display = 'flex';
}

document.getElementById('btnConfirmarExclusao').onclick = function() {
    if(!itemParaExcluir || !tipoParaExcluir) return;

    let promise = null;

    // --- MUDANÇA 8: Exclusões dinâmicas ---
    if(tipoParaExcluir === 'membro') {
        promise = pegarReferencia(`membros/${itemParaExcluir}`).remove();
    } 
    else if(tipoParaExcluir === 'sociedade') {
        promise = pegarReferencia(`sociedades/${itemParaExcluir}`).remove()
            .then(() => atualizarVinculoMembros('sociedadeId', itemParaExcluir, null));
    }
    else if(tipoParaExcluir === 'sala') {
        promise = pegarReferencia(`salas/${itemParaExcluir}`).remove()
            .then(() => atualizarVinculoMembros('salaId', itemParaExcluir, null));
    }
    else if(tipoParaExcluir === 'cargo') {
        const cargoObj = cacheCargos.find(c => c.key === itemParaExcluir);
        promise = pegarReferencia(`cargos/${itemParaExcluir}`).remove().then(() => {
            if(cargoObj) atualizarVinculoMembros('cargoNome', cargoObj.nome, null);
        });
    }

    if(promise) {
        promise.then(() => {
            mostrarToast("Excluído com sucesso!");
            fecharModalExclusao();
            if(editandoIdOriginal === itemParaExcluir) resetarFormGerenciador(tipoParaExcluir);
            itemParaExcluir = null;
            tipoParaExcluir = null;
        }).catch(err => mostrarToast("Erro: " + err.message, "error"));
    }
};

// === FUNÇÕES DE APOIO (SALVAR MEMBRO, MODAIS, ETC) ===
function renderizarListaGerenciar(tipo) {
    let tbodyId = '', lista = [];
    if(tipo === 'sociedade') {
        tbodyId = 'listaSociedadesGerenciar';
        lista = Object.keys(cacheSociedades).sort().map(k => ({ id: k, nome: k, cor: cacheSociedades[k] }));
    } else if(tipo === 'sala') {
        tbodyId = 'listaSalasGerenciar';
        lista = Object.entries(cacheSalas).map(([k,v]) => ({ id: k, nome: v.nome }));
    } else if(tipo === 'cargo') {
        tbodyId = 'listaCargosGerenciar';
        lista = cacheCargos.map(c => ({ id: c.key, nome: c.nome }));
    }

    const tbody = document.getElementById(tbodyId);
    if(!tbody) return;
    tbody.innerHTML = '';

    lista.forEach(item => {
        let visual = (tipo === 'sociedade') 
            ? `<span style="display:inline-block;width:15px;height:15px;background:${item.cor};border-radius:50%;margin-right:10px;border:1px solid #ddd;"></span>`
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div style="display:flex;align-items:center;">${visual}<span style="font-weight:600;color:#333;">${item.nome}</span></div></td>
            <td style="text-align:right;">
                <div class="acoes-direita">
                    <button class="btn-quadrado btn-azul" onclick="prepararEdicao('${tipo}', '${item.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-quadrado btn-vermelho" onclick="prepararExclusao('${tipo}', '${item.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function prepararEdicao(tipo, id) {
    editandoTipo = tipo;
    editandoIdOriginal = id;
    if(tipo === 'sociedade') {
        document.getElementById('tagSocNome').value = id;
        document.getElementById('tagSocCor').value = cacheSociedades[id];
        document.getElementById('previewSoc').style.backgroundColor = cacheSociedades[id];
        document.getElementById('btnSalvarSociedade').innerText = "Salvar";
    } 
    else if(tipo === 'sala') {
        document.getElementById('tagSalaNome').value = cacheSalas[id].nome;
        document.getElementById('btnSalvarSala').innerText = "Salvar";
    }
    else if(tipo === 'cargo') {
        const c = cacheCargos.find(x => x.key === id);
        document.getElementById('tagCargoNome').value = c ? c.nome : '';
        document.getElementById('btnSalvarCargo').innerText = "Salvar";
    }
}

function resetarFormGerenciador(tipo) {
    editandoTipo = null;
    editandoIdOriginal = null;
    if(tipo === 'sociedade') {
        document.getElementById('tagSocNome').value = '';
        document.getElementById('btnSalvarSociedade').innerText = "Criar";
    } else if(tipo === 'sala') {
        document.getElementById('tagSalaNome').value = '';
        document.getElementById('btnSalvarSala').innerText = "Criar";
    } else if(tipo === 'cargo') {
        document.getElementById('tagCargoNome').value = '';
        document.getElementById('btnSalvarCargo').innerText = "Criar";
    }
}

function atualizarSelectSociedades() {
    const s = document.getElementById('selectSociedade');
    const old = s.value;
    s.innerHTML = '<option value="Nenhuma">Nenhuma</option>';
    Object.keys(cacheSociedades).sort().forEach(k => { s.innerHTML += `<option value="${k}">${k}</option>`; });
    if(old && old !== 'Nenhuma') s.value = old;
}
function atualizarSelectSalas() {
    const s = document.getElementById('selectSala');
    const old = s.value;
    s.innerHTML = '<option value="Nenhuma">Nenhuma</option>';
    Object.entries(cacheSalas).forEach(([k,v]) => { s.innerHTML += `<option value="${k}">${v.nome}</option>`; });
    if(old && old !== 'Nenhuma') s.value = old;
}
function atualizarPreviewCor(c, id) { document.getElementById(id).style.backgroundColor = c; }

function atualizarVinculoMembros(campo, velho, novo) {
    membrosLocais.forEach(m => {
        let mudou = false;
        if(campo === 'cargoNome') {
            if(m.cargos && m.cargos.includes(velho)) {
                m.cargos = m.cargos.filter(x => x !== velho);
                if(novo) m.cargos.push(novo);
                mudou = true;
            }
        } else {
            if(m[campo] === velho) {
                m[campo] = novo || 'Nenhuma';
                mudou = true;
            }
        }
        if(mudou) pegarReferencia(`membros/${m.id}`).update(m);
    });
}

function abrirModalMembro(id=null) {
    const m = document.getElementById('modalMembro');
    document.getElementById('formMembro').reset();
    cargosTemporarios = [];
    renderizarTagsCargos();
    idMembroEdicao = null;
    document.getElementById('inputBuscaCargo').value = '';
    document.getElementById('listaSugestoesCargos').style.display='none';

    if(id) {
        idMembroEdicao = id;
        document.getElementById('tituloModalMembro').innerText = "Editar Membro";
        const mem = membrosLocais.find(x => x.id === id);
        if(mem) {
            document.getElementById('memNome').value = mem.nome;
            document.getElementById('selectSociedade').value = mem.sociedadeId || 'Nenhuma';
            document.getElementById('selectSala').value = mem.salaId || 'Nenhuma';
            if(mem.cargos) { cargosTemporarios = [...mem.cargos]; renderizarTagsCargos(); }
        }
    } else {
        document.getElementById('tituloModalMembro').innerText = "Novo Membro";
    }
    m.style.display = 'flex';
}

function salvarMembro() {
    const nome = document.getElementById('memNome').value;
    if(!nome.trim()) return mostrarToast("Nome obrigatório", "error");
    const d = {
        nome: nome,
        sociedadeId: document.getElementById('selectSociedade').value,
        salaId: document.getElementById('selectSala').value,
        cargos: cargosTemporarios,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    // --- MUDANÇA 9: Salvar Membro ---
    if(idMembroEdicao) pegarReferencia(`membros/${idMembroEdicao}`).update(d).then(() => { mostrarToast("Salvo!"); fecharModalMembro(); });
    else pegarReferencia('membros').push(d).then(() => { mostrarToast("Criado!"); fecharModalMembro(); });
}

function fecharModalMembro() { document.getElementById('modalMembro').style.display='none'; }
function fecharModaisGerenciamento() {
    document.getElementById('modalGerenciarSociedades').style.display='none';
    document.getElementById('modalGerenciarSalas').style.display='none';
    document.getElementById('modalGerenciarCargos').style.display='none';
}
function fecharModalExclusao() { document.getElementById('modalExclusao').style.display='none'; }
function removerCargoTemp(i) { cargosTemporarios.splice(i,1); renderizarTagsCargos(); }
function renderizarTagsCargos() {
    const c = document.getElementById('containerCargos'); c.innerHTML='';
    cargosTemporarios.forEach((t,i) => c.innerHTML += `<div class="tag-chip"><span>${t}</span><span class="close-tag" onclick="removerCargoTemp(${i})">&times;</span></div>`);
}
function mostrarToast(m,t='success') {
    const d = document.createElement('div'); d.className = `toast ${t}`;
    d.innerHTML = `${t==='success'?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-exclamation-circle"></i>'} ${m}`;
    document.getElementById('toast-container').appendChild(d);
    setTimeout(() => d.remove(), 3000);
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