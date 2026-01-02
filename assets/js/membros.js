const accordionContainer = document.getElementById('lista-membros-accordion');

// Ordem hierárquica definida
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

function carregarDadosMembros() {
    database.ref('lideranca').on('value', snap => {
        const membros = snap.val() || {};
        renderizarAccordion(membros);
    });
}

function renderizarAccordion(membros) {
    if (!accordionContainer) return;
    accordionContainer.innerHTML = '';

    const agrupados = {};
    Object.values(membros).forEach(m => {
        if (!agrupados[m.sociedade]) agrupados[m.sociedade] = [];
        agrupados[m.sociedade].push(m);
    });

    Object.keys(agrupados).sort().forEach(socNome => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        // Ordenação Hierárquica
        const membrosOrdenados = agrupados[socNome].sort((a, b) => {
            let indexA = ordemCargos.indexOf(a.cargo);
            let indexB = ordemCargos.indexOf(b.cargo);
            if (indexA === -1) indexA = 99;
            if (indexB === -1) indexB = 99;
            return indexA - indexB;
        });

        let htmlMembros = '';
        membrosOrdenados.forEach(m => {
            const telLimpo = m.telefone ? m.telefone.replace(/\D/g, '') : '';
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
                    ` : ''}
                </div>
            `;
        });

        item.innerHTML = `
            <button class="accordion-header" onclick="toggleAccordion(this)">
                <h2>${socNome}</h2>
                <i class="fas fa-chevron-down accordion-icon"></i>
            </button>
            <div class="accordion-content">
                <div class="membros-lista-vertical">${htmlMembros}</div>
            </div>
        `;
        accordionContainer.appendChild(item);
    });
}

function toggleAccordion(element) {
    const item = element.parentElement;
    const isActive = item.classList.contains('active');
    
    // Fecha os outros para focar em um por vez
    document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));
    
    if (!isActive) {
        item.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', carregarDadosMembros);

