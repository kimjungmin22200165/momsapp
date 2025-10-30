class AnipangGame {
    constructor() {
        this.boardSize = 8;
        this.animalTypes = 6;
        this.board = [];
        this.score = 0;
        this.timeLimit = 60;
        this.targetScore = 10000;
        this.timeRemaining = this.timeLimit;
        this.selectedBlock = null;
        this.isProcessing = false;
        this.gameRunning = false;
        this.timer = null;

        // 동물 이모지
        this.animals = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊'];

        // 터치/드래그 관련
        this.touchStartPos = null;
        this.isDragging = false;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.boardElement = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.timeElement = document.getElementById('time');
        this.targetElement = document.getElementById('target');
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.gameResultElement = document.getElementById('game-result');
        this.playAgainBtn = document.getElementById('play-again-btn');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.startGame());
        this.playAgainBtn.addEventListener('click', () => {
            this.gameOverModal.classList.remove('show');
            this.startGame();
        });
    }

    startGame() {
        this.score = 0;
        this.timeRemaining = this.timeLimit;
        this.gameRunning = true;
        this.selectedBlock = null;

        this.updateDisplay();
        this.startBtn.style.display = 'none';
        this.restartBtn.style.display = 'inline-block';

        this.initBoard();
        this.renderBoard();
        this.startTimer();
    }

    initBoard() {
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = this.getRandomAnimal();
            }
        }

        // 초기 매칭 제거
        while (this.findMatches().length > 0) {
            this.initBoard();
        }
    }

    getRandomAnimal() {
        return Math.floor(Math.random() * this.animalTypes);
    }

    renderBoard() {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const block = document.createElement('div');
                block.className = 'block';
                block.dataset.row = row;
                block.dataset.col = col;
                block.dataset.animal = this.board[row][col];
                block.textContent = this.animals[this.board[row][col]];

                // 클릭 이벤트
                block.addEventListener('click', () => this.handleBlockClick(row, col));

                // 터치 이벤트 (모바일)
                block.addEventListener('touchstart', (e) => this.handleTouchStart(e, row, col), { passive: true });
                block.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
                block.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

                this.boardElement.appendChild(block);
            }
        }
    }

    handleBlockClick(row, col) {
        if (!this.gameRunning || this.isProcessing) return;

        const clickedBlock = { row, col };

        if (!this.selectedBlock) {
            // 첫 번째 블록 선택
            this.selectedBlock = clickedBlock;
            this.highlightBlock(row, col, true);
        } else {
            // 두 번째 블록 선택
            if (this.selectedBlock.row === row && this.selectedBlock.col === col) {
                // 같은 블록 클릭 - 선택 취소
                this.highlightBlock(row, col, false);
                this.selectedBlock = null;
            } else if (this.isAdjacent(this.selectedBlock, clickedBlock)) {
                // 인접한 블록 - 교환 시도
                this.swapBlocks(this.selectedBlock, clickedBlock);
            } else {
                // 인접하지 않은 블록 - 선택 변경
                this.highlightBlock(this.selectedBlock.row, this.selectedBlock.col, false);
                this.selectedBlock = clickedBlock;
                this.highlightBlock(row, col, true);
            }
        }
    }

    isAdjacent(block1, block2) {
        const rowDiff = Math.abs(block1.row - block2.row);
        const colDiff = Math.abs(block1.col - block2.col);
        // 상하좌우 또는 대각선 (1칸 이내)
        return (rowDiff <= 1 && colDiff <= 1) && (rowDiff + colDiff > 0);
    }

    highlightBlock(row, col, highlight) {
        const blockElement = this.boardElement.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
        );
        if (blockElement) {
            if (highlight) {
                blockElement.classList.add('selected');
            } else {
                blockElement.classList.remove('selected');
            }
        }
    }

    async swapBlocks(block1, block2) {
        this.isProcessing = true;

        // 보드에서 교환
        const temp = this.board[block1.row][block1.col];
        this.board[block1.row][block1.col] = this.board[block2.row][block2.col];
        this.board[block2.row][block2.col] = temp;

        // UI 업데이트
        this.renderBoard();

        // 매칭 확인
        const matches = this.findMatches();

        if (matches.length > 0) {
            // 매칭 성공
            this.highlightBlock(block1.row, block1.col, false);
            this.selectedBlock = null;
            await this.processMatches();
        } else {
            // 매칭 실패 - 되돌리기
            await this.delay(300);
            this.board[block2.row][block2.col] = this.board[block1.row][block1.col];
            this.board[block1.row][block1.col] = temp;
            this.renderBoard();
            this.highlightBlock(block1.row, block1.col, false);
            this.selectedBlock = null;
        }

        this.isProcessing = false;
    }

    findMatches() {
        const matches = [];

        // 가로 매칭 체크
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize - 2; col++) {
                const animal = this.board[row][col];
                if (animal === this.board[row][col + 1] &&
                    animal === this.board[row][col + 2]) {

                    const match = [{ row, col }];
                    let checkCol = col + 1;

                    while (checkCol < this.boardSize && this.board[row][checkCol] === animal) {
                        match.push({ row, col: checkCol });
                        checkCol++;
                    }

                    matches.push(match);
                    col = checkCol - 1;
                }
            }
        }

        // 세로 매칭 체크
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize - 2; row++) {
                const animal = this.board[row][col];
                if (animal === this.board[row + 1][col] &&
                    animal === this.board[row + 2][col]) {

                    const match = [{ row, col }];
                    let checkRow = row + 1;

                    while (checkRow < this.boardSize && this.board[checkRow][col] === animal) {
                        match.push({ row: checkRow, col });
                        checkRow++;
                    }

                    matches.push(match);
                    row = checkRow - 1;
                }
            }
        }

        return matches;
    }

    async processMatches() {
        let matches = this.findMatches();

        while (matches.length > 0) {
            // 매칭된 블록 제거 애니메이션
            await this.removeMatches(matches);

            // 블록 떨어뜨리기
            await this.dropBlocks();

            // 새 블록 생성
            this.fillBoard();

            // UI 업데이트
            this.renderBoard();

            await this.delay(300);

            // 다시 매칭 확인 (연쇄)
            matches = this.findMatches();
        }
    }

    async removeMatches(matches) {
        const uniqueBlocks = new Set();

        matches.forEach(match => {
            match.forEach(block => {
                uniqueBlocks.add(`${block.row},${block.col}`);
            });
        });

        // 점수 추가
        const matchCount = uniqueBlocks.size;
        this.score += matchCount * 100;
        this.updateDisplay();

        // 애니메이션
        uniqueBlocks.forEach(blockKey => {
            const [row, col] = blockKey.split(',').map(Number);
            const blockElement = this.boardElement.querySelector(
                `[data-row="${row}"][data-col="${col}"]`
            );
            if (blockElement) {
                blockElement.classList.add('matched');
            }
        });

        await this.delay(400);

        // 보드에서 제거
        uniqueBlocks.forEach(blockKey => {
            const [row, col] = blockKey.split(',').map(Number);
            this.board[row][col] = -1; // 빈 공간 표시
        });
    }

    async dropBlocks() {
        for (let col = 0; col < this.boardSize; col++) {
            let emptyRow = this.boardSize - 1;

            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.board[row][col] !== -1) {
                    if (row !== emptyRow) {
                        this.board[emptyRow][col] = this.board[row][col];
                        this.board[row][col] = -1;
                    }
                    emptyRow--;
                }
            }
        }
    }

    fillBoard() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === -1) {
                    this.board[row][col] = this.getRandomAnimal();
                }
            }
        }
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateDisplay();

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.gameRunning = false;
        clearInterval(this.timer);

        this.finalScoreElement.textContent = this.score;

        if (this.score >= this.targetScore) {
            this.gameResultElement.textContent = '🎉 성공! 🎉';
            this.gameResultElement.style.color = '#4ecdc4';
        } else {
            this.gameResultElement.textContent = '게임 종료';
            this.gameResultElement.style.color = '#667eea';
        }

        this.gameOverModal.classList.add('show');
    }

    updateDisplay() {
        this.scoreElement.textContent = this.score;
        this.timeElement.textContent = this.timeRemaining;
        this.targetElement.textContent = this.targetScore;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 터치 이벤트 핸들러 (모바일 지원)
    handleTouchStart(e, row, col) {
        if (!this.gameRunning || this.isProcessing) return;

        this.touchStartPos = { row, col };
        this.isDragging = false;

        // 첫 번째 블록 선택
        if (!this.selectedBlock) {
            this.selectedBlock = { row, col };
            this.highlightBlock(row, col, true);
        }
    }

    handleTouchMove(e) {
        if (!this.gameRunning || this.isProcessing || !this.touchStartPos) return;

        e.preventDefault(); // 스크롤 방지

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (element && element.classList.contains('block')) {
            const row = parseInt(element.dataset.row);
            const col = parseInt(element.dataset.col);

            if (row !== this.touchStartPos.row || col !== this.touchStartPos.col) {
                this.isDragging = true;

                // 드래그 중 하이라이트 업데이트
                if (this.selectedBlock &&
                    this.isAdjacent(this.touchStartPos, { row, col })) {
                    // 임시로 대상 블록 표시
                    const allBlocks = document.querySelectorAll('.block');
                    allBlocks.forEach(b => {
                        if (b !== element && !b.classList.contains('selected')) {
                            b.style.opacity = '0.5';
                        }
                    });
                    element.style.opacity = '1';
                }
            }
        }
    }

    handleTouchEnd(e) {
        if (!this.gameRunning || this.isProcessing || !this.touchStartPos) return;

        // 모든 블록의 투명도 복원
        const allBlocks = document.querySelectorAll('.block');
        allBlocks.forEach(b => b.style.opacity = '1');

        if (this.isDragging && this.selectedBlock) {
            const touch = e.changedTouches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);

            if (element && element.classList.contains('block')) {
                const row = parseInt(element.dataset.row);
                const col = parseInt(element.dataset.col);

                if (this.isAdjacent(this.touchStartPos, { row, col })) {
                    // 드래그로 교환
                    this.swapBlocks(this.touchStartPos, { row, col });
                } else {
                    // 인접하지 않으면 선택 취소
                    this.highlightBlock(this.selectedBlock.row, this.selectedBlock.col, false);
                    this.selectedBlock = null;
                }
            } else {
                // 블록 밖으로 나가면 선택 취소
                if (this.selectedBlock) {
                    this.highlightBlock(this.selectedBlock.row, this.selectedBlock.col, false);
                    this.selectedBlock = null;
                }
            }
        }

        this.touchStartPos = null;
        this.isDragging = false;
    }
}

// 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
    new AnipangGame();
});
