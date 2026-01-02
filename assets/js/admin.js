// ========================================
// ARQUIVO: assets/js/admin.js
// PAINEL ADMINISTRATIVO COMPLETO
// ========================================

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================
let agendaData = []; // Armazena todos os eventos da agenda organizados por mês
let tagsData = {}; // Armazena as sociedades e suas cores (Ex: {SAF: "#d63031"})
let cargosData = []; // Lista de todos os cargos disponíveis (Ex: ["Presidente", "Pastor"])
let editando = false; // Controla se está editando um evento existente
let idEdicaoOriginal = null; // Guarda a posição do evento sendo editado {m: mesIndex, e: eventoIndex}

// Variáveis de controle de Membros da Liderança
let editandoMembro = false; // Controla se está editando um membro existente
let idMembroEdicao = null; // Guarda o ID do membro sendo editado no Firebase

const statusMsg = document.getElementById('statusMsg'); // Elemento que mostra o status da conexão

// ========================================
// INICIALIZAÇÃO E CONEXÃO FIREBASE
// ========================================
// Configura todos os listeners em tempo real e carrega dados iniciais
function iniciarAdmin() {
	gerarGridDias(); // Cria a grade de seleção de dias (1 a 31)
	
	// LISTENER: Sociedades (Tags)
	// Escuta mudanças nas sociedades cadastradas e suas cores
	database.ref('tags').on('value', snap => {
		if(snap.exists()) {
			let val = snap.val();
			// Normaliza: se vier como array, converte para objeto
			if(Array.isArray(val)) {
				tagsData = {};
				val.forEach(t => tagsData[t] = "#074528"); // Cor padrão verde
			} else {
				tagsData = val;
			}
		} else {
			tagsData = {}; // Se não houver dados, inicia vazio
		}
		atualizarSelectSociedades(); // Atualiza os dropdowns de sociedades
		renderizarTabelaTags(); // Atualiza a tabela do modal de gerenciamento
	});

	// LISTENER: Cargos
	// Escuta mudanças na lista de cargos disponíveis
	database.ref('cargos').on('value', snap => {
		cargosData = snap.val() || []; // Pega os dados ou array vazio
		atualizarSelectCargos(); // Atualiza o dropdown de cargos
		renderizarTabelaCargos(); // Atualiza a tabela do modal de gerenciamento
	});

	// LISTENER: Agenda de Eventos
	// Escuta mudanças em todos os eventos do ano 2026
	database.ref('agenda2026').on('value', (snapshot) => {
		const data = snapshot.val();
		// Normaliza os dados ou cria estrutura vazia de 12 meses
		agendaData = data ? (Array.isArray(data) ? data : Object.values(data)) : criarEstruturaVazia();
		// Atualiza o status visual da conexão
		if(statusMsg) statusMsg.innerHTML = "Status: <span style='color:#27ae60; font-weight:bold'>Conectado Online ✅</span>";
		renderizarLista(); // Re-renderiza a lista de eventos
	});

	// LISTENER: Liderança (Membros)
	// Escuta mudanças na lista de membros da liderança
	database.ref('lideranca').on('value', (snapshot) => {
		carregarLideranca(snapshot.val()); // Renderiza a tabela de membros
	});
}

// ========================================
// SISTEMA DE LOGIN E AUTENTICAÇÃO
// ========================================
// Verifica se a senha digitada está correta e libera acesso
function verificarAcesso() {
	const input = document.getElementById("senhaInput");
	const msg = document.getElementById("msgErro");
	const overlay = document.getElementById("loginOverlay");
	const senhaCorreta = "Presbiteriana2023"; // Senha de acesso (pode ser alterada)

	console.log("Tentando login..."); // Log para debug

	if (input.value === senhaCorreta) {
		console.log("Senha correta!");
		// Salva no sessionStorage que o usuário está logado
		sessionStorage.setItem("adminLogado", "sim");
		
		// Remove a tela de login (overlay)
		if (overlay) {
			overlay.style.setProperty("display", "none", "important");
			overlay.classList.add("hidden"); // Garantia extra
		}
		
		// Mostra notificação de sucesso
		if (typeof showToast === "function") showToast("Acesso concedido!", "success");
	} else {
		console.log("Senha errada!");
		if (msg) msg.style.display = "block"; // Mostra mensagem de erro
		input.style.border = "2px solid red"; // Destaca o campo em vermelho
		input.value = ""; // Limpa o campo
		input.focus(); // Foca novamente no campo
		if (typeof showToast === "function") showToast("Senha incorreta!", "error");
	}
}

