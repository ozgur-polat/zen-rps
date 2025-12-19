document.addEventListener('DOMContentLoaded', () => {
    // Sound System
    class SoundManager {
        constructor() {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = localStorage.getItem('zen-muted') !== 'true';
        }

        play(type) {
            if (!this.enabled || this.ctx.state === 'suspended') {
                if (!this.enabled) return;
                this.ctx.resume();
            }

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;

            switch (type) {
                case 'tick':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'win':
                    // Cheering Gong: Complex harmonics + modulation
                    const root = 261.63; // C4

                    // Main Gong Swing
                    const osc1 = this.ctx.createOscillator();
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(root, now);
                    osc1.frequency.exponentialRampToValueAtTime(root * 0.98, now + 1.5);

                    const gain1 = this.ctx.createGain();
                    gain1.gain.setValueAtTime(0.3, now);
                    gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

                    osc1.connect(gain1);
                    gain1.connect(this.ctx.destination);
                    osc1.start(now);
                    osc1.stop(now + 2.0);

                    // "Cheer" Shimmy (High frequency cluster)
                    for (let i = 0; i < 3; i++) {
                        const oscHigh = this.ctx.createOscillator();
                        oscHigh.type = 'sine';
                        oscHigh.frequency.value = root * (2 + i * 0.5) + Math.random() * 20;
                        const gainHigh = this.ctx.createGain();
                        gainHigh.gain.setValueAtTime(0.1, now);
                        gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                        oscHigh.connect(gainHigh);
                        gainHigh.connect(this.ctx.destination);
                        oscHigh.start(now);
                        oscHigh.stop(now + 0.8);
                    }
                    break;

                case 'loss':
                    // Subtle Wind: White noise through Lowpass filter
                    const bufferSize = this.ctx.sampleRate * 2.0;
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }

                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(400, now);
                    filter.frequency.linearRampToValueAtTime(100, now + 2.0); // Filter closes down

                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.15, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(this.ctx.destination);
                    noise.start(now);
                    break;

                case 'tie':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(330, now);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'gong':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(150, now);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
                    osc.start(now);
                    osc.stop(now + 2);
                    break;
            }
        }

        toggle() {
            this.enabled = !this.enabled;
            localStorage.setItem('zen-muted', !this.enabled);
            return this.enabled;
        }
    }

    // Network System
    class NetworkManager {
        constructor() {
            this.peer = null;
            this.conn = null;
            this.myId = null;
            this.isHost = false;
        }

        generateShortId() {
            return Math.random().toString(36).substr(2, 6).toUpperCase();
        }

        initHost(onReady, onConnect) {
            this.isHost = true;
            this.myId = this.generateShortId();
            this.peer = new Peer(this.myId);

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                onReady(id);
            });

            this.peer.on('connection', (conn) => {
                this.conn = conn;
                this.setupConnectionHandlers(onConnect);
            });
        }

        initJoin(hostId, onConnect, onError) {
            this.isHost = false;
            this.peer = new Peer(); // Auto-gen ID for joiner

            this.peer.on('open', () => {
                this.conn = this.peer.connect(hostId);
                this.conn.on('open', () => {
                    this.setupConnectionHandlers(onConnect);
                });
                this.conn.on('error', onError);
            });

            this.peer.on('error', onError);
        }

        setupConnectionHandlers(onConnect) {
            onConnect();
            this.conn.on('data', (data) => {
                handleNetworkData(data);
            });
            this.conn.on('close', () => {
                alert('Connection lost');
                location.reload();
            });
        }

        send(type, payload = {}) {
            if (this.conn && this.conn.open) {
                this.conn.send({ type, ...payload });
            }
        }
    }

    const net = new NetworkManager();
    const sounds = new SoundManager();

    // Game Logic
    let playerScore = 0;
    let computerScore = 0;
    let isProcessing = false;

    let isMultiplayer = false;
    let localChoice = null;
    let remoteChoice = null;
    let isRemoteReady = false; // For replay sync

    // UI Handling for Screens
    const screens = {
        start: document.getElementById('start-screen'),
        lobby: document.getElementById('lobby-screen'),
        game: document.getElementById('app') // The main game area
    };

    function showScreen(name) {
        screens.start.classList.add('hidden');
        screens.lobby.classList.add('hidden');
        if (name === 'game') return; // Game is background, just hide others
        screens[name].classList.remove('hidden');
    }

    // Menu Listeners
    const cpuBtn = document.getElementById('mode-cpu');
    if (cpuBtn) cpuBtn.addEventListener('click', () => {
        isMultiplayer = false;
        showScreen('game');
    });

    const friendBtn = document.getElementById('mode-friend');
    if (friendBtn) friendBtn.addEventListener('click', () => {
        isMultiplayer = true;
        showScreen('lobby');
        // Auto-generate host ID immediately for convenience
        net.initHost((id) => {
            document.getElementById('room-code-display').innerText = id;
            document.getElementById('host-status').innerText = "Waiting for friend...";
        }, () => {
            // On Connect
            document.getElementById('host-status').innerText = "Connected!";
            setTimeout(() => showScreen('game'), 1000);
            updatePlayerLabels("HOST", "FRIEND");
        });
    });

    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => {
        const code = document.getElementById('join-code-input').value.toUpperCase();
        const status = document.getElementById('join-status');
        if (code.length < 2) return;

        status.innerText = "Connecting...";
        net.initJoin(code, () => {
            status.innerText = "Connected!";
            setTimeout(() => showScreen('game'), 1000);
            updatePlayerLabels("FRIEND", "HOST");
        }, (err) => {
            status.innerText = "Connection Failed";
            console.error(err);
        });
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => showScreen('start'));

    const copyBtn = document.getElementById('copy-code-btn');
    if (copyBtn) copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(net.myId);
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "COPIED!";
        setTimeout(() => copyBtn.innerText = originalText, 1500);
    });

    function updatePlayerLabels(p1, p2) {
        const pLabel = document.querySelector('#score-container .score-block:first-child .score-label');
        const cLabel = document.querySelector('#score-container .score-block:last-child .score-label');
        if (pLabel) pLabel.innerText = "YOU";
        if (cLabel) cLabel.innerText = "ENEMY";
    }

    function handleNetworkData(data) {
        console.log('Received:', data);
        switch (data.type) {
            case 'CHOICE_COMMITTED':
                // Opponent has picked.
                resultText.innerText = "ENEMY READY";
                cFighter.classList.add('active'); // Show hidden icon
                updateFighter(cFighter, 'hidden');
                remoteChoice = 'HIDDEN'; // Placeholder
                checkRoundReady();
                break;

            case 'REVEAL_CHOICE':
                remoteChoice = data.choice;
                checkRoundReady();
                break;

            case 'PLAY_AGAIN':
                // Opponent wants to play again
                isRemoteReady = true;
                if (isGameOver) {
                    document.getElementById('play-again-btn').innerText = "OPPONENT READY";
                }
                checkResetReady();
                break;
        }
    }

    const CHOICES = ['rock', 'paper', 'scissors'];
    const WINNING_SCORE = 3;
    let isGameOver = false;

    // DOM Elements
    const pScoreEl = document.getElementById('player-score');
    const cScoreEl = document.getElementById('computer-score');
    const pFighter = document.getElementById('player-fighter');
    const cFighter = document.getElementById('computer-fighter');
    const resultText = document.getElementById('result-text');
    const buttons = document.querySelectorAll('.choice-btn');
    const controls = document.getElementById('controls');
    const resetBtn = document.getElementById('reset-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const gameOverOverlay = document.getElementById('game-over-overlay');

    // New Polish Elements (Assuming they will be added to HTML)
    const muteBtn = document.getElementById('mute-btn');

    // Init
    // loadScore(); // Disabled: Score resets on refresh

    // Event Listeners
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isProcessing || isGameOver) return;
            playRound(btn.dataset.choice);
        });
    });

    if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
    if (resetBtn) resetBtn.addEventListener('click', resetGame);

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const isEnabled = sounds.toggle();
            muteBtn.classList.toggle('muted', !isEnabled);
        });
        if (!sounds.enabled) muteBtn.classList.add('muted');
    }



    // Keyboard Support
    window.addEventListener('keydown', (e) => {
        if (isProcessing) return;

        switch (e.key.toLowerCase()) {
            case '1': case 'r': playRound('rock'); break;
            case '2': case 'p': playRound('paper'); break;
            case '3': case 's': playRound('scissors'); break;
            case ' ': if (isGameOver) resetGame(); break;
            case 'escape': resetGame(); break;
        }
    });

    function resetGame() {
        if (isProcessing) return;

        if (isMultiplayer) {
            net.send('PLAY_AGAIN');
            // Wait for opponent
            if (!isRemoteReady) {
                resultText.innerText = "WAITING FOR OPPONENT";
                document.getElementById('play-again-btn').innerText = "WAITING...";
                return;
            }
        }

        doReset();
    }

    function checkResetReady() {
        if (isMultiplayer && isRemoteReady) {
            // If I am also at Game Over screen, I can initiate if I clicked too?
            // Actually, simplified: both must click play again.
            // When play again clicked -> set localReady.
            // If localReady && remoteReady -> doReset()
        }
    }

    function doReset() {
        playerScore = 0;
        computerScore = 0;
        isGameOver = false;
        controls.classList.remove('disabled');
        updateScoreUI();
        if (!isMultiplayer) saveScore(); // Only save vs CPU

        // Visual feedback
        resultText.innerText = "SCORE RESET";

        // Hide Overlay logic
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

        setTimeout(() => {
            if (!isProcessing) resultText.innerText = "CHOOSE";
        }, 1000);

        isRemoteReady = false;
        if (isMultiplayer) document.getElementById('play-again-btn').innerText = "PLAY AGAIN";
    }

    // REMOVE OLD playRound function to avoid conflict
    // (Consolidated into the one above)

    function playRound(playerChoice) {
        if (isProcessing) return;

        if (isMultiplayer) {
            // Multiplayer Flow
            if (localChoice) return; // Already picked

            localChoice = playerChoice;
            updateFighter(pFighter, 'hidden');
            pFighter.classList.add('active');

            controls.classList.add('disabled'); // Lock temporarily
            resultText.innerText = "WAITING...";

            // 1. Send Commit signal
            net.send('REVEAL_CHOICE', { choice: playerChoice });

            checkRoundReady();

        } else {
            // CPU Flow (Original)
            isProcessing = true;
            controls.classList.add('disabled');
            resetBtn.disabled = true;
            resultText.innerText = "";
            resultText.style.color = "var(--text-color)";

            startShowdown(playerChoice, CHOICES[Math.floor(Math.random() * CHOICES.length)]);
        }
    }

    function checkRoundReady() {
        if (!isMultiplayer) return;

        // We need both choices to proceed
        if (localChoice && remoteChoice && remoteChoice !== 'HIDDEN') {
            startShowdown(localChoice, remoteChoice);
            // Reset for next round
            localChoice = null;
            remoteChoice = null;
        }
    }

    function startShowdown(pChoice, cChoice) {
        isProcessing = true;
        resultText.style.color = "var(--text-color)";

        // Setup Arena
        updateFighter(pFighter, 'hidden');
        updateFighter(cFighter, 'hidden');
        pFighter.classList.add('active');
        cFighter.classList.add('active');

        // Shake
        pFighter.classList.add('shaking');
        cFighter.classList.add('shaking');

        let count = 3;
        resultText.innerText = count;
        sounds.play('tick');

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                resultText.innerText = count;
                sounds.play('tick');
            } else {
                clearInterval(interval);

                // Reveal
                pFighter.classList.remove('shaking');
                cFighter.classList.remove('shaking');

                updateFighter(pFighter, pChoice);
                updateFighter(cFighter, cChoice);

                pFighter.classList.add('reveal');
                cFighter.classList.add('reveal');

                const result = getWinner(pChoice, cChoice);
                handleResult(result);

                setTimeout(() => {
                    pFighter.classList.remove('reveal');
                    cFighter.classList.remove('reveal');
                    isProcessing = false;
                    controls.classList.remove('disabled');
                    resetBtn.disabled = false;
                }, 1500);
            }
        }, 1000);
    }

    function getWinner(p, c) {
        if (p === c) return 'tie';
        if ((p === 'rock' && c === 'scissors') ||
            (p === 'paper' && c === 'rock') ||
            (p === 'scissors' && c === 'paper')) {
            return 'win';
        }
        return 'loss';
    }

    function handleResult(result) {
        const bgPulse = document.getElementById('bg-pulse');

        // Remove previous classes to restart animation if needed (void trick)
        bgPulse.className = '';
        void bgPulse.offsetWidth; // Trigger reflow

        if (result === 'win') {
            playerScore++;
            resultText.innerText = "YOU WON";
            resultText.style.color = "var(--accent-win)";
            bgPulse.classList.add('pulse-win');
            sounds.play('win');
        } else if (result === 'loss') {
            computerScore++;
            resultText.innerText = "YOU LOST";
            resultText.style.color = "var(--accent-loss)";
            bgPulse.classList.add('pulse-loss');
            sounds.play('loss');
        } else {
            resultText.innerText = "DRAW";
            resultText.style.color = "var(--accent-tie)";
            bgPulse.classList.add('pulse-tie');
            sounds.play('tie');
        }

        updateScoreUI();
        saveScore();

        // Check Winner
        if (playerScore >= WINNING_SCORE) {
            endGame('win');
        } else if (computerScore >= WINNING_SCORE) {
            endGame('loss');
        }
    }

    function endGame(result) {
        isGameOver = true;
        const bgPulse = document.getElementById('bg-pulse');

        // Ensure controls are locked
        controls.classList.add('disabled');

        if (result === 'win') {
            resultText.innerText = "MATCH WON";
            resultText.style.color = "var(--accent-win)";
        } else {
            resultText.innerText = "MATCH LOST";
            resultText.style.color = "var(--accent-loss)";
        }
        sounds.play('gong');

        // Show Play Again Overlay
        if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');
    }

    function updateFighter(el, choice) {
        el.innerHTML = '';
        const template = document.getElementById(`icon-${choice}`);
        if (template) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 100 100");
            const content = template.innerHTML;
            svg.innerHTML = content;
            el.appendChild(svg);
        }
    }

    function updateScoreUI() {
        if (pScoreEl) pScoreEl.innerText = playerScore;
        if (cScoreEl) cScoreEl.innerText = computerScore;
    }

    function saveScore() {
        localStorage.setItem('zen-rps-score', JSON.stringify({ p: playerScore, c: computerScore }));
    }

    function loadScore() {
        const data = JSON.parse(localStorage.getItem('zen-rps-score'));
        if (data) {
            playerScore = data.p;
            computerScore = data.c;
            updateScoreUI();
        }
    }
});
