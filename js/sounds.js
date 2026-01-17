/**
 * SOUNDS.JS - Sistema de Áudio
 * Gera efeitos sonoros usando Web Audio API
 */

const Sounds = {
  audioContext: null,
  enabled: true,

  /**
   * Inicializa o contexto de áudio
   */
  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.enabled = Storage.getSettings().soundEnabled;
    } catch (e) {
      console.warn('Web Audio API não suportada:', e);
      this.enabled = false;
    }
  },

  /**
   * Habilita/desabilita sons
   * @param {boolean} enabled 
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    Storage.updateSettings({ soundEnabled: enabled });
  },

  /**
   * Resume o contexto de áudio (necessário após interação do usuário)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  },

  /**
   * Toca uma nota musical
   * @param {number} frequency - Frequência em Hz
   * @param {number} duration - Duração em segundos
   * @param {string} type - Tipo de onda (sine, square, triangle, sawtooth)
   * @param {number} volume - Volume (0-1)
   */
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope suave
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + duration * 0.3);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  },

  /**
   * Som de movimento de peça
   */
  playMove() {
    if (!this.enabled) return;
    this.playTone(440, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(550, 0.1, 'sine', 0.15), 50);
  },

  /**
   * Som de seleção de peça
   */
  playSelect() {
    if (!this.enabled) return;
    this.playTone(660, 0.08, 'sine', 0.2);
  },

  /**
   * Som de captura de peça
   */
  playCapture() {
    if (!this.enabled) return;
    // Som mais dramático para captura
    this.playTone(200, 0.15, 'sawtooth', 0.25);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.2), 100);
    setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.15), 200);
  },

  /**
   * Som de promoção a dama
   */
  playCrown() {
    if (!this.enabled) return;
    // Arpejo ascendente
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'triangle', 0.25), i * 100);
    });
  },

  /**
   * Som de vitória - Fanfarra
   */
  playVictory() {
    if (!this.enabled) return;
    // Fanfarra de vitória
    const melody = [
      { freq: 523, dur: 0.15 },  // C5
      { freq: 523, dur: 0.15 },  // C5
      { freq: 523, dur: 0.15 },  // C5
      { freq: 523, dur: 0.3 },   // C5
      { freq: 415, dur: 0.3 },   // Ab4
      { freq: 466, dur: 0.3 },   // Bb4
      { freq: 523, dur: 0.15 },  // C5
      { freq: 466, dur: 0.1 },   // Bb4
      { freq: 523, dur: 0.5 },   // C5
    ];

    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => this.playTone(note.freq, note.dur, 'square', 0.2), time);
      time += note.dur * 1000;
    });
  },

  /**
   * Som de erro/movimento inválido
   */
  playError() {
    if (!this.enabled) return;
    this.playTone(200, 0.15, 'square', 0.2);
    setTimeout(() => this.playTone(150, 0.2, 'square', 0.15), 100);
  },

  /**
   * Som de navegação no menu
   */
  playNavigate() {
    if (!this.enabled) return;
    this.playTone(880, 0.05, 'sine', 0.1);
  },

  /**
   * Som de confirmação
   */
  playConfirm() {
    if (!this.enabled) return;
    this.playTone(523, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 100);
  },

  /**
   * Som de cancelar/voltar
   */
  playCancel() {
    if (!this.enabled) return;
    this.playTone(440, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(330, 0.15, 'sine', 0.1), 80);
  },

  /**
   * Som de início de jogo
   */
  playGameStart() {
    if (!this.enabled) return;
    const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'triangle', 0.2), i * 80);
    });
  }
};