// INICIALIZAÇÃO DO LOGIN
// Executa quando a página termina de carregar
document.addEventListener("DOMContentLoaded", () => {
	const overlay = document.getElementById("loginOverlay");
	const campoSenha = document.getElementById("senhaInput");

	// Verifica se o usuário já estava logado nesta sessão do navegador
	if (sessionStorage.getItem("adminLogado") === "sim") {
		if (overlay) overlay.style.display = "none"; // Pula a tela de login
	}

	// Permite fazer login apertando Enter no campo de senha
	if (campoSenha) {
		campoSenha.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault(); // Impede o recarregamento da página
				verificarAcesso();
			}
		});
	}
	
	iniciarAdmin(); // Inicia as conexões com Firebase
});

// ========================================
// SISTEMA DE ABAS E MODAIS
// ========================================
// Alterna entre a aba de Agenda e a aba de Liderança
function trocarAba(aba) {
	const secaoAgenda = document.getElementById('secaoAgenda');
	const secaoLideranca = document.getElementById('secaoLideranca');
	const acoesAgenda = document.getElementById('acoesAgenda'); // Botões específicos da agenda
	const btnAgenda = document.getElementById('tabAgenda');
	const btnLideranca = document.getElementById('tabLideranca');

	if (aba === 'lideranca') {
		// Mostra aba de Liderança
		secaoAgenda.style.display = 'none';
		acoesAgenda.style.display = 'none'; // Esconde botões da agenda
		secaoLideranca.style.display = 'block';
		btnAgenda.classList.remove('active');
		btnLideranca.classList.add('active');
	} else {
		// Mostra aba de Agenda
		secaoAgenda.style.display = 'block';
		acoesAgenda.style.display = 'flex'; // Mostra botões da agenda
		secaoLideranca.style.display = 'none';
		btnAgenda.classList.add('active');
		btnLideranca.classList.remove('active');
	}
}

// Funções para abrir e fechar modais (janelas popup)
function abrirModalTags() { document.getElementById('modalTags').style.display = 'flex'; }
function abrirModalCargos() { document.getElementById('modalCargos').style.display = 'flex'; }
function abrirModalRecorrencia() { document.getElementById('modalRecorrencia').style.display = 'flex'; }
function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }

// ========================================
// GERENCIAMENTO DE SOCIEDADES (TAGS)
// ========================================
// Atualiza todos os dropdowns (select) que mostram sociedades
function atualizarSelectSociedades() {
	const ids = ['inputTag', 'recTag', 'membroSociedade']; // IDs dos selects na página
	ids.forEach(id => {
		const sel = document.getElementById(id);
		if(!sel) return; // Pula se o elemento não existir
		const valorAtual = sel.value; // Guarda o valor selecionado
		sel.innerHTML = '<option value="">Nenhuma</option>'; // Limpa e adiciona opção vazia
		// Adiciona todas as sociedades em ordem alfabética
		Object.keys(tagsData).sort().forEach(tag => {
			const opt = document.createElement('option');
			opt.value = tag; 
			opt.textContent = tag;
			sel.appendChild(opt);
		});
		sel.value = valorAtual; // Restaura o valor que estava selecionado
	});
}

