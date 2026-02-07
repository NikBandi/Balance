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
let coinPopups = [];
let time = 0;
let perfectEffect = { active: false, x: 0, y: 0, t: 0 };

// Upgrades
let upgrades = {
    mult1: false,
    mult2: false,
    mult3: false,
    auto: 0,
    lucky: false,
    rainbow: false,
    golden: false,
    particles: false,
    trail: false
};

let scoreMultiplier = 1;
let rebirthCount = 0;

function getRebirthCost() {
    return 10000 * Math.pow(2, rebirthCount);
}

function getRebirthMultiplier() {
    return Math.pow(2, rebirthCount);
}

// Food definitions
const foods = [
    {name: 'bread', shape: 0, c1: '#deb887', c2: '#f5deb3', c3: '#8b7355', w: 140, h: 90},
    {name: 'baguette', shape: 1, c1: '#d4a574', c2: '#f5deb3', c3: '#8b6914', w: 200, h: 60},
    {name: 'egg', shape: 2, c1: '#fff', c2: '#ffeb3b', c3: '#ff6f00', w: 70, h: 90},
    {name: 'melon', shape: 3, c1: '#2d5016', c2: '#ff6b9d', c3: '#2d1b3d', r: 110},
    {name: 'cheese', shape: 4, c1: '#f4d03f', c2: '#f9e79f', c3: '#d4ac0d', w: 140, h: 120},
    {name: 'cake', shape: 0, c1: '#ffb6c1', c2: '#fff0f5', c3: '#ff69b4', w: 120, h: 100},
    {name: 'carrot', shape: 5, c1: '#ff7f27', c2: '#ffa500', c3: '#228b22', w: 50, h: 140},
    {name: 'fish', shape: 6, c1: '#87ceeb', c2: '#ffb6c1', c3: '#4682b4', w: 160, h: 80},
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
        {id: 'auto', name: 'Auto Slice', desc: 'Doubles coins/sec each level', cost: 300, levelable: true},
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
        this.speedMult = 0.6 + Math.random() * 0.8;
        this.vx = 0;
        this.vy = 0;
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
        if (!this.sliced) {
            let spinBonus = Math.min(score / 3000, 0.12);
            this.wobble += this.wobbleSpeed + spinBonus;
            if (score >= 10000) {
                let baseSpeed = 1.2 + Math.floor((score - 10000) / 1000) * 0.25;
                let spd = baseSpeed * this.speedMult;
                if (this.vx === 0 && this.vy === 0) {
                    let angle = Math.random() * Math.PI * 2;
                    this.vx = Math.cos(angle) * spd;
                    this.vy = Math.sin(angle) * spd;
                } else {
                    let mag = Math.hypot(this.vx, this.vy) || 1;
                    this.vx = (this.vx / mag) * spd;
                    this.vy = (this.vy / mag) * spd;
                }
                this.x += this.vx;
                this.y += this.vy;
                let halfExt = this.shape === 3 ? this.r : Math.hypot(this.w / 2, this.h / 2);
                let minX = halfExt, maxX = w - halfExt, minY = halfExt, maxY = h - halfExt;
                if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx) || spd; }
                if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx) || -spd; }
                if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy) || spd; }
                if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy) || -spd; }
            }
            return;
        }
        let g = 0.45;
        this.sliceLeftVy += g;
        this.sliceLeftY += this.sliceLeftVy;
        this.sliceLeftX += this.sliceLeftVx;
        this.sliceLeftAngle += this.sliceLeftSpin;
        this.sliceRightVy += g;
        this.sliceRightY += this.sliceRightVy;
        this.sliceRightX += this.sliceRightVx;
        this.sliceRightAngle += this.sliceRightSpin;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        let wobbleAmp = 0.05 + Math.min(score / 2000, 0.12);
        ctx.rotate(this.rotation + Math.sin(this.wobble) * wobbleAmp);
        
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
                ctx.font = '600 20px Outfit, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('★', 0, 10);
            }
        } else {
            let sliceY = this.sliceY;
            let bound = 200;
            let sliceAngle = this.sliceAngle != null ? this.sliceAngle : 0;
            ctx.rotate(-sliceAngle);
            ctx.save();
            ctx.translate(-this.sliceLeftX, this.sliceLeftY);
            ctx.translate(0, sliceY);
            ctx.rotate(this.sliceLeftAngle);
            ctx.translate(0, -sliceY);
            ctx.beginPath();
            ctx.rect(-bound, -bound, bound * 2, sliceY + bound);
            ctx.clip();
            this.drawShape();
            this.drawDetails(sliceY);
            ctx.restore();
            ctx.save();
            ctx.translate(this.sliceRightX, this.sliceRightY);
            ctx.translate(0, sliceY);
            ctx.rotate(this.sliceRightAngle);
            ctx.translate(0, -sliceY);
            ctx.beginPath();
            ctx.rect(-bound, sliceY, bound * 2, bound * 2);
            ctx.clip();
            this.drawShape();
            this.drawDetails(sliceY);
            ctx.restore();
            
        }
        
        ctx.restore();
    }
    
    drawShape() {
        if (this.shape === 0) {
            if (this.name === 'bread') {
                ctx.fillStyle = this.c2;
                let r = 8, x = -this.w/2, y = -this.h/2;
                ctx.beginPath();
                ctx.moveTo(x + r, y); ctx.lineTo(x + this.w - r, y);
                ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + r);
                ctx.lineTo(x + this.w, y + this.h - r);
                ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - r, y + this.h);
                ctx.lineTo(x + r, y + this.h);
                ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.fill();
                ctx.strokeStyle = this.c3;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = 'rgba(139,115,85,0.15)';
                for (let i = 0; i < 4; i++) ctx.fillRect(-this.w/2 + 12 + i*35, -this.h/2 + 8, 18, 4);
            } else if (this.name === 'cake') {
                ctx.fillStyle = this.c1;
                let r = 6, x = -this.w/2, y = -this.h/2;
                ctx.beginPath();
                ctx.moveTo(x + r, y); ctx.lineTo(x + this.w - r, y);
                ctx.quadraticCurveTo(x + this.w, y, x + this.w, y + r);
                ctx.lineTo(x + this.w, y + this.h - r);
                ctx.quadraticCurveTo(x + this.w, y + this.h, x + this.w - r, y + this.h);
                ctx.lineTo(x + r, y + this.h);
                ctx.quadraticCurveTo(x, y + this.h, x, y + this.h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.fill();
                ctx.fillStyle = this.c3;
                ctx.beginPath();
                ctx.ellipse(0, -this.h/2 - 2, this.w/2 + 4, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff69b4';
                ctx.beginPath();
                ctx.arc(0, -this.h/2 - 5, 8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = this.c1;
                ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
                ctx.strokeStyle = this.c3;
                ctx.lineWidth = 4;
                ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
            }
        } else if (this.shape === 1) {
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            if (this.name === 'baguette') {
                ctx.strokeStyle = 'rgba(139,105,20,0.6)';
                ctx.lineWidth = 1;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-this.w/2 + 10, i * 12);
                    ctx.lineTo(this.w/2 - 10, i * 12);
                    ctx.stroke();
                }
            } else if (this.name === 'avocado') {
                ctx.fillStyle = this.c1;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.arc(-12, -18, 12, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = this.c3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.shape === 2) {
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(0, -this.h/2);
            ctx.bezierCurveTo(this.w/2, -this.h/2, this.w/2, this.h/4, 0, this.h/2);
            ctx.bezierCurveTo(-this.w/2, this.h/4, -this.w/2, -this.h/2, 0, -this.h/2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (this.shape === 3) {
            if (this.name === 'melon') {
                ctx.fillStyle = this.c2;
                ctx.beginPath();
                ctx.arc(0, 0, this.r, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 0; i < 14; i++) {
                    ctx.fillStyle = i % 2 ? '#2d5016' : '#4a7c23';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, this.r, (i - 0.5) * Math.PI / 7, (i + 0.5) * Math.PI / 7);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.fillStyle = this.c2;
                ctx.beginPath();
                ctx.arc(0, 0, this.r * 0.78, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.name === 'donut') {
                ctx.fillStyle = this.c1;
                ctx.beginPath();
                ctx.arc(0, 0, this.r, 0, Math.PI * 2);
                ctx.arc(0, 0, this.r * 0.35, 0, Math.PI * 2, true);
                ctx.fill('evenodd');
                ctx.fillStyle = this.c3;
                ctx.beginPath();
                ctx.ellipse(-this.r*0.5, -this.r*0.3, 8, 12, 0.3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = this.c1;
                ctx.beginPath();
                ctx.arc(0, 0, this.r, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.shape === 4) {
            if (this.name === 'cheese') {
                ctx.fillStyle = this.c1;
                ctx.beginPath();
                ctx.moveTo(0, -this.h/2);
                ctx.lineTo(this.w/2, this.h/2);
                ctx.lineTo(-this.w/2, this.h/2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(212,172,13,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                let holes = [
                    [-22, 8, 10], [-18, -18, 8], [20, -12, 9], [15, 22, 7],
                    [-5, 5, 6], [28, 8, 5], [-28, -8, 6]
                ];
                for (let [hx, hy, hr] of holes) {
                    ctx.fillStyle = 'rgba(212,172,13,0.35)';
                    ctx.beginPath();
                    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(184,134,11,0.5)';
                    ctx.beginPath();
                    ctx.arc(hx, hy, hr * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = this.c1;
                ctx.beginPath();
                ctx.moveTo(0, -this.h/2);
                ctx.lineTo(this.w/2, this.h/2);
                ctx.lineTo(-this.w/2, this.h/2);
                ctx.closePath();
                ctx.fill();
            }
        } else if (this.shape === 5) {
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(0, -this.h/2);
            ctx.lineTo(this.w/2, this.h/2);
            ctx.lineTo(-this.w/2, this.h/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(230,100,0,0.4)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-this.w/2 + i*8, -this.h/2 + i*25);
                ctx.lineTo(this.w/2 - i*8, -this.h/2 + i*25);
                ctx.stroke();
            }
            ctx.fillStyle = this.c3;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.translate((i - 1) * 12, -this.h/2 - 8);
                ctx.beginPath();
                ctx.ellipse(0, 0, 4, 18, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else if (this.shape === 6) {
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(70,130,180,0.3)';
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.ellipse(-this.w/4 + i*12, (i % 2) * 8 - 4, 8, 4, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = this.c1;
            ctx.beginPath();
            ctx.moveTo(this.w/2, 0);
            ctx.lineTo(this.w * 0.75, -this.h * 0.35);
            ctx.lineTo(this.w * 0.75, this.h * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = this.c3;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-this.w * 0.25, -this.h * 0.15, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawDetails(sliceY) {
        if (this.shape === 2 && sliceY > -10 && sliceY < 10) {
            ctx.fillStyle = this.c3;
            ctx.beginPath();
            ctx.arc(0, sliceY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        if (this.name === 'avocado' && sliceY > -25 && sliceY < 25) {
            ctx.fillStyle = this.c3;
            ctx.beginPath();
            ctx.arc(0, sliceY, 18, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Particle class - subtle, satisfying burst
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = -Math.random() * 4 - 2;
        this.size = 1.5 + Math.random() * 3;
        this.color = color;
        this.life = 1;
        this.gravity = 0.2;
        this.decay = 0.03;
        this.hue = upgrades.rainbow ? Math.random() * 360 : 0;
    }
    
    update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.hue += 1;
        return this.life > 0;
    }
    
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = upgrades.rainbow ? `hsl(${this.hue % 360}, 60%, 55%)` : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Coin popup: rises up, then falls
class CoinPopup {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.text = '+' + amount + ' coins';
        this.vy = -8;
        this.life = 1;
        this.decay = 0.022;
    }
    update() {
        this.vy += 0.4;
        this.y += this.vy;
        this.life -= this.decay;
        return this.life > 0;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = '600 18px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffc93c';
        ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Game functions
function spawnFood() {
    currentFood = new Food();
}

function calculateSlice(y, sliceMidX, sliceMidY) {
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
    topPercent = Math.max(1, Math.min(99, topPercent));
    let bottomPercent = 100 - topPercent;
    currentFood.leftPercent = Math.max(topPercent, bottomPercent);
    currentFood.rightPercent = Math.min(topPercent, bottomPercent);
    showCutPopup(currentFood.leftPercent + '% / ' + currentFood.rightPercent + '%');

    let diff = Math.abs(50 - currentFood.rightPercent);
    let points = 0;
    let coinEarn = 0;
    
    let effX = sliceMidX != null ? sliceMidX : currentFood.x;
    let effY = sliceMidY != null ? sliceMidY : currentFood.y + relY;
    
    playWhoosh();
    if (diff === 0) {
        points = 100;
        coinEarn = 10;
        perfectSlices++;
        streak++;
        document.getElementById('pf').classList.add('show');
        setTimeout(() => document.getElementById('pf').classList.remove('show'), 1000);
        playCutSound('perfect');
        perfectEffect = { active: true, x: effX, y: effY, t: 0 };
        for (let i = 0; i < 24; i++) {
            let a = (i / 24) * Math.PI * 2;
            let px = effX + Math.cos(a) * 25;
            let py = effY + Math.sin(a) * 25;
            let p = new Particle(px, py, '#ffd700');
            p.vx = Math.cos(a) * 8;
            p.vy = Math.sin(a) * 8 - 3;
            p.size = 3 + Math.random() * 4;
            p.decay = 0.02;
            particles.push(p);
        }
    } else if (diff <= 2) {
        points = 50;
        coinEarn = 5;
        streak++;
        playCutSound('good');
    } else if (diff <= 5) {
        points = 25;
        coinEarn = 3;
        streak++;
        playCutSound('okay');
    } else if (diff <= 10) {
        points = 10;
        coinEarn = 1;
        streak = Math.floor(streak / 2);
        playCutSound('okay');
    } else {
        points = 5;
        coinEarn = 1;
        streak = 0;
        playCutSound('bad');
    }
    
    points *= scoreMultiplier * getRebirthMultiplier();
    
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
    showCoinsGain(coinEarn);
    
    let popX = effX;
    let popY = effY - 20;
    coinPopups.push(new CoinPopup(popX, popY, coinEarn));
    
    let particleCount = upgrades.particles ? 20 : 12;
    for (let i = 0; i < particleCount; i++) {
        let px = effX + (Math.random() - 0.5) * 40;
        let py = effY + (Math.random() - 0.5) * 20;
        particles.push(new Particle(px, py, currentFood.c2));
    }
}

let cutPopupTimer;
let coinsGainTimer;
function showCoinsGain(amount) {
    let el = document.getElementById('coins-gain');
    el.textContent = '+' + amount;
    el.classList.remove('show');
    el.offsetHeight;
    el.classList.add('show');
    clearTimeout(coinsGainTimer);
    coinsGainTimer = setTimeout(() => el.classList.remove('show'), 600);
}
function showCutPopup(text) {
    let el = document.getElementById('cut-popup');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(cutPopupTimer);
    cutPopupTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

function updateUI() {
    document.getElementById('s').textContent = '✂ ' + score;
    document.getElementById('coins').textContent = '💰 ' + coins + ' coins';
    let rb = document.getElementById('rebirth-btn');
    if (rb) {
        let cost = getRebirthCost();
        let mult = getRebirthMultiplier();
        rb.textContent = rebirthCount > 0 ? '✨ rebirth (' + cost + ') ×' + mult : '✨ rebirth (' + cost + ')';
        rb.disabled = score < cost;
        rb.title = score >= cost ? 'Reset score for +2x base multiplier' : 'Need ' + cost + ' score';
    }
    
    let accuracy = totalSlices > 0 ? Math.round((perfectSlices / totalSlices) * 100) : 100;
    let label = 'Perfect';
    if (accuracy < 100 && accuracy >= 80) label = 'Excellent';
    else if (accuracy < 80 && accuracy >= 60) label = 'Nice';
    else if (accuracy < 60 && accuracy >= 40) label = 'Okay';
    else if (accuracy < 40) label = 'Practice';
    
    document.getElementById('a').textContent = label;
    document.getElementById('t').textContent = 'Streak: ' + streak;
    
    updateShop();
}

function draw() {
    ctx.fillStyle = 'rgba(32, 26, 38, 0.85)';
    ctx.fillRect(0, 0, w, h);
    
    if (currentFood) {
        currentFood.update();
        currentFood.draw();
    }
    
    particles = particles.filter(p => {
        let alive = p.update();
        p.draw();
        return alive;
    });
    
    coinPopups = coinPopups.filter(cp => {
        let alive = cp.update();
        cp.draw();
        return alive;
    });
    
    if (perfectEffect.active) {
        perfectEffect.t++;
        if (perfectEffect.t < 50) {
            let prog = perfectEffect.t / 50;
            ctx.strokeStyle = `rgba(255,215,0,${1 - prog})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(perfectEffect.x, perfectEffect.y, prog * 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,255,200,${0.7 - prog * 0.7})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(perfectEffect.x, perfectEffect.y, prog * 55 + 5, 0, Math.PI * 2);
            ctx.stroke();
        } else perfectEffect.active = false;
    }
    
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

// Audio - lofi / satisfying
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (AudioContext || webkitAudioContext)();
}

function lofiChain(node) {
    let lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.7;
    node.connect(lp);
    lp.connect(audioCtx.destination);
}

function playTone(freq, duration, type = 'sine', vol = 0.12) {
    if (!soundOn) return;
    initAudio();
    let t = audioCtx.currentTime;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration / 1000);
    osc.connect(gain);
    lofiChain(gain);
    osc.start(t);
    osc.stop(t + duration / 1000);
}

function playCutSound(quality) {
    if (!soundOn) return;
    initAudio();
    let t = audioCtx.currentTime;
    if (quality === 'perfect') {
        [261, 330, 392].forEach((f, i) => {
            let o = audioCtx.createOscillator();
            let g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = f + (Math.random() - 0.5) * 4;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + i * 0.08);
            o.connect(g);
            lofiChain(g);
            o.start(t + i * 0.06);
            o.stop(t + 0.5);
        });
    } else if (quality === 'good') {
        let o = audioCtx.createOscillator();
        let g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = 330;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g);
        lofiChain(g);
        o.start(t);
        o.stop(t + 0.2);
    } else if (quality === 'okay') {
        let o = audioCtx.createOscillator();
        let g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = 240;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g);
        lofiChain(g);
        o.start(t);
        o.stop(t + 0.14);
    } else {
        let o = audioCtx.createOscillator();
        let g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = 165;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(g);
        lofiChain(g);
        o.start(t);
        o.stop(t + 0.12);
    }
}

function playWhoosh() {
    if (!soundOn) return;
    initAudio();
    let t = audioCtx.currentTime;
    let buf = audioCtx.createBuffer(1, 4410, 44100);
    let d = buf.getChannelData(0);
    for (let i = 0; i < 4410; i++) {
        let env = Math.pow(1 - i / 4410, 0.8);
        d[i] = (Math.random() * 2 - 1) * env * (0.3 + 0.7 * Math.pow(1 - i / 4410, 2));
    }
    let src = audioCtx.createBufferSource();
    src.buffer = buf;
    let lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    lp.Q.value = 0.5;
    let g = audioCtx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    src.connect(lp);
    lp.connect(g);
    g.connect(audioCtx.destination);
    src.start(t);
    src.stop(t + 0.1);
    let thud = audioCtx.createOscillator();
    let thudG = audioCtx.createGain();
    thud.type = 'sine';
    thud.frequency.value = 120;
    thudG.gain.setValueAtTime(0, t);
    thudG.gain.linearRampToValueAtTime(0.04, t + 0.005);
    thudG.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    thud.connect(thudG);
    lofiChain(thudG);
    thud.start(t);
    thud.stop(t + 0.05);
}

function playBuySound() {
    if (!soundOn) return;
    initAudio();
    let t = audioCtx.currentTime;
    let chimes = [784, 988, 1318];
    chimes.forEach((freq, i) => {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
        osc.connect(gain);
        lofiChain(gain);
        osc.start(t + i * 0.06);
        osc.stop(t + 0.5);
    });
}

function playBuyFailSound() {
    if (!soundOn) return;
    playTone(165, 150, 'sine', 0.06);
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

function sliceIntersectsFood(sliceMidX, sliceMidY) {
    if (!currentFood) return false;
    let halfH = currentFood.shape === 3
        ? currentFood.r
        : (Math.sqrt(Math.pow(currentFood.w / 2, 2) + Math.pow(currentFood.h / 2, 2)));
    let margin = 15;
    let dist = Math.hypot(sliceMidX - currentFood.x, sliceMidY - currentFood.y);
    return dist <= halfH + margin;
}

function handleSliceEnd() {
    if (slicing && currentFood && !currentFood.sliced && sliceStart && sliceEnd) {
        let dx = sliceEnd.x - sliceStart.x;
        let dy = sliceEnd.y - sliceStart.y;
        let sliceLen = Math.hypot(dx, dy);
        let sliceMidX = (sliceStart.x + sliceEnd.x) / 2;
        let sliceMidY = (sliceStart.y + sliceEnd.y) / 2;

        let minLen = 40;
        let throughFruit = sliceIntersectsFood(sliceMidX, sliceMidY);

        if (sliceLen >= minLen && throughFruit) {
            let foodRot = currentFood.rotation + Math.sin(currentFood.wobble) * (0.05 + Math.min(score / 2000, 0.12));
            let sliceAngle = Math.atan2(dy, dx) - foodRot;
            let cosA = Math.cos(-foodRot), sinA = Math.sin(-foodRot);
            let localX = (sliceMidX - currentFood.x) * cosA - (sliceMidY - currentFood.y) * sinA;
            let localY = (sliceMidX - currentFood.x) * sinA + (sliceMidY - currentFood.y) * cosA;
            let sliceY = -localX * Math.sin(sliceAngle) + localY * Math.cos(sliceAngle);

            currentFood.sliced = true;
            currentFood.sliceY = sliceY;
            currentFood.sliceAngle = sliceAngle;
            currentFood.sliceLeftX = 0;
            currentFood.sliceLeftY = -22;
            currentFood.sliceLeftVx = 0;
            currentFood.sliceLeftVy = -6;
            currentFood.sliceLeftAngle = 0;
            currentFood.sliceLeftSpin = -0.06;
            currentFood.sliceRightX = 0;
            currentFood.sliceRightY = 22;
            currentFood.sliceRightVx = 0;
            currentFood.sliceRightVy = 6;
            currentFood.sliceRightAngle = 0;
            currentFood.sliceRightSpin = 0.06;
            calculateSlice(currentFood.y + sliceY, sliceMidX, sliceMidY);
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

function rebirth() {
    let cost = getRebirthCost();
    if (score < cost) return;
    rebirthCount++;
    score = 0;
    streak = 0;
    totalSlices = 0;
    perfectSlices = 0;
    currentFood = null;
    upgrades.mult1 = false;
    upgrades.mult2 = false;
    upgrades.mult3 = false;
    upgrades.auto = 0;
    upgrades.lucky = false;
    upgrades.golden = false;
    scoreMultiplier = 1;
    setTimeout(spawnFood, 100);
    updateUI();
    playBuySound();
    save();
}

// Shop functions
function getAutoCost() {
    return 300 * Math.pow(2, upgrades.auto);
}

function getAutoCoinsPerSec() {
    return upgrades.auto > 0 ? Math.pow(2, upgrades.auto - 1) : 0;
}

function buyUpgrade(id, cost) {
    if (coins >= cost) {
        coins -= cost;
        if (id === 'auto') {
            upgrades.auto++;
        } else {
            upgrades[id] = true;
        }
        
        if (id === 'mult1') scoreMultiplier = 2;
        if (id === 'mult2') scoreMultiplier = 3;
        if (id === 'mult3') scoreMultiplier = 5;
        
        updateUI();
        playBuySound();
        save();
    } else {
        playBuyFailSound();
    }
}

function updateShop() {
    let categories = ['upgrades', 'abilities', 'cosmetics'];
    
    categories.forEach(category => {
        let html = '';
        shopItems[category].forEach(item => {
            let bought = item.levelable ? false : upgrades[item.id];
            let cost = item.id === 'auto' ? getAutoCost() : item.cost;
            let canBuy = item.levelable
                ? coins >= cost
                : !bought && coins >= cost && (!item.req || upgrades[item.req]);
            let display = item.id === 'auto'
                ? (upgrades.auto > 0 ? `Lv.${upgrades.auto} · ${getAutoCoinsPerSec()} coins/sec` : item.desc)
                : item.desc;
            
            html += `
                <div class="upgrade ${bought ? 'bought' : ''}">
                    <div>
                        <h3>${item.name}${item.id === 'auto' && upgrades.auto > 0 ? ' (Lv.' + upgrades.auto + ')' : ''}</h3>
                        <p>${display}</p>
                    </div>
                    <span class="price">${cost} coins</span>
                    <button class="buy-btn" onclick="buyUpgrade('${item.id}', ${cost})" ${!canBuy ? 'disabled' : ''}>
                        ${item.levelable ? 'upgrade' : (bought ? 'owned' : 'buy')}
                    </button>
                </div>
            `;
        });
        
        document.getElementById(category).innerHTML = html;
    });
}

const SAVE_VERSION = 2;

function save() {
    localStorage.setItem('lofiSlicerSave', JSON.stringify({
        version: SAVE_VERSION,
        coins,
        score,
        upgrades,
        totalSlices,
        perfectSlices,
        rebirthCount
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
        rebirthCount = saved.rebirthCount || 0;
        
        if ((saved.version || 1) < SAVE_VERSION) {
            upgrades.mult1 = false;
            upgrades.mult2 = false;
            upgrades.mult3 = false;
            upgrades.auto = 0;
            upgrades.lucky = false;
            upgrades.golden = false;
            scoreMultiplier = 1;
        } else {
            if (upgrades.auto === true) upgrades.auto = 1;
            if (upgrades.mult1) scoreMultiplier = 2;
            if (upgrades.mult2) scoreMultiplier = 3;
            if (upgrades.mult3) scoreMultiplier = 5;
        }
        
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
    const shop = document.getElementById('shop');
    shop.classList.add('show', 'just-opened');
    updateShop();
    setTimeout(() => shop.classList.remove('just-opened'), 500);
});

document.getElementById('rebirth-btn').addEventListener('click', rebirth);

document.getElementById('close-shop').addEventListener('click', () => {
    document.getElementById('shop').classList.remove('show');
});
document.getElementById('shop-close-x').addEventListener('click', () => {
    document.getElementById('shop').classList.remove('show');
});

document.getElementById('shop').addEventListener('click', (e) => {
    if (e.target.id === 'shop') document.getElementById('shop').classList.remove('show');
});

document.getElementById('instructions-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('instructions-overlay').classList.add('show');
});
document.getElementById('close-instructions').addEventListener('click', () => {
    document.getElementById('instructions-overlay').classList.remove('show');
});
document.getElementById('instructions-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'instructions-overlay') document.getElementById('instructions-overlay').classList.remove('show');
});

// Auto income
setInterval(() => {
    if (upgrades.auto > 0) {
        coins += getAutoCoinsPerSec();
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