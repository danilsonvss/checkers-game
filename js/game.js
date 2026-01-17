/**
 * GAME.JS - Lógica do Jogo de Damas
 * Implementa todas as regras do jogo de damas brasileiro
 */

const Game = {
  // Constantes
  BOARD_SIZE: 8,
  EMPTY: 0,
  RED: 1,
  BLUE: 2,
  RED_KING: 3,
  BLUE_KING: 4,

  // Estado do jogo
  board: [],
  currentPlayer: null, // 1 = RED, 2 = BLUE
  selectedPiece: null,
  validMoves: [],
  mustCapture: false,
  captureChain: false, // Se está em cadeia de capturas
  
  // Jogadores da partida atual
  player1: null, // RED
  player2: null, // BLUE
  
  // Contagem de peças
  redPieces: 12,
  bluePieces: 12,
  
  // Tempo de jogo
  startTime: null,
  gameOver: false,

  /**
   * Inicializa um novo jogo
   * @param {Object} player1 - Jogador 1 (peças vermelhas)
   * @param {Object} player2 - Jogador 2 (peças azuis)
   */
  init(player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.currentPlayer = 1; // RED começa
    this.selectedPiece = null;
    this.validMoves = [];
    this.mustCapture = false;
    this.captureChain = false;
    this.redPieces = 12;
    this.bluePieces = 12;
    this.startTime = Date.now();
    this.gameOver = false;
    
    this.initBoard();
  },

  /**
   * Inicializa o tabuleiro com peças na posição inicial
   */
  initBoard() {
    this.board = [];
    
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      this.board[row] = [];
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        // Peças só ficam em casas escuras (onde row + col é ímpar)
        const isDarkSquare = (row + col) % 2 === 1;
        
        if (isDarkSquare) {
          if (row < 3) {
            // Peças azuis no topo
            this.board[row][col] = this.BLUE;
          } else if (row > 4) {
            // Peças vermelhas embaixo
            this.board[row][col] = this.RED;
          } else {
            this.board[row][col] = this.EMPTY;
          }
        } else {
          this.board[row][col] = this.EMPTY;
        }
      }
    }
  },

  /**
   * Verifica se uma posição está dentro do tabuleiro
   * @param {number} row 
   * @param {number} col 
   * @returns {boolean}
   */
  isValidPosition(row, col) {
    return row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE;
  },

  /**
   * Verifica se uma peça pertence ao jogador atual
   * @param {number} piece 
   * @returns {boolean}
   */
  isCurrentPlayerPiece(piece) {
    if (this.currentPlayer === 1) {
      return piece === this.RED || piece === this.RED_KING;
    }
    return piece === this.BLUE || piece === this.BLUE_KING;
  },

  /**
   * Verifica se uma peça é do oponente
   * @param {number} piece 
   * @returns {boolean}
   */
  isOpponentPiece(piece) {
    if (this.currentPlayer === 1) {
      return piece === this.BLUE || piece === this.BLUE_KING;
    }
    return piece === this.RED || piece === this.RED_KING;
  },

  /**
   * Verifica se uma peça é dama
   * @param {number} piece 
   * @returns {boolean}
   */
  isKing(piece) {
    return piece === this.RED_KING || piece === this.BLUE_KING;
  },

  /**
   * Seleciona uma peça para mover
   * @param {number} row 
   * @param {number} col 
   * @returns {boolean} Se a seleção foi válida
   */
  selectPiece(row, col) {
    const piece = this.board[row][col];
    
    // Se está em cadeia de capturas, só pode mover a peça que está capturando
    if (this.captureChain && this.selectedPiece) {
      if (row !== this.selectedPiece.row || col !== this.selectedPiece.col) {
        return false;
      }
    }
    
    if (!this.isCurrentPlayerPiece(piece)) {
      return false;
    }

    this.selectedPiece = { row, col };
    this.validMoves = this.getValidMoves(row, col);
    
    // Se houver capturas obrigatórias e esta peça não pode capturar, não seleciona
    if (this.mustCapture && !this.validMoves.some(m => m.capture)) {
      this.selectedPiece = null;
      this.validMoves = [];
      return false;
    }

    Sounds.playSelect();
    return true;
  },

  /**
   * Obtém todos os movimentos válidos para uma peça
   * @param {number} row 
   * @param {number} col 
   * @returns {Array} Lista de movimentos válidos
   */
  getValidMoves(row, col) {
    const piece = this.board[row][col];
    const moves = [];
    const captures = [];
    
    const isKing = this.isKing(piece);
    
    // Direções de movimento
    // Peças normais: vermelhas vão para cima (-1), azuis vão para baixo (+1)
    // Damas podem ir em todas as direções
    let directions;
    if (isKing) {
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else if (piece === this.RED || piece === this.RED_KING) {
      directions = [[-1, -1], [-1, 1]]; // Para cima
    } else {
      directions = [[1, -1], [1, 1]]; // Para baixo
    }
    
    // Verifica movimentos simples e capturas
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      
      if (!this.isValidPosition(newRow, newCol)) continue;
      
      const targetPiece = this.board[newRow][newCol];
      
      if (targetPiece === this.EMPTY) {
        // Movimento simples
        moves.push({ row: newRow, col: newCol, capture: false });
      } else if (this.isOpponentPiece(targetPiece)) {
        // Verifica se pode capturar
        const jumpRow = newRow + dRow;
        const jumpCol = newCol + dCol;
        
        if (this.isValidPosition(jumpRow, jumpCol) && this.board[jumpRow][jumpCol] === this.EMPTY) {
          captures.push({
            row: jumpRow,
            col: jumpCol,
            capture: true,
            capturedRow: newRow,
            capturedCol: newCol
          });
        }
      }
    }
    
    // Se há capturas disponíveis, elas são obrigatórias
    if (captures.length > 0) {
      return captures;
    }
    
    // Se não há capturas obrigatórias globalmente, retorna movimentos simples
    if (!this.mustCapture) {
      return moves;
    }
    
    return [];
  },

  /**
   * Verifica se há capturas obrigatórias para o jogador atual
   * @returns {boolean}
   */
  checkMustCapture() {
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (this.isCurrentPlayerPiece(piece)) {
          const moves = this.getValidMoves(row, col);
          if (moves.some(m => m.capture)) {
            return true;
          }
        }
      }
    }
    return false;
  },

  /**
   * Move uma peça para uma posição
   * @param {number} toRow 
   * @param {number} toCol 
   * @returns {Object} Resultado do movimento
   */
  movePiece(toRow, toCol) {
    if (!this.selectedPiece) return { success: false };
    
    const move = this.validMoves.find(m => m.row === toRow && m.col === toCol);
    if (!move) {
      Sounds.playError();
      return { success: false };
    }
    
    const { row: fromRow, col: fromCol } = this.selectedPiece;
    const piece = this.board[fromRow][fromCol];
    
    // Move a peça
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = this.EMPTY;
    
    let captured = false;
    let crowned = false;
    
    // Se foi uma captura
    if (move.capture) {
      this.board[move.capturedRow][move.capturedCol] = this.EMPTY;
      captured = true;
      
      // Atualiza contagem de peças
      if (this.currentPlayer === 1) {
        this.bluePieces--;
      } else {
        this.redPieces--;
      }
      
      Sounds.playCapture();
    } else {
      Sounds.playMove();
    }
    
    // Verifica promoção a dama
    if (!this.isKing(piece)) {
      if ((piece === this.RED && toRow === 0) || 
          (piece === this.BLUE && toRow === this.BOARD_SIZE - 1)) {
        this.board[toRow][toCol] = piece === this.RED ? this.RED_KING : this.BLUE_KING;
        crowned = true;
        Sounds.playCrown();
      }
    }
    
    // Verifica se pode continuar capturando (cadeia de capturas)
    if (captured && !crowned) {
      this.selectedPiece = { row: toRow, col: toCol };
      this.mustCapture = true;
      this.validMoves = this.getValidMoves(toRow, toCol).filter(m => m.capture);
      
      if (this.validMoves.length > 0) {
        this.captureChain = true;
        return { success: true, captured, crowned, continueCapture: true };
      }
    }
    
    // Fim do turno
    this.selectedPiece = null;
    this.validMoves = [];
    this.captureChain = false;
    
    // Verifica fim de jogo antes de mudar de turno
    const gameResult = this.checkGameOver();
    if (gameResult.over) {
      this.gameOver = true;
      return { success: true, captured, crowned, gameOver: true, winner: gameResult.winner };
    }
    
    // Muda o turno
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.mustCapture = this.checkMustCapture();
    
    return { success: true, captured, crowned };
  },

  /**
   * Verifica se o jogo terminou
   * @returns {Object} Estado do fim de jogo
   */
  checkGameOver() {
    // Verifica se algum jogador ficou sem peças
    if (this.redPieces === 0) {
      return { over: true, winner: 2 };
    }
    if (this.bluePieces === 0) {
      return { over: true, winner: 1 };
    }
    
    // Verifica se o jogador atual tem movimentos válidos
    let hasValidMove = false;
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (this.isCurrentPlayerPiece(this.board[row][col])) {
          const moves = this.getValidMoves(row, col);
          if (moves.length > 0) {
            hasValidMove = true;
            break;
          }
        }
      }
      if (hasValidMove) break;
    }
    
    if (!hasValidMove) {
      // O jogador atual não tem movimentos, o oponente vence
      return { over: true, winner: this.currentPlayer === 1 ? 2 : 1 };
    }
    
    return { over: false };
  },

  /**
   * Finaliza o jogo e salva a partida
   * @param {number} winnerId - 1 para RED, 2 para BLUE
   */
  endGame(winnerId) {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    
    const matchData = {
      player1Id: this.player1.id,
      player2Id: this.player2.id,
      winnerId: winnerId === 1 ? this.player1.id : this.player2.id,
      player1Pieces: this.redPieces,
      player2Pieces: this.bluePieces,
      duration: duration
    };
    
    Storage.addMatch(matchData);
    
    return {
      winner: winnerId === 1 ? this.player1 : this.player2,
      loser: winnerId === 1 ? this.player2 : this.player1,
      winnerPieces: winnerId === 1 ? this.redPieces : this.bluePieces,
      duration: duration
    };
  },

  /**
   * Retorna o jogador atual
   * @returns {Object}
   */
  getCurrentPlayer() {
    return this.currentPlayer === 1 ? this.player1 : this.player2;
  },

  /**
   * Retorna estatísticas do jogo atual
   * @returns {Object}
   */
  getStats() {
    return {
      currentPlayer: this.currentPlayer,
      currentPlayerObj: this.getCurrentPlayer(),
      redPieces: this.redPieces,
      bluePieces: this.bluePieces,
      player1: this.player1,
      player2: this.player2,
      mustCapture: this.mustCapture,
      duration: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
    };
  },

  /**
   * Retorna peças que têm capturas obrigatórias
   * @returns {Array} Lista de posições com peças que devem capturar
   */
  getPiecesWithMandatoryCapture() {
    const pieces = [];
    if (!this.mustCapture) return pieces;
    
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = this.board[row][col];
        if (this.isCurrentPlayerPiece(piece)) {
          const moves = this.getValidMoves(row, col);
          if (moves.some(m => m.capture)) {
            pieces.push({ row, col });
          }
        }
      }
    }
    return pieces;
  }
};
