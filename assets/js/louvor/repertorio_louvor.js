document.addEventListener("DOMContentLoaded", () => {
    
    // =========================================================================
    // 0. SISTEMA DE NOTIFICAÇÃO (TOAST)
    // =========================================================================
    if (!document.getElementById('toast-container')) {
        const c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c);
    }
    window.showToast = (msg, type='success') => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        let icon = type==='success'?'check-circle':(type==='error'?'exclamation-triangle':'info-circle');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fas fa-${icon}"></i> <span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
    }

    // =========================================================================
    // 1. DADOS E VARIÁVEIS GLOBAIS
    // =========================================================================
    
    // Dados Iniciais
    let songs = [
        { id: 1, title: "Oceanos", artist: "Ana Nóbrega", key: "D", bpm: "74", cifra: "Intro...", link: "", voices: ["Soprano.mp3"] }
    ];
    let tempVoices = [];

    // Variáveis do Metrônomo
    let metronomeLoop = null;
    let metronomeSynth = null;
    let isMetronomePlaying = false;
    let currentMetronomeId = null;

    // Seletores Gerais
    const linkOverview = document.getElementById('link-overview');
    const linkRepertoire = document.getElementById('link-repertoire');
    const sectionOverview = document.getElementById('section-overview');
    const sectionRepertoire = document.getElementById('section-repertoire');
    const songListContainer = document.getElementById('song-list');
    
    // Seletores Modal/Form
    const modal = document.getElementById('modal-add-song');
    const btnOpenModal = document.getElementById('btn-open-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const formSaveSong = document.getElementById('form-save-song');
    
    // Seletores Busca API
    const apiSearchInput = document.getElementById('api-search-input');
    const apiSourceSelect = document.getElementById('api-search-source');
    const searchSection = document.getElementById('section-api-search');
    const btnHolyricsHelp = document.getElementById('btn-holyrics-help');
    const modalHelpHolyrics = document.getElementById('modal-help-holyrics');

    // Configuração Inicial de Busca
    if(apiSearchInput) apiSearchInput.setAttribute('autocomplete', 'off');
    
    const resultsDropdown = document.createElement('div');
    resultsDropdown.className = 'search-results-dropdown';
    if(apiSearchInput && apiSearchInput.parentElement) apiSearchInput.parentElement.appendChild(resultsDropdown);

    if(apiSourceSelect) {
        apiSourceSelect.addEventListener('change', () => {
            if(apiSourceSelect.value === 'holyrics') btnHolyricsHelp.classList.remove('hidden');
            else btnHolyricsHelp.classList.add('hidden');
            apiSearchInput.value = ''; resultsDropdown.style.display = 'none';
        });
    }
    if(btnHolyricsHelp) btnHolyricsHelp.addEventListener('click', () => modalHelpHolyrics.classList.remove('hidden'));

    // =========================================================================
    // 2. LÓGICA DO METRÔNOMO (TONE.JS)
    // =========================================================================

    // Função Global para ser chamada no HTML onclick
    window.toggleMetronome = async function(id, bpm) {
        event.stopPropagation(); // Impede abrir o acordeão da música

        if(!bpm || isNaN(bpm)) {
            showToast("BPM não definido", "error");
            return;
        }

        // Inicializa AudioContext (Necessário clique do usuário)
        await Tone.start();

        // Lógica de Toggle (Ligar/Desligar/Trocar)
        if (isMetronomePlaying && currentMetronomeId === id) {
            stopMetronome();
        } else {
            if(isMetronomePlaying) stopMetronome(); // Para o anterior se houver
            // Pequeno delay para garantir limpeza
            setTimeout(() => startMetronome(id, bpm), 50);
        }
    }

    function startMetronome(id, bpm) {
        if (!metronomeSynth) {
            metronomeSynth = new Tone.MembraneSynth({
                pitchDecay: 0.008,
                octaves: 2,
                envelope: { attack: 0.001, decay: 0.3, sustain: 0 }
            }).toDestination();
            metronomeSynth.volume.value = -10; // Volume agradável
        }

        Tone.Transport.bpm.value = bpm;

        metronomeLoop = new Tone.Loop((time) => {
            metronomeSynth.triggerAttackRelease("C5", "32n", time);
            
            // Feedback Visual (Animação do Botão)
            Tone.Draw.schedule(() => {
                const btn = document.getElementById(`btn-bpm-${id}`);
                if(btn) {
                    btn.style.transform = "scale(1.1)";
                    setTimeout(() => btn.style.transform = "scale(1)", 100);
                }
            }, time);
        }, "4n");

        metronomeLoop.start(0);
        Tone.Transport.start();
        
        isMetronomePlaying = true;
        currentMetronomeId = id;
        updateMetronomeUI(id, true);
        showToast(`BPM: ${bpm}`, 'info');
    }

    function stopMetronome() {
        if (metronomeLoop) {
            metronomeLoop.stop();
            metronomeLoop.dispose();
            metronomeLoop = null;
        }
        Tone.Transport.stop();
        
        if(currentMetronomeId) updateMetronomeUI(currentMetronomeId, false);
        isMetronomePlaying = false;
        currentMetronomeId = null;
    }

    function updateMetronomeUI(id, isPlaying) {
        const btn = document.getElementById(`btn-bpm-${id}`);
        const icon = document.getElementById(`icon-bpm-${id}`);
        
        if(!btn || !icon) return;

        if (isPlaying) {
            btn.classList.add('playing'); // Adicionei classe CSS para ficar vermelho
            icon.className = "fas fa-stop bpm-icon-state";
        } else {
            btn.classList.remove('playing');
            icon.className = "fas fa-play bpm-icon-state";
        }
    }


    // =========================================================================
    // 3. RENDERIZAÇÃO DA LISTA (LAYOUT CORRIGIDO)
    // =========================================================================
    function renderSongs(filter = "") {
        if(!songListContainer) return;
        songListContainer.innerHTML = "";
        
        const filtered = songs.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()) || s.artist.toLowerCase().includes(filter.toLowerCase()));
        
        if (filtered.length === 0) {
            songListContainer.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);"><i class="fas fa-music fa-2x"></i><p>Nada encontrado.</p></div>`;
            return;
        }

        filtered.forEach(song => {
            // HTML das Vozes
            let voicesHtml = "";
            if(song.voices && song.voices.length > 0) {
                voicesHtml = `<div class="voices-playback-list">${song.voices.map(v => 
                    `<div style="background:rgba(255,255,255,0.05); padding:8px; margin-bottom:5px; border-radius:6px; font-size:13px; display:flex; align-items:center;">
                        <i class="fas fa-play-circle" style="color:#3b82f6; margin-right:8px;"></i> ${v}
                    </div>`).join('')}</div>`;
            } else {
                voicesHtml = `<p style="color:var(--text-muted); font-size:13px; font-style:italic;">Nenhum arquivo de voz.</p>`;
            }

            const el = document.createElement('div');
            el.className = 'song-item'; 
            
            // HTML PRINCIPAL DO CARD (Aqui foi feita a correção do layout)
            el.innerHTML = `
                <div class="song-header" onclick="toggleAccordion(this)">
                    <div class="song-info">
                        <h4>${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                    
                    <div class="song-meta">
                        <span id="btn-bpm-${song.id}" class="badge badge-bpm" onclick="toggleMetronome(${song.id}, ${song.bpm || 0})">
                            <i class="fas fa-heartbeat"></i> 
                            <span>${song.bpm || '?'}</span>
                            <i id="icon-bpm-${song.id}" class="fas fa-play bpm-icon-state" style="font-size:10px; margin-left:5px;"></i>
                        </span>
                        
                        <span class="badge badge-key">${song.key||'?'}</span>
                        
                        <button class="btn-icon" onclick="event.stopPropagation(); openModalEdit(${song.id}, 'info')">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>

                <div class="song-details">
                    <div class="tabs-header">
                        <button class="tab-btn active" onclick="switchTab(this, 'cifra-${song.id}')">Cifra</button>
                        <button class="tab-btn" onclick="switchTab(this, 'audio-${song.id}')">Áudio</button>
                        <button class="btn-icon btn-delete" style="margin-left:auto;" onclick="deleteSong(${song.id})"><i class="fas fa-trash"></i></button>
                    </div>
                    
                    <div id="cifra-${song.id}" class="tab-content active">
                        <div class="internal-toolbar">
                            <button class="btn-small btn-holyrics" onclick="transmitToHolyrics(${song.id})"><i class="fas fa-broadcast-tower"></i> Transmitir</button>
                            <button class="btn-small btn-edit-action" onclick="openModalEdit(${song.id}, 'cifra')">Editar</button>
                        </div>
                        <div class="cifra-wrapper"><div class="cifra-container">${song.cifra}</div></div>
                    </div>
                    
                    <div id="audio-${song.id}" class="tab-content">
                        <div class="internal-toolbar"><button class="btn-small btn-edit-action" onclick="openModalEdit(${song.id}, 'audio')">Editar</button></div>
                        <div style="padding:20px;">
                            <h5 style="color:white; margin-bottom:10px;">Link de Referência</h5>
                            <p>${song.link ? `<a href="${song.link}" target="_blank" style="color:#60a5fa;">Abrir Link Externo</a>` : '<span style="color:var(--text-muted)">Link não informado</span>'}</p>
                            <h5 style="color:white; margin-top:20px; margin-bottom:10px;">Arquivos de Vozes</h5>
                            ${voicesHtml}
                        </div>
                    </div>
                </div>`;
            songListContainer.appendChild(el);
        });
    }
    const searchInput = document.getElementById('search-song');
    if(searchInput) searchInput.addEventListener('input', (e) => renderSongs(e.target.value));


    // =========================================================================
    // 4. NAVEGAÇÃO E UTILS
    // =========================================================================
    
    function switchSection(targetSection, activeLink) {
        document.querySelectorAll('.view-section').forEach(s => { s.classList.remove('active-section'); s.classList.add('hidden-section'); });
        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
        if(targetSection) { targetSection.classList.remove('hidden-section'); targetSection.classList.add('active-section'); }
        if(activeLink) activeLink.classList.add('active');
    }
    if(linkOverview) linkOverview.addEventListener('click', (e) => { e.preventDefault(); switchSection(sectionOverview, linkOverview); });
    if(linkRepertoire) linkRepertoire.addEventListener('click', (e) => { e.preventDefault(); switchSection(sectionRepertoire, linkRepertoire); });

    window.toggleAccordion = (h) => h.parentElement.classList.toggle('open');
    window.switchTab = (b, t) => {
        const c = b.closest('.song-details');
        c.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
        c.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); document.getElementById(t).classList.add('active');
    }

    // =========================================================================
    // 5. LÓGICA DE BUSCA UNIFICADA (LRCLIB, VAGALUME, HOLYRICS)
    // =========================================================================

    function debounce(func, wait) {
        let timeout;
        return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    async function searchSourceLrclib(term) {
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        return data.filter(i => i.plainLyrics).map(i => ({ source: 'lrclib', id: i.id, title: i.trackName, artist: i.artistName, fullData: i }));
    }

    async function searchSourceVagalume(term) {
        const res = await fetch(`https://api.vagalume.com.br/search.artmus?q=${encodeURIComponent(term)}&limit=5`);
        const data = await res.json();
        return (data.response.docs || []).filter(d => d.title && d.band && d.url).map(d => ({ source: 'vagalume', id: d.id, title: d.title, artist: d.band, url: d.url }));
    }

    async function searchSourceHolyrics(term) {
        const config = JSON.parse(localStorage.getItem('louvor_config_data')) || {};
        const port = config.holyricsPort || "8091";
        const token = config.holyricsToken || ""; 

        if(!config.holyricsIp) throw new Error("Configure o IP");
        if(!token) throw new Error("Configure o Token");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const res = await fetch(`http://${config.holyricsIp}:${port}/api/lyrics/search?q=${encodeURIComponent(term)}&token=${token}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            
            if (data.status === 'error') {
                if (data.error === 'invalid token') throw new Error("Token do Holyrics inválido");
                throw new Error("Erro do Holyrics: " + data.error);
            }
            const list = data.data || data;
            if (!Array.isArray(list)) return [];
            return list.map(m => ({ source: 'holyrics', id: m.id || Date.now(), title: m.title || m.nome, artist: m.artist || m.cantor, fullData: m }));
        } catch (e) {
            if (e.message.includes("Token")) throw e;
            throw new Error(`Erro conexão: ${e.message}`);
        }
    }

    async function getDetailsVagalume(url) {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://www.vagalume.com.br'+url)}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const lyrics = doc.getElementById('lyrics') || doc.querySelector('.lyrics');
        if(!lyrics) throw new Error("Letra não encontrada");
        
        let txt = lyrics.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        const ta = document.createElement("textarea"); ta.innerHTML = txt;
        
        let ytid = null;
        for(let s of doc.querySelectorAll('script')) {
            if(s.innerText.includes('videoID')) {
                let m = s.innerText.match(/videoID\s*=\s*["']([^"']+)["']/);
                if(m) ytid = m[1];
            }
        }
        return { text: ta.value.trim(), ytid: ytid };
    }

    // Listener de Busca
    if(apiSearchInput) {
        apiSearchInput.addEventListener('input', debounce(async (e) => {
            const term = e.target.value.trim();
            const source = apiSourceSelect.value;
            if(term.length < 3) { resultsDropdown.style.display = 'none'; return; }

            resultsDropdown.style.display = 'block';
            resultsDropdown.innerHTML = `<div style="padding:10px;text-align:center;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> Buscando em <b>${source.toUpperCase()}</b>...</div>`;

            try {
                let res = [];
                if(source==='lrclib') res = await searchSourceLrclib(term);
                else if(source==='vagalume') res = await searchSourceVagalume(term);
                else if(source==='holyrics') res = await searchSourceHolyrics(term);
                renderApiResults(res);
            } catch (err) {
                resultsDropdown.innerHTML = `<div style="padding:10px;color:#ef4444;text-align:center;">${err.message}</div>`;
            }
        }, 600));
    }

    function renderApiResults(results) {
        if(!results || results.length===0) { resultsDropdown.innerHTML='<div style="padding:15px;text-align:center;color:#94a3b8;">Nada encontrado.</div>'; return; }
        resultsDropdown.innerHTML = '';
        results.forEach(song => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.style.padding='10px 15px'; div.style.borderBottom='1px solid rgba(255,255,255,0.05)'; div.style.display='flex'; div.style.justifyContent='space-between'; div.style.cursor='pointer';
            div.innerHTML = `<div><div style="font-weight:bold;color:white;">${song.title}</div><div style="font-size:12px;color:#94a3b8;">${song.artist} <span style="opacity:0.5">• ${song.source}</span></div></div><i class="fas fa-download" style="color:#3b82f6;"></i>`;
            
            div.addEventListener('click', async () => {
                const old = div.innerHTML;
                div.innerHTML = `<span style="color:#10b981;font-size:12px;"><i class="fas fa-spinner fa-spin"></i> Baixando...</span>`;
                try {
                    let d = {title:song.title, artist:song.artist, lyrics:"", link:""};
                    if(song.source==='lrclib') d.lyrics = song.fullData.plainLyrics;
                    else if(song.source==='vagalume') {
                        let det = await getDetailsVagalume(song.url);
                        d.lyrics = det.text; if(det.ytid) d.link = `https://www.youtube.com/watch?v=${det.ytid}`;
                    } else if(song.source==='holyrics') {
                        d.lyrics = song.fullData.lyrics || song.fullData.text || "";
                    }
                    document.getElementById('input-title').value = d.title;
                    document.getElementById('input-artist').value = d.artist;
                    document.getElementById('input-cifra').value = d.lyrics;
                    document.getElementById('input-link').value = d.link;
                    resultsDropdown.style.display='none';
                    apiSearchInput.value='';
                    showToast(`"${d.title}" importada!`, 'success');
                } catch(e) {
                    showToast("Erro: "+e.message, 'error');
                    div.innerHTML = old;
                }
            });
            resultsDropdown.appendChild(div);
        });
    }

    document.addEventListener('click', e => { if(searchSection && !searchSection.contains(e.target)) resultsDropdown.style.display='none'; });


    // =========================================================================
    // 6. TRANSMISSÃO PARA O HOLYRICS
    // =========================================================================
    window.transmitToHolyrics = (id) => {
        const song = songs.find(s => s.id === id);
        if(!song) return;
        const conf = JSON.parse(localStorage.getItem('louvor_config_data')) || {};
        if(!conf.holyricsIp) { showToast("Configure o IP.", 'error'); return; }
        
        const port = conf.holyricsPort || "8091";
        const token = conf.holyricsToken || ""; 

        const btn = event.currentTarget;
        const old = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ...`;

        fetch(`http://${conf.holyricsIp}:${port}/api/lyrics/push?token=${token}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ song_id: song.id, title: song.title, text: song.cifra })
        }).then(res => {
            if(res.ok) {
                showToast("Enviado para o telão!", 'success');
                btn.innerHTML = `<i class="fas fa-check"></i> Enviado!`;
            } else { throw new Error("Erro ao enviar"); }
        }).catch(e => { 
            console.error(e); showToast("Erro no envio", 'error'); btn.innerHTML = old;
        });
        setTimeout(() => { if(btn.innerHTML !== old) btn.innerHTML = old; }, 2000);
    }


    // =========================================================================
    // 7. CRUD E VOZES (UPLOAD)
    // =========================================================================

    // ABRIR MODAL
    if(btnOpenModal) btnOpenModal.addEventListener('click', () => {
        document.getElementById('edit-song-id').value = ""; 
        formSaveSong.reset();
        tempVoices = []; // Reseta lista
        renderModalVoicesList(); // Limpa visual
        document.querySelectorAll('.hidden-group').forEach(el => el.classList.remove('hidden-group'));
        if(document.getElementById('section-api-search')) document.getElementById('section-api-search').style.display='flex';
        modal.classList.remove('hidden');
    });

    if(btnCloseModal) btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

    // UPLOAD DE VOZES
    const fileInput = document.getElementById('file-upload-input');
    const btnAddVoice = document.getElementById('btn-add-voice');
    const voicesListUl = document.getElementById('voices-list');

    function renderModalVoicesList() {
        if(!voicesListUl) return;
        voicesListUl.innerHTML = "";
        tempVoices.forEach((voice, index) => {
            const li = document.createElement('li');
            li.className = 'voice-item'; 
            li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.padding = '8px'; li.style.background = 'rgba(255,255,255,0.05)'; li.style.marginBottom = '5px'; li.style.borderRadius='4px';
            li.innerHTML = `<span><i class="fas fa-file-audio" style="margin-right:5px;"></i> ${voice}</span> <i class="fas fa-times" style="cursor:pointer; color:#ef4444;" onclick="removeTempVoice(${index})"></i>`;
            voicesListUl.appendChild(li);
        });
    }

    window.removeTempVoice = (index) => {
        tempVoices.splice(index, 1);
        renderModalVoicesList();
    }

    if(btnAddVoice && fileInput) {
        btnAddVoice.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length > 0) {
                for (let i = 0; i < e.target.files.length; i++) {
                    tempVoices.push(e.target.files[i].name); 
                }
                renderModalVoicesList();
                fileInput.value = "";
            }
        });
    }

    // EDITAR
    window.openModalEdit = function(id, mode) {
        const song = songs.find(s => s.id === id);
        if(!song) return;
        document.getElementById('edit-song-id').value = song.id;
        document.getElementById('input-title').value = song.title;
        document.getElementById('input-artist').value = song.artist;
        document.getElementById('input-key').value = song.key;
        document.getElementById('input-bpm').value = song.bpm;
        document.getElementById('input-cifra').value = song.cifra;
        document.getElementById('input-link').value = song.link || "";
        
        tempVoices = song.voices ? [...song.voices] : [];
        renderModalVoicesList();
        if(document.getElementById('section-api-search')) document.getElementById('section-api-search').style.display = 'none';
        modal.classList.remove('hidden');
    }

    // SALVAR
    if(formSaveSong) formSaveSong.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('edit-song-id').value;
        const formData = {
            title: document.getElementById('input-title').value,
            artist: document.getElementById('input-artist').value,
            key: document.getElementById('input-key').value,
            bpm: document.getElementById('input-bpm').value,
            cifra: document.getElementById('input-cifra').value,
            link: document.getElementById('input-link').value,
            voices: [...tempVoices]
        };

        if(editId) {
            const index = songs.findIndex(s => s.id == editId);
            if(index !== -1) songs[index] = { ...songs[index], ...formData };
            showToast("Atualizado!", 'success');
        } else {
            songs.push({ id: Date.now(), ...formData });
            showToast("Criado!", 'success');
        }
        renderSongs();
        modal.classList.add('hidden');
    });

    // EXCLUIR
    window.deleteSong = function(id) {
        if(confirm("Excluir?")) {
            songs = songs.filter(s => s.id !== id);
            renderSongs();
            showToast("Removido.", 'info');
        }
    }

    // Render Inicial
    renderSongs();
});