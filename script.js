// script.js
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: false });
const modeIndicator = document.getElementById('mode-indicator');

// ---- Performance settings ----
const RES_SCALE = 0.65;
let MAX_PARTICLES = 180;
let MAX_BOLTS = 12;
const MAX_TRAIL_LENGTH = 5;

// ---- State ----
let particles = [];
let lightningBolts = [];
let currentPower = 'fire_ice';
let lightningIntensity = 0;
let handIntensities = [0, 0];
let handSurges = [0, 0];
let lastHandOpenState = [false, false];
let shakeAmount = 0;
let fingertipTrails = [[], []];

const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
];

const pointingState = {
    left: { frames:0, active:false, lastWrist:null },
    right: { frames:0, active:false, lastWrist:null }
};

let animationFrameId = null;
let gestureFrameCounter = 0;
const MODES = ['fire_ice', 'lightning', 'red_blue', 'cosmic', 'golden', 'nature'];
const MODE_NAMES = {
    fire_ice: 'Fire & Ice',
    lightning: 'Lightning',
    red_blue: 'Red & Blue',
    cosmic: 'Cosmic',
    golden: 'Golden',
    nature: 'Nature'
};

// ---- Auto-tune ----
let frameTimeSum = 0, frameCount = 0;
const AUTO_TUNE_INTERVAL = 60;
function autoTune(dt) {
    frameTimeSum += dt;
    frameCount++;
    if (frameCount >= AUTO_TUNE_INTERVAL) {
        const avg = frameTimeSum / frameCount;
        if (avg > 33) {
            MAX_PARTICLES = Math.max(70, MAX_PARTICLES - 10);
            MAX_BOLTS = Math.max(4, MAX_BOLTS - 2);
        } else if (avg < 16 && MAX_PARTICLES < 250) {
            MAX_PARTICLES = Math.min(250, MAX_PARTICLES + 5);
            MAX_BOLTS = Math.min(18, MAX_BOLTS + 1);
        }
        frameTimeSum = 0; frameCount = 0;
    }
}

// ---- Sparkle burst (mode change feedback) ----
function spawnSparkles(x, y, count=20) {
    for (let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random()*5;
        particles.push({
            x, y,
            vx: Math.cos(angle)*speed,
            vy: Math.sin(angle)*speed,
            life: 1.0,
            decay: 0.08,
            size: 3 + Math.random()*6,
            type: 'sparkle'
        });
    }
}

// ---- Particle spawn ----
function spawnParticle(x, y, type, isDrawing=false, extraVelocity={vx:0, vy:0}) {
    const handIdx = (type==='fire'||type==='red'||type==='cosmicLeft'||type==='goldenLeft'||type==='nature') ? 0 : 1;
    if (!isDrawing && Math.random() > handIntensities[handIdx]) return;
    if (particles.length >= MAX_PARTICLES) particles.shift();

    const count = isDrawing ? 1 : 1;
    for (let i=0; i<count; i++) {
        const baseVy = (type==='ice'||type==='blue'||type==='cosmicRight'||type==='goldenRight'||type==='nature') ? -4 : -8;
        particles.push({
            x: x + (Math.random()-0.5)*(isDrawing?8:12),
            y: y + (Math.random()-0.5)*(isDrawing?8:12),
            vx: extraVelocity.vx + (isDrawing?0:(Math.random()-0.5)*3),
            vy: extraVelocity.vy + (isDrawing?0: ((Math.random()*baseVy)-2) - (handSurges[handIdx]*15)),
            life: 1.0,
            decay: isDrawing?0.008:0.08,
            size: isDrawing? (Math.random()*15+15) : (Math.random()*16+5),
            type: type
        });
    }
}

function spawnLightning(x, y) {
    if (Math.random() > lightningIntensity) return;
    if (lightningBolts.length >= MAX_BOLTS) lightningBolts.shift();
    const bolt = [];
    let cx=x, cy=y;
    for (let i=0; i<18; i++) {
        bolt.push({x:cx, y:cy});
        cx += (Math.random()-0.5)*60;
        cy += (Math.random()-0.8)*60;
    }
    lightningBolts.push({path:bolt, life:1.0, color:Math.random()>0.5?'#e0ffff':'#00bfff'});
    shakeAmount = Math.max(shakeAmount, 0.3);
}

// ---- Hand helpers (unchanged) ----
function isHandOpen(landmarks) {
    let open = 0;
    const wrist = landmarks[0];
    [ [8,6],[12,10],[16,14],[20,18] ].forEach(([tipIdx,pipIdx]) => {
        if (Math.hypot(landmarks[tipIdx].x-wrist.x, landmarks[tipIdx].y-wrist.y) > Math.hypot(landmarks[pipIdx].x-wrist.x, landmarks[pipIdx].y-wrist.y)) open++;
    });
    return open>=3;
}