// ========================================
// GERENCIAMENTO DE CARGOS
// ========================================
// Atualiza o dropdown de cargos no formulário de membros
function atualizarSelectCargos() {
	const sel = document.getElementById('membroCargoSelect');
	if(!sel) return;
	sel.innerHTML = '<option value="">Selecione...</option>'; // Limpa
	// Adiciona todos os cargos em ordem alfabética
	cargosData.sort().forEach(cargo => {
		const opt = document.createElement('option');
		opt.value = cargo; 
		opt.textContent = cargo;
		sel.appendChild(opt);
	});
}

// Cria uma nova sociedade (tag) no Firebase
function criarTagNoModal() {
	const nome = document.getElementById('newTagName').value.trim().toUpperCase();
	const cor = document.getElementById('newTagColor').value;
	if(!nome) return showToast("Digite um nome!", "error");
	// Salva no Firebase usando o nome como chave
	database.ref(`tags/${nome}`).set(cor).then(() => {
		document.getElementById('newTagName').value = ""; // Limpa o campo
	});
}

// Cria um novo cargo no Firebase
function criarCargoNoModal() {
	const input = document.getElementById('newCargoName');
	const nome = input.value.trim();
	if(!nome) return showToast("Digite o nome do cargo!", "error");
	if(cargosData.includes(nome)) return showToast("Cargo já existe!", "error");
	cargosData.push(nome); // Adiciona no array local
	database.ref('cargos').set(cargosData).then(() => input.value = ""); // Salva no Firebase
}

