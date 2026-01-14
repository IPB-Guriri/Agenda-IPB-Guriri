document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 1. LÓGICA DE LOGIN
    // =========================================================
    const loginScreen = document.getElementById('login-screen');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password-input');
    const errorMsg = document.getElementById('error-msg');
    const loginBox = document.querySelector('.login-box');

    // Senha definida
    const CORRECT_PASS = "Presbiteriana2023";

    function checkLogin() {
        if (passwordInput.value === CORRECT_PASS) {
            // Senha Correta
            loginScreen.style.opacity = '0';
            loginScreen.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                loginScreen.style.display = 'none';
                dashboardContainer.style.display = 'flex'; // Exibe o painel
                animateMenuItems();
            }, 500);
        } else {
            // Senha Incorreta
            errorMsg.classList.remove('hidden');
            loginBox.classList.add('shake');
            
            setTimeout(() => {
                loginBox.classList.remove('shake');
            }, 500);
        }
    }

    if(loginBtn) loginBtn.addEventListener('click', checkLogin);
    if(passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkLogin();
        });
    }


    // =========================================================
    // 2. SISTEMA DO MENU (SIDEBAR)
    // =========================================================
    
    // Animação de entrada dos itens
    function animateMenuItems() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item, index) => {
            item.style.animation = `slideInLeft 0.5s ease forwards ${index / 7 + 0.1}s`;
        });
    }

    // Toggle Mobile (Abrir/Fechar)
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobile-toggle');

    if(mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const icon = mobileToggle.querySelector('i');
            
            if (sidebar.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Fechar ao clicar fora (Mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && mobileToggle) {
            if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                mobileToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
            }
        }
    });


    // =========================================================
    // 3. NAVEGAÇÃO ENTRE TELAS (CORRIGIDO PARA O SEU HTML)
    // =========================================================
    const navLinks = document.querySelectorAll('.nav-link');
    
    // AQUI ESTAVA O ERRO: Mudamos de .app-section para .view-section
    const allSections = document.querySelectorAll('.view-section'); 

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            
            // Pega o destino (ex: section-settings)
            const targetId = this.getAttribute('data-target');

            // Só roda a lógica se for um link de navegação (tiver data-target)
            if (targetId) {
                e.preventDefault();

                // 1. Atualiza visual do Menu (Link Ativo)
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');

                // 2. Esconde TODAS as seções
                allSections.forEach(section => {
                    section.style.display = 'none'; // Garante que suma
                    section.classList.add('hidden-section'); // Usa sua classe CSS
                    section.classList.remove('active-section');
                });

                // 3. Mostra APENAS a seção alvo
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block'; // Garante que apareça
                    targetSection.classList.remove('hidden-section'); // Remove classe de ocultar
                    targetSection.classList.add('active-section'); // Adiciona classe de ativo
                    
                    // Pequena animação de fade
                    targetSection.style.opacity = '0';
                    setTimeout(() => {
                        targetSection.style.transition = 'opacity 0.3s ease';
                        targetSection.style.opacity = '1';
                    }, 50);
                }

                // 4. (Mobile) Fecha o menu se estiver aberto
                if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    if(mobileToggle) mobileToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
                }
            }
        });
    });
});