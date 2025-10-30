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

        // 레벨 시스템
        this.currentLevel = 1;
        this.maxLevel = 100;
        this.unlockedLevel = 1;
        this.levelStars = {}; // 각 레벨별 별 개수 저장

        // 동물 이모지
        this.animals = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊'];

        // 터치/드래그 관련
        this.touchStartPos = null;
        this.isDragging = false;

        // 아이템 시스템
        this.items = {
            bomb: 3,
            lightning: 3,
            rainbow: 2,
            time: 2,
            shuffle: 2,
            hint: 5
        };
        this.activeItem = null;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // 레벨 선택 화면
        this.levelSelectScreen = document.getElementById('level-select-screen');
        this.levelGrid = document.getElementById('level-grid');
        this.gameContainer = document.querySelector('.game-container');

        // 게임 화면
        this.boardElement = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.timeElement = document.getElementById('time');
        this.targetElement = document.getElementById('target');
        this.currentLevelElement = document.getElementById('current-level');
        this.startBtn = document.getElementById('start-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.backBtn = document.getElementById('back-btn');

        // 모달
        this.gameOverModal = document.getElementById('game-over-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.gameResultElement = document.getElementById('game-result');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.nextLevelBtn = document.getElementById('next-level-btn');
        this.backToLevelsBtn = document.getElementById('back-to-levels-btn');

        // 아이템 버튼
        this.itemButtons = {
            bomb: document.getElementById('item-bomb'),
            lightning: document.getElementById('item-lightning'),
            rainbow: document.getElementById('item-rainbow'),
            time: document.getElementById('item-time'),
            shuffle: document.getElementById('item-shuffle'),
            hint: document.getElementById('item-hint')
        };
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.startGame());
        this.backBtn.addEventListener('click', () => this.showLevelSelect());

        this.playAgainBtn.addEventListener('click', () => {
            this.gameOverModal.classList.remove('show');
            this.startGame();
        });

        this.nextLevelBtn.addEventListener('click', () => {
            this.gameOverModal.classList.remove('show');
            this.currentLevel++;
            this.startGame();
        });

        this.backToLevelsBtn.addEventListener('click', () => {
            this.gameOverModal.classList.remove('show');
            this.showLevelSelect();
        });

        // 아이템 버튼 이벤트
        Object.keys(this.itemButtons).forEach(itemType => {
            this.itemButtons[itemType].addEventListener('click', () => this.activateItem(itemType));
        });

        // 초기화
        this.loadProgress();
        this.renderLevelSelect();
    }

    getLevelConfig(level) {
        // 난이도에 따른 설정
        const baseTime = 60;
        const baseTarget = 5000;

        // 레벨이 올라갈수록 목표 점수 증가, 시간은 감소
        const targetScore = baseTarget + (level - 1) * 500;
        const timeLimit = Math.max(30, baseTime - Math.floor((level - 1) / 5));

        // 30레벨 이상부터 장애물 추가
        const obstacleCount = level >= 30 ? Math.min(Math.floor((level - 30) / 5) + 2, 10) : 0;

        return {
            level,
            targetScore,
            timeLimit,
            obstacleCount
        };
    }

    startGame() {
        // 레벨 설정 적용
        const config = this.getLevelConfig(this.currentLevel);
        this.targetScore = config.targetScore;
        this.timeLimit = config.timeLimit;
        this.obstacleCount = config.obstacleCount;

        this.score = 0;
        this.timeRemaining = this.timeLimit;
        this.gameRunning = true;
        this.selectedBlock = null;
        this.activeItem = null;

        // 아이템 개수 리셋
        this.items = {
            bomb: 3,
            lightning: 3,
            rainbow: 2,
            time: 2,
            shuffle: 2,
            hint: 5
        };

        // 화면 전환
        this.levelSelectScreen.style.display = 'none';
        this.gameContainer.style.display = 'block';

        this.currentLevelElement.textContent = this.currentLevel;
        this.updateDisplay();
        this.updateItemButtons();
        this.startBtn.style.display = 'none';
        this.restartBtn.style.display = 'inline-block';

        this.initBoard();
        this.renderBoard();
        this.startTimer();
    }

    initBoard() {
        this.board = [];
        this.obstacles = []; // 장애물 위치 저장

        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = this.getRandomAnimal();
            }
        }

        // 장애물 추가 (30레벨 이상)
        if (this.obstacleCount > 0) {
            this.addObstacles();
        }

        // 초기 매칭 제거
        while (this.findMatches().length > 0) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (!this.isObstacle(row, col)) {
                        this.board[row][col] = this.getRandomAnimal();
                    }
                }
            }
        }
    }

    addObstacles() {
        // 랜덤 위치에 장애물 배치
        const positions = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                positions.push({ row, col });
            }
        }

        // Fisher-Yates 셔플
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // 장애물 배치
        this.obstacles = positions.slice(0, this.obstacleCount);
        this.obstacles.forEach(pos => {
            this.board[pos.row][pos.col] = -2; // -2는 장애물 표시
        });
    }

    isObstacle(row, col) {
        return this.board[row] && this.board[row][col] === -2;
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

                const cellValue = this.board[row][col];

                if (cellValue === -2) {
                    // 장애물
                    block.classList.add('obstacle');
                    block.textContent = '';
                } else {
                    // 일반 블록
                    block.dataset.animal = cellValue;
                    block.textContent = this.animals[cellValue];

                    // 클릭 이벤트
                    block.addEventListener('click', () => this.handleBlockClick(row, col));

                    // 터치 이벤트 (모바일)
                    block.addEventListener('touchstart', (e) => this.handleTouchStart(e, row, col), { passive: true });
                    block.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
                    block.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
                }

                this.boardElement.appendChild(block);
            }
        }
    }

    handleBlockClick(row, col) {
        if (!this.gameRunning || this.isProcessing) return;

        // 장애물은 클릭 불가
        if (this.isObstacle(row, col)) return;

        // 아이템이 활성화된 경우
        if (this.activeItem) {
            if (this.activeItem === 'bomb') {
                this.useBombItem(row, col);
            } else if (this.activeItem === 'lightning') {
                this.useLightningItem(row, col);
            } else if (this.activeItem === 'rainbow') {
                this.useRainbowItem(row, col);
            }
            return;
        }

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
                } else if (this.board[row][col] === -2) {
                    // 장애물은 그대로 유지
                    continue;
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

        const isSuccess = this.score >= this.targetScore;

        if (isSuccess) {
            this.gameResultElement.textContent = '🎉 성공! 🎉';
            this.gameResultElement.style.color = '#4ecdc4';

            // 별 개수 계산 (목표의 120% 이상이면 3개, 100% 이상이면 2개, 그 외 1개)
            let stars = 1;
            if (this.score >= this.targetScore * 1.5) {
                stars = 3;
            } else if (this.score >= this.targetScore * 1.2) {
                stars = 2;
            }

            // 진행 상태 저장
            if (!this.levelStars[this.currentLevel] || this.levelStars[this.currentLevel] < stars) {
                this.levelStars[this.currentLevel] = stars;
            }

            // 다음 레벨 잠금 해제
            if (this.currentLevel < this.maxLevel && this.currentLevel >= this.unlockedLevel) {
                this.unlockedLevel = this.currentLevel + 1;
            }

            this.saveProgress();

            // 다음 레벨 버튼 표시
            if (this.currentLevel < this.maxLevel) {
                this.nextLevelBtn.style.display = 'inline-block';
            } else {
                this.nextLevelBtn.style.display = 'none';
            }
        } else {
            this.gameResultElement.textContent = '게임 종료';
            this.gameResultElement.style.color = '#667eea';
            this.nextLevelBtn.style.display = 'none';
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

    // 아이템 시스템
    updateItemButtons() {
        Object.keys(this.itemButtons).forEach(itemType => {
            const button = this.itemButtons[itemType];
            const count = this.items[itemType];
            const countElement = button.querySelector('.item-count');

            if (countElement) {
                countElement.textContent = count;
            }

            if (count <= 0) {
                button.disabled = true;
            } else {
                button.disabled = false;
            }

            // 활성화된 아이템 표시
            if (this.activeItem === itemType) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    activateItem(itemType) {
        if (!this.gameRunning || this.items[itemType] <= 0) return;

        // 즉시 실행되는 아이템들
        if (itemType === 'time') {
            this.useTimeItem();
            return;
        }

        if (itemType === 'shuffle') {
            this.useShuffleItem();
            return;
        }

        if (itemType === 'hint') {
            this.useHintItem();
            return;
        }

        // 클릭이 필요한 아이템들
        if (this.activeItem === itemType) {
            // 같은 아이템 클릭 시 취소
            this.activeItem = null;
        } else {
            this.activeItem = itemType;
        }

        this.updateItemButtons();
    }

    async useBombItem(row, col) {
        if (this.items.bomb <= 0) return;

        this.items.bomb--;
        this.activeItem = null;
        this.updateItemButtons();
        this.isProcessing = true;

        // 3x3 영역의 블록 제거
        const blocksToRemove = [];
        for (let r = Math.max(0, row - 1); r <= Math.min(this.boardSize - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(this.boardSize - 1, col + 1); c++) {
                blocksToRemove.push({ row: r, col: c });
                const blockElement = this.boardElement.querySelector(
                    `[data-row="${r}"][data-col="${c}"]`
                );
                if (blockElement) {
                    blockElement.classList.add('matched');
                }
            }
        }

        await this.delay(400);

        // 점수 추가
        this.score += blocksToRemove.length * 100;
        this.updateDisplay();

        // 블록 제거
        blocksToRemove.forEach(block => {
            this.board[block.row][block.col] = -1;
        });

        await this.dropBlocks();
        this.fillBoard();
        this.renderBoard();
        await this.delay(300);

        // 추가 매칭 확인
        await this.processMatches();

        this.isProcessing = false;
    }

    async useLightningItem(row, col) {
        if (this.items.lightning <= 0) return;

        this.items.lightning--;
        this.activeItem = null;
        this.updateItemButtons();
        this.isProcessing = true;

        // 가로 또는 세로 중 더 많은 블록이 있는 방향 선택
        const rowBlocks = [];
        const colBlocks = [];

        for (let c = 0; c < this.boardSize; c++) {
            rowBlocks.push({ row, col: c });
        }

        for (let r = 0; r < this.boardSize; r++) {
            colBlocks.push({ row: r, col });
        }

        const blocksToRemove = rowBlocks.length >= colBlocks.length ? rowBlocks : colBlocks;

        // 애니메이션
        blocksToRemove.forEach(block => {
            const blockElement = this.boardElement.querySelector(
                `[data-row="${block.row}"][data-col="${block.col}"]`
            );
            if (blockElement) {
                blockElement.classList.add('matched');
            }
        });

        await this.delay(400);

        // 점수 추가
        this.score += blocksToRemove.length * 100;
        this.updateDisplay();

        // 블록 제거
        blocksToRemove.forEach(block => {
            this.board[block.row][block.col] = -1;
        });

        await this.dropBlocks();
        this.fillBoard();
        this.renderBoard();
        await this.delay(300);

        await this.processMatches();

        this.isProcessing = false;
    }

    async useRainbowItem(row, col) {
        if (this.items.rainbow <= 0) return;

        this.items.rainbow--;
        this.activeItem = null;
        this.updateItemButtons();
        this.isProcessing = true;

        const targetAnimal = this.board[row][col];
        const blocksToRemove = [];

        // 같은 종류의 모든 블록 찾기
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.board[r][c] === targetAnimal) {
                    blocksToRemove.push({ row: r, col: c });
                    const blockElement = this.boardElement.querySelector(
                        `[data-row="${r}"][data-col="${c}"]`
                    );
                    if (blockElement) {
                        blockElement.classList.add('matched');
                    }
                }
            }
        }

        await this.delay(400);

        // 점수 추가
        this.score += blocksToRemove.length * 150;
        this.updateDisplay();

        // 블록 제거
        blocksToRemove.forEach(block => {
            this.board[block.row][block.col] = -1;
        });

        await this.dropBlocks();
        this.fillBoard();
        this.renderBoard();
        await this.delay(300);

        await this.processMatches();

        this.isProcessing = false;
    }

    useTimeItem() {
        if (this.items.time <= 0) return;

        this.items.time--;
        this.timeRemaining += 10;
        this.updateDisplay();
        this.updateItemButtons();

        // 시간 추가 효과
        this.timeElement.style.color = '#4ecdc4';
        this.timeElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
            this.timeElement.style.color = '';
            this.timeElement.style.transform = '';
        }, 500);
    }

    useShuffleItem() {
        if (this.items.shuffle <= 0 || this.isProcessing) return;

        this.items.shuffle--;
        this.updateItemButtons();

        // 보드 섞기
        const allAnimals = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                allAnimals.push(this.board[row][col]);
            }
        }

        // Fisher-Yates 셔플
        for (let i = allAnimals.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allAnimals[i], allAnimals[j]] = [allAnimals[j], allAnimals[i]];
        }

        // 보드에 다시 배치
        let index = 0;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                this.board[row][col] = allAnimals[index++];
            }
        }

        this.renderBoard();
    }

    useHintItem() {
        if (this.items.hint <= 0 || this.isProcessing) return;

        this.items.hint--;
        this.updateItemButtons();

        // 가능한 매칭 찾기
        const possibleMove = this.findPossibleMove();

        if (possibleMove) {
            const { block1, block2 } = possibleMove;

            // 힌트 표시
            const element1 = this.boardElement.querySelector(
                `[data-row="${block1.row}"][data-col="${block1.col}"]`
            );
            const element2 = this.boardElement.querySelector(
                `[data-row="${block2.row}"][data-col="${block2.col}"]`
            );

            if (element1 && element2) {
                element1.style.border = '3px solid yellow';
                element2.style.border = '3px solid yellow';

                setTimeout(() => {
                    element1.style.border = '';
                    element2.style.border = '';
                }, 2000);
            }
        }
    }

    findPossibleMove() {
        // 모든 가능한 교환을 시도하여 매칭이 생기는지 확인
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // 인접한 8방향 확인
                const directions = [
                    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                    { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                    { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                    { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
                ];

                for (const dir of directions) {
                    const newRow = row + dir.dr;
                    const newCol = col + dir.dc;

                    if (newRow >= 0 && newRow < this.boardSize &&
                        newCol >= 0 && newCol < this.boardSize) {

                        // 임시로 교환
                        const temp = this.board[row][col];
                        this.board[row][col] = this.board[newRow][newCol];
                        this.board[newRow][newCol] = temp;

                        // 매칭 확인
                        const matches = this.findMatches();

                        // 되돌리기
                        this.board[newRow][newCol] = this.board[row][col];
                        this.board[row][col] = temp;

                        if (matches.length > 0) {
                            return {
                                block1: { row, col },
                                block2: { row: newRow, col: newCol }
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    // 레벨 시스템
    renderLevelSelect() {
        this.levelGrid.innerHTML = '';

        for (let level = 1; level <= this.maxLevel; level++) {
            const levelBtn = document.createElement('button');
            levelBtn.className = 'level-btn';
            levelBtn.textContent = level;

            // 잠금 상태 확인
            if (level > this.unlockedLevel) {
                levelBtn.disabled = true;
            } else {
                levelBtn.addEventListener('click', () => this.selectLevel(level));

                // 완료된 레벨 표시
                if (this.levelStars[level]) {
                    levelBtn.classList.add('completed');

                    // 별 표시
                    const starsSpan = document.createElement('div');
                    starsSpan.className = 'stars';
                    starsSpan.textContent = '⭐'.repeat(this.levelStars[level]);
                    levelBtn.appendChild(document.createElement('br'));
                    levelBtn.appendChild(starsSpan);
                }

                // 현재 플레이 가능한 레벨 강조
                if (level === this.unlockedLevel && !this.levelStars[level]) {
                    levelBtn.classList.add('current');
                }
            }

            this.levelGrid.appendChild(levelBtn);
        }
    }

    selectLevel(level) {
        this.currentLevel = level;
        this.startGame();
    }

    showLevelSelect() {
        this.gameRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.gameContainer.style.display = 'none';
        this.levelSelectScreen.style.display = 'block';
        this.renderLevelSelect();
    }

    saveProgress() {
        const progress = {
            unlockedLevel: this.unlockedLevel,
            levelStars: this.levelStars
        };
        localStorage.setItem('anipangProgress', JSON.stringify(progress));
    }

    loadProgress() {
        const saved = localStorage.getItem('anipangProgress');
        if (saved) {
            try {
                const progress = JSON.parse(saved);
                this.unlockedLevel = progress.unlockedLevel || 1;
                this.levelStars = progress.levelStars || {};
            } catch (e) {
                console.error('Failed to load progress:', e);
            }
        }
    }
}

// 게임 초기화
document.addEventListener('DOMContentLoaded', () => {
    new AnipangGame();
});
