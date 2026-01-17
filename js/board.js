/**
 * BOARD.JS - Renderização do Tabuleiro
 * Responsável por desenhar e atualizar o tabuleiro visualmente
 * Com suporte a navegação D-pad para TV e Drag & Drop para touch/mouse
 */

const Board = {
  container: null,
  
  // Estado do cursor para navegação D-pad
  cursorRow: 0,
  cursorCol: 1,
  
  // Estado do drag & drop
  isDragging: false,
  dragPiece: null,
  dragStartRow: null,
  dragStartCol: null,
  ghostElement: null,
  dragOffsetX: 0,
  dragOffsetY: 0,

  /**
   * Inicializa o tabuleiro visual
   * @param {string} containerId - ID do container do tabuleiro
   */
  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    // Inicia cursor na primeira peça jogável
    this.cursorRow = 5;
    this.cursorCol = 0;
    this.findFirstPlayablePiece();
    
    // Reset drag state
    this.isDragging = false;
    this.dragPiece = null;
    this.removeGhost();
    
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
          
          // Adiciona classe draggable se for peça do jogador atual
          if (Game.isCurrentPlayerPiece(piece) && !Game.gameOver) {
            pieceClass += ' draggable';
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
    console.log('Board handleKeyNavigation key:', key);
    
    // Navegação por setas - move o cursor
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      this.moveCursor(key);
      console.log('Cursor moved to:', this.cursorRow, this.cursorCol);
      return true;
    }
    
    // Enter/Space - seleciona peça ou move
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      console.log('Enter pressed - calling handleCursorAction');
      this.handleCursorAction();
      return true;
    }
    
    // Escape - cancela seleção ou volta
    if (key === 'Escape') {
      e.preventDefault();
      if (Game.selectedPiece && !Game.captureChain) {
        Game.selectedPiece = null;
        Game.validMoves = [];
        this.render();
        Sounds.playCancel();
        console.log('Selection cancelled');
        return true;
      }
      // Se não tem peça selecionada, deixa o App tratar (voltar)
      return false;
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
    
    console.log('Cursor action at:', row, col, 'piece:', piece, 'currentPlayer:', Game.currentPlayer);
    
    // Se há uma peça selecionada e esta é uma casa válida para mover
    if (Game.selectedPiece) {
      const isValidMove = Game.validMoves.some(m => m.row === row && m.col === col);
      if (isValidMove) {
        console.log('Moving to valid position');
        this.handleCellClick(row, col);
        return;
      }
    }
    
    // Se é uma peça do jogador atual, tenta selecionar
    if (Game.isCurrentPlayerPiece(piece)) {
      console.log('Selecting piece');
      this.handlePieceClick(row, col);
    } 
    // Se é uma casa vazia ou movimento válido
    else if (piece === Game.EMPTY) {
      console.log('Clicking on empty cell');
      this.handleCellClick(row, col);
    }
    // Se é uma peça do oponente, não faz nada (ou mostra erro)
    else {
      console.log('Cannot select opponent piece');
      Sounds.playError();
    }
  },

  /**
   * Adiciona event listeners às células e peças
   */
  attachListeners() {
    // Listeners para peças (click e drag)
    this.container.querySelectorAll('.piece').forEach(piece => {
      // Click
      piece.addEventListener('click', (e) => {
        if (this.isDragging) return;
        e.stopPropagation();
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        this.cursorRow = row;
        this.cursorCol = col;
        this.handlePieceClick(row, col);
      });
      
      // Touch start (drag)
      piece.addEventListener('touchstart', (e) => this.onDragStart(e, piece), { passive: false });
      
      // Mouse down (drag)
      piece.addEventListener('mousedown', (e) => this.onDragStart(e, piece));
    });
    
    // Listeners para células
    this.container.querySelectorAll('.cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (this.isDragging) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        this.cursorRow = row;
        this.cursorCol = col;
        this.handleCellClick(row, col);
      });
    });
    
    // Global listeners para drag (movimento e soltar)
    document.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.onDragEnd(e));
    document.addEventListener('touchcancel', (e) => this.onDragEnd(e));
    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('mouseup', (e) => this.onDragEnd(e));
  },

  /**
   * Inicia o arraste de uma peça
   * @param {Event} e 
   * @param {HTMLElement} pieceElement 
   */
  onDragStart(e, pieceElement) {
    if (Game.gameOver) return;
    
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = Game.board[row][col];
    
    // Só permite arrastar peças do jogador atual
    if (!Game.isCurrentPlayerPiece(piece)) return;
    
    // Se está em cadeia de captura, só permite mover a peça selecionada
    if (Game.captureChain && Game.selectedPiece) {
      if (row !== Game.selectedPiece.row || col !== Game.selectedPiece.col) {
        return;
      }
    }
    
    e.preventDefault();
    
    // Seleciona a peça
    if (Game.selectPiece(row, col)) {
      this.isDragging = true;
      this.dragPiece = pieceElement;
      this.dragStartRow = row;
      this.dragStartCol = col;
      
      // Pega posição do toque/mouse
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      // Calcula offset do centro da peça
      const rect = pieceElement.getBoundingClientRect();
      this.dragOffsetX = clientX - (rect.left + rect.width / 2);
      this.dragOffsetY = clientY - (rect.top + rect.height / 2);
      
      // Cria ghost
      this.createGhost(pieceElement, clientX, clientY);
      
      // Esconde peça original
      pieceElement.style.opacity = '0.3';
      
      // Re-renderiza para mostrar movimentos válidos
      this.render();
      
      // Mantém a peça original escondida após re-render
      const originalPiece = this.container.querySelector(`.piece[data-row="${row}"][data-col="${col}"]`);
      if (originalPiece) {
        originalPiece.style.opacity = '0.3';
      }
      
      Sounds.playSelect();
    }
  },

  /**
   * Move a peça durante o arraste
   * @param {Event} e 
   */
  onDragMove(e) {
    if (!this.isDragging || !this.ghostElement) return;
    
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Move o ghost
    this.ghostElement.style.left = (clientX - this.dragOffsetX) + 'px';
    this.ghostElement.style.top = (clientY - this.dragOffsetY) + 'px';
    
    // Destaca a célula sob o cursor
    this.highlightCellUnderCursor(clientX, clientY);
  },

  /**
   * Finaliza o arraste
   * @param {Event} e 
   */
  onDragEnd(e) {
    if (!this.isDragging) return;
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    // Encontra a célula alvo
    const targetCell = this.getCellAtPosition(clientX, clientY);
    
    if (targetCell) {
      const toRow = parseInt(targetCell.dataset.row);
      const toCol = parseInt(targetCell.dataset.col);
      
      // Tenta mover
      if (Game.board[toRow][toCol] === Game.EMPTY) {
        const result = Game.movePiece(toRow, toCol);
        
        if (result.success) {
          this.cursorRow = toRow;
          this.cursorCol = toCol;
          
          this.removeGhost();
          this.isDragging = false;
          this.dragPiece = null;
          
          this.render();
          App.updateGameInfo();
          
          if (result.gameOver) {
            setTimeout(() => {
              App.showGameOver(result.winner);
            }, 500);
          } else if (result.continueCapture) {
            setTimeout(() => this.render(), 100);
          }
          
          return;
        }
      }
    }
    
    // Se não conseguiu mover, cancela e volta
    this.cancelDrag();
  },

  /**
   * Cancela o arraste e restaura a peça
   */
  cancelDrag() {
    this.removeGhost();
    this.isDragging = false;
    this.dragPiece = null;
    
    // Se não está em cadeia de captura, deseleciona
    if (!Game.captureChain) {
      Game.selectedPiece = null;
      Game.validMoves = [];
    }
    
    this.render();
    Sounds.playError();
  },

  /**
   * Cria o elemento fantasma para arraste
   * @param {HTMLElement} pieceElement 
   * @param {number} x 
   * @param {number} y 
   */
  createGhost(pieceElement, x, y) {
    this.removeGhost();
    
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost ' + pieceElement.className;
    ghost.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(1.2);
      transition: transform 0.1s ease;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    `;
    
    ghost.style.left = (x - this.dragOffsetX) + 'px';
    ghost.style.top = (y - this.dragOffsetY) + 'px';
    
    document.body.appendChild(ghost);
    this.ghostElement = ghost;
  },

  /**
   * Remove o elemento fantasma
   */
  removeGhost() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }
  },

  /**
   * Destaca a célula sob a posição do cursor
   * @param {number} x 
   * @param {number} y 
   */
  highlightCellUnderCursor(x, y) {
    // Remove destaque anterior
    this.container.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });
    
    const cell = this.getCellAtPosition(x, y);
    if (cell) {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      
      // Verifica se é um movimento válido
      const isValid = Game.validMoves.some(m => m.row === row && m.col === col);
      if (isValid) {
        cell.classList.add('drop-target');
      }
    }
  },

  /**
   * Obtém a célula na posição dada
   * @param {number} x 
   * @param {number} y 
   * @returns {HTMLElement|null}
   */
  getCellAtPosition(x, y) {
    const cells = this.container.querySelectorAll('.cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return cell;
      }
    }
    return null;
  },

  /**
   * Trata clique em uma peça
   * @param {number} row 
   * @param {number} col 
   */
  handlePieceClick(row, col) {
    if (Game.gameOver) return;
    
    const piece = Game.board[row][col];
    console.log('handlePieceClick:', row, col, 'piece:', piece);
    
    // Validação de multiplayer: só pode selecionar minhas peças e no meu turno
    if (Game.isMultiplayer) {
      if (!Multiplayer.isMyTurn()) {
        console.log('Not my turn to select');
        Sounds.playError();
        return;
      }
      
      // Verifica se a peça pertence ao jogador local
      // Azul = 2 (pieces 3, 4), Vermelho = 1 (pieces 1, 2)
      const isMyPieceColor = (Multiplayer.myPlayer === 1 && (piece === 1 || piece === 2)) ||
                             (Multiplayer.myPlayer === 2 && (piece === 3 || piece === 4));
                             
      if (!isMyPieceColor) {
        console.log('Not my piece color');
        Sounds.playError();
        return;
      }
    }
    
    // Se clicou na própria peça selecionada, deseleciona
    if (Game.selectedPiece && 
        Game.selectedPiece.row === row && 
        Game.selectedPiece.col === col) {
      if (!Game.captureChain) {
        Game.selectedPiece = null;
        Game.validMoves = [];
        this.render();
        Sounds.playCancel();
        console.log('Deselected piece');
      }
      return;
    }
    
    // Se já tem uma peça selecionada e clicou em outra peça do mesmo jogador
    if (Game.selectedPiece && Game.isCurrentPlayerPiece(piece)) {
      if (!Game.captureChain) {
        if (Game.selectPiece(row, col)) {
          this.render();
          Sounds.playSelect();
          console.log('Changed selection to:', row, col);
        } else {
          Sounds.playError();
          console.log('Cannot select this piece (maybe must capture)');
        }
      }
      return;
    }
    
    // Tenta selecionar a peça
    if (Game.selectPiece(row, col)) {
      this.render();
      Sounds.playSelect();
      console.log('Selected piece at:', row, col, 'valid moves:', Game.validMoves.length);
    } else {
      Sounds.playError();
      console.log('Selection failed - maybe must capture with another piece');
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
      
      // Validação de turno para multiplayer
      if (Game.isMultiplayer && !Multiplayer.isMyTurn()) {
        console.log('Not my turn!');
        Sounds.playError();
        return;
      }
      
      // Guarda posição original para enviar depois
      const from = { row: Game.selectedPiece.row, col: Game.selectedPiece.col };
      
      const result = Game.movePiece(row, col);
      
      if (result.success) {
        
        // Envia movimento se for multiplayer
        if (Game.isMultiplayer) {
          console.log('Sending move:', from, 'to', { row, col });
          Multiplayer.sendMove(from, { row, col });
        }
        
        this.cursorRow = row;
        this.cursorCol = col;
        
        this.render();
        if (window.App) window.App.updateGameInfo();
        
        if (result.gameOver) {
          setTimeout(() => {
            if (window.App) window.App.showGameOver(result.winner);
          }, 500);
        } else if (result.continueCapture) {
          setTimeout(() => this.render(), 100);
        }
      }
    }
  },

  /**
   * Atualiza apenas as informações visuais sem re-renderizar tudo
   */
  updateHighlights() {
    this.container.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    this.container.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));
    this.container.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    this.container.querySelectorAll('.cursor').forEach(el => el.classList.remove('cursor'));
    
    const cursorCell = this.container.querySelector(
      `.cell[data-row="${this.cursorRow}"][data-col="${this.cursorCol}"]`
    );
    if (cursorCell) cursorCell.classList.add('cursor');
    
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
   * Foca na primeira peça jogável
   */
  focusFirstPlayablePiece() {
    this.findFirstPlayablePiece();
    this.render();
  }
};
