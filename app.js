/**
 * Polish Telephone Listening Practice App
 * Logic, State Management, Voice Synthesis and Polish Number Translator
 */

class PolishTelephonePractice {
  constructor() {
    // State Initialization
    this.currentNumber = null;
    this.speechRate = 1.0;
    this.synth = window.speechSynthesis;
    this.polishVoice = null;
    this.voices = [];
    
    // Stats State
    this.stats = {
      correct: 0,
      total: 0,
      streak: 0,
      maxStreak: 0
    };
    
    // History log
    this.history = [];
    
    // UI Selectors
    this.selectors = {
      playBtn: document.getElementById('play-btn'),
      playSlowBtn: document.getElementById('play-slow-btn'),
      userInput: document.getElementById('user-input'),
      checkBtn: document.getElementById('check-btn'),
      revealBtn: document.getElementById('reveal-btn'),
      skipBtn: document.getElementById('skip-btn'),
      feedbackEl: document.getElementById('feedback'),
      feedbackTitle: document.getElementById('feedback-title'),
      feedbackMessage: document.getElementById('feedback-message'),
      feedbackSpelling: document.getElementById('feedback-spelling'),
      voiceSelect: document.getElementById('voice-select'),
      statsCorrect: document.getElementById('stats-correct'),
      statsTotal: document.getElementById('stats-total'),
      statsAccuracy: document.getElementById('stats-accuracy'),
      statsStreak: document.getElementById('stats-streak'),
      statsMaxStreak: document.getElementById('stats-max-streak'),
      historyList: document.getElementById('history-list'),
      resetStatsBtn: document.getElementById('reset-stats-btn'),
      voiceWarning: document.getElementById('voice-warning'),
      dialBtns: document.querySelectorAll('.dial-btn[data-key]'),
      dialClear: document.getElementById('dial-clear'),
      dialBackspace: document.getElementById('dial-backspace')
    };
  }

  init() {
    this.loadStateFromStorage();
    this.setupEventListeners();
    this.initVoices();
    
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.initVoices();
    }
    
