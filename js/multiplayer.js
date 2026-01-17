/**
 * MULTIPLAYER.JS - Sistema de Multiplayer WiFi Local
 * Gerencia conexões WebSocket para jogo em rede local
 */

const Multiplayer = {
  // Estado
  socket: null,
  isHost: false,
  roomCode: null,
  isConnected: false,
  opponentName: 'Jogador',
  myPlayer: null, // 1 = RED, 2 = BLUE
  
  // Servidor WebSocket (padrão)
  serverUrl: null,
  
  // Callbacks
  onConnected: null,
  onDisconnected: null,
  onGameStart: null,
  onOpponentMove: null,
  onError: null,

  /**
   * Gera um código de sala aleatório
   * @returns {string} Código de 6 caracteres
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  /**
   * Obtém o IP local (para exibir ao host)
   * @returns {string}
   */
  getLocalIP() {
    // Em produção, isso seria obtido do servidor
    // Por ora, retornamos o hostname
    return window.location.hostname || 'localhost';
  },

  /**
   * Cria uma sala como host
   * @param {string} playerName Nome do jogador host
   * @returns {Promise<string>} Código da sala
   */
  async createRoom(playerName) {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.roomCode = this.generateRoomCode();
      this.myPlayer = 1; // Host sempre é RED
      
      const serverUrl = this.getServerUrl();
      
      try {
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
          this.startHeartbeat();
          // Envia comando para criar sala
          this.send({
            type: 'create_room',
            roomCode: this.roomCode,
            playerName: playerName
          });
          resolve(this.roomCode);
        };
        
        this.socket.onmessage = (event) => this.handleMessage(event);
        this.socket.onclose = () => this.handleDisconnect();
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('Não foi possível conectar ao servidor'));
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Entra em uma sala existente
   * @param {string} roomCode Código da sala
   * @param {string} playerName Nome do jogador
   * @returns {Promise<void>}
   */
  async joinRoom(roomCode, playerName) {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomCode = roomCode.toUpperCase();
      this.myPlayer = 2; // Cliente sempre é BLUE
      
      const serverUrl = this.getServerUrl();
      
      try {
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
          this.startHeartbeat();
          this.send({
            type: 'join_room',
            roomCode: this.roomCode,
            playerName: playerName
          });
        };
        
        this.socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'join_success') {
            this.isConnected = true;
            this.opponentName = data.hostName;
            resolve();
          } else if (data.type === 'error') {
            reject(new Error(data.message));
          } else {
            this.handleMessage(event);
          }
        };
        
        this.socket.onclose = () => this.handleDisconnect();
        this.socket.onerror = (error) => {
          reject(new Error('Não foi possível conectar'));
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Obtém a URL do servidor WebSocket
   * @returns {string}
   */
  getServerUrl() {
    if (this.serverUrl) return this.serverUrl;
    
    // Para app Capacitor, usar IP fixo do servidor
    // No navegador, usa o mesmo host que a página
    let host = window.location.hostname;
    
    // Se estamos em Capacitor (localhost) ou não há host, usar IP do servidor
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      // IP do servidor de desenvolvimento - ajuste para seu ambiente
      host = '192.168.100.100';
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}:3000`;
  },

  /**
   * Envia uma mensagem pelo WebSocket
   * @param {Object} data 
   */
  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  },

  /**
   * Trata mensagens recebidas
   * @param {MessageEvent} event 
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'player_joined':
          // Um jogador entrou na sala (para o host)
          this.isConnected = true;
          this.opponentName = data.playerName;
          if (this.onConnected) {
            this.onConnected(data.playerName);
          }
          break;
          
        case 'game_start':
          // O jogo vai começar
          if (this.onGameStart) {
            this.onGameStart(data);
          }
          break;
          
        case 'move':
          // Oponente fez um movimento
          if (this.onOpponentMove) {
            this.onOpponentMove(data.from, data.to);
          }
          break;
          
        case 'game_over':
          // Jogo terminou
          break;
          
        case 'opponent_disconnected':
          if (this.onDisconnected) {
            this.onDisconnected(); // Notifica que o oponente saiu
          }
          break;

        case 'error':
          console.error('Server error:', data.message);
          if (this.onError) {
            this.onError(data.message);
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  },

  /**
   * Mantém a conexão ativa (Heartbeat)
   */
  startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  },

  /**
   * Trata desconexão
   */
  handleDisconnect() {
    this.isConnected = false;
    if (this.onDisconnected) {
      this.onDisconnected();
    }
  },

  /**
   * Envia um movimento para o oponente
   * @param {Object} from {row, col}
   * @param {Object} to {row, col}
   */
  sendMove(from, to) {
    this.send({
      type: 'move',
      roomCode: this.roomCode,
      from: from,
      to: to
    });
  },

  /**
   * Solicita início do jogo (host)
   */
  startGame() {
    if (this.isHost) {
      this.send({
        type: 'start_game',
        roomCode: this.roomCode
      });
    }
  },

  /**
   * Verifica se é minha vez de jogar
   * @returns {boolean}
   */
  isMyTurn() {
    return Game.currentPlayer === this.myPlayer;
  },

  /**
   * Desconecta do servidor
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomCode = null;
  },

  /**
   * Reseta o estado
   */
  reset() {
    this.disconnect();
    this.opponentName = 'Jogador';
    this.myPlayer = null;
  }
};
