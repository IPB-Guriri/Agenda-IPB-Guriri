// ========================================
// VARIÁVEIS GLOBAIS DE ESTADO
// ========================================
let dadosGlobais = null; // Armazena todos os eventos carregados do Firebase
let filtroAtualTempo = 'todos'; // Controla qual período está sendo exibido (todos/mes/trimestre/semestre)
let filtroAtualSociedade = 'todas'; // Controla qual sociedade está sendo filtrada

// ========================================
// PALETA DE CORES DAS SOCIEDADES
// ========================================
// Define a cor de cada sociedade/tag para uso nos eventos
const CORES_TAGS = {
	'SAF': '#d63031',      // Vermelho - Sociedade Auxiliadora Feminina
	'UPH': '#0984e3',      // Azul - União de Homens Presbiterianos
	'UMP': '#e17055',      // Laranja - União de Mocidade Presbiteriana
	'UCP': '#00cec9',      // Ciano - União de Crianças Presbiterianas
	'IGREJA': '#27ae60',   // Verde - Eventos gerais da igreja
	'EBD': '#27ae60',      // Verde - Escola Bíblica Dominical
	'CONSELHO': '#636e72', // Cinza - Reuniões do conselho
	'DEFAULT': '#2d3436'   // Cinza escuro - Padrão quando não há tag
};

// ========================================
// CARREGA AGENDA DO FIREBASE
// ========================================
// Busca todos os eventos do ano 2026 e fica escutando mudanças em tempo real
function carregarAgenda() {
	const container = document.getElementById('agenda-container');
	container.innerHTML = '<p style="text-align:center; padding: 50px;">Carregando...</p>';

	const agendaRef = database.ref('agenda2026');
	
	// Listener em tempo real - atualiza automaticamente quando há mudanças no Firebase
	agendaRef.on('value', (snapshot) => {
		const data = snapshot.val();
		
		// 1. Armazena os dados na memória global
		// Normaliza: se vier como Objeto, converte para Array
		dadosGlobais = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
		
		// 2. Aplica os filtros iniciais (por padrão mostra tudo)
		aplicarFiltros();
	});
}

