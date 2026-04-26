# 🎹 Piano Chords

<p align="center">
  <a href="https://maxmskrus.github.io/piano-chords/">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-Open-success?style=for-the-badge" />
  </a>
  <a href="https://github.com/MaxMskRus/piano-chords/releases">
    <img src="https://img.shields.io/badge/📱_Download_APK-Latest-blue?style=for-the-badge" />
  </a>
  <a href="https://github.com/MaxMskRus/piano-chords">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github" />
  </a>
</p>

<p align="center">
<strong>Interactive Piano • Chord Visualization • MIDI Support</strong><br/>
<em>Lightweight web app for learning and playing piano chords directly in your browser.</em>
</p>

---

## 🌍 Language / Язык

- 🇬🇧 English
- 🇷🇺 Русский

---

<details open>
<summary>🇬🇧 English</summary>

### 📖 About
**Piano Chords** is a fast, modern, and minimalistic web application designed to help musicians and developers explore piano harmony. It focuses on high performance and clean architecture without the overhead of heavy frameworks.

### ✨ Features
| Feature | Description |
|---|---|
| 🎹 **Interactive Piano** | Play notes directly in the browser with low latency. |
| 🎼 **Chord Recognition** | Real-time visual breakdown and detection of chords. |
| 🎛️ **MIDI Support** | Connect your external MIDI keyboard and play. |
| 🔊 **Optimized Audio** | High-quality sound using OGG format and Web Audio API. |
| 📄 **Song Parsing** | Extract and visualize chords from plain text. |
| 📱 **Fully Responsive** | Optimized for both desktop and mobile browsers. |

### 🛠 Tech Stack
- **Core:** Vanilla JavaScript (ES Modules)
- **Build Tool:** Vite
- **Styling:** HTML5 / CSS3
- **Audio:** Web Audio API

### 🚀 Getting Started
```bash
git clone https://github.com/MaxMskRus/piano-chords.git
npm install
npm run dev
```

### 📁 Project Structure
- src/js/ — Core logic, MIDI handling, and UI modules.
- src/styles/ — Modular CSS (Layout, Components, Modals).
- public/audio/ — Optimized audio samples.
- scripts/ — Validation and CI/CD automation scripts.

### 🔒 Security & Quality
- **XSS Protection:** All user input is escaped via escapeHtml().
- **Validation:** Strict innerHTML usage checks via custom CI scripts.
- **Linting:** ESLint rules for secure and clean code.

</details>

---

<details>
<summary>🇷🇺 Русский</summary>

### 📖 О проекте
**Piano Chords** — это лёгкое и быстрое веб-приложение для изучения аккордов, визуализации гармонии и работы с MIDI в реальном времени. Проект создан с упором на производительность и чистый код без использования тяжелых фреймворков.

### ✨ Возможности
- 🎹 **Интерактивная клавиатура:** Играйте на пианино прямо в браузере.
- 🎼 **Распознавание аккордов:** Визуальное отображение структуры аккорда в реальном времени.
- 🎛️ **Поддержка MIDI:** Подключайте внешние MIDI-клавиатуры.
- 🔊 **Оптимизированный звук:** Использование формата OGG для быстрой загрузки.
- 📄 **Парсинг текстов:** Извлечение аккордов из текстовых файлов песен.
- ⚡ **Быстрая работа:** Мгновенная загрузка благодаря Vite.

### 🚀 Инструкции
```bash
npm install
npm run dev
npm run build
```

</details>

---

## 🛣 Roadmap
- [ ] Improve MIDI latency for professional performance.
- [ ] Chord progression generator.
- [ ] Export sequences to MIDI files.
- [ ] Advanced mobile UI optimizations.

---

## 🤝 Contributing
Contributions are welcome! Please run `npm run validate` before opening a Pull Request.

---

## 📄 License
Distributed under the **MIT License**.

---

<p align="center">
Made with ❤️ by <a href="https://github.com/MaxMskRus">MaxMskRus</a>
</p>