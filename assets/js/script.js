// Verifica se o Firebase foi iniciado no config.js
if (typeof firebase === 'undefined' || typeof database === 'undefined') {
    console.error("Erro: Firebase não configurado. Verifique o arquivo config.js");
}

function carregarAgenda() {
    const container = document.getElementById('agenda-container');
    
    // AJUSTE: Ocupa a largura total (todas as colunas) enquanto carrega
    container.innerHTML = '<p style="text-align:center; width:100%; color:#666; grid-column: 1/-1; padding: 50px;">Carregando agenda...</p>';

    // Conecta na "tabela" agenda2026 do seu banco
    const agendaRef = database.ref('agenda2026');
    
    // Ouve as mudanças em tempo real
    agendaRef.on('value', (snapshot) => {
        const data = snapshot.val();
        container.innerHTML = ''; // Limpa a tela

        if (!data) {
            container.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1/-1; padding: 20px;">Nenhuma programação encontrada.</p>';
            return;
        }

        // Garante que seja um Array (caso o Firebase devolva Objeto)
        const listaMeses = Array.isArray(data) ? data : Object.values(data);

        listaMeses.forEach(mesData => {
            // Se o mês não existir ou não tiver eventos, pula
            if (!mesData || !mesData.eventos) return; 

            // 1. Cria o Cartão do Mês
            const card = document.createElement('div');
            card.className = 'month-card';

            // 2. Título do Mês
            const titulo = document.createElement('div');
            titulo.className = 'month-title';
            titulo.textContent = mesData.mes || "Mês";
            card.appendChild(titulo);

            // 3. Lista de Eventos
            const lista = document.createElement('ul');
            lista.className = 'events-list';

            // Garante que eventos seja array
            const eventos = Array.isArray(mesData.eventos) ? mesData.eventos : Object.values(mesData.eventos);
            
            // 4. Preenche os eventos
            eventos.forEach(evento => {
                const item = document.createElement('li');
                item.className = 'event-item';
                
                // Cria a etiqueta (Tag) se existir
                const tagHtml = evento.tag ? `<span class="tag">${evento.tag}</span>` : '';
                
                // LÓGICA DE DETALHES (Horário e Local)
                let detalhes = [];
                if(evento.horario) detalhes.push(`🕒 ${evento.horario}`);
                if(evento.local) detalhes.push(`📍 ${evento.local}`);
                
                // Junta os detalhes com um separador bonito ou espaço
                const infoTexto = detalhes.length > 0 ? detalhes.join(' &nbsp;|&nbsp; ') : '';

                item.innerHTML = `
                    <div class="event-date">${evento.dia}</div>
                    <div class="event-details">
                        <span class="event-name">${evento.nome}</span>
                        <div class="event-meta">
                            ${infoTexto} ${tagHtml}
                        </div>
                    </div>
                `;
                lista.appendChild(item);
            });

            card.appendChild(lista);
            container.appendChild(card);
        });
    });
}

document.addEventListener('DOMContentLoaded', carregarAgenda);