// ========================================
// FUNÇÃO CENTRAL DE FILTRAGEM E RENDERIZAÇÃO
// ========================================
// Aplica os filtros de tempo e sociedade, depois renderiza os cards na tela
function aplicarFiltros() {
	const container = document.getElementById('agenda-container');
	container.innerHTML = ''; // Limpa o conteúdo anterior

	// Validação: se não houver dados, exibe mensagem
	if (!dadosGlobais || dadosGlobais.length === 0) {
		container.innerHTML = '<p style="text-align:center; padding:50px;">Nenhuma programação encontrada.</p>';
		return;
	}

	// Obtém o mês atual para cálculos de período
	const hoje = new Date();
	const mesAtual = hoje.getMonth(); // 0 = Janeiro, 11 = Dezembro
	
	// Percorre cada mês do ano
	dadosGlobais.forEach((mesData, indexMes) => {
		if (!mesData || !mesData.eventos) return; // Pula se o mês não tiver eventos

		// ========================================
		// FILTRO DE TEMPO (PERÍODO)
		// ========================================
		let mostrarMes = false;
		
		if (filtroAtualTempo === 'todos') {
			mostrarMes = true; // Exibe todos os meses
		} 
		else if (filtroAtualTempo === 'mes') {
			// Exibe apenas o mês atual
			// OBS: Assume que indexMes 0 = Janeiro. Ajuste se o Firebase usar outra estrutura
			if (indexMes === mesAtual) mostrarMes = true;
		} 
		else if (filtroAtualTempo === 'trimestre') {
			// Exibe o mês atual + próximos 2 meses
			if (indexMes >= mesAtual && indexMes <= mesAtual + 2) mostrarMes = true;
		} 
		else if (filtroAtualTempo === 'semestre') {
			// Exibe 1º Semestre (Jan-Jun) ou 2º Semestre (Jul-Dez) baseado no mês atual
			const semestreAtual = mesAtual < 6 ? 1 : 2;
			if (semestreAtual === 1 && indexMes < 6) mostrarMes = true;
			if (semestreAtual === 2 && indexMes >= 6) mostrarMes = true;
		}

		if (!mostrarMes) return; // Pula o mês se não atender ao filtro de tempo

		// ========================================
		// FILTRO DE SOCIEDADE (TAG)
		// ========================================
		// Normaliza os eventos (array ou objeto) e filtra pela sociedade selecionada
		let eventos = Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos);
		
		if (filtroAtualSociedade !== 'todas') {
			eventos = eventos.filter(ev => 
				ev.tag && ev.tag.toLowerCase() === filtroAtualSociedade
			);
		}

		// Se após filtrar por sociedade não sobrar nenhum evento, pula o mês
		if (eventos.length === 0) return;

		// ========================================
		// RENDERIZAÇÃO DO CARD DO MÊS
		// ========================================
		const card = document.createElement('div');
		card.className = 'month-card';

		// Cabeçalho com nome do mês
		const header = document.createElement('div');
		header.className = 'month-title';
		header.innerText = mesData.mes;
		card.appendChild(header);

		// Lista de eventos do mês
		const listaEventos = document.createElement('ul');
		listaEventos.className = 'events-list';

		// Ordena eventos por dia (do menor para o maior)
		eventos.sort((a, b) => parseInt(a.dia.substring(0,2)) - parseInt(b.dia.substring(0,2)));

		// Cria um item (li) para cada evento
		eventos.forEach(evento => {
			const li = document.createElement('li');
			li.className = 'event-item';
			li.onclick = () => abrirModal(evento, mesData.mes); // Clique abre o modal de detalhes

			// Obtém a cor da sociedade
			const tagKey = evento.tag ? evento.tag.toUpperCase() : 'DEFAULT';
			const corSolida = CORES_TAGS[tagKey] || CORES_TAGS['DEFAULT'];
			const corFundoData = hexToRgba(corSolida, 0.12); // Cor mais clara para o fundo
			const dataFormatada = formatarDataIntervalo(evento.dia); // Ex: "10-12" para múltiplos dias

			// Monta o HTML do evento
			li.innerHTML = `
				<div class="event-date-box" style="background-color: ${corFundoData}; color: ${corSolida}; border-color: ${hexToRgba(corSolida, 0.3)}">
					${dataFormatada}
				</div>
				<div class="event-details">
					<span class="event-name">${evento.nome}</span>
					<div class="event-meta">
						${evento.horario ? `<div class="event-time"><i class="far fa-clock"></i> ${evento.horario}</div>` : ''}
						${evento.tag ? `<div class="tag-badge" style="background-color: ${corSolida};">${evento.tag}</div>` : ''}
					</div>
				</div>
			`;
			listaEventos.appendChild(li);
		});

		card.appendChild(listaEventos);
		container.appendChild(card); // Adiciona o card do mês ao container principal
	});
}

// ========================================
// CONTROLE DOS BOTÕES DE FILTRO DE TEMPO
// ========================================
// Atualiza o filtro de período e re-renderiza a agenda
function filtrarTempo(tipo, btn) {
	filtroAtualTempo = tipo; // Atualiza o filtro (todos/mes/trimestre/semestre)
	
	// Atualiza visual: remove 'active' de todos e adiciona no clicado
	const grupo = btn.parentElement;
	grupo.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
	btn.classList.add('active');

	aplicarFiltros(); // Re-aplica os filtros com a nova seleção
}

