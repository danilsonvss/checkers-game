/**
 * STORAGE.JS - Sistema de Persistência Local
 * Gerencia todos os dados do jogo no localStorage
 */

const Storage = {
  KEYS: {
    PLAYERS: 'checkers_players',
    MATCHES: 'checkers_matches',
    SETTINGS: 'checkers_settings'
  },

  /**
   * Inicializa o storage com valores padrão se necessário
   */
  init() {
    if (!this.get(this.KEYS.PLAYERS)) {
      this.set(this.KEYS.PLAYERS, []);
    }
    if (!this.get(this.KEYS.MATCHES)) {
      this.set(this.KEYS.MATCHES, []);
    }
    if (!this.get(this.KEYS.SETTINGS)) {
      this.set(this.KEYS.SETTINGS, {
        soundEnabled: true,
        musicEnabled: false
      });
    }
  },

  /**
   * Salva dados no localStorage
   * @param {string} key - Chave do storage
   * @param {any} value - Valor a ser salvo
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
      return false;
    }
  },

  /**
   * Recupera dados do localStorage
   * @param {string} key - Chave do storage
   * @returns {any} Dados recuperados ou null
   */
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Erro ao ler do localStorage:', e);
      return null;
    }
  },

  // ============================================
  // JOGADORES
  // ============================================

  /**
   * Retorna todos os jogadores cadastrados
   * @returns {Array} Lista de jogadores
   */
  getPlayers() {
    return this.get(this.KEYS.PLAYERS) || [];
  },

  /**
   * Busca um jogador pelo ID
   * @param {string} id - ID do jogador
   * @returns {Object|null} Jogador encontrado ou null
   */
  getPlayerById(id) {
    const players = this.getPlayers();
    return players.find(p => p.id === id) || null;
  },

  /**
   * Adiciona um novo jogador
   * @param {Object} player - Dados do jogador
   * @returns {Object} Jogador criado com ID
   */
  addPlayer(player) {
    const players = this.getPlayers();
    const newPlayer = {
      id: this.generateId(),
      name: player.name,
      color: player.color,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      createdAt: new Date().toISOString()
    };
    players.push(newPlayer);
    this.set(this.KEYS.PLAYERS, players);
    return newPlayer;
  },

  /**
   * Atualiza um jogador existente
   * @param {string} id - ID do jogador
   * @param {Object} updates - Dados a atualizar
   * @returns {Object|null} Jogador atualizado ou null
   */
  updatePlayer(id, updates) {
    const players = this.getPlayers();
    const index = players.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    players[index] = { ...players[index], ...updates };
    this.set(this.KEYS.PLAYERS, players);
    return players[index];
  },

  /**
   * Remove um jogador
   * @param {string} id - ID do jogador
   * @returns {boolean} Sucesso da operação
   */
  removePlayer(id) {
    const players = this.getPlayers();
    const filtered = players.filter(p => p.id !== id);
    return this.set(this.KEYS.PLAYERS, filtered);
  },

  /**
   * Retorna o ranking de jogadores ordenado por vitórias
   * @returns {Array} Lista ordenada de jogadores
   */
  getRanking() {
    const players = this.getPlayers();
    return players
      .filter(p => p.gamesPlayed > 0)
      .sort((a, b) => {
        // Ordena por vitórias, depois por menor número de derrotas
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      });
  },

  // ============================================
  // PARTIDAS
  // ============================================

  /**
   * Retorna todas as partidas registradas
   * @returns {Array} Lista de partidas
   */
  getMatches() {
    return this.get(this.KEYS.MATCHES) || [];
  },

  /**
   * Registra uma nova partida
   * @param {Object} match - Dados da partida
   * @returns {Object} Partida registrada
   */
  addMatch(match) {
    const matches = this.getMatches();
    const newMatch = {
      id: this.generateId(),
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      winnerId: match.winnerId, // null se empate
      player1Pieces: match.player1Pieces,
      player2Pieces: match.player2Pieces,
      duration: match.duration, // em segundos
      playedAt: new Date().toISOString()
    };
    
    // Mantém apenas as últimas 100 partidas
    matches.unshift(newMatch);
    if (matches.length > 100) {
      matches.pop();
    }
    
    this.set(this.KEYS.MATCHES, matches);
    
    // Atualiza estatísticas dos jogadores
    this.updatePlayerStats(match);
    
    return newMatch;
  },

  /**
   * Atualiza estatísticas dos jogadores após uma partida
   * @param {Object} match - Dados da partida
   */
  updatePlayerStats(match) {
    const player1 = this.getPlayerById(match.player1Id);
    const player2 = this.getPlayerById(match.player2Id);
    
    if (!player1 || !player2) return;
    
    // Atualiza jogador 1
    const p1Updates = { gamesPlayed: player1.gamesPlayed + 1 };
    if (match.winnerId === match.player1Id) {
      p1Updates.wins = player1.wins + 1;
    } else if (match.winnerId === match.player2Id) {
      p1Updates.losses = player1.losses + 1;
    } else {
      p1Updates.draws = player1.draws + 1;
    }
    this.updatePlayer(match.player1Id, p1Updates);
    
    // Atualiza jogador 2
    const p2Updates = { gamesPlayed: player2.gamesPlayed + 1 };
    if (match.winnerId === match.player2Id) {
      p2Updates.wins = player2.wins + 1;
    } else if (match.winnerId === match.player1Id) {
      p2Updates.losses = player2.losses + 1;
    } else {
      p2Updates.draws = player2.draws + 1;
    }
    this.updatePlayer(match.player2Id, p2Updates);
  },

  /**
   * Retorna partidas de um jogador específico
   * @param {string} playerId - ID do jogador
   * @returns {Array} Partidas do jogador
   */
  getPlayerMatches(playerId) {
    const matches = this.getMatches();
    return matches.filter(m => 
      m.player1Id === playerId || m.player2Id === playerId
    );
  },

  // ============================================
  // CONFIGURAÇÕES
  // ============================================

  /**
   * Retorna as configurações do jogo
   * @returns {Object} Configurações
   */
  getSettings() {
    return this.get(this.KEYS.SETTINGS) || {
      soundEnabled: true,
      musicEnabled: false
    };
  },

  /**
   * Atualiza configurações
   * @param {Object} updates - Configurações a atualizar
   * @returns {Object} Configurações atualizadas
   */
  updateSettings(updates) {
    const settings = this.getSettings();
    const updated = { ...settings, ...updates };
    this.set(this.KEYS.SETTINGS, updated);
    return updated;
  },

  // ============================================
  // UTILITÁRIOS
  // ============================================

  /**
   * Gera um ID único
   * @returns {string} ID gerado
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Limpa todos os dados do jogo
   * @returns {boolean} Sucesso da operação
   */
  clearAll() {
    try {
      localStorage.removeItem(this.KEYS.PLAYERS);
      localStorage.removeItem(this.KEYS.MATCHES);
      localStorage.removeItem(this.KEYS.SETTINGS);
      this.init();
      return true;
    } catch (e) {
      console.error('Erro ao limpar dados:', e);
      return false;
    }
  }
};

// Inicializa o storage quando o script carrega
Storage.init();
