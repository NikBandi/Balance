// Canvas setup
const c = document.getElementById('c');
const ctx = c.getContext('2d');
const w = c.width = Math.min(600, window.innerWidth - 40);
const h = c.height = Math.min(800, window.innerHeight - 100);

// Game state
let score = 0;
let coins = 0;
let streak = 0;
let totalSlices = 0;
let perfectSlices = 0;
let soundOn = true;
let currentFood = null;
let slicing = false;
let sliceStart = null;
let sliceEnd = null;
let particles = [];
let time = 0;

// Upgrades
let upgrades = {
    mult1: false,
    mult2: false,
    mult3: false,
    auto: false,
    lucky: false,
    rainbow: false,
    golden: false,
    particles: false,
    trail: false
};

let scoreMultiplier = 1;

// Food definitions
const foods = [
    {name: 'bread', shape: 0, c1: '#deb887', c2: '#f5deb3', c3: '#8b7355', w: 140, h: 90},
    {name: 'baguette', shape: 1, c1: '#d4a574', c2: '#f5deb3', c3: '#8b6914', w: 200, h: 60},
    {name: 'egg', shape: 2, c1: '#fff', c2: '#ffeb3b', c3: '#ff6f00', w: 70, h: 90},
    {name: 'melon', shape: 3, c1: '#2d5016', c2: '#ff6b9d', c3: '#2d1b3d', r: 110},
    {name: 'cheese', shape: 4, c1: '#ffd700', c2: '#ffed4e', c3: '#000', w: 140, h: 120},
    {name: 'cake', shape: 0, c1: '#ffb6c1', c2: '#fff0f5', c3: '#ff69b4', w: 120, h: 100},
    {name: 'carrot', shape: 5, c1: '#ff7f27', c2: '#ffa500', c3: '#228b22', w: 50, h: 140},
    {name: 'fish', shape: 6, c1: '#87ceeb', c2: '#ffb6c1', c3: '#4682b4', w: 160, h: 80},
    {name: 'pizza', shape: 4, c1: '#ffd700', c2: '#ff6347', c3: '#ffed4e', w: 150, h: 130},
    {name: 'donut', shape: 3, c1: '#ff9ff3', c2: '#ffeaa7', c3: '#ff1493', r: 85},
    {name: 'avocado', shape: 1, c1: '#6b8e23', c2: '#d4e157', c3: '#8b4513', w: 90, h: 120}
];

// Shop items
const shopItems = {
    upgrades: [
        {id: 'mult1', name: 'Sharp Knife', desc: '2x score', cost: 100, mult: 2},
        {id: 'mult2', name: 'Diamond Blade', desc: '3x score', cost: 500, mult: 3, req: 'mult1'},
        {id: 'mult3', name: 'Laser Cutter', desc: '5x score', cost: 2000, mult: 5, req: 'mult2'}
    ],
    abilities: [
        {id: 'auto', name: 'Auto Slice', desc: '+1 coin/sec', cost: 300},
        {id: 'lucky', name: 'Lucky Cuts', desc: '20% 2x coins', cost: 800},
        {id: 'golden', name: 'Golden Touch', desc: 'Rare golden 10x', cost: 1500}
    ],
    cosmetics: [
        {id: 'rainbow', name: 'Rainbow Trail', desc: 'Color trail', cost: 250},
        {id: 'particles', name: 'Particle Boost', desc: '2x particles', cost: 400},
        {id: 'trail', name: 'Sparkle Trail', desc: 'Glitter path', cost: 600}
    ]
};

// Food class
class Food {
    constructor() {
        let f = foods[Math.floor(Math.random() * foods.length)];
        Object.assign(this, f);
        
        this.golden = upgrades.golden && Math.random() < 0.1;
        if (this.golden) {
            this.c1 = '#ffd700';
            this.c2 = '#ffed4e';
            this.c3 = '#ff8c00';
        }
        
        this.x = w / 2;
        this.y = h / 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.wobble = 0;
        this.wobbleSpeed = 0.02;
        this.sliced = false;
        this.sliceY = 0;
        this.leftPercent = 0;
        this.rightPercent = 0;
        this.showResult = false;
    }
    
    update() {
        this.wobble += this.wobbleSpeed;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation + Math.sin(this.wobble) * 0.05);
        
        if (!this.sliced) {
            ctx.shadowColor = this.golden ? 'rgba(255,215,0,.5)' : 'rgba(0,0,0,.3)';
            ctx.shadowBlur = this.golden ? 30 : 20;
            ctx.shadowOffsetY = 10;
            
            this.drawShape();
            
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255,255,255,.2)';
            ctx.beginPath();
            ctx.arc(-30, -30, 25, 0, Math.PI * 2);
            ctx.fill();
            