// ========================================
// CONTROLE DOS BOTÕES DE FILTRO DE SOCIEDADE
// ========================================
// Atualiza o filtro de sociedade e re-renderiza a agenda
function filtrarSociedade(tag, btn) {
	filtroAtualSociedade = tag; // Atualiza o filtro (todas/saf/ump/etc)

	// Atualiza visual: remove 'active' de todos e adiciona no clicado
	const grupo = btn.parentElement;
	grupo.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
	btn.classList.add('active');

	aplicarFiltros(); // Re-aplica os filtros com a nova seleção
}

// ========================================
// ABRE MODAL COM DETALHES DO EVENTO
// ========================================
// Exibe uma janela popup com todas as informações do evento clicado
function abrirModal(evento, nomeMes) {
	const modal = document.getElementById('modalDetalhes');
	const modalHeader = document.querySelector('.modal-header');
	
	// 1. Obtém a cor da sociedade
	const tagKey = evento.tag ? evento.tag.toUpperCase() : 'DEFAULT';
	const corTema = CORES_TAGS[tagKey] || CORES_TAGS['DEFAULT'];

	// 2. Pinta o cabeçalho do modal com a cor da sociedade
	modalHeader.style.backgroundColor = corTema;
	
	// 3. Preenche as informações básicas
	document.getElementById('modalTitulo').innerText = evento.nome;
	
	// Formata a data (Ex: "03 de Janeiro" ou "10-12 de Março")
	const diaTexto = evento.dia.includes(',') || evento.dia.includes('-') ? evento.dia : evento.dia;
	document.getElementById('modalData').innerText = `${diaTexto} de ${nomeMes}`;
	
	document.getElementById('modalHora').innerText = evento.horario || '--:--';
	document.getElementById('modalLocal').innerText = evento.local || 'Igreja';

	// 4. Exibe a descrição (se houver)
	const divDesc = document.getElementById('modalDescricaoContainer');
	const txtDesc = document.getElementById('modalDescricao');
	
	if (evento.descricao && evento.descricao.trim() !== "") {
		divDesc.style.display = 'block';
		txtDesc.innerText = evento.descricao;
		txtDesc.style.borderLeftColor = corTema; // Borda esquerda colorida
	} else {
		divDesc.style.display = 'none'; // Oculta se não houver descrição
	}

	// 5. Exibe o badge grande da sociedade no rodapé
	const tagContainer = document.getElementById('modalTagContainer');
	tagContainer.innerHTML = ''; // Limpa badges anteriores
	
	if(evento.tag) {
		const btn = document.createElement('div');
		btn.className = 'tag-pill-large'; // Badge grande e arredondado
		btn.innerText = evento.tag;
		btn.style.backgroundColor = corTema; // Pinta com a cor da sociedade
		tagContainer.appendChild(btn);
	}

	// 6. Mostra o modal na tela
	modal.classList.add('active');
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Formata datas em intervalo (Ex: "10, 11, 12" vira "10-12")
function formatarDataIntervalo(diaString) {
	if (!diaString) return "--";
	if (diaString.includes(',')) {
		const partes = diaString.replace(/\s/g, '').split(',');
		return `${partes[0]}-${partes[partes.length - 1]}`;
	}
	return diaString;
}

// Fecha o modal de detalhes
function fecharModal() {
	document.getElementById('modalDetalhes').classList.remove('active');
}

// Fecha o modal ao clicar fora dele (no overlay escuro)
document.getElementById('modalDetalhes').addEventListener('click', (e) => {
	if (e.target.id === 'modalDetalhes') fecharModal();
});

// Converte cor hexadecimal (#074528) para RGBA com transparência
function hexToRgba(hex, alpha) {
	let c;
	if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
		c= hex.substring(1).split('');
		if(c.length== 3){ c= [c[0], c[0], c[1], c[1], c[2], c[2]]; }
		c= '0x'+c.join('');
		return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
	}
	return hex;
}

// ========================================
// INICIALIZAÇÃO
// ========================================
// Carrega a agenda assim que a página terminar de carregar
document.addEventListener('DOMContentLoaded', carregarAgenda);