function countExtendedNonThumbFingers(landmarks) {
    let count = 0;
    const wrist = landmarks[0];
    [8,12,16,20].forEach((tipIdx, i) => {
        const pipIdx = [6,10,14,18][i];
        if (Math.hypot(landmarks[tipIdx].x-wrist.x, landmarks[tipIdx].y-wrist.y) > Math.hypot(landmarks[pipIdx].x-wrist.x, landmarks[pipIdx].y-wrist.y)) count++;
    });
    return count;
}

function isPinching(landmarks, isRightHand) {
    const state = isRightHand ? pointingState.right : pointingState.left;
    const thumb = landmarks[4], index = landmarks[8], wrist = landmarks[0];
    let velocity = 0;
    if (state.lastWrist) velocity = Math.hypot(wrist.x-state.lastWrist.x, wrist.y-state.lastWrist.y);
    state.lastWrist = {x:wrist.x, y:wrist.y};
    if (velocity>0.05) { state.frames=0; state.active=false; return false; }

    let openCount = 0;
    [ [12,10],[16,14],[20,18] ].forEach(([tip, pip]) => {
        if (Math.hypot(landmarks[tip].x-wrist.x, landmarks[tip].y-wrist.y) > Math.hypot(landmarks[pip].x-wrist.x, landmarks[pip].y-wrist.y)) openCount++;
    });
    if (openCount<2) return false;

    const pinchDist = Math.hypot(thumb.x-index.x, thumb.y-index.y);
    const handSize = Math.hypot(landmarks[9].x-wrist.x, landmarks[9].y-wrist.y);
    const raw = pinchDist < handSize*0.35;
    if (raw) { state.frames=5; state.active=true; }
    else {
        state.frames--;
        if (state.frames<=0) state.active=false;
    }
    return state.active;
}

function onResults(results) { window.latestResults = results; }

