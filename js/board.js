/**
 * BOARD.JS - Renderização do Tabuleiro
 * Responsável por desenhar e atualizar o tabuleiro visualmente
 * Com suporte a navegação D-pad para TV
 */

const Board = {
  container: null,
  
  // Estado do cursor para navegação D-pad
  cursorRow: 0,
  cursorCol: 1, // Começa em uma casa escura

  /**
   * Inicializa o tabuleiro visual
   * @param {string} containerId - ID do container do tabuleiro
   */
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    // Inicia cursor na primeira peça jogável
    this.cursorRow = 5; // Primeira linha das peças vermelhas
    this.cursorCol = 0;
    this.findFirstPlayablePiece();
    
    this.render();
  },

  /**
   * Encontra a primeira peça jogável e posiciona o cursor
   */
  findFirstPlayablePiece() {
    for (let row = 0; row < Game.BOARD_SIZE; row++) {
      for (let col = 0; col < Game.BOARD_SIZE; col++) {
        const piece = Game.board[row][col];
        if (Game.isCurrentPlayerPiece(piece)) {
          this.cursorRow = row;
          this.cursorCol = col;
          return;
        }
      }
    }
  },

  /**
   * Renderiza o tabuleiro completo
   */
  render() {
    if (!this.container) return;
    
    let html = '';
    
    for (let row = 0; row < Game.BOARD_SIZE; row++) {
      for (let col = 0; col < Game.BOARD_SIZE; col++) {
        const isDark = (row + col) % 2 === 1;
        const piece = Game.board[row][col];
        const isSelected = Game.selectedPiece && 
                          Game.selectedPiece.row === row && 
                          Game.selectedPiece.col === col;
        const isValidMove = Game.validMoves.some(m => m.row === row && m.col === col);
        const mustCapturePieces = Game.getPiecesWithMandatoryCapture();
        const mustCapture = mustCapturePieces.some(p => p.row === row && p.col === col);
        const isCursor = this.cursorRow === row && this.cursorCol === col;
        
        let cellClass = `cell cell--${isDark ? 'dark' : 'light'}`;
        if (isSelected) cellClass += ' highlight';
        if (isValidMove) cellClass += ' valid-move';
        if (isCursor) cellClass += ' cursor';
        
        let pieceHtml = '';
        if (piece !== Game.EMPTY) {
          let pieceClass = 'piece';
          
          if (piece === Game.RED || piece === Game.RED_KING) {
            pieceClass += ' piece--red';
          } else {
            pieceClass += ' piece--blue';
          }
          
          if (Game.isKing(piece)) {
            pieceClass += ' king';
          }
          
          if (isSelected) {
            pieceClass += ' selected';
          }
          
          if (mustCapture && !isSelected) {
            pieceClass += ' piece-must-capture';
          }
          
          pieceHtml = `<div class="${pieceClass}" 
                           data-row="${row}" 
                           data-col="${col}"
                           role="button"
                           aria-label="Peça ${piece === Game.RED || piece === Game.RED_KING ? 'vermelha' : 'azul'}${Game.isKing(piece) ? ' dama' : ''} na linha ${row + 1}, coluna ${col + 1}">
                      </div>`;
        }
        
        html += `<div class="${cellClass}" 
                     data-row="${row}" 
                     data-col="${col}"
                     role="gridcell"
                     aria-label="Casa ${isDark ? 'escura' : 'clara'} na linha ${row + 1}, coluna ${col + 1}${isValidMove ? ' - movimento válido' : ''}">
                   ${pieceHtml}
                 </div>`;
      }
    }
    
    this.container.innerHTML = html;
    this.attachListeners();
  },

  /**
   * Trata navegação por teclado no tabuleiro
   * @param {KeyboardEvent} e
   * @returns {boolean} Se o evento foi tratado
   */
  handleKeyNavigation(e) {
    const key = e.key;
    
    // Navegação por setas - move o cursor
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      this.moveCursor(key);
      return true;
    }
    
    // Enter/Space - seleciona peça ou move
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      this.handleCursorAction();
      return true;
    }
    
    // Escape - cancela seleção
    if (key === 'Escape' && Game.selectedPiece && !Game.captureChain) {
      e.preventDefault();
      Game.selectedPiece = null;
      Game.validMoves = [];
      this.render();
      Sounds.playCancel();
      return true;
    }
    
    return false;
  },

  /**
   * Move o cursor no tabuleiro
   * @param {string} key
   */
  moveCursor(key) {
    let newRow = this.cursorRow;
    let newCol = this.cursorCol;
    
    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, this.cursorRow - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(Game.BOARD_SIZE - 1, this.cursorRow + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, this.cursorCol - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(Game.BOARD_SIZE - 1, this.cursorCol + 1);
        break;
    }
    
    // Só move se for diferente
    if (newRow !== this.cursorRow || newCol !== this.cursorCol) {
      this.cursorRow = newRow;
      this.cursorCol = newCol;
      this.render();
      Sounds.playNavigate();
    }
  },

  /**
   * Executa ação na posição do cursor (selecionar ou mover)
   */
  handleCursorAction() {
    const row = this.cursorRow;
    const col = this.cursorCol;
    const piece = Game.board[row][col];
    
    // Se há uma peça do jogador atual na posição
    if (Game.isCurrentPlayerPiece(piece)) {
      this.handlePieceClick(row, col);
    } 
    // Se é uma posição vazia ou movimento
    else {
      this.handleCellClick(row, col);
    }
  },

  /**
   * Adiciona event listeners às células e peças
   */
  attachListeners() {
    // Listener para cliques em peças
    this.container.querySelectorAll('.piece').forEach(piece => {
      piece.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        this.cursorRow = row;
        this.cursorCol = col;
        this.handlePieceClick(row, col);
      });
    });
    
    // Listener para cliques em células (para movimentos)
    this.container.querySelectorAll('.cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.cursorRow = row;
        this.cursorCol = col;
        this.handleCellClick(row, col);
      });
    });
  },

  /**
   * Trata clique em uma peça
   * @param {number} row 
   * @param {number} col 
   */
  handlePieceClick(row, col) {
    if (Game.gameOver) return;
    
    const piece = Game.board[row][col];
    
    // Se clicou na própria peça selecionada, deseleciona
    if (Game.selectedPiece && 
        Game.selectedPiece.row === row && 
        Game.selectedPiece.col === col) {
      if (!Game.captureChain) {
        Game.selectedPiece = null;
        Game.validMoves = [];
        this.render();
        Sounds.playCancel();
      }
      return;
    }
    
    // Se já tem uma peça selecionada e clicou em outra peça do mesmo jogador
    if (Game.selectedPiece && Game.isCurrentPlayerPiece(piece)) {
      if (!Game.captureChain) {
        Game.selectPiece(row, col);
        this.render();
      }
      return;
    }
    
    // Tenta selecionar a peça
    if (Game.selectPiece(row, col)) {
      this.render();
    }
  },

  /**
   * Trata clique em uma célula
   * @param {number} row 
   * @param {number} col 
   */
  handleCellClick(row, col) {
    if (Game.gameOver) return;
    
    // Se há uma peça na célula, trata como clique na peça
    if (Game.board[row][col] !== Game.EMPTY) {
      this.handlePieceClick(row, col);
      return;
    }
    
    // Se tem uma peça selecionada e esta é uma posição válida
    if (Game.selectedPiece) {
      const result = Game.movePiece(row, col);
      
      if (result.success) {
        // Move o cursor para a nova posição
        this.cursorRow = row;
        this.cursorCol = col;
        
        this.render();
        App.updateGameInfo();
        
        if (result.gameOver) {
          setTimeout(() => {
            App.showGameOver(result.winner);
          }, 500);
        } else if (result.continueCapture) {
          // Continua na cadeia de capturas
          setTimeout(() => {
            this.render();
          }, 100);
        }
      }
    }
  },

  /**
   * Atualiza apenas as informações visuais sem re-renderizar tudo
   */
  updateHighlights() {
    // Remove destaques anteriores
    this.container.querySelectorAll('.highlight').forEach(el => {
      el.classList.remove('highlight');
    });
    this.container.querySelectorAll('.valid-move').forEach(el => {
      el.classList.remove('valid-move');
    });
    this.container.querySelectorAll('.selected').forEach(el => {
      el.classList.remove('selected');
    });
    this.container.querySelectorAll('.cursor').forEach(el => {
      el.classList.remove('cursor');
    });
    
    // Adiciona cursor
    const cursorCell = this.container.querySelector(
      `.cell[data-row="${this.cursorRow}"][data-col="${this.cursorCol}"]`
    );
    if (cursorCell) cursorCell.classList.add('cursor');
    
    // Adiciona novos destaques
    if (Game.selectedPiece) {
      const selectedCell = this.container.querySelector(
        `.cell[data-row="${Game.selectedPiece.row}"][data-col="${Game.selectedPiece.col}"]`
      );
      if (selectedCell) {
        selectedCell.classList.add('highlight');
        const piece = selectedCell.querySelector('.piece');
        if (piece) piece.classList.add('selected');
      }
      
      Game.validMoves.forEach(move => {
        const cell = this.container.querySelector(
          `.cell[data-row="${move.row}"][data-col="${move.col}"]`
        );
        if (cell) cell.classList.add('valid-move');
      });
    }
  },

  /**
   * Anima o movimento de uma peça
   * @param {number} fromRow 
   * @param {number} fromCol 
   * @param {number} toRow 
   * @param {number} toCol 
   */
  animateMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.container.querySelector(
      `.piece[data-row="${fromRow}"][data-col="${fromCol}"]`
    );
    if (piece) {
      piece.classList.add('piece-move');
      setTimeout(() => piece.classList.remove('piece-move'), 250);
    }
  },

  /**
   * Anima a captura de uma peça
   * @param {number} row 
   * @param {number} col 
   */
  animateCapture(row, col) {
    const piece = this.container.querySelector(
      `.piece[data-row="${row}"][data-col="${col}"]`
    );
    if (piece) {
      piece.classList.add('piece-capture');
    }
  },

  /**
   * Anima a promoção a dama
   * @param {number} row 
   * @param {number} col 
   */
  animateCrown(row, col) {
    const piece = this.container.querySelector(
      `.piece[data-row="${row}"][data-col="${col}"]`
    );
    if (piece) {
      piece.classList.add('piece-crown');
      setTimeout(() => piece.classList.remove('piece-crown'), 500);
    }
  },

  /**
   * Foca na primeira peça jogável (para navegação por teclado)
   */
  focusFirstPlayablePiece() {
    this.findFirstPlayablePiece();
    this.render();
  }
};
