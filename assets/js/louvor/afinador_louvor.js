// --- AFINADOR_LOUVOR.JS (CORRIGIDO) ---

let audioContext = null;
let micStream = null;
let pitch;
let isTunerRunning = false;

const btnStart = document.getElementById('btn-start-tuner');
const noteElem = document.getElementById('tuner-note');
const freqElem = document.getElementById('tuner-freq');
const needleElem = document.getElementById('tuner-needle');
const statusElem = document.getElementById('tuner-status');

// URL do modelo (garantindo que não tenha cache antigo)
const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';

async function toggleTuner() {
    if (!isTunerRunning) {
        // --- LIGAR ---
        try {
            statusElem.innerText = "Iniciando áudio...";
            btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inicializando...';

            // 1. Cria o contexto de áudio
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // CORREÇÃO CRÍTICA: Forçar o áudio a acordar (navegadores bloqueiam se não fizer isso)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // 2. Pede permissão do mic
            statusElem.innerText = "Aguardando microfone...";
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            // 3. Inicia a IA
            statusElem.innerText = "Baixando modelo IA (aguarde)...";
            startPitchDetection();

        } catch (err) {
            console.error("ERRO NO AFINADOR:", err);
            isTunerRunning = false;
            // Mostra o erro real na tela
            statusElem.innerHTML = `<span style="color:#ef4444">Erro: ${err.message || err.name}</span>`;
            btnStart.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Tentar Novamente';
        }
    } else {
        // --- DESLIGAR ---
        stopTuner();
    }
}

function startPitchDetection() {
    // Verifica se a biblioteca carregou
    if (typeof ml5 === 'undefined') {
        throw new Error("Biblioteca ML5 não carregou. Verifique sua internet.");
    }

    pitch = ml5.pitchDetection(modelUrl, audioContext, micStream, modelLoaded);
}

function modelLoaded() {
    // Se chegou aqui, tudo funcionou
    statusElem.innerText = "Microfone ouvindo...";
    statusElem.style.color = "#10b981"; // Verde
    
    btnStart.innerHTML = '<i class="fas fa-stop"></i> Desligar';
    btnStart.classList.add('active'); // Estilo visual de ligado
    
    isTunerRunning = true;
    getPitch(); // Começa o loop
}

function stopTuner() {
    if(audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if(micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    
    isTunerRunning = false;
    noteElem.innerText = "--";
    freqElem.innerText = "0";
    needleElem.style.transform = `translateX(-50%) rotate(0deg)`; // Volta pro meio
    
    btnStart.innerHTML = '<i class="fas fa-power-off"></i> Ligar Afinador';
    btnStart.classList.remove('active');
    
    statusElem.innerText = "Afinador desligado.";
    statusElem.style.color = "var(--text-muted)";
}

function getPitch() {
    if (!isTunerRunning || !pitch) return;

    pitch.getPitch((err, frequency) => {
        if (frequency) {
            freqElem.innerText = frequency.toFixed(1);
            
            // Matemática da nota
            let midiNum = 12 * (Math.log(frequency / 440) / Math.log(2)) + 69;
            let noteIndex = Math.round(midiNum) % 12;
            
            const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            let note = notes[noteIndex];

            // Cálculo do desvio (cents)
            let detune = midiNum - Math.round(midiNum); 
            
            if(note) updateUI(note, detune);
        }
        // Chama a si mesmo novamente se ainda estiver ligado
        if(isTunerRunning) {
            requestAnimationFrame(getPitch); // Mais suave que recursão direta
        }
    })
}

function updateUI(note, detune) {
    noteElem.innerText = note;

    // Rotação do ponteiro (-45deg a +45deg)
    let angle = detune * 90; 
    
    // Trava visual para não girar demais
    if(angle > 45) angle = 45;
    if(angle < -45) angle = -45;

    needleElem.style.transform = `translateX(-50%) rotate(${angle}deg)`;

    // Se estiver afinado (erro menor que 5%)
    if (Math.abs(detune) < 0.05) {
        needleElem.classList.add('tuned');
        noteElem.classList.add('in-tune');
        // Opcional: Vibração no celular
        if(navigator.vibrate) navigator.vibrate(5);
    } else {
        needleElem.classList.remove('tuned');
        noteElem.classList.remove('in-tune');
    }
}

if(btnStart) btnStart.addEventListener('click', toggleTuner);