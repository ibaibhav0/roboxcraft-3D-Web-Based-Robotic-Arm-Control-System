/**
 * VirtualJoystick — Canvas-based virtual joystick with mouse & touch support.
 * Outputs normalised x, y in [-1, 1].
 */
export class VirtualJoystick {
    constructor(container, size = 180) {
        this.size = size;
        this.half = size / 2;
        this.maxR = size * 0.37;        // max stick travel
        this.stickR = size * 0.14;      // stick knob radius
        this.active = false;
        this.x = 0;
        this.y = 0;

        // create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width  = size;
        this.canvas.height = size;
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.stickX = this.half;
        this.stickY = this.half;

        this._bind();
        this._draw();
    }

    /* ---------- event wiring ---------- */
    _bind() {
        const c = this.canvas;
        c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); this._start(e); });
        c.addEventListener('pointermove', (e) => this._move(e));
        c.addEventListener('pointerup',   (e) => { c.releasePointerCapture(e.pointerId); this._end(); });
        c.addEventListener('pointercancel', () => this._end());
        // prevent context menu on long press
        c.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _start(e) {
        this.active = true;
        this._update(e);
    }

    _move(e) {
        if (!this.active) return;
        this._update(e);
    }

    _end() {
        this.active = false;
        this.stickX = this.half;
        this.stickY = this.half;
        this.x = 0;
        this.y = 0;
        this._draw();
    }

    _update(e) {
        const rect = this.canvas.getBoundingClientRect();
        let px = e.clientX - rect.left;
        let py = e.clientY - rect.top;

        let dx = px - this.half;
        let dy = py - this.half;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.maxR) {
            dx = dx / dist * this.maxR;
            dy = dy / dist * this.maxR;
        }

        this.stickX = this.half + dx;
        this.stickY = this.half + dy;
        this.x =  dx / this.maxR;
        this.y = -dy / this.maxR;          // Y up = positive
        this._draw();
    }

    /* ---------- rendering ---------- */
    _draw() {
        const ctx = this.ctx;
        const s = this.size;
        ctx.clearRect(0, 0, s, s);

        // outer glow ring
        ctx.beginPath();
        ctx.arc(this.half, this.half, this.maxR + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,170,255,0.08)';
        ctx.lineWidth = 16;
        ctx.stroke();

        // outer ring
        ctx.beginPath();
        ctx.arc(this.half, this.half, this.maxR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15,20,40,0.6)';
        ctx.fill();
        ctx.strokeStyle = this.active ? 'rgba(0,170,255,0.6)' : 'rgba(0,170,255,0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // crosshairs
        ctx.beginPath();
        ctx.moveTo(this.half - this.maxR, this.half);
        ctx.lineTo(this.half + this.maxR, this.half);
        ctx.moveTo(this.half, this.half - this.maxR);
        ctx.lineTo(this.half, this.half + this.maxR);
        ctx.strokeStyle = 'rgba(0,170,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // small centre dot
        ctx.beginPath();
        ctx.arc(this.half, this.half, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,170,255,0.3)';
        ctx.fill();

        // line from centre to stick
        if (this.active) {
            ctx.beginPath();
            ctx.moveTo(this.half, this.half);
            ctx.lineTo(this.stickX, this.stickY);
            ctx.strokeStyle = 'rgba(0,170,255,0.25)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // stick knob
        const grad = ctx.createRadialGradient(
            this.stickX, this.stickY, 0,
            this.stickX, this.stickY, this.stickR
        );
        if (this.active) {
            grad.addColorStop(0, 'rgba(50,200,255,0.95)');
            grad.addColorStop(0.6, 'rgba(0,150,235,0.80)');
            grad.addColorStop(1, 'rgba(0,100,200,0.50)');
        } else {
            grad.addColorStop(0, 'rgba(40,160,220,0.75)');
            grad.addColorStop(0.6, 'rgba(0,120,200,0.55)');
            grad.addColorStop(1, 'rgba(0,80,170,0.30)');
        }

        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.stickR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = this.active ? 'rgba(100,220,255,0.7)' : 'rgba(100,200,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // inner highlight
        ctx.beginPath();
        ctx.arc(this.stickX - this.stickR * 0.25, this.stickY - this.stickR * 0.25, this.stickR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
    }
}