            if (this.golden) {
                ctx.fillStyle = 'rgba(255,215,0,.3)';
                ctx.font = '20px Courier';
                ctx.textAlign = 'center';
                ctx.fillText('★', 0, 10);
            }
        } else {
            let offset = time * 3;
            let sliceY = this.sliceY;
            
            // Left piece
            ctx.save();
            ctx.translate(-offset, 0);
            this.drawShape();
            ctx.fillStyle = this.c2;
            ctx.fillRect(-200, sliceY, 400, 200);
            this.drawDetails(sliceY);
            ctx.restore();
            
            // Right piece
            ctx.save();
            ctx.translate(offset, 0);
            this.drawShape();
            ctx.fillStyle = this.c2;
            ctx.fillRect(-200, -200, 400, sliceY + 200);
            this.drawDetails(sliceY);
            ctx.restore();
            
            if (this.showResult) {
                ctx.fillStyle = this.golden ? '#ffd700' : 'rgba(232,213,183,.9)';
                ctx.font = '14px Courier';
                ctx.textAlign = 'center';
                ctx.fillText(this.leftPercent + '%', 0, sliceY - 20);
                ctx.fillText(this.rightPercent + '%', 0, sliceY + 30);
            }
        }
        
        ctx.restore();
    }
    
    drawShape() {
        if (this.shape === 0) {
            // Rectangle
            ctx.fillStyle = this.c1;
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.strokeStyle = this.c3;
            ctx.lineWidth = 4;
            ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
        } else if (this.shape === 1) {
            // Oval
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.c3;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (this.shape === 2) {
            // Egg
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(0, -this.h/2);
            ctx.bezierCurveTo(this.w/2, -this.h/2, this.w/2, this.h/4, 0, this.h/2);
            ctx.bezierCurveTo(-this.w/2, this.h/4, -this.w/2, -this.h/2, 0, -this.h/2);
            ctx.fill();
        } else if (this.shape === 3) {
            // Circle
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.arc(0, 0, this.r, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 4) {
            // Triangle
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(0, -this.h/2);
            ctx.lineTo(this.w/2, this.h/2);
            ctx.lineTo(-this.w/2, this.h/2);
            ctx.closePath();
            ctx.fill();
        } else if (this.shape === 5) {
            // Carrot
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(0, -this.h/2);
            ctx.lineTo(this.w/2, this.h/2);
            ctx.lineTo(-this.w/2, this.h/2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = this.c3;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.translate((i - 1) * 10, -this.h/2);
                ctx.fillRect(-3, -20, 6, 25);
                ctx.restore();
            }
        } else if (this.shape === 6) {
            // Fish
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.w/2, 0);
            ctx.lineTo(this.w * 0.7, -this.h * 0.4);
            ctx.lineTo(this.w * 0.7, this.h * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-this.w * 0.3, -this.h * 0.2, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawDetails(sliceY) {
        if (this.shape === 2 && sliceY > -10 && sliceY < 10) {
            // Egg yolk
            ctx.fillStyle = this.c3;
            ctx.beginPath();
            ctx.arc(0, sliceY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = -Math.random() * 6 - 2;
        this.size = 3 + Math.random() * 5;
        this.color = color;
        this.life = 1;
        this.gravity = 0.3;
        this.hue = upgrades.rainbow ? Math.random() * 360 : 0;
    }
    
    update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.hue += 2;
        return this.life > 0;
    }
    
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = upgrades.rainbow ? `hsl(${this.hue}, 70%, 60%)` : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Game functions
function spawnFood() {
    currentFood = new Food();
}

function calculateSlice(y) {
    if (!currentFood) return;
    
    let relY = y - currentFood.y;
    let top, bottom;
    
    if (currentFood.shape === 3) {
        top = relY + currentFood.r;
        bottom = currentFood.r * 2;
    } else {
        top = relY + currentFood.h / 2;
        bottom = currentFood.h;
    }
    
    let topPercent = Math.round((top / bottom) * 100);
    let bottomPercent = 100 - topPercent;
    currentFood.leftPercent = Math.max(topPercent, bottomPercent);
    currentFood.rightPercent = Math.min(topPercent, bottomPercent);
    
    let diff = Math.abs(50 - currentFood.rightPercent);
    let points = 0;
    let coinEarn = 0;
    
    if (diff === 0) {
        points = 100;
        coinEarn = 10;
        perfectSlices++;
        streak++;
        document.getElementById('pf').classList.add('show');
        setTimeout(() => document.getElementById('pf').classList.remove('show'), 1000);
        playTone(800, 150);
    } else if (diff <= 2) {
        points = 50;
        coinEarn = 5;
        streak++;
        playTone(600, 100);
    } else if (diff <= 5) {
        points = 25;
        coinEarn = 3;
        streak++;
        playTone(500, 100);
    } else if (diff <= 10) {
        points = 10;
        coinEarn = 1;
        streak = Math.floor(streak / 2);
        playTone(400, 100);
    } else {
        points = 5;
        coinEarn = 1;
        streak = 0;
        playTone(300, 100);
    }
    
    points *= scoreMultiplier;
    
    if (currentFood.golden) {
        coinEarn *= 10;
        points *= 10;
    }
    
    if (upgrades.lucky && Math.random() < 0.2) {
        coinEarn *= 2;
    }
    
    score += points + (streak * 5);
    coins += coinEarn;
    totalSlices++;
    updateUI();
    
    let particleCount = upgrades.particles ? 40 : 20;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(currentFood.x + relY, currentFood.y + relY, currentFood.c2));
    }
}

function updateUI() {
    document.getElementById('s').textContent = '✂ ' + score;
    document.getElementById('coins').textContent = '💰 ' + coins + ' coins';
    
    let accuracy = totalSlices > 0 ? Math.round((perfectSlices / totalSlices) * 100) : 100;
    let emoji = '~perfect~';
    if (accuracy < 100 && accuracy >= 80) emoji = '~excellent~';
    else if (accuracy < 80 && accuracy >= 60) emoji = '~nice~';
    else if (accuracy < 60 && accuracy >= 40) emoji = '~okay~';
    else if (accuracy < 40) emoji = '~practice~';
    
    document.getElementById('a').textContent = emoji;
    document.getElementById('t').textContent = 'streak: ' + streak + ' ✨';
    
    updateShop();
}

function draw() {
    let gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    gradient.addColorStop(0, 'rgba(45,27,61,.1)');
    gradient.addColorStop(1, 'rgba(22,33,62,.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Floating orbs
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(232,213,183,${0.05 + Math.sin(time * 0.01 + i) * 0.02})`;
        ctx.beginPath();
        ctx.arc(
            w * 0.2 + Math.sin(time * 0.005 + i) * 100,
            h * 0.3 + Math.cos(time * 0.007 + i) * 80,
            40 + i * 20,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    if (currentFood) {
        currentFood.update();
        currentFood.draw();
    }
    
    particles = particles.filter(p => {
        p.update();
        p.draw();
        return p.update();
    });
    
    if (slicing && sliceStart && sliceEnd) {
        let gradient;
        
        if (upgrades.rainbow) {
            gradient = ctx.createLinearGradient(sliceStart.x, sliceStart.y, sliceEnd.x, sliceEnd.y);
            gradient.addColorStop(0, 'rgba(255,0,255,.5)');
            gradient.addColorStop(0.5, 'rgba(0,255,255,.8)');
            gradient.addColorStop(1, 'rgba(255,255,0,.5)');
        } else if (upgrades.trail) {
            gradient = ctx.createLinearGradient(sliceStart.x, sliceStart.y, sliceEnd.x, sliceEnd.y);
            gradient.addColorStop(0, 'rgba(255,215,0,0)');
            gradient.addColorStop(0.5, 'rgba(255,215,0,.9)');
            gradient.addColorStop(1, 'rgba(255,215,0,0)');
        } else {
            gradient = ctx.createLinearGradient(sliceStart.x, sliceStart.y, sliceEnd.x, sliceEnd.y);
            gradient.addColorStop(0, 'rgba(232,213,183,0)');
            gradient.addColorStop(0.5, 'rgba(232,213,183,.8)');
            gradient.addColorStop(1, 'rgba(232,213,183,0)');
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = upgrades.trail ? 'rgba(255,215,0,.6)' : 'rgba(232,213,183,.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(sliceStart.x, sliceStart.y);
        ctx.lineTo(sliceEnd.x, sliceEnd.y);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
    }
    
    time++;
    requestAnimationFrame(draw);
}

// Audio
let audioCtx;
function playTone(freq, duration) {
    if (!soundOn) return;
    if (!audioCtx) audioCtx = new (AudioContext || webkitAudioContext)();
    
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    let filter = audioCtx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = freq * 2;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0.08;
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    osc.stop(audioCtx.currentTime + duration / 1000);
}

// Input handling
function handleSliceStart(x, y) {
    slicing = true;
    sliceStart = {x, y};
    sliceEnd = {x, y};
}

function handleSliceMove(x, y) {
    if (slicing) sliceEnd = {x, y};
}

function handleSliceEnd() {
    if (slicing && currentFood && !currentFood.sliced && sliceStart && sliceEnd) {
        let dy = Math.abs(sliceEnd.y - sliceStart.y);
        let dx = Math.abs(sliceEnd.x - sliceStart.x);
        
        if (dx > dy * 2) {
            currentFood.sliced = true;
            currentFood.sliceY = (sliceStart.y + sliceEnd.y) / 2 - currentFood.y;
            calculateSlice((sliceStart.y + sliceEnd.y) / 2);
            currentFood.showResult = true;
            
            setTimeout(() => {
                currentFood = null;
                setTimeout(spawnFood, 300);
            }, 2000);
        }
    }
    
    slicing = false;
    sliceStart = null;
    sliceEnd = null;
}

// Shop functions
function buyUpgrade(id, cost) {
    if (coins >= cost) {
        coins -= cost;
        upgrades[id] = true;
        
        if (id === 'mult1') scoreMultiplier = 2;
        if (id === 'mult2') scoreMultiplier = 3;
        if (id === 'mult3') scoreMultiplier = 5;
        
        updateUI();
        playTone(600, 100);
        save();
    } else {
        playTone(200, 100);
    }
}

function updateShop() {
    let categories = ['upgrades', 'abilities', 'cosmetics'];
    
    categories.forEach(category => {
        let html = '';
        shopItems[category].forEach(item => {
            let bought = upgrades[item.id];
            let canBuy = !bought && coins >= item.cost && (!item.req || upgrades[item.req]);
            
            html += `
                <div class="upgrade ${bought ? 'bought' : ''}">
                    <div>
                        <h3>${item.name}</h3>
                        <p>${item.desc}</p>
                    </div>
                    <span class="price">${item.cost} coins</span>
                    <button class="buy-btn" onclick="buyUpgrade('${item.id}', ${item.cost})" ${bought || !canBuy ? 'disabled' : ''}>
                        ${bought ? 'owned' : 'buy'}
                    </button>
                </div>
            `;
        });
        
        document.getElementById(category).innerHTML = html;
    });
}

// Save/Load
function save() {
    localStorage.setItem('lofiSlicerSave', JSON.stringify({
        coins,
        score,
        upgrades,
        totalSlices,
        perfectSlices
    }));
}

function load() {
    let data = localStorage.getItem('lofiSlicerSave');
    if (data) {
        let saved = JSON.parse(data);
        coins = saved.coins || 0;
        score = saved.score || 0;
        upgrades = saved.upgrades || {};
        totalSlices = saved.totalSlices || 0;
        perfectSlices = saved.perfectSlices || 0;
        
        if (upgrades.mult1) scoreMultiplier = 2;
        if (upgrades.mult2) scoreMultiplier = 3;
        if (upgrades.mult3) scoreMultiplier = 5;
        
        updateUI();
    }
}

// Event listeners
// Mouse events
c.addEventListener('mousedown', e => {
    let rect = c.getBoundingClientRect();
    handleSliceStart(e.clientX - rect.left, e.clientY - rect.top);
});

c.addEventListener('mousemove', e => {
    let rect = c.getBoundingClientRect();
    handleSliceMove(e.clientX - rect.left, e.clientY - rect.top);
});

c.addEventListener('mouseup', handleSliceEnd);

// Touch events
c.addEventListener('touchstart', e => {
    e.preventDefault();
    let rect = c.getBoundingClientRect();
    let touch = e.touches[0];
    handleSliceStart(touch.clientX - rect.left, touch.clientY - rect.top);
});

c.addEventListener('touchmove', e => {
    e.preventDefault();
    let rect = c.getBoundingClientRect();
    let touch = e.touches[0];
    handleSliceMove(touch.clientX - rect.left, touch.clientY - rect.top);
});

c.addEventListener('touchend', e => {
    e.preventDefault();
    handleSliceEnd();
});

// UI events
document.getElementById('m').addEventListener('click', function() {
    soundOn = !soundOn;
    this.textContent = soundOn ? 'sound: on' : 'sound: off';
});

document.getElementById('shop-btn').addEventListener('click', () => {
    document.getElementById('shop').classList.add('show');
    updateShop();
});

document.getElementById('close-shop').addEventListener('click', () => {
    document.getElementById('shop').classList.remove('show');
});

// Auto income
setInterval(() => {
    if (upgrades.auto) {
        coins += 1;
        updateUI();
        save();
    }
}, 1000);

// Auto save
setInterval(save, 5000);

// Initialize game
load();
spawnFood();
draw();
updateUI();