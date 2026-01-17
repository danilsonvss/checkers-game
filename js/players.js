/**
 * PLAYERS.JS - Gerenciamento de Jogadores
 * Funções para cadastro, edição e seleção de jogadores
 */

const Players = {
  // Cores disponíveis para avatares
  AVATAR_COLORS: [
    { id: 'red', name: 'Vermelho', hex: '#ef4444' },
    { id: 'blue', name: 'Azul', hex: '#3b82f6' },
    { id: 'green', name: 'Verde', hex: '#22c55e' },
    { id: 'yellow', name: 'Amarelo', hex: '#eab308' },
    { id: 'purple', name: 'Roxo', hex: '#a855f7' },
    { id: 'pink', name: 'Rosa', hex: '#ec4899' },
    { id: 'orange', name: 'Laranja', hex: '#f97316' },
    { id: 'cyan', name: 'Ciano', hex: '#06b6d4' }
  ],

  // Estado atual
  editingPlayer: null,
  selectedColor: 'blue',

  /**
   * Retorna a cor hex pelo ID
   * @param {string} colorId 
   * @returns {string} Cor hex
   */
  getColorHex(colorId) {
    const color = this.AVATAR_COLORS.find(c => c.id === colorId);
    return color ? color.hex : '#3b82f6';
  },

  /**
   * Retorna a inicial do nome para o avatar
   * @param {string} name 
   * @returns {string} Inicial
   */
  getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
  },

  /**
   * Renderiza a lista de jogadores
   * @param {string} containerId - ID do container
   * @param {Object} options - Opções de renderização
   */
  renderPlayersList(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const players = Storage.getPlayers();
    
    if (players.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">👥</div>
          <p class="empty-state__text">Nenhum jogador cadastrado ainda!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = players.map((player, index) => `
      <div class="player-item focusable" 
           tabindex="0" 
           data-player-id="${player.id}"
           data-action="${options.selectable ? 'select' : 'view'}">
        <div class="player-item__avatar" style="background: ${this.getColorHex(player.color)}">
          ${this.getInitial(player.name)}
        </div>
        <div class="player-item__info">
          <div class="player-item__name">${this.escapeHtml(player.name)}</div>
          <div class="player-item__stats">
            🏆 ${player.wins} vitórias · ${player.gamesPlayed} jogos
          </div>
        </div>
        ${options.showActions ? `
          <div class="player-item__actions">
            <button class="player-item__action focusable" 
                    tabindex="0"
                    data-action="edit" 
                    data-player-id="${player.id}"
                    aria-label="Editar ${player.name}">
              ✏️
            </button>
            <button class="player-item__action player-item__action--delete focusable" 
                    tabindex="0"
                    data-action="delete" 
                    data-player-id="${player.id}"
                    aria-label="Remover ${player.name}">
              🗑️
            </button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Adiciona event listeners
    this.attachPlayerListeners(container, options);
  },

  /**
   * Adiciona listeners aos itens da lista
   * @param {HTMLElement} container 
   * @param {Object} options 
   */
  attachPlayerListeners(container, options) {
    // Listeners para ações nos jogadores
    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = el.dataset.action;
        const playerId = el.dataset.playerId;
        
        switch (action) {
          case 'edit':
            this.openEditForm(playerId);
            break;
          case 'delete':
            this.confirmDelete(playerId);
            break;
          case 'select':
            if (options.onSelect) {
              options.onSelect(playerId);
            }
            break;
        }
      });

      // Suporte a Enter/Space para acessibilidade
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  },

  /**
   * Renderiza o seletor de cores de avatar
   * @param {string} containerId 
   * @param {string} selectedColor 
   */
  renderColorPicker(containerId, selectedColor = 'blue') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.selectedColor = selectedColor;

    container.innerHTML = this.AVATAR_COLORS.map(color => `
      <button class="avatar-option avatar-option--${color.id} focusable ${color.id === selectedColor ? 'selected' : ''}"
              tabindex="0"
              data-color="${color.id}"
              aria-label="Cor ${color.name}"
              style="background: ${color.hex}">
      </button>
    `).join('');

    // Event listeners para seleção de cor
    container.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedColor = btn.dataset.color;
        Sounds.playSelect();
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  },

  /**
   * Abre o formulário para adicionar jogador
   */
  openAddForm() {
    this.editingPlayer = null;
    this.selectedColor = 'blue';
    
    const nameInput = document.getElementById('player-name');
    if (nameInput) {
      nameInput.value = '';
    }
    
    this.renderColorPicker('color-picker', 'blue');
    
    const formTitle = document.getElementById('player-form-title');
    if (formTitle) {
      formTitle.textContent = 'Novo Jogador';
    }

    App.showScreen('player-form');
  },

  /**
   * Abre o formulário para editar jogador
   * @param {string} playerId 
   */
  openEditForm(playerId) {
    const player = Storage.getPlayerById(playerId);
    if (!player) return;

    this.editingPlayer = player;
    this.selectedColor = player.color;
    
    const nameInput = document.getElementById('player-name');
    if (nameInput) {
      nameInput.value = player.name;
    }
    
    this.renderColorPicker('color-picker', player.color);
    
    const formTitle = document.getElementById('player-form-title');
    if (formTitle) {
      formTitle.textContent = 'Editar Jogador';
    }

    App.showScreen('player-form');
  },

  /**
   * Salva o jogador (novo ou editado)
   */
  savePlayer() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
      Sounds.playError();
      nameInput.focus();
      return false;
    }

    if (name.length > 20) {
      Sounds.playError();
      alert('Nome muito longo! Máximo 20 caracteres.');
      return false;
    }

    if (this.editingPlayer) {
      // Atualizando jogador existente
      Storage.updatePlayer(this.editingPlayer.id, {
        name: name,
        color: this.selectedColor
      });
    } else {
      // Criando novo jogador
      const players = Storage.getPlayers();
      if (players.length >= 20) {
        Sounds.playError();
        alert('Limite de 20 jogadores atingido!');
        return false;
      }
      Storage.addPlayer({
        name: name,
        color: this.selectedColor
      });
    }

    Sounds.playConfirm();
    this.editingPlayer = null;
    
    // Volta diretamente para lista de jogadores sem acumular histórico
    App.screenHistory = App.screenHistory.filter(s => s !== 'player-form');
    App.showScreen('players');
    return true;
  },

  /**
   * Confirma e exclui um jogador
   * @param {string} playerId 
   */
  confirmDelete(playerId) {
    const player = Storage.getPlayerById(playerId);
    if (!player) return;

    if (confirm(`Deseja realmente remover "${player.name}"?\nTodas as estatísticas serão perdidas.`)) {
      Storage.removePlayer(playerId);
      Sounds.playConfirm();
      this.renderPlayersList('players-list', { showActions: true });
    }
  },

  /**
   * Renderiza o ranking de jogadores
   * @param {string} containerId 
   */
  renderRanking(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ranking = Storage.getRanking();

    if (ranking.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🏆</div>
          <p class="empty-state__text">Nenhuma partida jogada ainda!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = ranking.map((player, index) => `
      <div class="ranking-item">
        <div class="ranking-item__position ranking-item__position--${index + 1}">
          ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
        </div>
        <div class="ranking-item__avatar" style="background: ${this.getColorHex(player.color)}">
          ${this.getInitial(player.name)}
        </div>
        <div class="ranking-item__info">
          <div class="ranking-item__name">${this.escapeHtml(player.name)}</div>
          <div class="ranking-item__record">
            ${player.wins}V · ${player.losses}D · ${player.draws}E
          </div>
        </div>
        <div class="ranking-item__wins">
          ${player.wins} 🏆
        </div>
      </div>
    `).join('');
  },

  /**
   * Escapa HTML para prevenir XSS
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
