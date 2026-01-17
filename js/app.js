/**
 * APP.JS - Aplicação Principal
 * Gerencia navegação, telas e inicialização do jogo
 */

const App = {
  // Tela atual
  currentScreen: 'home',
  
  // Histórico de navegação (para botão voltar)
  screenHistory: [],
  
  // Jogadores selecionados para a partida
  selectedPlayer1: null,
  selectedPlayer2: null,
  selectingFor: null, // 1 ou 2

  /**
   * Inicializa a aplicação
   */
  init() {
    // Inicializa módulos
    Storage.init();
    Sounds.init();
    
    // Configura navegação por teclado
    this.setupKeyboardNavigation();
    
    // Configura listeners globais
    this.setupGlobalListeners();
    
    // Mostra tela inicial
    this.showScreen('home');
    
    // Resume áudio após primeira interação
    document.addEventListener('click', () => Sounds.resume(), { once: true });
    document.addEventListener('keydown', () => Sounds.resume(), { once: true });
    
    console.log('🎮 Jogo de Damas inicializado!');
  },

  /**
   * Mostra uma tela específica
   * @param {string} screenId 
   */
  showScreen(screenId) {
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Salva no histórico
    if (this.currentScreen && this.currentScreen !== screenId) {
      this.screenHistory.push(this.currentScreen);
    }
    
    // Mostra a tela solicitada
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
      
      // Executa ações específicas de cada tela
      this.onScreenShow(screenId);
      
      // Foca no primeiro elemento navegável
      setTimeout(() => {
        const firstFocusable = screen.querySelector('.focusable, button, input, [tabindex="0"]');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
    }
    
    // Mostra/esconde botão voltar
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.style.display = screenId === 'home' ? 'none' : 'block';
    }
  },

  /**
   * Executa ações ao mostrar uma tela
   * @param {string} screenId 
   */
  onScreenShow(screenId) {
    switch (screenId) {
      case 'players':
        Players.renderPlayersList('players-list', { showActions: true });
        break;
        
      case 'player-form':
        // Foca no input de nome
        setTimeout(() => {
          const input = document.getElementById('player-name');
          if (input) input.focus();
        }, 100);
        break;
        
      case 'select-players':
        this.selectedPlayer1 = null;
        this.selectedPlayer2 = null;
        this.updatePlayerSelection();
        Players.renderPlayersList('select-players-list', { 
          selectable: true,
          onSelect: (playerId) => this.onPlayerSelect(playerId)
        });
        break;
        
      case 'game':
        Board.init('game-board');
        this.updateGameInfo();
        Sounds.playGameStart();
        break;
        
      case 'ranking':
        Players.renderRanking('ranking-list');
        break;
    }
  },

  /**
   * Volta para a tela anterior
   */
  goBack() {
    // Se está no jogo, confirma abandono
    if (this.currentScreen === 'game' && !Game.gameOver) {
      if (!confirm('Deseja realmente abandonar a partida?')) {
        return;
      }
    }
    
    Sounds.playCancel();
    
    const previousScreen = this.screenHistory.pop() || 'home';
    
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Mostra a anterior
    const screen = document.getElementById(previousScreen);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = previousScreen;
      this.onScreenShow(previousScreen);
    }
    
    // Botão voltar
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.style.display = previousScreen === 'home' ? 'none' : 'block';
    }
  },

  /**
   * Configura navegação por teclado (D-pad para TV)
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Navegação por setas
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this.handleArrowNavigation(e.key);
      }
      
      // Botão voltar (Escape ou Backspace)
      if (e.key === 'Escape' || (e.key === 'Backspace' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        this.goBack();
      }
    });
  },

  /**
   * Navega entre elementos usando setas
   * @param {string} key 
   */
  handleArrowNavigation(key) {
    const focusables = Array.from(document.querySelectorAll(
      '.screen.active .focusable:not([style*="display: none"]), ' +
      '.screen.active button:not([style*="display: none"]):not(:disabled), ' +
      '.screen.active input:not([style*="display: none"]):not(:disabled), ' +
      '.screen.active [tabindex="0"]:not([style*="display: none"])'
    )).filter(el => el.offsetParent !== null);
    
    if (focusables.length === 0) return;
    
    const current = document.activeElement;
    const currentIndex = focusables.indexOf(current);
    
    let nextIndex = currentIndex;
    
    // Navegação baseada em posição visual
    const currentRect = current.getBoundingClientRect();
    
    switch (key) {
      case 'ArrowUp':
        nextIndex = this.findClosestElement(focusables, current, 'up');
        break;
      case 'ArrowDown':
        nextIndex = this.findClosestElement(focusables, current, 'down');
        break;
      case 'ArrowLeft':
        nextIndex = this.findClosestElement(focusables, current, 'left');
        break;
      case 'ArrowRight':
        nextIndex = this.findClosestElement(focusables, current, 'right');
        break;
    }
    
    if (nextIndex !== -1 && nextIndex !== currentIndex) {
      focusables[nextIndex].focus();
      Sounds.playNavigate();
    }
  },

  /**
   * Encontra o elemento mais próximo em uma direção
   * @param {Array} elements 
   * @param {Element} current 
   * @param {string} direction 
   * @returns {number} Índice do elemento mais próximo
   */
  findClosestElement(elements, current, direction) {
    if (!current || !current.getBoundingClientRect) {
      return 0;
    }
    
    const currentRect = current.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;
    
    let bestIndex = -1;
    let bestDistance = Infinity;
    
    elements.forEach((el, index) => {
      if (el === current) return;
      
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = centerX - currentCenterX;
      const dy = centerY - currentCenterY;
      
      let isValidDirection = false;
      
      switch (direction) {
        case 'up':
          isValidDirection = dy < -10;
          break;
        case 'down':
          isValidDirection = dy > 10;
          break;
        case 'left':
          isValidDirection = dx < -10;
          break;
        case 'right':
          isValidDirection = dx > 10;
          break;
      }
      
      if (isValidDirection) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    });
    
    // Se não encontrou na direção, tenta encontrar o próximo na lista
    if (bestIndex === -1) {
      const currentIndex = elements.indexOf(current);
      if (direction === 'down' || direction === 'right') {
        bestIndex = (currentIndex + 1) % elements.length;
      } else {
        bestIndex = (currentIndex - 1 + elements.length) % elements.length;
      }
    }
    
    return bestIndex;
  },

  /**
   * Configura listeners globais
   */
  setupGlobalListeners() {
    // Botão voltar
    document.getElementById('btn-back')?.addEventListener('click', () => this.goBack());
    
    // Menu principal
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('select-players');
    });
    
    document.getElementById('btn-players')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('players');
    });
    
    document.getElementById('btn-ranking')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('ranking');
    });
    
    // Tela de jogadores
    document.getElementById('btn-add-player')?.addEventListener('click', () => {
      Sounds.playConfirm();
      Players.openAddForm();
    });
    
    // Formulário de jogador
    document.getElementById('btn-save-player')?.addEventListener('click', () => {
      Players.savePlayer();
    });
    
    document.getElementById('btn-cancel-player')?.addEventListener('click', () => {
      Sounds.playCancel();
      this.goBack();
    });
    
    // Seleção de jogadores
    document.getElementById('btn-select-player1')?.addEventListener('click', () => {
      this.selectingFor = 1;
      document.getElementById('selecting-for-label').textContent = 
        'Selecione o Jogador 1 (Peças Vermelhas)';
      this.highlightPlayerSlot(1);
    });
    
    document.getElementById('btn-select-player2')?.addEventListener('click', () => {
      this.selectingFor = 2;
      document.getElementById('selecting-for-label').textContent = 
        'Selecione o Jogador 2 (Peças Azuis)';
      this.highlightPlayerSlot(2);
    });
    
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.startGame();
    });
    
    // Fim de jogo
    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.playAgain();
    });
    
    document.getElementById('btn-back-home')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.hideModal();
      this.screenHistory = [];
      this.showScreen('home');
    });
  },

  /**
   * Handler para seleção de jogador
   * @param {string} playerId 
   */
  onPlayerSelect(playerId) {
    if (!this.selectingFor) {
      this.selectingFor = this.selectedPlayer1 ? 2 : 1;
    }
    
    const player = Storage.getPlayerById(playerId);
    if (!player) return;
    
    // Não permite selecionar o mesmo jogador para os dois lados
    if (this.selectingFor === 1 && this.selectedPlayer2?.id === playerId) {
      Sounds.playError();
      return;
    }
    if (this.selectingFor === 2 && this.selectedPlayer1?.id === playerId) {
      Sounds.playError();
      return;
    }
    
    if (this.selectingFor === 1) {
      this.selectedPlayer1 = player;
      this.selectingFor = this.selectedPlayer2 ? null : 2;
    } else {
      this.selectedPlayer2 = player;
      this.selectingFor = this.selectedPlayer1 ? null : 1;
    }
    
    Sounds.playSelect();
    this.updatePlayerSelection();
  },

  /**
   * Atualiza a UI de seleção de jogadores
   */
  updatePlayerSelection() {
    const slot1Name = document.getElementById('slot1-name');
    const slot1Avatar = document.getElementById('slot1-avatar');
    const slot2Name = document.getElementById('slot2-name');
    const slot2Avatar = document.getElementById('slot2-avatar');
    const startBtn = document.getElementById('btn-start-game');
    const label = document.getElementById('selecting-for-label');
    
    if (this.selectedPlayer1) {
      slot1Name.textContent = this.selectedPlayer1.name;
      slot1Avatar.style.background = Players.getColorHex(this.selectedPlayer1.color);
      slot1Avatar.textContent = Players.getInitial(this.selectedPlayer1.name);
    } else {
      slot1Name.textContent = 'Selecione...';
      slot1Avatar.style.background = '#6b7280';
      slot1Avatar.textContent = '?';
    }
    
    if (this.selectedPlayer2) {
      slot2Name.textContent = this.selectedPlayer2.name;
      slot2Avatar.style.background = Players.getColorHex(this.selectedPlayer2.color);
      slot2Avatar.textContent = Players.getInitial(this.selectedPlayer2.name);
    } else {
      slot2Name.textContent = 'Selecione...';
      slot2Avatar.style.background = '#6b7280';
      slot2Avatar.textContent = '?';
    }
    
    // Habilita botão de iniciar apenas se os dois jogadores estão selecionados
    if (startBtn) {
      startBtn.disabled = !(this.selectedPlayer1 && this.selectedPlayer2);
      startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
    }
    
    // Atualiza label de instrução
    if (label) {
      if (!this.selectedPlayer1) {
        label.textContent = 'Selecione o Jogador 1 (Peças Vermelhas)';
      } else if (!this.selectedPlayer2) {
        label.textContent = 'Selecione o Jogador 2 (Peças Azuis)';
      } else {
        label.textContent = 'Pronto para jogar!';
      }
    }
    
    // Atualiza destaque dos slots
    document.querySelector('.player-slot--red')?.classList.toggle('active', this.selectingFor === 1);
    document.querySelector('.player-slot--blue')?.classList.toggle('active', this.selectingFor === 2);
  },

  /**
   * Destaca o slot de jogador sendo selecionado
   * @param {number} slot 
   */
  highlightPlayerSlot(slot) {
    document.querySelectorAll('.player-slot').forEach(s => s.classList.remove('active'));
    if (slot === 1) {
      document.querySelector('.player-slot--red')?.classList.add('active');
    } else {
      document.querySelector('.player-slot--blue')?.classList.add('active');
    }
  },

  /**
   * Inicia uma nova partida
   */
  startGame() {
    if (!this.selectedPlayer1 || !this.selectedPlayer2) {
      Sounds.playError();
      return;
    }
    
    Game.init(this.selectedPlayer1, this.selectedPlayer2);
    this.showScreen('game');
  },

  /**
   * Atualiza informações do jogo na tela
   */
  updateGameInfo() {
    const stats = Game.getStats();
    
    // Player 1 (RED)
    const p1Info = document.getElementById('player1-info');
    if (p1Info) {
      p1Info.classList.toggle('active', stats.currentPlayer === 1);
      document.getElementById('player1-name').textContent = stats.player1.name;
      document.getElementById('player1-pieces').textContent = `${stats.redPieces} peças`;
      const p1Avatar = document.getElementById('player1-avatar');
      p1Avatar.style.background = Players.getColorHex(stats.player1.color);
      p1Avatar.textContent = Players.getInitial(stats.player1.name);
    }
    
    // Player 2 (BLUE)
    const p2Info = document.getElementById('player2-info');
    if (p2Info) {
      p2Info.classList.toggle('active', stats.currentPlayer === 2);
      document.getElementById('player2-name').textContent = stats.player2.name;
      document.getElementById('player2-pieces').textContent = `${stats.bluePieces} peças`;
      const p2Avatar = document.getElementById('player2-avatar');
      p2Avatar.style.background = Players.getColorHex(stats.player2.color);
      p2Avatar.textContent = Players.getInitial(stats.player2.name);
    }
    
    // Indicador de turno
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
      turnIndicator.textContent = `Vez de ${stats.currentPlayerObj.name}`;
    }
  },

  /**
   * Mostra modal de fim de jogo
   * @param {number} winnerId - 1 para RED, 2 para BLUE
   */
  showGameOver(winnerId) {
    const result = Game.endGame(winnerId);
    
    // Atualiza modal
    document.getElementById('winner-name').textContent = result.winner.name;
    document.getElementById('winner-avatar').style.background = 
      Players.getColorHex(result.winner.color);
    document.getElementById('winner-avatar').textContent = 
      Players.getInitial(result.winner.name);
    document.getElementById('winner-pieces').textContent = 
      `Vitória com ${result.winnerPieces} peças restantes!`;
    
    // Mostra modal
    document.getElementById('game-over-modal').classList.add('active');
    
    // Efeitos de vitória
    Sounds.playVictory();
    this.showConfetti();
    
    // Foca no botão de jogar novamente
    setTimeout(() => {
      document.getElementById('btn-play-again')?.focus();
    }, 500);
  },

  /**
   * Esconde modal
   */
  hideModal() {
    document.getElementById('game-over-modal')?.classList.remove('active');
    this.hideConfetti();
  },

  /**
   * Joga novamente com os mesmos jogadores
   */
  playAgain() {
    this.hideModal();
    Sounds.playConfirm();
    Game.init(this.selectedPlayer1, this.selectedPlayer2);
    Board.render();
    this.updateGameInfo();
    Sounds.playGameStart();
  },

  /**
   * Mostra confetes de celebração
   */
  showConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];
    
    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      confetti.style.width = (Math.random() * 10 + 5) + 'px';
      confetti.style.height = confetti.style.width;
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      container.appendChild(confetti);
    }
  },

  /**
   * Esconde confetes
   */
  hideConfetti() {
    const container = document.getElementById('confetti-container');
    if (container) {
      container.innerHTML = '';
    }
  }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
