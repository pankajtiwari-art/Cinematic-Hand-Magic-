# 🌟 Cinematic Hand Magic

**Interactive Cinematic Hand‑Tracking Particle Engine**

[![Live Demo](https://img.shields.io/badge/🚀-Live_Demo-brightgreen?style=for-the-badge)](https://pankajtiwari-art.github.io/Cinematic-Hand-Magic-/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Made with JavaScript](https://img.shields.io/badge/Made_with-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

**Control magic with your bare hands – no controllers, no touchscreens.**  
Open your hand to unleash power, pinch to draw, clap to explode, and switch between **6 dazzling modes** using a simple 3‑finger gesture or keyboard keys. Built with MediaPipe Hands and vanilla Canvas 2D for ultra‑smooth performance.

👉 **[Try it live!](https://pankajtiwari-art.github.io/Cinematic-Hand-Magic-/)**

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **6 Distinct Modes** | Fire & Ice, Lightning, Red & Blue, Cosmic, Golden, Nature |
| 🖐️ **Real‑time Hand Tracking** | 21 keypoints per hand via MediaPipe Hands |
| 🔥 **Particle Physics** | Fire, ice, electric bolts, trails, shockwaves |
| 💥 **Explosive Surge** | Sudden hand‑open triggers a burst of particles |
| 👏 **Hand‑Clap Shockwave** | Bring both open hands close for a screen‑shaking blast |
| 🌈 **Dynamic Glows** | Radial gradients pulse with hand intensity |
| 🪄 **Pinch Drawing** | Thumb + index finger sprays focused particles |
| ⌨️ **Keyboard & Gesture** | Keys 1‑6 or 3‑finger gesture to switch modes |
| 📳 **Screen Shake** | Camera quake on lightning and shockwaves |
| ✨ **Fingertip Trails** | Glowing ribbons follow your index finger |
| ⚡ **Auto‑Tune Performance** | Particle caps adjust automatically to maintain 30‑60 FPS |
| 📱 **Mobile Friendly** | Works on any modern browser with a camera |
| 🧹 **Zero Dependencies** | Only MediaPipe Hands + Camera Utils, pure JS |

---

## 🎮 Modes

| Key | Mode | Description |
|---|---|---|
| `1` | 🔥❄️ **Fire & Ice** | Left hand – blazing fire | Right hand – icy shards |
| `2` | ⚡ **Lightning** | Open hands summon thunder, flashes & screen shake |
| `3` | 🔴🔵 **Red & Blue** | Symmetrical: red left, blue right |
| `4` | 🟣 **Cosmic** | Magenta & cyan nebula particles envelop your palms |
| `5` | 🟡 **Golden** | Shimmering golden embers radiate warmth and elegance |
| `6` | 🟢 **Nature** | Soft green leaf‑like particles drift gently |

---

## 🖐️ Gestures & Controls

| Gesture / Input | Action |
|---|---|
| ✋ **Open Hand** (3+ fingers extended) | Activate that hand’s power – continuous particle emission |
| 🤏 **Pinch** (thumb + index) | Focused particle spray (Fire & Ice mode, with a timer) |
| 👏 **Hand Clap** (both hands open, palms close) | Shockwave explosion + screen shake |
| 🖐️ **3 Fingers** (index, middle, ring extended) | Cycle to the next mode (visual sparkle feedback) |
| ⌨️ **Keys 1–6** | Jump directly to any mode |

---

## ⚙️ Tech Stack

| Technology | Role |
|---|---|
| [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) | Real‑time hand landmark detection |
| Canvas 2D API | High‑performance particle rendering & blending |
| Camera Utils | Webcam stream management |
| requestAnimationFrame | Smooth 60 FPS animation loop |
| Vanilla JavaScript (ES6+) | All logic — no frameworks |
| CSS3 | Mirror transform, UI overlays, responsive layout |

---

## 📂 Project Structure

```
Cinematic-Hand-Magic-/
├── index.html        # Main HTML (camera video, canvas, UI)
├── style.css         # Styling & responsive layout
├── script.js         # All logic: hand tracking, particles, rendering
├── README.md         # You are reading it!
└── LICENSE           # MIT License
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Modern browser (Chrome / Edge / Firefox / Safari)
- Webcam
- HTTPS or `localhost` (required for `getUserMedia`)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/PankajTiwari-Art/Cinematic-Hand-Magic-.git
cd Cinematic-Hand-Magic-
```

2. **Serve the project** (example with Python)
```bash
python -m http.server 8000
```
or use Live Server in VS Code.

3. **Open** `http://localhost:8000` in your browser.

4. **Allow camera** when prompted and start gesturing!

---

## 🧠 How It Works

1. **Camera** → feeds frames to a hidden `<video>` element.  
2. **MediaPipe Hands** → returns 21 keypoints per hand (up to 2 hands).  
3. **Gesture Recognition** → custom functions detect open hand, pinch, finger count.  
4. **Particle Engine** → spawns particles with type, velocity, lifetime, size.  
5. **Separate Render Loop** (`requestAnimationFrame`):  
   - Draws video selfie with dark multiply overlay.  
   - Applies screen shake if active.  
   - Renders fingertip trails, radial glows, particles (with `lighter` blend).  
   - Draws lightning bolts with multi‑pass glow.  
6. **Auto‑Tune** → every 60 frames, measures average frame time and adjusts `MAX_PARTICLES` to avoid lag.

---

## ⚡ Performance Optimizations

| Technique | Impact |
|---|---|
| Canvas rendered at **65% of window size** (CSS scales up) | ~50% fewer pixels to process |
| **Particle cap** (auto‑tuned) + **bolt cap** | Memory and draw‑call control |
| **Reverse loops** for particle/bolt removal | No index skipping |
| **Simplified radial gradients** (2 stops instead of 3‑4) | Faster gradient creation |
| **Short fingertip trails** (5 points) | Minimal per‑hand overhead |
| **No Web Audio API** – zero audio processing | No extra CPU load |
| **`willReadFrequently: false`** canvas hint | Browser optimizes drawing |
| **All particles use `globalCompositeOperation: 'lighter'`** | Efficient blending |

---

## 📱 Browser Support

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome / Edge (Chromium) | 88+ | Best performance |
| Firefox | 85+ | Slightly slower particle rendering |
| Safari | 14+ | Requires HTTPS |
| Mobile Chrome (Android) | 88+ | Full support |
| Mobile Safari (iOS) | 14+ | Requires HTTPS |

---

## 🤝 Contributing

Pull requests are welcome! Ideas:
- Add new modes (e.g., water, smoke, plasma).
- Improve gesture recognition.
- Add screenshots / GIF demos.
- Translate README.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing`).
3. Commit changes (`git commit -m 'Add amazing feature'`).
4. Push (`git push origin feature/amazing`).
5. Open a Pull Request.

---

## 📄 License

GNU License – see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgements

- **Google MediaPipe** for incredible hand tracking.
- Open‑source community for inspiration.
- Built with ❤️ by [Pankaj Tiwari](https://github.com/PankajTiwari-Art).

---

<p align="center">
  <strong>⭐ Star this repo if you like it! ⭐</strong><br>
  <sub>Made with magic and JavaScript ✨</sub>
</p>
```
