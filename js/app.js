/**
 * APP.JS - Aplicação Principal
 * Gerencia navegação, telas e inicialização do jogo
 * Otimizado para TV com navegação D-pad
 * Suporte a Multiplayer WiFi
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
  
  // Modo de jogo
  gameMode: 'local', // 'local' ou 'multiplayer'
  isMultiplayer: false,

  /**
   * Inicializa a aplicação
   */
  init() {
    // Inicializa módulos
    Storage.init();
    Sounds.init();
    
    // Cria jogadores padrão se não existirem
    this.ensureDefaultPlayers();
    
    // Configura navegação por teclado
    this.setupKeyboardNavigation();
    
    // Configura listeners globais
    this.setupGlobalListeners();
    
    // Configura interceptação do botão voltar do navegador (importante para TV)
    this.setupBrowserBackButton();
    
    // Configura callbacks do multiplayer
    this.setupMultiplayerCallbacks();
    
    // Mostra tela inicial
    this.showScreen('home');
    
    // Resume áudio após primeira interação
    document.addEventListener('click', () => Sounds.resume(), { once: true });
    document.addEventListener('keydown', () => Sounds.resume(), { once: true });
    
    console.log('🎮 Jogo de Damas inicializado!');
  },

  /**
   * Garante que existam jogadores padrão para jogar rapidamente
   */
  ensureDefaultPlayers() {
    const players = Storage.getPlayers();
    if (players.length === 0) {
      Storage.addPlayer({ name: 'Jogador 1', color: 'red' });
      Storage.addPlayer({ name: 'Jogador 2', color: 'blue' });
    }
  },

  /**
   * Configura interceptação do botão voltar do navegador
   */
  setupBrowserBackButton() {
    history.replaceState({ screen: 'home', index: 0 }, '', '');
    
    window.addEventListener('popstate', (e) => {
      e.preventDefault();
      
      if (this.currentScreen === 'home') {
        history.pushState({ screen: 'home', index: 0 }, '', '');
        return;
      }
      
      this.goBack();
      history.pushState({ screen: this.currentScreen, index: Date.now() }, '', '');
    });
  },

  /**
   * Configura callbacks do multiplayer
   */
  setupMultiplayerCallbacks() {
    Multiplayer.onConnected = (playerName) => {
      this.showLobbyState('connected', playerName);
    };
    
    Multiplayer.onDisconnected = () => {
      if (this.isMultiplayer && this.currentScreen === 'game') {
        alert('Conexão perdida com o oponente!');
        this.goBack();
      }
    };
    
    Multiplayer.onGameStart = (data) => {
      // Configura e inicia o jogo
      const players = Storage.getPlayers();
      this.selectedPlayer1 = players[0] || { id: '1', name: 'Host', color: 'red' };
      this.selectedPlayer2 = { id: '2', name: Multiplayer.opponentName, color: 'blue' };
      
      if (!Multiplayer.isHost) {
        // Cliente inverte os jogadores (ele é azul)
        const temp = this.selectedPlayer1;
        this.selectedPlayer1 = this.selectedPlayer2;
        this.selectedPlayer2 = temp;
      }
      
      Game.init(this.selectedPlayer1, this.selectedPlayer2);
      Game.isMultiplayer = true;
      this.isMultiplayer = true;
      console.log('Game started in MULTIPLAYER mode');
      // alert('Multiplayer iniciado! Eu sou: ' + (Multiplayer.isHost ? 'Host (Vermelho)' : 'Cliente (Azul)'));
      this.showScreen('game');
    };
    
    Multiplayer.onOpponentMove = (from, to) => {
      console.log('Received opponent move:', from, to);
      console.log('Current player:', Game.currentPlayer, 'Piece at from:', Game.board[from.row][from.col]);
      
      // Força seleção da peça para garantir que o movimento ocorra
      // Bypass da validação de UI pois é um movimento remoto autorizado
      Game.selectedPiece = { row: from.row, col: from.col };
      Game.validMoves = Game.getValidMoves(from.row, from.col);
      
      const result = Game.movePiece(to.row, to.col);
      console.log('Move result:', result);
      
      if (result.success) {
        Board.render();
        this.updateGameInfo();
        
        if (result.gameOver) {
          setTimeout(() => this.showGameOver(result.winner), 500);
        }
      } else {
        console.error('Failed to apply opponent move!');
        alert('Erro de sincronização: movimento inválido recebido');
      }
    };
    
    Multiplayer.onError = (message) => {
      alert('Erro Multiplayer: ' + message);
    };
  },

  /**
   * Mostra uma tela específica
   * @param {string} screenId 
   */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    if (this.currentScreen && this.currentScreen !== screenId) {
      if (this.screenHistory[this.screenHistory.length - 1] !== this.currentScreen) {
        this.screenHistory.push(this.currentScreen);
      }
    }
    
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
      this.onScreenShow(screenId);
      
      setTimeout(() => {
        const firstFocusable = screen.querySelector('.focusable:not([disabled]), button:not([disabled]), input:not([disabled])');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
    }
    
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.style.display = screenId === 'home' ? 'none' : 'flex';
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
        setTimeout(() => {
          const input = document.getElementById('player-name');
          if (input) input.focus();
        }, 100);
        break;
        
      case 'game-mode':
        // Nada específico
        break;
        
      case 'multiplayer-lobby':
        this.showLobbyState('options');
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
        setTimeout(() => Board.focusFirstPlayablePiece(), 200);
        break;
        
      case 'ranking':
        Players.renderRanking('ranking-list');
        break;
    }
  },

  /**
   * Mostra estado do lobby multiplayer
   * @param {string} state 'options', 'waiting', 'connecting', 'connected'
   * @param {string} data Dados adicionais
   */
  showLobbyState(state, data) {
    const states = ['lobby-options', 'lobby-waiting', 'lobby-connecting', 'lobby-connected'];
    
    states.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = 'none';
    });
    
    const activeEl = document.getElementById(`lobby-${state}`);
    if (activeEl) activeEl.style.display = 'block';
    
    if (state === 'waiting' && Multiplayer.roomCode) {
      document.getElementById('room-code-display').textContent = Multiplayer.roomCode;
      document.getElementById('host-ip').textContent = Multiplayer.getLocalIP() + ':3000';
    }
    
    if (state === 'connected' && data) {
      document.getElementById('opponent-name').textContent = `Oponente: ${data}`;
    }
  },

  /**
   * Volta para a tela anterior
   */
  goBack() {
    // Se está no jogo multiplayer, desconecta
    if (this.currentScreen === 'game' && this.isMultiplayer) {
      if (!confirm('Deseja abandonar a partida?')) return;
      Multiplayer.disconnect();
      this.isMultiplayer = false;
    }
    
    // Se está no jogo local, confirma abandono
    if (this.currentScreen === 'game' && !this.isMultiplayer && !Game.gameOver) {
      if (!confirm('Deseja realmente abandonar a partida?')) return;
    }
    
    // Se está no lobby, desconecta
    if (this.currentScreen === 'multiplayer-lobby') {
      Multiplayer.disconnect();
    }
    
    Sounds.playCancel();
    
    let previousScreen = this.screenHistory.pop();
    
    if (this.currentScreen === 'player-form') {
      previousScreen = 'players';
      this.screenHistory = this.screenHistory.filter(s => s !== 'player-form');
    }
    
    if (!previousScreen) {
      previousScreen = 'home';
    }
    
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    const screen = document.getElementById(previousScreen);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = previousScreen;
      this.onScreenShow(previousScreen);
    }
    
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.style.display = previousScreen === 'home' ? 'none' : 'flex';
    }
  },

  /**
   * Configura navegação por teclado (D-pad para TV)
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'game' && !Game.gameOver) {
        // Verifica se é multiplayer e não é minha vez
        if (this.isMultiplayer && !Multiplayer.isMyTurn()) {
          return; // Bloqueia input
        }
        
        if (Board.handleKeyNavigation(e)) {
          return;
        }
      }
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this.handleArrowNavigation(e.key);
      }
      
      if (e.key === 'Enter' || e.key === ' ') {
        const active = document.activeElement;
        if (active && active.tagName !== 'INPUT') {
          e.preventDefault();
          active.click();
        }
      }
      
      if (e.key === 'Escape' || (e.key === 'Backspace' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        if (this.currentScreen !== 'home') {
          this.goBack();
        }
      }
    });
  },

  /**
   * Navega entre elementos usando setas
   */
  handleArrowNavigation(key) {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    
    const focusables = Array.from(activeScreen.querySelectorAll(
      '.focusable:not([style*="display: none"]):not([disabled]), ' +
      'button:not([style*="display: none"]):not(:disabled), ' +
      'input:not([style*="display: none"]):not(:disabled)'
    )).filter(el => el.offsetParent !== null);
    
    if (focusables.length === 0) return;
    
    const current = document.activeElement;
    let nextIndex = this.findClosestElement(focusables, current, key.replace('Arrow', '').toLowerCase());
    
    if (nextIndex !== -1 && focusables[nextIndex] !== current) {
      focusables[nextIndex].focus();
      Sounds.playNavigate();
    }
  },

  /**
   * Encontra o elemento mais próximo em uma direção
   */
  findClosestElement(elements, current, direction) {
    if (!current || !current.getBoundingClientRect) return 0;
    
    const currentRect = current.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;
    
    let bestIndex = -1;
    let bestScore = Infinity;
    
    elements.forEach((el, index) => {
      if (el === current) return;
      
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const dx = centerX - currentCenterX;
      const dy = centerY - currentCenterY;
      
      let isValidDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;
      
      switch (direction) {
        case 'up':
          isValidDirection = dy < -5;
          primaryDistance = Math.abs(dy);
          secondaryDistance = Math.abs(dx);
          break;
        case 'down':
          isValidDirection = dy > 5;
          primaryDistance = Math.abs(dy);
          secondaryDistance = Math.abs(dx);
          break;
        case 'left':
          isValidDirection = dx < -5;
          primaryDistance = Math.abs(dx);
          secondaryDistance = Math.abs(dy);
          break;
        case 'right':
          isValidDirection = dx > 5;
          primaryDistance = Math.abs(dx);
          secondaryDistance = Math.abs(dy);
          break;
      }
      
      if (isValidDirection) {
        const score = primaryDistance + secondaryDistance * 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    });
    
    if (bestIndex === -1) {
      const currentIndex = elements.indexOf(current);
      if (currentIndex !== -1) {
        if (direction === 'down' || direction === 'right') {
          bestIndex = (currentIndex + 1) % elements.length;
        } else {
          bestIndex = (currentIndex - 1 + elements.length) % elements.length;
        }
      } else {
        bestIndex = 0;
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
    
    // Menu principal - agora vai para tela de modo de jogo
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('game-mode');
    });
    
    document.getElementById('btn-players')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('players');
    });
    
    document.getElementById('btn-ranking')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.showScreen('ranking');
    });
    
    // Modo de jogo
    document.getElementById('btn-mode-local')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.gameMode = 'local';
      this.isMultiplayer = false;
      this.showScreen('select-players');
    });
    
    document.getElementById('btn-mode-online')?.addEventListener('click', () => {
      Sounds.playConfirm();
      this.gameMode = 'multiplayer';
      this.showScreen('multiplayer-lobby');
    });
    
    // Lobby multiplayer
    document.getElementById('btn-create-room')?.addEventListener('click', async () => {
      Sounds.playConfirm();
      try {
        const players = Storage.getPlayers();
        const hostName = players[0]?.name || 'Host';
        await Multiplayer.createRoom(hostName);
        this.showLobbyState('waiting');
      } catch (error) {
        alert('Erro ao criar sala: ' + error.message);
      }
    });
    
    document.getElementById('btn-join-room')?.addEventListener('click', async () => {
      const codeInput = document.getElementById('room-code-input');
      const code = codeInput?.value.trim().toUpperCase();
      
      if (!code || code.length !== 6) {
        Sounds.playError();
        alert('Digite um código de sala válido (6 caracteres)');
        return;
      }
      
      Sounds.playConfirm();
      this.showLobbyState('connecting');
      
      try {
        const players = Storage.getPlayers();
        const playerName = players[0]?.name || 'Jogador';
        await Multiplayer.joinRoom(code, playerName);
        this.showLobbyState('connected', Multiplayer.opponentName);
      } catch (error) {
        alert('Erro ao entrar: ' + error.message);
        this.showLobbyState('options');
      }
    });
    
    document.getElementById('btn-cancel-host')?.addEventListener('click', () => {
      Multiplayer.disconnect();
      this.showLobbyState('options');
    });
    
    document.getElementById('btn-cancel-join')?.addEventListener('click', () => {
      Multiplayer.disconnect();
      this.showLobbyState('options');
    });
    
    document.getElementById('btn-start-multiplayer')?.addEventListener('click', () => {
      if (Multiplayer.isHost) {
        Multiplayer.startGame();
      }
      // O jogo será iniciado pelo callback onGameStart
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
      if (this.isMultiplayer) {
        Multiplayer.disconnect();
        this.isMultiplayer = false;
      }
      this.screenHistory = [];
      this.showScreen('home');
    });
  },

  /**
   * Handler para seleção de jogador
   */
  onPlayerSelect(playerId) {
    if (!this.selectingFor) {
      this.selectingFor = this.selectedPlayer1 ? 2 : 1;
    }
    
    const player = Storage.getPlayerById(playerId);
    if (!player) return;
    
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
    
    if (startBtn) {
      startBtn.disabled = !(this.selectedPlayer1 && this.selectedPlayer2);
      startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
    }
    
    if (label) {
      if (!this.selectedPlayer1) {
        label.textContent = 'Selecione o Jogador 1 (Peças Vermelhas)';
      } else if (!this.selectedPlayer2) {
        label.textContent = 'Selecione o Jogador 2 (Peças Azuis)';
      } else {
        label.textContent = 'Pronto para jogar!';
      }
    }
    
    document.querySelector('.player-slot--red')?.classList.toggle('active', this.selectingFor === 1);
    document.querySelector('.player-slot--blue')?.classList.toggle('active', this.selectingFor === 2);
  },

  /**
   * Inicia uma nova partida local
   */
  startGame() {
    if (!this.selectedPlayer1 || !this.selectedPlayer2) {
      Sounds.playError();
      return;
    }
    
    Game.init(this.selectedPlayer1, this.selectedPlayer2);
    Game.isMultiplayer = false;
    this.isMultiplayer = false;
    this.showScreen('game');
  },

  /**
   * Atualiza informações do jogo na tela
   */
  updateGameInfo() {
    const stats = Game.getStats();
    
    const p1Info = document.getElementById('player1-info');
    if (p1Info) {
      p1Info.classList.toggle('active', stats.currentPlayer === 1);
      document.getElementById('player1-name').textContent = stats.player1.name;
      document.getElementById('player1-pieces').textContent = `${stats.redPieces} peças`;
      const p1Avatar = document.getElementById('player1-avatar');
      p1Avatar.style.background = Players.getColorHex(stats.player1.color);
      p1Avatar.textContent = Players.getInitial(stats.player1.name);
    }
    
    const p2Info = document.getElementById('player2-info');
    if (p2Info) {
      p2Info.classList.toggle('active', stats.currentPlayer === 2);
      document.getElementById('player2-name').textContent = stats.player2.name;
      document.getElementById('player2-pieces').textContent = `${stats.bluePieces} peças`;
      const p2Avatar = document.getElementById('player2-avatar');
      p2Avatar.style.background = Players.getColorHex(stats.player2.color);
      p2Avatar.textContent = Players.getInitial(stats.player2.name);
    }
    
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
      let turnText = `Vez de ${stats.currentPlayerObj.name}`;
      if (this.isMultiplayer) {
        turnText = Multiplayer.isMyTurn() ? 'Sua vez!' : `Vez de ${stats.currentPlayerObj.name}`;
      }
      turnIndicator.textContent = turnText;
    }
  },

  /**
   * Mostra modal de fim de jogo
   */
  showGameOver(winnerId) {
    const result = Game.endGame(winnerId);
    
    document.getElementById('winner-name').textContent = result.winner.name;
    document.getElementById('winner-avatar').style.background = 
      Players.getColorHex(result.winner.color);
    document.getElementById('winner-avatar').textContent = 
      Players.getInitial(result.winner.name);
    document.getElementById('winner-pieces').textContent = 
      `Vitória com ${result.winnerPieces} peças restantes!`;
    
    document.getElementById('game-over-modal').classList.add('active');
    
    Sounds.playVictory();
    this.showConfetti();
    
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
   * Joga novamente
   */
  playAgain() {
    this.hideModal();
    Sounds.playConfirm();
    
    if (this.isMultiplayer) {
      // Em multiplayer, precisa reiniciar a partida via servidor
      Multiplayer.startGame();
    } else {
      Game.init(this.selectedPlayer1, this.selectedPlayer2);
      Board.render();
      this.updateGameInfo();
      Sounds.playGameStart();
    }
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
