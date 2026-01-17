/**
 * SERVER.JS - Servidor WebSocket para Multiplayer
 * Execute com: node server.js
 */

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = 3000;

// Armazena as salas ativas
const rooms = new Map();

// Cria servidor HTTP básico
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jogo de Damas - Servidor Multiplayer\n');
});

// Cria servidor WebSocket
const wss = new WebSocketServer({ server });

console.log('🎮 Servidor de Damas iniciando...');

wss.on('connection', (ws) => {
  console.log('✅ Nova conexão');
  
  ws.roomCode = null;
  ws.playerName = 'Jogador';
  ws.isHost = false;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('❌ Conexão fechada');
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('Erro WebSocket:', error);
  });
});

/**
 * Processa mensagens recebidas
 */
function handleMessage(ws, message) {
  console.log('📨 Mensagem:', message.type);
  
  switch (message.type) {
    case 'create_room':
      createRoom(ws, message);
      break;
      
    case 'join_room':
      joinRoom(ws, message);
      break;
      
    case 'start_game':
      startGame(ws, message);
      break;
      
    case 'move':
      broadcastMove(ws, message);
      break;
      
    default:
      console.log('Mensagem desconhecida:', message.type);
  }
}

/**
 * Cria uma nova sala
 */
function createRoom(ws, message) {
  const { roomCode, playerName } = message;
  
  if (rooms.has(roomCode)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Código de sala já existe'
    }));
    return;
  }
  
  rooms.set(roomCode, {
    host: ws,
    client: null,
    hostName: playerName,
    clientName: null,
    gameStarted: false
  });
  
  ws.roomCode = roomCode;
  ws.playerName = playerName;
  ws.isHost = true;
  
  console.log(`🏠 Sala criada: ${roomCode} por ${playerName}`);
  
  ws.send(JSON.stringify({
    type: 'room_created',
    roomCode: roomCode
  }));
}

/**
 * Entra em uma sala existente
 */
function joinRoom(ws, message) {
  const { roomCode, playerName } = message;
  
  const room = rooms.get(roomCode);
  
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Sala não encontrada'
    }));
    return;
  }
  
  if (room.client) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Sala já está cheia'
    }));
    return;
  }
  
  room.client = ws;
  room.clientName = playerName;
  
  ws.roomCode = roomCode;
  ws.playerName = playerName;
  ws.isHost = false;
  
  console.log(`👤 ${playerName} entrou na sala ${roomCode}`);
  
  // Notifica o cliente
  ws.send(JSON.stringify({
    type: 'join_success',
    hostName: room.hostName
  }));
  
  // Notifica o host
  room.host.send(JSON.stringify({
    type: 'player_joined',
    playerName: playerName
  }));
}

/**
 * Inicia o jogo
 */
function startGame(ws, message) {
  const { roomCode } = message;
  const room = rooms.get(roomCode);
  
  if (!room || !room.client) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Sala incompleta'
    }));
    return;
  }
  
  room.gameStarted = true;
  
  console.log(`🎮 Jogo iniciado na sala ${roomCode}`);
  
  // Notifica ambos os jogadores
  const gameStartMessage = JSON.stringify({
    type: 'game_start',
    hostName: room.hostName,
    clientName: room.clientName
  });
  
  room.host.send(gameStartMessage);
  room.client.send(gameStartMessage);
}

/**
 * Envia movimento para o outro jogador
 */
function broadcastMove(ws, message) {
  const { roomCode, from, to } = message;
  const room = rooms.get(roomCode);
  
  if (!room) return;
  
  const moveMessage = JSON.stringify({
    type: 'move',
    from: from,
    to: to
  });
  
  // Envia para o outro jogador
  if (ws.isHost && room.client) {
    room.client.send(moveMessage);
  } else if (!ws.isHost && room.host) {
    room.host.send(moveMessage);
  }
}

/**
 * Trata desconexão de um jogador
 */
function handleDisconnect(ws) {
  if (!ws.roomCode) return;
  
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  
  // Notifica o outro jogador
  const disconnectMessage = JSON.stringify({
    type: 'opponent_disconnected'
  });
  
  if (ws.isHost) {
    if (room.client) {
      room.client.send(disconnectMessage);
    }
    rooms.delete(ws.roomCode);
  } else {
    if (room.host) {
      room.host.send(disconnectMessage);
    }
    room.client = null;
    room.clientName = null;
  }
  
  console.log(`🚪 Jogador saiu da sala ${ws.roomCode}`);
}

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 WebSocket em ws://localhost:${PORT}`);
  console.log('');
  console.log('Para jogar em rede local:');
  console.log('1. Descubra seu IP local (ipconfig / ifconfig)');
  console.log('2. Ambos os dispositivos devem acessar http://SEU_IP:8088');
  console.log('3. O servidor WebSocket estará em ws://SEU_IP:3000');
});