// Renderiza a tabela de sociedades no modal de gerenciamento
function renderizarTabelaTags() {
	const tbody = document.getElementById('listaTagsEditaveis');
	if(!tbody) return;
	tbody.innerHTML = ''; // Limpa a tabela
	// Percorre todas as sociedades
	Object.entries(tagsData).forEach(([nome, cor]) => {
		const tr = document.createElement('tr');
		// Cria linha com nome, seletor de cor e botão de excluir
		tr.innerHTML = `
			<td>${nome}</td>
			<td style="text-align:center">
				<input type="color" value="${cor}" onchange="database.ref('tags/${nome}').set(this.value)">
			</td>
			<td style="text-align:right">
				<button class="btn-delete-tag-table" onclick="database.ref('tags/${nome}').remove()">
					<i class="fas fa-trash"></i>
				</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

// Renderiza a tabela de cargos no modal de gerenciamento
function renderizarTabelaCargos() {
	const tbody = document.getElementById('listaCargosEditaveis');
	if(!tbody) return;
	tbody.innerHTML = ''; // Limpa a tabela
	// Percorre todos os cargos
	cargosData.forEach((cargo, i) => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${cargo}</td>
			<td style="text-align:right">
				<button class="btn-delete-tag-table" onclick="excluirCargo(${i})">
					<i class="fas fa-trash"></i>
				</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

// Remove um cargo da lista
function excluirCargo(i) { 
	cargosData.splice(i, 1); // Remove do array
	database.ref('cargos').set(cargosData); // Atualiza no Firebase
}

// ========================================
// GERENCIAMENTO DE LIDERANÇA (MEMBROS)
// ========================================
// Salva um novo membro ou atualiza um existente
function salvarMembro() {
	const nome = document.getElementById('membroNome').value.trim();
	const sociedade = document.getElementById('membroSociedade').value;
	const cargo = document.getElementById('membroCargoSelect').value;
	const telefone = document.getElementById('membroTelefone').value.trim();

	// Validação: campos obrigatórios
	if (!nome || !cargo || !sociedade) {
		showToast("⚠️ Preencha nome, sociedade e cargo!", "error");
		return;
	}

	const dadosMembro = { nome, sociedade, cargo, telefone };

	if (editandoMembro && idMembroEdicao) {
		// MODO EDIÇÃO: Atualiza membro existente
		database.ref(`lideranca/${idMembroEdicao}`).update(dadosMembro)
			.then(() => {
				showToast("✅ Membro atualizado!");
				cancelarEdicaoMembro(); // Limpa o formulário e volta ao modo de criação
			});
	} else {
		// MODO CRIAÇÃO: Adiciona novo membro
		database.ref('lideranca').push(dadosMembro) // push() gera ID automático
			.then(() => {
				showToast("✅ Membro cadastrado!");
				limparCamposMembro(); // Limpa apenas os campos
			});
	}
}

// Renderiza a tabela de membros da liderança
// ========================================
// SUBSTITUIR A FUNÇÃO carregarLideranca NO ARQUIVO admin.js
// ========================================

function carregarLideranca(dados) {
    const tbody = document.getElementById('listaLideranca');
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa a tabela

    if (!dados) return; // Se não houver dados, não renderiza nada

    // 1. CONVERTER OBJETO EM ARRAY PARA PODER ORDENAR
    let listaMembros = Object.entries(dados).map(([id, m]) => ({
        id: id,
        ...m
    }));

    // 2. DEFINIR A HIERARQUIA DE CARGOS (Menor número = Aparece antes)
    const hierarquiaCargos = {
        "Presidente": 1,
        "Vice-Presidente": 2,
        "1º Secretário(a)": 3,
        "2º Secretário(a)": 4,
        "Secretário(a)": 4, // Genérico
        "Executiva": 4,
        "1º Tesoureiro(a)": 5,
        "2º Tesoureiro(a)": 6,
        "Tesoureiro(a)": 6, // Genérico
        "Pastor": 7,
        "Presbítero": 8,
        "Diácono": 9,
        "Conselheiro": 10
    };

    // Função auxiliar para pegar o peso do cargo (se não achar, joga pro final com peso 99)
    const getPeso = (cargo) => {
        if (!cargo) return 99;
        // Tenta achar o cargo exato ou procura se contém a palavra chave
        const chave = Object.keys(hierarquiaCargos).find(k => cargo.includes(k));
        return chave ? hierarquiaCargos[chave] : 99;
    };

    // 3. APLICAR A ORDENAÇÃO
    listaMembros.sort((a, b) => {
        // Critério 1: Sociedade (Ordem Alfabética)
        // Se quiser uma sociedade específica primeiro (ex: "Conselho"), teria que fazer lógica extra aqui
        const socA = (a.sociedade || "").toLowerCase();
        const socB = (b.sociedade || "").toLowerCase();
        
        if (socA < socB) return -1;
        if (socA > socB) return 1;

        // Critério 2: Cargo (Hierarquia) - Só acontece se a Sociedade for igual
        return getPeso(a.cargo) - getPeso(b.cargo);
    });

    // 4. RENDERIZAR A LISTA JÁ ORDENADA
    listaMembros.forEach((m) => {
        const tr = document.createElement('tr');

        // COLUNA 1: Nome + Telefone
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

        // COLUNA 2: Sociedade (Badge colorido)
        const tdSoc = document.createElement('td');
        const spanTag = document.createElement('span');
        spanTag.className = 'tag';
        // Usa a cor salva ou verde padrão
        spanTag.style.backgroundColor = (tagsData && tagsData[m.sociedade]) ? tagsData[m.sociedade] : '#074528'; 
        // Estilo básico do badge (caso não tenha no CSS global)
        spanTag.style.color = '#fff';
        spanTag.style.padding = '4px 8px';
        spanTag.style.borderRadius = '12px';
        spanTag.style.fontSize = '0.75rem';
        spanTag.style.fontWeight = 'bold';
        
        spanTag.textContent = m.sociedade;
        tdSoc.appendChild(spanTag);

        // COLUNA 3: Cargo
        const tdCargo = document.createElement('td');
        tdCargo.textContent = m.cargo;

        // COLUNA 4: Ações
        const tdAcoes = document.createElement('td');
        const divAcoes = document.createElement('div');
        divAcoes.className = 'acoes-lideranca';

        // Botão Editar
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-icon-small btn-edit-icon';
        btnEdit.innerHTML = '<i class="fas fa-pen"></i>';
        btnEdit.onclick = () => prepararEdicaoMembro(m.id, m); // Note que agora usamos m.id

        // Botão Excluir
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon-small btn-delete-tag-table';
        btnDel.innerHTML = '<i class="fas fa-trash"></i>';
        btnDel.onclick = () => {
            if (confirm("Excluir membro?")) database.ref(`lideranca/${m.id}`).remove();
        };

        divAcoes.appendChild(btnEdit);
        divAcoes.appendChild(btnDel);
        tdAcoes.appendChild(divAcoes);

        tr.appendChild(tdInfo);
        tr.appendChild(tdSoc);
        tr.appendChild(tdCargo);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
    });
}

// Prepara o formulário para editar um membro existente
function prepararEdicaoMembro(id, m) {
	// Preenche os campos com os dados do membro
	document.getElementById('membroNome').value = m.nome;
	document.getElementById('membroSociedade').value = m.sociedade;
	document.getElementById('membroCargoSelect').value = m.cargo;
	document.getElementById('membroTelefone').value = m.telefone || '';
	
	// Ativa o modo de edição
	editandoMembro = true;
	idMembroEdicao = id;
	
	// Altera textos e botões do formulário
	document.getElementById('btnSalvarMembro').textContent = "🔄 Atualizar Membro";
	document.getElementById('btnCancelarMembro').style.display = 'inline-block';
	document.getElementById('tituloMembro').textContent = "Editando Membro...";
	
	// Rola a página para o topo (onde está o formulário)
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cancela a edição e volta ao modo de criação
function cancelarEdicaoMembro() {
	limparCamposMembro();
	editandoMembro = false;
	idMembroEdicao = null;
	// Restaura textos e botões originais
	document.getElementById('btnSalvarMembro').textContent = "💾 Salvar na Liderança";
	document.getElementById('btnCancelarMembro').style.display = 'none';
	document.getElementById('tituloMembro').textContent = "Cadastrar Liderança / Membro";
}

// Limpa apenas os campos do formulário de membros
function limparCamposMembro() {
	document.getElementById('membroNome').value = '';
	document.getElementById('membroTelefone').value = '';
}

// ========================================
// GERENCIAMENTO DA AGENDA DE EVENTOS
// ========================================
// Cria estrutura vazia com os 12 meses do ano
function criarEstruturaVazia() { 
	return Array.from({length: 12}, (_, i) => ({ 
		mes: obterNomeMes(i), 
		eventos: [] 
	})); 
}

// Retorna o nome do mês baseado no índice (0 = Janeiro, 11 = Dezembro)
function obterNomeMes(i) { 
	return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i]; 
}

// Gera a grade de botões de 1 a 31 para seleção de dias
function gerarGridDias() {
	const grid = document.getElementById('dayGrid');
	if(!grid) return;
	grid.innerHTML = ''; // Limpa a grade
	for(let i=1; i<=31; i++) {
		const btn = document.createElement('div');
		btn.className = 'day-btn';
		btn.textContent = i < 10 ? '0'+i : i; // Formata com zero à esquerda (01, 02...)
		btn.onclick = function() { 
			this.classList.toggle('selected'); // Seleciona/deseleciona o dia ao clicar
		};
		grid.appendChild(btn);
	}
}

// Renderiza a lista de eventos cadastrados organizados por mês
function renderizarLista() {
	const listaDiv = document.getElementById('listaPreview');
	if(!listaDiv) return;
	listaDiv.innerHTML = ''; // Limpa a lista
	
	// Percorre cada mês
	agendaData.forEach((mesData, mesIndex) => {
		// Normaliza os eventos (array ou objeto)
		let eventos = mesData.eventos ? (Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos)) : [];
		
		// Só renderiza o mês se houver eventos
		if(eventos.length > 0) {
			const mesBlock = document.createElement('div');
			mesBlock.className = 'month-block';
			mesBlock.innerHTML = `<div class="month-header">${mesData.mes}</div>`;
			
			// Percorre cada evento do mês
			eventos.forEach((ev, i) => {
				const corTag = tagsData[ev.tag] || '#074528'; // Cor da sociedade
				const row = document.createElement('div');
				row.className = 'event-preview-item'; 
				// Monta o HTML do evento com botões de editar e excluir
				row.innerHTML = `
					<div class="event-preview-info">
						<strong>Dia ${ev.dia} - ${ev.nome}</strong>
						<span class="event-preview-date">
							${ev.horario ? '<i class="far fa-clock"></i> ' + ev.horario : ''} 
							${ev.tag ? `<span class="tag" style="background:${corTag}">${ev.tag}</span>` : ''}
						</span>
					</div>
					<div class="event-actions-group">
						<button class="btn-icon-small btn-edit-icon" onclick="prepararEdicao(${mesIndex}, ${i})">
							<i class="fas fa-pen"></i>
						</button>
						<button class="btn-icon-small btn-delete-icon" onclick="removerEvento(${mesIndex}, ${i})">
							<i class="fas fa-trash"></i>
						</button>
					</div>
				`;
				mesBlock.appendChild(row);
			});
			listaDiv.appendChild(mesBlock);
		}
	});
}

// ========================================
// NOTIFICAÇÕES TOAST
// ========================================
// Exibe uma notificação temporária no canto da tela
function showToast(mensagem, tipo = 'success') {
	const container = document.getElementById('toast-container');
	if (!container) return;
	const toast = document.createElement('div');
	toast.className = `toast ${tipo}`; // success ou error
	toast.innerHTML = `
		<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> 
		<span>${mensagem}</span>
	`;
	container.appendChild(toast);
	// Remove a notificação após 3 segundos
	setTimeout(() => { toast.remove(); }, 3000);
}

// ========================================
// SALVAR/ATUALIZAR EVENTO
// ========================================
// Processa o formulário de eventos e salva no Firebase
function processarEvento() {
	const mesNome = document.getElementById('inputMes').value;
	const ano = document.getElementById('inputAno').value || "2026";
	const nome = document.getElementById('inputNome').value;
	const selecionados = document.querySelectorAll('.day-btn.selected'); // Dias selecionados
	
	// Validação: precisa ter dias e nome
	if (selecionados.length === 0 || !nome) return showToast("⚠️ Selecione os dias e o nome!", "error");

	// Busca ou cria o mês na estrutura de dados
	let mesIdx = agendaData.findIndex(m => m.mes === mesNome);
	if (mesIdx === -1) { 
		agendaData.push({ mes: mesNome, eventos: [] }); 
		mesIdx = agendaData.length - 1; 
	}
	if (!agendaData[mesIdx].eventos) agendaData[mesIdx].eventos = [];

	// Se está editando, remove o evento antigo
	if (editando && idEdicaoOriginal) {
		agendaData[idEdicaoOriginal.m].eventos.splice(idEdicaoOriginal.e, 1);
	}

	// Formata os dias selecionados (Ex: "10, 11, 12")
	const dias = Array.from(selecionados).map(b => b.textContent).join(", ");
	
	// Cria o objeto do evento
	agendaData[mesIdx].eventos.push({ 
		dia: dias, 
		ano, 
		nome, 
		descricao: document.getElementById('inputDescricao').value, 
		horario: document.getElementById('inputHorario').value, 
		local: document.getElementById('inputLocal').value, 
		tag: document.getElementById('inputTag').value 
	});
	
	// Ordena eventos por dia
	agendaData[mesIdx].eventos.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

	// Animação de salvamento no botão
	const btn = document.getElementById('btnSalvar');
	const txtOriginal = btn.innerHTML;
	btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Salvando...";
	btn.disabled = true;

	// Salva no Firebase
	database.ref('agenda2026').set(agendaData)
		.then(() => {
			showToast(editando ? "Evento atualizado!" : "Evento cadastrado!");
			setTimeout(() => { 
				btn.innerHTML = txtOriginal; 
				btn.disabled = false; 
				limparFormulario(); 
			}, 1000);
		})
		.catch(() => { 
			showToast("Erro ao conectar ao Firebase", "error"); 
			btn.innerHTML = txtOriginal; 
			btn.disabled = false; 
		});
}

// ========================================
// PREPARAR EDIÇÃO DE EVENTO
// ========================================
// Preenche o formulário com os dados do evento para edição
function prepararEdicao(m, e) {
	const ev = agendaData[m].eventos[e];
	// Preenche todos os campos
	document.getElementById('inputMes').value = agendaData[m].mes;
	document.getElementById('inputAno').value = ev.ano || "2026";
	document.getElementById('inputNome').value = ev.nome;
	document.getElementById('inputDescricao').value = ev.descricao || '';
	document.getElementById('inputHorario').value = ev.horario || '';
	document.getElementById('inputLocal').value = ev.local || '';
	document.getElementById('inputTag').value = ev.tag || '';
	
	// Marca os dias corretos na grade
	document.querySelectorAll('.day-btn').forEach(b => {
		b.classList.toggle('selected', ev.dia.split(', ').includes(b.textContent));
	});
	
	// Ativa modo de edição
	editando = true; 
	idEdicaoOriginal = { m, e }; // Guarda posição original
	
	// Altera textos do formulário
	document.getElementById('btnSalvar').innerHTML = "🔄 Atualizar Evento";
	document.getElementById('btnCancelar').style.display = 'block';
	
	// Rola para o topo
	window.scrollTo({top:0, behavior:'smooth'});
}

// ========================================
// CANCELAR EDIÇÃO DE EVENTO
// ========================================
// Cancela a edição e limpa o formulário
function cancelarEdicao() {
	limparFormulario();
	document.getElementById('btnSalvar').innerHTML = "💾 Salvar Evento";
	document.getElementById('btnCancelar').style.display = 'none';
	document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
	editando = false; 
	idEdicaoOriginal = null;
	window.scrollTo({top: 0, behavior: 'smooth'});
}

// ========================================
// RECORRÊNCIA: ALTERNA MODO
// ========================================
// Alterna entre modo semanal e mensal na criação de recorrência
function toggleRecMode() {
	const tipo = document.querySelector('input[name="recType"]:checked').value;
	document.getElementById('optSemanal').style.display = (tipo === 'semanal') ? 'block' : 'none';
	document.getElementById('optMensal').style.display = (tipo === 'mensal') ? 'block' : 'none';
}

// ========================================
// LIMPAR FORMULÁRIO DE EVENTOS
// ========================================
// Reseta todos os campos do formulário de eventos
function limparFormulario() {
	editando = false; 
	idEdicaoOriginal = null;
	// Limpa todos os campos
	document.getElementById('inputNome').value = ""; 
	document.getElementById('inputDescricao').value = ""; 
	document.getElementById('inputHorario').value = ""; 
	document.getElementById('inputLocal').value = ""; 
	document.getElementById('inputTag').value = "";
	// Desmarca todos os dias
	document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
	// Restaura textos originais
	document.getElementById('btnSalvar').innerHTML = "💾 Salvar Evento";
	document.getElementById('btnCancelar').style.display = 'none';
	document.getElementById('formTitle').textContent = "Adicionar Novo Evento";
}

// ========================================
// REMOVER EVENTO
// ========================================
// Exclui um evento da agenda após confirmação
function removerEvento(m, e) { 
	if(confirm("Apagar?")) { 
		agendaData[m].eventos.splice(e, 1); // Remove do array
		database.ref('agenda2026').set(agendaData); // Atualiza no Firebase
	} 
}

// ========================================
// FINALIZAÇÃO E COMPATIBILIDADE
// ========================================
// Inicialização duplicada para garantir compatibilidade
document.addEventListener("DOMContentLoaded", () => {
	// Verifica login novamente
	if (sessionStorage.getItem("adminLogado") === "sim") {
		document.getElementById("loginOverlay").style.display = "none";
	}
	// Listener adicional para Enter no campo de senha
	const campoSenha = document.getElementById("senhaInput");
	if (campoSenha) {
		campoSenha.addEventListener("keypress", (e) => { 
			if (e.key === "Enter") verificarAcesso(); 
		});
	}
	iniciarAdmin();
});
