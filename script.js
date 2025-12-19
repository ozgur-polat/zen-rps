document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let playerScore = 0;
    let computerScore = 0;
    let isProcessing = false;

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

    // Init
    loadScore();

    // Event Listeners
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isProcessing || isGameOver) return;
            playRound(btn.dataset.choice);
        });
    });

    if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
    if (resetBtn) resetBtn.addEventListener('click', resetGame);

    function resetGame() {
        if (isProcessing) return;
        playerScore = 0;
        computerScore = 0;
        isGameOver = false;
        controls.classList.remove('disabled');
        updateScoreUI();
        saveScore();

        // Visual feedback
        resultText.innerText = "SCORE RESET";

        // Hide Overlay logic
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');

        setTimeout(() => {
            if (!isProcessing) resultText.innerText = "CHOOSE";
        }, 1000);
    }

    function playRound(playerChoice) {
        isProcessing = true;

        // 1. Disable controls
        controls.classList.add('disabled');
        resetBtn.disabled = true;
        resultText.innerText = "";
        resultText.style.color = "var(--text-color)";

        // 2. Setup Arena (Clear to Shake State - Hidden Mystery Icon)
        updateFighter(pFighter, 'hidden');
        updateFighter(cFighter, 'hidden');

        pFighter.classList.add('active');
        cFighter.classList.add('active');

        // 3. Shake + Countdown
        pFighter.classList.add('shaking');
        cFighter.classList.add('shaking');

        let count = 3;
        resultText.innerText = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                resultText.innerText = count;
            } else {
                clearInterval(interval);

                // 4. Reveal
                pFighter.classList.remove('shaking');
                cFighter.classList.remove('shaking');

                // Show Actual Choices
                updateFighter(pFighter, playerChoice); // Reveal Player
                const computerChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
                updateFighter(cFighter, computerChoice); // Reveal CPU

                pFighter.classList.add('reveal');
                cFighter.classList.add('reveal');

                // Logic & Result
                const result = getWinner(playerChoice, computerChoice);
                handleResult(result);

                // Cleanup
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
            resultText.innerText = "VICTORY";
            resultText.style.color = "var(--accent-win)";
            bgPulse.classList.add('pulse-win');
        } else if (result === 'loss') {
            computerScore++;
            resultText.innerText = "DEFEAT";
            resultText.style.color = "var(--accent-loss)";
            bgPulse.classList.add('pulse-loss');
        } else {
            resultText.innerText = "DRAW";
            resultText.style.color = "var(--accent-tie)";
            bgPulse.classList.add('pulse-tie');
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
