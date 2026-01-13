// --- CONFIGURAÇÃO ---
const db = firebase.database();
let entidadesCache = {};
let editandoID = null;

// ESTRUTURA COMPLETA DE UMA NOVA ENTIDADE (O SEU PEDIDO)
const MODELO_BANCO = {
    info: {
        nome_exibicao: "",  // Super Admin lê daqui
        cidade: "",
        criadoEm: "",
        status: "ativo"
    },
    dados: {
        configuracoes: {
            entidade: "",   // App do Cliente lê daqui
            temaColor: "#074528",
            ano: new Date().getFullYear()
        },
        membros: {},        // Lista vazia
        financeiro: {},
        // DADOS PADRÃO PARA NÃO BUGAR O ADMIN DO CLIENTE:
        sociedades: { 
            "UMP": "#074528", 
            "SAF": "#be185d", 
            "UPH": "#1e3a8a", 
            "UCP": "#eab308" 
        },
        cargos: { 
            "cargo_01": { nome: "Presbítero" }, 
            "cargo_02": { nome: "Diácono" },
            "cargo_03": { nome: "Professor EBD" } 
        },
        salas: { 
            "sala_01": { nome: "Templo Principal" },
            "sala_02": { nome: "Salão Social" }
        },
        agenda: {}
    },
    usuarios: {
        "admin": "123456" // Senha padrão
    }
};

// --- AUTO-EXECUÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    // Slug Automático
    document.getElementById('inpNome').addEventListener('input', function() {
        if(!editandoID) document.getElementById('inpSlug').value = gerarSlug(this.value);
    });
});

// --- AUTENTICAÇÃO ---
function tentarLogin() {
    const senha = document.getElementById('senhaMestre').value;
    if(senha === "admin123") {
        document.getElementById('loginOverlay').style.display = 'none';
        iniciarApp();
    } else {
        alert("Senha incorreta. Tente 'admin123'.");
    }
}