function renderLoop(timestamp) {
    if (!window.latestResults) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
    }
    const startTime = performance.now();
    const results = window.latestResults;
    const ctx = canvasCtx;

    const w = window.innerWidth * RES_SCALE;
    const h = window.innerHeight * RES_SCALE;
    if (canvasElement.width !== w || canvasElement.height !== h) {
        canvasElement.width = w;
        canvasElement.height = h;
    }

    let shakeX=0, shakeY=0;
    if (shakeAmount>0.01) {
        shakeX = (Math.random()-0.5)*shakeAmount*20;
        shakeY = (Math.random()-0.5)*shakeAmount*20;
        shakeAmount *= 0.9;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(results.image, 0,0,w,h);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(10,5,0,0.4)';
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation = 'source-over';

    let anyHandOpen = false;
    const handsData = [];
    for (let i=0; i<2; i++) if (fingertipTrails[i].length > MAX_TRAIL_LENGTH) fingertipTrails[i].shift();

    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
            const label = results.multiHandedness[index].label;
            const isRightHand = label==='Right';
            const targetIndex = isRightHand ? 1 : 0;
            const isOpen = isHandOpen(landmarks);
            if (isOpen) anyHandOpen = true;

            const ext = countExtendedNonThumbFingers(landmarks);
            if (isOpen && ext===3) {
                gestureFrameCounter++;
                if (gestureFrameCounter===12) {
                    const idx = MODES.indexOf(currentPower);
                    currentPower = MODES[(idx+1) % MODES.length];
                    modeIndicator.textContent = MODE_NAMES[currentPower];
                    modeIndicator.style.textShadow = '0 0 20px white';
                    setTimeout(() => modeIndicator.style.textShadow = 'none', 300);
                    gestureFrameCounter = 0;
                    // Sparkle burst at palm
                    const palm = landmarks[9];
                    spawnSparkles(palm.x*w, palm.y*h, 25);
                }
            } else {
                gestureFrameCounter = 0;
            }

            const isPinch = isPinching(landmarks, isRightHand);

            // Intensity (only for modes that use hands specifically)
            if (['fire_ice','red_blue','cosmic','golden','nature'].includes(currentPower)) {
                const target = (isOpen || isPinch) ? 1 : 0;
                handIntensities[targetIndex] += (target - handIntensities[targetIndex]) * 0.15;
                if (isOpen && !lastHandOpenState[targetIndex]) {
                    handSurges[targetIndex] = 1.0;
                    const palm = landmarks[9];
                    for (let i=0; i<15; i++) {
                        const angle = Math.random()*Math.PI*2;
                        const speed = 2+Math.random()*5;
                        const t = currentPower==='fire_ice'? (targetIndex===0?'fire':'ice') : currentPower;
                        spawnParticle(palm.x*w, palm.y*h, t, false, {vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed});
                    }
                }
            } else {
                handIntensities[targetIndex] += (0 - handIntensities[targetIndex]) * 0.15;
            }
            lastHandOpenState[targetIndex] = isOpen;
            handSurges[targetIndex] *= 0.92;
            if (handSurges[targetIndex] < 0.01) handSurges[targetIndex]=0;
            handIntensities[targetIndex] = Math.max(0, Math.min(1, handIntensities[targetIndex]));

            const idxTip = landmarks[8];
            fingertipTrails[targetIndex].push({ x:idxTip.x*w, y:idxTip.y*h, life:1.0 });

            handsData.push({ landmarks, isRightHand, targetIndex, isOpen, isPinch, intensity:handIntensities[targetIndex] });
        });
    }

    // Lightning
    if (currentPower==='lightning') {
        lightningIntensity += anyHandOpen?0.08:-0.05;
    } else {
        lightningIntensity -= 0.1;
    }
    lightningIntensity = Math.max(0,Math.min(1,lightningIntensity));
    if (lightningIntensity>0.01) {
        if (Math.random()<0.5*lightningIntensity) {
            ctx.fillStyle = `rgba(200,220,255,${0.25*lightningIntensity})`;
            ctx.fillRect(0,0,w,h);
        }
        if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach(landmarks => {
                if (!isHandOpen(landmarks)) return;
                [4,8,12,16,20].forEach(tip => {
                    const pt = landmarks[tip];
                    if (Math.random()<0.07) spawnLightning(pt.x*w, pt.y*h);
                });
                HAND_CONNECTIONS.forEach(([s,e]) => {
                    if (Math.random()<0.005) {
                        const start = landmarks[s];
                        spawnLightning(start.x*w, start.y*h);
                    }
                });
            });
        }
    }

    // Hand clap shockwave
    if (handsData.length===2) {
        const h0=handsData[0], h1=handsData[1];
        if (h0.isOpen && h1.isOpen) {
            const palm0=h0.landmarks[9], palm1=h1.landmarks[9];
            const dist = Math.hypot(palm0.x-palm1.x, palm0.y-palm1.y)*Math.max(w,h);
            if (dist<100) {
                const mx=(palm0.x+palm1.x)/2*w, my=(palm0.y+palm1.y)/2*h;
                for (let i=0;i<20;i++) {
                    const angle=Math.random()*Math.PI*2, speed=4+Math.random()*6;
                    spawnParticle(mx, my, 'sparkle', false, {vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed});
                }
                shakeAmount=Math.max(shakeAmount,0.5);
            }
        }
    }

    // Trails
    ctx.globalCompositeOperation = 'lighter';
    for (let hi=0; hi<2; hi++) {
        const trail = fingertipTrails[hi];
        if (trail.length<2) continue;
        let col;
        if (currentPower==='red_blue') col = hi===0?'255,0,0':'0,0,255';
        else if (currentPower==='fire_ice') col = hi===0?'255,100,0':'100,200,255';
        else if (currentPower==='cosmic') col = hi===0?'255,0,255':'0,255,255';
        else if (currentPower==='golden') col = '255,215,0';
        else if (currentPower==='nature') col = '0,255,100';
        else col = '200,200,200';

        for (let i=1; i<trail.length; i++) {
            const p=trail[i-1], c=trail[i];
            const alpha = (i/trail.length)*0.6*handIntensities[hi];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y);
            ctx.strokeStyle = `rgba(${col},${alpha})`;
            ctx.lineWidth=5; ctx.shadowBlur=10; ctx.shadowColor=`rgba(${col},${alpha})`;
            ctx.stroke();
        }
        for (let i=trail.length-1; i>=0; i--) {
            trail[i].life -= 0.03;
            if (trail[i].life<=0) trail.splice(i,1);
        }
    }

    // Glows and continuous emission
    handsData.forEach(hand => {
        const { landmarks, isRightHand, targetIndex, isPinch, intensity } = hand;
        if (intensity<=0.01) return;
        const palm = landmarks[9];
        const lx=palm.x*w, ly=palm.y*h;

        // Pinch drawing (only fire_ice)
        if (isPinch && currentPower==='fire_ice' && performance.now()>10000) {
            const idx=landmarks[8], th=landmarks[4];
            const tx=(idx.x+th.x)/2*w, ty=(idx.y+th.y)/2*h;
            spawnParticle(tx, ty, targetIndex===0?'fire':'ice', true);
        }

        // Glow and particle type
        let color1, color2, typeContinuous;
        if (currentPower==='fire_ice') {
            if (!isRightHand) { color1=`rgba(255,60,0,${0.4*intensity})`; typeContinuous='fire'; }
            else { color1=`rgba(100,200,255,${0.35*intensity})`; typeContinuous='ice'; }
        } else if (currentPower==='red_blue') {
            if (!isRightHand) { color1=`rgba(255,0,0,${0.4*intensity})`; typeContinuous='red'; }
            else { color1=`rgba(0,0,255,${0.35*intensity})`; typeContinuous='blue'; }
        } else if (currentPower==='cosmic') {
            color1 = `rgba(180,0,255,${0.4*intensity})`;
            typeContinuous = !isRightHand ? 'cosmicLeft' : 'cosmicRight';
        } else if (currentPower==='golden') {
            color1 = `rgba(255,200,0,${0.4*intensity})`;
            typeContinuous = !isRightHand ? 'goldenLeft' : 'goldenRight';
        } else if (currentPower==='nature') {
            color1 = `rgba(0,200,50,${0.35*intensity})`;
            typeContinuous = 'nature';
        } else return;

        const gradRadius = isRightHand?280:350;
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, gradRadius);
        glow.addColorStop(0, color1);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = glow;
        ctx.fillRect(0,0,w,h);

        landmarks.forEach(pt => { if (Math.random()<0.45) spawnParticle(pt.x*w, pt.y*h, typeContinuous); });
        HAND_CONNECTIONS.forEach(([s,e]) => {
            if (Math.random()<0.25) {
                const start=landmarks[s], end=landmarks[e];
                spawnParticle(((start.x+end.x)/2)*w, ((start.y+end.y)/2)*h, typeContinuous);
            }
        });
    });

    // Draw particles
    ctx.globalCompositeOperation = 'lighter';
    for (let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life<=0) { particles.splice(i,1); continue; }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        switch(p.type) {
            case 'ice': grad.addColorStop(0,`rgba(255,255,255,${p.life})`); grad.addColorStop(1,`rgba(0,150,255,0)`); break;
            case 'red': grad.addColorStop(0,`rgba(255,150,150,${p.life})`); grad.addColorStop(1,`rgba(100,0,0,0)`); break;
            case 'blue': grad.addColorStop(0,`rgba(150,150,255,${p.life})`); grad.addColorStop(1,`rgba(0,0,100,0)`); break;
            case 'fire': grad.addColorStop(0,`rgba(255,255,200,${p.life})`); grad.addColorStop(1,`rgba(255,40,0,0)`); break;
            case 'cosmicLeft': case 'cosmicRight':
                grad.addColorStop(0, `rgba(255,100,255,${p.life})`); grad.addColorStop(1, `rgba(100,0,150,0)`); break;
            case 'goldenLeft': case 'goldenRight':
                grad.addColorStop(0, `rgba(255,220,100,${p.life})`); grad.addColorStop(1, `rgba(180,120,0,0)`); break;
            case 'nature':
                grad.addColorStop(0, `rgba(180,255,150,${p.life})`); grad.addColorStop(1, `rgba(0,100,0,0)`); break;
            case 'sparkle':
                grad.addColorStop(0, `rgba(255,255,255,${p.life})`); grad.addColorStop(1, `rgba(255,255,255,0)`); break;
            default: grad.addColorStop(0,`rgba(255,255,200,${p.life})`); grad.addColorStop(1,`rgba(255,40,0,0)`);
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    }

    // Lightning bolts
    for (let i=lightningBolts.length-1; i>=0; i--) {
        const b = lightningBolts[i];
        b.life -= 0.1;
        if (b.life<=0) { lightningBolts.splice(i,1); continue; }
        if (b.path.length===0) continue;
        ctx.beginPath();
        ctx.moveTo(b.path[0].x, b.path[0].y);
        for (let j=1; j<b.path.length; j++) ctx.lineTo(b.path[j].x, b.path[j].y);
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=b.color; ctx.lineWidth=15; ctx.globalAlpha=b.life*0.3; ctx.shadowBlur=20; ctx.shadowColor=b.color; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=b.color; ctx.lineWidth=6; ctx.globalAlpha=b.life*0.6; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation='source-over'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.globalAlpha=b.life; ctx.stroke(); ctx.restore();
    }

    ctx.restore();
    autoTune(performance.now() - startTime);
    animationFrameId = requestAnimationFrame(renderLoop);
}

// Keyboard swap (1-6)
document.addEventListener('keydown', (e) => {
    const key = parseInt(e.key);
    if (key>=1 && key<=6) {
        currentPower = MODES[key-1];
        modeIndicator.textContent = MODE_NAMES[currentPower];
    }
});

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands:2, modelComplexity:1, minDetectionConfidence:0.65, minTrackingConfidence:0.65 });
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width:1280, height:720
});

camera.start().then(() => {
    animationFrameId = requestAnimationFrame(renderLoop);
}).catch(err => {
    alert('Camera access denied.');
    console.error(err);
});

window.addEventListener('beforeunload', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    camera.stop();
});
