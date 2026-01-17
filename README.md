# 🎮 Jogo de Damas

Um jogo de damas divertido e colorido para toda a família! Otimizado para TV Android e crianças.

## ✨ Características

- 🎨 Interface colorida e animada
- 👥 Cadastro de jogadores com avatares
- 🏆 Sistema de ranking e estatísticas
- 🔊 Efeitos sonoros divertidos
- 📺 Navegação por controle remoto (D-pad)
- 💾 Dados salvos localmente (offline)
- 📱 100% responsivo

## 🚀 Como Jogar

1. Abra `index.html` no navegador ou use um servidor local:
   ```bash
   cd /home/danilson/www/checkers-game
   python3 -m http.server 8080
   ```

2. Acesse `http://localhost:8080`

3. Cadastre os jogadores em "Jogadores"

4. Clique em "Nova Partida" e selecione os participantes

5. Use o mouse ou setas do teclado para jogar!

## 🎯 Regras do Jogo

- Peças movem-se na diagonal, uma casa por vez
- Capturas são obrigatórias quando disponíveis
- Ao chegar na última linha, a peça vira Dama (👑)
- Damas podem mover-se para trás
- Vence quem capturar todas as peças do oponente

## 📂 Estrutura

```
checkers-game/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos e animações
└── js/
    ├── app.js          # Navegação e inicialização
    ├── game.js         # Lógica do jogo
    ├── board.js        # Renderização do tabuleiro
    ├── players.js      # Gerenciamento de jogadores
    ├── storage.js      # Persistência localStorage
    └── sounds.js       # Efeitos sonoros
```

## 📺 Uso em TV Android

1. Hospede os arquivos em um servidor local
2. Acesse pelo navegador da TV (Chrome, etc.)
3. Use o controle remoto para navegar
   - **Setas**: Navegar entre elementos
   - **OK/Enter**: Selecionar
   - **Voltar**: Voltar à tela anterior

---

Feito com ❤️ para diversão em família!