// --- CORE: LEITURA DE DADOS ---
function iniciarApp() {
    const grid = document.getElementById('gridCards');
    
    db.ref('entidades').on('value', (snap) => {
        grid.innerHTML = '';
        entidadesCache = snap.val() || {};

        if(Object.keys(entidadesCache).length === 0) {
            grid.innerHTML = '<div class="empty-placeholder"><i class="fas fa-folder-open"></i><p>Nenhuma entidade cadastrada.</p></div>';
            return;
        }

        Object.keys(entidadesCache).forEach(key => {
            const ent = entidadesCache[key];
            
            // LÓGICA HÍBRIDA: Lê de info (novo) OU dados (velho)
            const nome = ent.info?.nome_exibicao || ent.dados?.configuracoes?.entidade || "Nome Indefinido";
            const cidade = ent.info?.cidade || "Local não informado";
            const cor = ent.dados?.configuracoes?.temaColor || "#074528";
            const data = ent.info?.criadoEm ? new Date(ent.info.criadoEm).toLocaleDateString() : "--/--/----";

            const card = document.createElement('div');
            card.className = 'card';
            card.style.borderTop = `4px solid ${cor}`;
            
            card.innerHTML = `
                <div class="card-top">
                    <h4>${nome}</h4>
                    <div class="icon-badge" style="background:${cor}20; color:${cor}">
                        <i class="fas fa-church"></i>
                    </div>
                </div>
                
                <div class="card-info"><i class="fas fa-map-marker-alt"></i> ${cidade}</div>
                <div class="card-info"><i class="fas fa-calendar-check"></i> Criado em: ${data}</div>
                
                <span class="slug-tag">ID: ${key}</span>
                
                <div class="card-actions">
                    <button class="btn-mini" onclick="editar('${key}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="btn-mini" onclick="copiarLink('${key}')" title="Copiar Link"><i class="fas fa-link"></i></button>
                    <button class="btn-mini del" onclick="deletar('${key}')" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

// --- CORE: ESCRITA DE DADOS ---
function salvarEntidade() {
    const btn = document.getElementById('btnSalvar');
    btn.disabled = true;
    btn.innerText = "Processando...";

    const nome = document.getElementById('inpNome').value;
    const slug = document.getElementById('inpSlug').value;
    const cidade = document.getElementById('inpCidade').value;
    const cor = document.getElementById('inpCor').value;
    const senha = document.getElementById('inpSenha').value;

    if(!slug) { alert("O ID é obrigatório"); btn.disabled = false; return; }

    if(editandoID) {
        // MODO EDIÇÃO: Atualiza campos específicos sem apagar o resto
        const updates = {};
        updates[`entidades/${editandoID}/info/nome_exibicao`] = nome;
        updates[`entidades/${editandoID}/info/cidade`] = cidade;
        updates[`entidades/${editandoID}/dados/configuracoes/entidade`] = nome;
        updates[`entidades/${editandoID}/dados/configuracoes/temaColor`] = cor;
        if(senha) updates[`entidades/${editandoID}/usuarios/admin`] = senha;

        db.ref().update(updates).then(() => {
            alert("Dados atualizados!");
            fecharModal();
        });

    } else {
        // MODO CRIAÇÃO: Gera banco novo completo
        if(entidadesCache[slug]) {
            alert("Este ID já existe! Escolha outro.");
            btn.disabled = false; btn.innerText = "Salvar Dados";
            return;
        }

        const novo = JSON.parse(JSON.stringify(MODELO_BANCO)); // Clone limpo
        
        // Preenche info
        novo.info.nome_exibicao = nome;
        novo.info.cidade = cidade;
        novo.info.criadoEm = new Date().toISOString();
        
        // Preenche configs
        novo.dados.configuracoes.entidade = nome;
        novo.dados.configuracoes.temaColor = cor;
        
        // Preenche usuario
        novo.usuarios.admin = senha || "123456";

        db.ref('entidades/' + slug).set(novo).then(() => {
            alert("Igreja criada com sucesso! Banco de dados gerado.");
            fecharModal();
        });
    }
}

// --- HELPERS E MODAL ---
function abrirModal() {
    editandoID = null;
    document.getElementById('modalForm').style.display = 'flex';
    document.getElementById('modalTitulo').innerText = "Nova Entidade";
    document.getElementById('inpSlug').disabled = false;
    document.getElementById('btnSalvar').disabled = false;
    document.getElementById('btnSalvar').innerText = "Salvar Dados";
    
    // Limpar campos
    document.getElementById('inpNome').value = "";
    document.getElementById('inpSlug').value = "";
    document.getElementById('inpCidade').value = "";
}

function editar(key) {
    editandoID = key;
    const ent = entidadesCache[key];
    
    document.getElementById('modalForm').style.display = 'flex';
    document.getElementById('modalTitulo').innerText = "Editar Entidade";
    document.getElementById('btnSalvar').disabled = false;
    document.getElementById('btnSalvar').innerText = "Atualizar";

    // Puxa dados (Híbrido)
    document.getElementById('inpNome').value = ent.info?.nome_exibicao || ent.dados?.configuracoes?.entidade || "";
    document.getElementById('inpSlug').value = key;
    document.getElementById('inpSlug').disabled = true; // Não pode mudar ID
    document.getElementById('inpCidade').value = ent.info?.cidade || "";
    document.getElementById('inpCor').value = ent.dados?.configuracoes?.temaColor || "#074528";
    document.getElementById('inpSenha').value = ""; // Senha fica vazia por segurança
}

function fecharModal() {
    document.getElementById('modalForm').style.display = 'none';
}

function deletar(key) {
    if(confirm(`ATENÇÃO: Você vai apagar TODO o banco de dados de: ${key}.\nIsso inclui membros, financeiro, tudo.\n\nConfirma?`)) {
        const check = prompt(`Digite "${key}" para confirmar a exclusão:`);
        if(check === key) {
            db.ref('entidades/'+key).remove();
        } else {
            alert("Nome incorreto. Cancelado.");
        }
    }
}

function copiarLink(key) {
    // Altere aqui se o caminho do seu arquivo admin for diferente
    const url = `${window.location.origin}/pages/admin.html?org=${key}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copiado: " + url));
}

function gerarSlug(txt) {
    return txt.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_').replace(/[^\w\-]+/g, '')
        .replace(/\_\_+/g, '_').replace(/^_+/, '').replace(/_+$/, '');
}

function mudarTela(tela) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('tela-entidades').style.display = 'none';
    document.getElementById('tela-usuarios').style.display = 'none';
    
    document.getElementById(`tela-${tela}`).style.display = 'block';
}