// Seleciona o container onde será renderizada a lista de membros em formato accordion
const accordionContainer = document.getElementById('lista-membros-accordion');

// ========================================
// ORDEM HIERÁRQUICA DOS CARGOS
// ======================================== 
// Define a ordem de exibição dos membros (do cargo mais alto para o mais baixo)
const ordemCargos = [
	"Presidente", 
	"Vice-Presidente", 
	"1º Secretário", 
	"2º Secretário", 
	"Tesoureiro",
	"Pastor",
	"Presbítero",
	"Diácono",
	"Membro"
];

// ========================================
// CARREGA DADOS DO FIREBASE
// ======================================== 
// Busca todos os membros da liderança no banco de dados e fica escutando mudanças em tempo real
function carregarDadosMembros() {
	database.ref('lideranca').on('value', snap => {
		const membros = snap.val() || {}; // Pega os dados ou retorna objeto vazio se não houver dados
		renderizarAccordion(membros); // Renderiza os membros na tela
	});
}

// ========================================
// RENDERIZA O ACCORDION COM OS MEMBROS
// ======================================== 
// Organiza os membros por sociedade e cria o accordion interativo
function renderizarAccordion(membros) {
	if (!accordionContainer) return; // Sai da função se o container não existir
	accordionContainer.innerHTML = ''; // Limpa o conteúdo anterior

	// Agrupa os membros por sociedade
	const agrupados = {};
	Object.values(membros).forEach(m => {
		if (!agrupados[m.sociedade]) agrupados[m.sociedade] = []; // Cria array se não existir
		agrupados[m.sociedade].push(m); // Adiciona o membro à sua sociedade
	});

	// Percorre cada sociedade em ordem alfabética
	Object.keys(agrupados).sort().forEach(socNome => {
		const item = document.createElement('div');
		item.className = 'accordion-item';

		// Ordenação Hierárquica dos membros dentro da sociedade
		const membrosOrdenados = agrupados[socNome].sort((a, b) => {
			let indexA = ordemCargos.indexOf(a.cargo); // Pega a posição do cargo na hierarquia
			let indexB = ordemCargos.indexOf(b.cargo);
			if (indexA === -1) indexA = 99; // Se o cargo não está na lista, coloca no final
			if (indexB === -1) indexB = 99;
			return indexA - indexB; // Ordena do menor índice (cargo mais alto) para o maior
		});

		// Constrói o HTML de cada membro
		let htmlMembros = '';
		membrosOrdenados.forEach(m => {
			const telLimpo = m.telefone ? m.telefone.replace(/\D/g, '') : ''; // Remove caracteres não numéricos do telefone
			htmlMembros += `
				<div class="membro-row-simple">
					<div class="membro-info-simple">
						<span class="membro-nome-simple">${m.nome}</span>
						<span class="membro-cargo-enfase">${m.cargo}</span>
					</div>
					${m.telefone ? `
						<a href="https://wa.me/55${telLimpo}" target="_blank" class="btn-whatsapp-minimal">
							<i class="fab fa-whatsapp"></i>
						</a>
					` : ''} <!-- Botão WhatsApp só aparece se houver telefone cadastrado -->
				</div>
			`;
		});

		// Cria o HTML completo do item do accordion (cabeçalho + conteúdo)
		item.innerHTML = `
			<button class="accordion-header" onclick="toggleAccordion(this)">
				<h2>${socNome}</h2>
				<i class="fas fa-chevron-down accordion-icon"></i>
			</button>
			<div class="accordion-content">
				<div class="membros-lista-vertical">${htmlMembros}</div>
			</div>
		`;
		accordionContainer.appendChild(item); // Adiciona o item ao container principal
	});
}

// ========================================
// TOGGLE DO ACCORDION (Expandir/Retrair)
// ======================================== 
// Controla a abertura e fechamento das seções do accordion
function toggleAccordion(element) {
	const item = element.parentElement; // Pega o elemento pai (accordion-item)
	const isActive = item.classList.contains('active'); // Verifica se já está aberto
	
	// Fecha todos os outros accordions para manter apenas um aberto por vez
	document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
	
	// Se não estava aberto, abre o clicado
	if (!isActive) {
		item.classList.add('active');
	}
}

// ========================================
// INICIALIZAÇÃO
// ======================================== 
// Carrega os dados assim que a página terminar de carregar
document.addEventListener('DOMContentLoaded', carregarDadosMembros);
