# Numery Telefonów po Polsku | Polish Telephone Practice

A premium, responsive, glassmorphic Single Page Application designed to help language learners practice listening to and writing 9-digit Polish telephone numbers.

## 🌐 Live Demo
Play it live here: [https://ippikin.github.io/polish-telephone-practice/](https://ippikin.github.io/polish-telephone-practice/)

---

## 🚀 Key Features

* **Interactive Smartphone Dial Pad**:
  * On-screen dial pad with standard lettering (ABC, DEF) alongside physical keyboard input.
  * Auto-formats input as `XXX XXX XXX` as you type.
* **Native Polish Telephone Grouping**:
  * Numbers are generated in 9-digit Polish mobile formats.
  * Speech synthesis dictates numbers naturally in three groups of hundreds with realistic pauses (e.g. "501 345 678" -> *pięćset jeden, trzysta czterdzieści pięć, sześćset siedemdziesiąt osiem*).
* **Speech Synthesis Control**:
  * Play buttons trigger the browser's native Web Speech synthesis (`pl-PL`).
  * Features a **slow speech speed toggle (0.55x)** to assist with fast Polish pronunciation.
  * Voice selector dropdown allows switching between available system voices.
* **Interactive Feedback & Session History**:
  * Instant feedback with full written Polish spelling.
  * Session history with one-click replay audio buttons.
  * LocalStorage saves statistics and history automatically.

---

## 🛠️ Technology Stack
* **HTML5**: Semantic glassmorphic layout.
* **CSS3**: CSS Grid dial pad layout, custom typography, micro-animations.
* **JavaScript**: State management, speech synthesis wrapper, auto-formatting, and number-to-words algorithm.

---

## 💻 Running Locally
1. Clone this repository:
   ```bash
   git clone https://github.com/ippikin/polish-telephone-practice.git
   ```
2. Open `index.html` in any web browser.