    this.newRound();
  }

  loadStateFromStorage() {
    const savedStats = localStorage.getItem('pl_tel_stats');
    if (savedStats) {
      try {
        this.stats = JSON.parse(savedStats);
      } catch (e) {
        console.error('Failed to parse saved stats', e);
      }
    }
    
    const savedHistory = localStorage.getItem('pl_tel_history');
    if (savedHistory) {
      try {
        this.history = JSON.parse(savedHistory);
        this.renderHistory();
      } catch (e) {
        console.error('Failed to parse saved history', e);
      }
    }
    
    const savedRate = localStorage.getItem('pl_tel_rate');
    if (savedRate) {
      this.speechRate = parseFloat(savedRate);
    }
    this.updateStatsUI();
  }

  saveStateToStorage() {
    localStorage.setItem('pl_tel_stats', JSON.stringify(this.stats));
    localStorage.setItem('pl_tel_history', JSON.stringify(this.history));
    localStorage.setItem('pl_tel_rate', this.speechRate);
  }

  formatInputNumber(value) {
    // Strip all non-digits
    let digits = value.replace(/\D/g, '');
    // Truncate to 9 digits
    digits = digits.substring(0, 9);
    // Format as XXX XXX XXX
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 3 === 0) formatted += ' ';
      formatted += digits[i];
    }
    return formatted;
  }

  setupEventListeners() {
    // Play button
    this.selectors.playBtn.addEventListener('click', () => {
      this.speechRate = 1.0;
      this.saveStateToStorage();
      this.speakCurrentNumber(1.0);
      this.selectors.userInput.focus();
    });
    this.selectors.playSlowBtn.addEventListener('click', () => {
      this.speechRate = 0.55;
      this.saveStateToStorage();
      this.speakCurrentNumber(0.55);
      this.selectors.userInput.focus();
    });
    
    // Input action
    this.selectors.checkBtn.addEventListener('click', () => this.checkAnswer());
    
    // Auto-format input as user types
    this.selectors.userInput.addEventListener('input', (e) => {
      let cursorPosition = this.selectors.userInput.selectionStart;
      let originalLength = this.selectors.userInput.value.length;
      
      this.selectors.userInput.value = this.formatInputNumber(this.selectors.userInput.value);
      
      // Attempt to keep cursor in right place after formatting (basic approximation)
      let newLength = this.selectors.userInput.value.length;
      cursorPosition += (newLength - originalLength);
      this.selectors.userInput.setSelectionRange(cursorPosition, cursorPosition);
    });

    this.selectors.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.checkAnswer();
      }
    });

    // Dial Pad logic
    this.selectors.dialBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        this.selectors.userInput.value = this.formatInputNumber(this.selectors.userInput.value + key);
        this.selectors.userInput.focus();
      });
    });

    this.selectors.dialClear.addEventListener('click', () => {
      this.selectors.userInput.value = '';
      this.selectors.userInput.focus();
    });

    this.selectors.dialBackspace.addEventListener('click', () => {
      let val = this.selectors.userInput.value.replace(/\s/g, '');
      if (val.length > 0) {
        val = val.slice(0, -1);
        this.selectors.userInput.value = this.formatInputNumber(val);
      }
      this.selectors.userInput.focus();
    });

    // Reveal & Skip
    this.selectors.revealBtn.addEventListener('click', () => this.revealAnswer());
    this.selectors.skipBtn.addEventListener('click', () => this.skipRound());
    
    // Reset stats
    this.selectors.resetStatsBtn.addEventListener('click', () => this.resetStats());
    
    // Voice select change
    this.selectors.voiceSelect.addEventListener('change', (e) => {
      const selectedIndex = e.target.value;
      if (selectedIndex !== '') {
        this.polishVoice = this.voices[selectedIndex];
        this.speakCurrentNumber();
      }
    });
  }

  initVoices() {
    if (!this.synth) return;
    
    const allVoices = this.synth.getVoices();
    this.voices = allVoices.filter(voice => voice.lang.includes('pl-PL') || voice.lang.startsWith('pl'));
    
    this.selectors.voiceSelect.innerHTML = '';
    
    if (this.voices.length === 0) {
      this.selectors.voiceSelect.innerHTML = '<option value="">No Polish voice found - falling back to browser default</option>';
      this.selectors.voiceWarning.style.display = 'block';
      
      this.voices = allVoices;
      allVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        this.selectors.voiceSelect.appendChild(option);
      });
      this.polishVoice = allVoices.find(voice => voice.default) || allVoices[0];
    } else {
      this.selectors.voiceWarning.style.display = 'none';
      
      this.voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name.includes('Google') || voice.name.includes('Natural')) {
          option.selected = true;
          this.polishVoice = voice;
        }
        this.selectors.voiceSelect.appendChild(option);
      });
      
      if (!this.polishVoice) {
        this.polishVoice = this.voices[0];
      }
    }
  }

  numberToPolishWords(n) {
    if (n === 0) return 'zero';
    
    const units = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
    const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
    const tens = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
    const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

    let parts = [];

    // Hundreds
    let hundredsVal = Math.floor(n / 100);
    let remainder = n % 100;
    if (hundredsVal > 0) {
      parts.push(hundreds[hundredsVal]);
    }

    // Tens and units
    if (remainder >= 10 && remainder <= 19) {
      parts.push(teens[remainder - 10]);
    } else {
      let tensVal = Math.floor(remainder / 10);
      let unitsVal = remainder % 10;
      
      if (tensVal > 0) {
        parts.push(tens[tensVal]);
      }
      if (unitsVal > 0) {
        parts.push(units[unitsVal]);
      }
    }

    return parts.filter(Boolean).join(' ');
  }

  telephoneToPolishWords(numStr) {
    if (!numStr || numStr.length !== 9) return '';
    const p1 = parseInt(numStr.substring(0, 3), 10);
    const p2 = parseInt(numStr.substring(3, 6), 10);
    const p3 = parseInt(numStr.substring(6, 9), 10);
    // Use commas to create natural pauses between the blocks
    return [this.numberToPolishWords(p1), this.numberToPolishWords(p2), this.numberToPolishWords(p3)].join(', ');
  }

  generateNumber() {
    // Generate a 9-digit Polish mobile number. Commonly starts with 5, 6, 7, or 8.
    const prefixes = ['5', '6', '7', '8'];
    let num = prefixes[Math.floor(Math.random() * prefixes.length)];
    for (let i = 0; i < 8; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    return num;
  }

  newRound() {
    this.currentNumber = this.generateNumber();
    this.selectors.userInput.disabled = false;
    this.selectors.checkBtn.disabled = false;
    this.selectors.revealBtn.disabled = false;
    // Enable dial pad
    this.selectors.dialBtns.forEach(btn => btn.disabled = false);
    this.selectors.dialClear.disabled = false;
    this.selectors.dialBackspace.disabled = false;
    
    this.selectors.userInput.value = '';
    setTimeout(() => {
      this.selectors.userInput.focus();
    }, 50);
    
    this.selectors.feedbackEl.className = 'feedback hidden';
    
    setTimeout(() => {
      this.speakCurrentNumber();
    }, 150);
  }

  speakCurrentNumber(speed = null) {
    if (this.currentNumber === null) return;
    const rate = speed !== null ? speed : this.speechRate;
    const words = this.telephoneToPolishWords(this.currentNumber);
    this.speakText(words, rate);
  }

  speakText(text, speed = 1.0) {
    if (!this.synth) return;
    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectors.userInput && !this.selectors.userInput.disabled) {
      this.selectors.userInput.focus();
    }

    if (this.polishVoice) {
      utterance.voice = this.polishVoice;
    }
    
    utterance.lang = 'pl-PL';
    utterance.rate = speed;
    utterance.pitch = 1.0;
    
    const activeBtn = speed < 0.8 ? this.selectors.playSlowBtn : this.selectors.playBtn;
    activeBtn.classList.add('playing');
    
    utterance.onend = () => activeBtn.classList.remove('playing');
    utterance.onerror = () => activeBtn.classList.remove('playing');
    
    this.synth.speak(utterance);
  }

  checkAnswer() {
    const rawVal = this.selectors.userInput.value.replace(/\s/g, '');
    if (rawVal.length === 0) return;
    
    const isCorrect = rawVal === this.currentNumber;
    const spelling = this.telephoneToPolishWords(this.currentNumber).replace(/,/g, '');
    const formattedNumber = this.formatInputNumber(this.currentNumber);
    
    this.stats.total += 1;
    if (isCorrect) {
      this.stats.correct += 1;
      this.stats.streak += 1;
      if (this.stats.streak > this.stats.maxStreak) {
        this.stats.maxStreak = this.stats.streak;
      }
      this.showFeedback(true, spelling, formattedNumber);
    } else {
      this.stats.streak = 0;
      this.showFeedback(false, spelling, formattedNumber);
    }
    
    this.history.unshift({
      id: Date.now(),
      number: formattedNumber,
      guess: this.formatInputNumber(rawVal),
      correct: isCorrect,
      spelling: spelling
    });
    
    if (this.history.length > 20) this.history.pop();
    
    this.selectors.userInput.disabled = true;
    this.selectors.checkBtn.disabled = true;
    this.selectors.revealBtn.disabled = true;
    this.selectors.dialBtns.forEach(btn => btn.disabled = true);
    this.selectors.dialClear.disabled = true;
    this.selectors.dialBackspace.disabled = true;
    
    this.saveStateToStorage();
    this.updateStatsUI();
    this.renderHistory();
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary next-round-btn';
    nextBtn.id = 'next-round-btn';
    nextBtn.innerHTML = 'Następny (Next) <span class="kbd">Enter</span>';
    
    const existingNext = document.getElementById('next-round-btn');
    if (existingNext) existingNext.remove();
    
    this.selectors.feedbackEl.appendChild(nextBtn);
    nextBtn.focus();
    
    nextBtn.addEventListener('click', () => {
      nextBtn.remove();
      setTimeout(() => this.newRound(), 0);
    });
    
    const nextKeyListener = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('keydown', nextKeyListener);
        const btn = document.getElementById('next-round-btn');
        if (btn) btn.click();
      }
    };
    document.addEventListener('keydown', nextKeyListener);
  }

  revealAnswer() {
    if (this.currentNumber === null) return;
    const spelling = this.telephoneToPolishWords(this.currentNumber).replace(/,/g, '');
    const formattedNumber = this.formatInputNumber(this.currentNumber);
    
    this.stats.total += 1;
    this.stats.streak = 0;
    
    this.showFeedback(false, spelling, formattedNumber, true);
    
    this.history.unshift({
      id: Date.now(),
      number: formattedNumber,
      guess: null,
      correct: false,
      spelling: spelling,
      revealed: true
    });
    
    if (this.history.length > 20) this.history.pop();
    
    this.selectors.userInput.disabled = true;
    this.selectors.checkBtn.disabled = true;
    this.selectors.revealBtn.disabled = true;
    this.selectors.dialBtns.forEach(btn => btn.disabled = true);
    this.selectors.dialClear.disabled = true;
    this.selectors.dialBackspace.disabled = true;
    
    this.saveStateToStorage();
    this.updateStatsUI();
    this.renderHistory();
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary next-round-btn';
    nextBtn.id = 'next-round-btn';
    nextBtn.innerHTML = 'Następny (Next) <span class="kbd">Enter</span>';
    
    const existingNext = document.getElementById('next-round-btn');
    if (existingNext) existingNext.remove();
    
    this.selectors.feedbackEl.appendChild(nextBtn);
    nextBtn.focus();
    
    nextBtn.addEventListener('click', () => {
      nextBtn.remove();
      setTimeout(() => this.newRound(), 0);
    });
    
    const nextKeyListener = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('keydown', nextKeyListener);
        const btn = document.getElementById('next-round-btn');
        if (btn) btn.click();
      }
    };
    document.addEventListener('keydown', nextKeyListener);
  }

  skipRound() {
    this.newRound();
  }

  showFeedback(isCorrect, spelling, formattedNumber, isRevealed = false) {
    this.selectors.feedbackEl.classList.remove('hidden', 'correct', 'incorrect');
    
    const existingNext = document.getElementById('next-round-btn');
    if (existingNext) existingNext.remove();
    
    if (isCorrect) {
      this.selectors.feedbackEl.classList.add('correct');
      this.selectors.feedbackTitle.textContent = 'Dobrze! (Correct!) 🎉';
      this.selectors.feedbackMessage.innerHTML = `Numer (Number): <strong>${formattedNumber}</strong>`;
    } else {
      this.selectors.feedbackEl.classList.add('incorrect');
      if (isRevealed) {
        this.selectors.feedbackTitle.textContent = 'Odkryty (Revealed)';
      } else {
        this.selectors.feedbackTitle.textContent = 'Źle (Incorrect) 😢';
      }
      this.selectors.feedbackMessage.innerHTML = `Poprawna odpowiedź (Correct answer): <strong>${formattedNumber}</strong>`;
    }
    
    this.selectors.feedbackSpelling.innerHTML = `Słownie (In words): <span class="polish-spelling-highlight">${spelling}</span>`;
  }

  updateStatsUI() {
    const accuracy = this.stats.total > 0 
      ? Math.round((this.stats.correct / this.stats.total) * 100) 
      : 0;
      
    this.selectors.statsCorrect.textContent = this.stats.correct;
    this.selectors.statsTotal.textContent = this.stats.total;
    this.selectors.statsAccuracy.textContent = `${accuracy}%`;
    this.selectors.statsStreak.textContent = this.stats.streak;
    this.selectors.statsMaxStreak.textContent = this.stats.maxStreak;
  }

  renderHistory() {
    this.selectors.historyList.innerHTML = '';
    
    if (this.history.length === 0) {
      this.selectors.historyList.innerHTML = '<li class="history-empty">Brak historii sesji (No session history yet)</li>';
      return;
    }
    
    this.history.forEach(item => {
      const li = document.createElement('li');
      li.className = `history-item ${item.correct ? 'history-correct' : 'history-incorrect'}`;
      
      const badge = item.correct 
        ? '<span class="history-badge badge-correct">✓</span>' 
        : '<span class="history-badge badge-incorrect">✗</span>';
        
      const guessStr = item.revealed 
        ? '<i>revealed</i>' 
        : (item.guess !== null ? item.guess : 'None');
      
      li.innerHTML = `
        <div class="history-header">
          ${badge}
          <span class="history-number">${item.number}</span>
          <span class="history-guess">Guess: ${guessStr}</span>
          <button class="history-replay-btn" title="Replay Audio" data-text="${item.spelling.replace(/,/g, '')}">🔊</button>
        </div>
        <div class="history-spelling">${item.spelling}</div>
      `;
      
      const replayBtn = li.querySelector('.history-replay-btn');
      replayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToSpeak = e.target.dataset.text;
        this.speakText(textToSpeak, 1.0);
      });
      
      this.selectors.historyList.appendChild(li);
    });
  }

  resetStats() {
    if (confirm('Czy na pewno chcesz zresetować statystyki? (Are you sure you want to reset stats?)')) {
      this.stats = { correct: 0, total: 0, streak: 0, maxStreak: 0 };
      this.history = [];
      this.saveStateToStorage();
      this.updateStatsUI();
      this.renderHistory();
      this.newRound();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new PolishTelephonePractice();
  app.init();
  window.appInstance = app;
});
