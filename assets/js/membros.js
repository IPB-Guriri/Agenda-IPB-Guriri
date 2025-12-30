const container = document.getElementById('lista-membros-container');

function carregarDadosMembros() {
    // Busca as sociedades (Tags) para obter as cores
    database.ref('tags').once('value', snapTags => {
        const sociedades = snapTags.val() || {};
        
        // Busca os membros cadastrados
        database.ref('lideranca').on('value', snapMembros => {
            const membros = snapMembros.val() || {};
            renderizarMembros(sociedades, membros);
        });
    });
}

function renderizarMembros(sociedades, membros) {
    if (!container) return;
    container.innerHTML = '';
    
    // Agrupa os membros por sociedade cadastrada no objeto
    const agrupados = {};
    Object.values(membros).forEach(m => {
        if (!agrupados[m.sociedade]) agrupados[m.sociedade] = [];
        agrupados[m.sociedade].push(m);
    });

    if (Object.keys(agrupados).length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:50px;">Nenhuma liderança cadastrada no momento.</p>';
        return;
    }

    // Ordena e cria as seções por sociedade
    Object.keys(agrupados).sort().forEach(socNome => {
        const corSociedade = sociedades[socNome] || '#074528';
        
        const section = document.createElement('section');
        section.className = 'sociedade-section';
        
        let htmlMembros = '';
        agrupados[socNome].forEach(m => {
            htmlMembros += `
                <div class="membro-card" style="border-left-color: ${corSociedade}">
                    <span class="membro-nome">${m.nome}</span>
                    <span class="membro-cargo">${m.cargo}</span>
                </div>
            `;
        });

        section.innerHTML = `
            <div class="sociedade-header" style="background-color: ${corSociedade}">
                <i class="fas fa-users"></i>
                <h2>${socNome}</h2>
            </div>
            <div class="membros-grid">
                ${htmlMembros}
            </div>
        `;
        
        container.appendChild(section);
    });
}

document.addEventListener('DOMContentLoaded', carregarDadosMembros);