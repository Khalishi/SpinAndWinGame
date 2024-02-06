/**
 * Class representing a Spin Wheel Game.
 */
export class SpinGame {
    /**
     * Create a Spin Wheel Game.
     * * @param {HTMLElement|string} target - The canvas element or selector (ID or class) for the canvas.
     * @param {Object} options - The options for the game.
     */
    constructor(target, options) {
        this.validateOptions(options);
        this.setupCanvas(target);
        this.setOptions(options);
        this.initializeGame();
    }

    validateOptions(options) {
        if (!options.prizes || options.prizes.length % 2 !== 0) {
            throw new Error("Prizes are required and their count must be an even number.");
        }
        if (!options.winRatios || options.winRatios.length !== options.prizes.length) {
            throw new Error("Win ratios are required and must match the number of prizes.");
        }
        const totalRatio = options.winRatios.reduce((acc, val) => acc + val, 0);
        if (totalRatio <= 0) {
            throw new Error("Total of win ratios must be greater than 0.");
        }
    }

    setOptions(options) {
        this.options = {
            prizes: options.prizes,
            winRatios: options.winRatios,
            oddSegmentTextColor: options.oddSegmentTextColor || '#FFFFFF',
            evenSegmentTextColor: options.evenSegmentTextColor || '#FFFFFF',
            gradientColors: options.gradientColors || [
                { start: '#8e281c', end: '#ef4523' },
                { start: '#b9b891', end: '#fcf8c7' }
            ],
            spinDuration: options.spinDuration || 4000,
            rotationMode: options.rotationMode || 'fixed', // Default to 'fixed'
            rotationSpeed: options.rotationSpeed || 5000, // Default rotation speed, affects spinDuration if 'fixed'
            fixedRotations: options.fixedRotations || 5, // Default number of rotations if 'fixed' mode is selected
            onGameResult: options.onGameResult || function (winner) { }
        };
        this.anglePerSegment = (2 * Math.PI) / this.options.prizes.length;
        this.currentAngle = 0;
        this.spinsLeft = options.spinsLeft || 0;
        this.isSpinning = false;
    }

    setupCanvas(target) {
        if (this.isElement(target)) {
            this.canvas = target;
        } else {
            this.canvas = document.querySelector(target);
        }

        if (!this.canvas) {
            throw new Error(`No canvas found with id '${target}'`);
        }
        this.ctx = this.canvas.getContext('2d');
    }

    isElement(object) {
        return object instanceof HTMLElement;
    }

    initializeGame() {
        this.canvas.addEventListener('click', () => this.spinWheel());
        this.drawWheel();
        this.drawCenterCircle();
    }

    drawWheel() {
        this.clearCanvas();
        this.setupWheelRotation();
        this.options.prizes.forEach((prize, index) => {
            this.drawSegment(prize, index);
        });
        this.restoreCanvasState();
        this.drawGoldenBorder();
        this.drawCenterCircle();
        this.drawPointer();
    }

    clearCanvas() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setupWheelRotation() {
        const { ctx, canvas, currentAngle } = this;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(currentAngle);
    }

    drawSegment(prize, index) {
        const { ctx, anglePerSegment, options } = this;
        ctx.beginPath();
        const startAngle = anglePerSegment * index;
        const endAngle = anglePerSegment * (index + 1);
        const gradientColor = options.gradientColors[index % options.gradientColors.length];
        this.applyGradient(startAngle, endAngle, gradientColor);
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.canvas.width / 2, startAngle, endAngle);
        ctx.fill();
        this.drawText(prize, startAngle, index);
    }

    applyGradient(startAngle, endAngle, gradientColor) {
        const { ctx } = this;
        const gradient = ctx.createLinearGradient(
            Math.cos(startAngle) * 100, Math.sin(startAngle) * 100,
            Math.cos(endAngle) * 100, Math.sin(endAngle) * 100
        );
        gradient.addColorStop(0, gradientColor.start);
        gradient.addColorStop(1, gradientColor.end);
        ctx.fillStyle = gradient;
    }

    drawText(prize, startAngle, index) {
        const { ctx, anglePerSegment, canvas, options } = this;
        ctx.save();
        ctx.rotate(startAngle + anglePerSegment / 2);
        ctx.textAlign = 'right';

        // Determine text color based on odd/even index
        ctx.fillStyle = index % 2 === 0 ? options.evenSegmentTextColor : options.oddSegmentTextColor;

        ctx.font = '16px Arial';
        const textDistanceFromEdge = 30;
        ctx.fillText(prize, canvas.width / 2 - textDistanceFromEdge, 0);
        ctx.restore();
    }


    restoreCanvasState() {
        this.ctx.restore();
    }

    spinWheel() {
        if (this.spinsLeft <= 0 || this.isSpinning) return;

        this.isSpinning = true;
        this.spinsLeft--;

        const winnerInfo = this.determineWinner();
        const winningIndex = winnerInfo.index;

        const totalSegments = this.options.prizes.length;
        const anglePerSegment = 2 * Math.PI / totalSegments;
        const winningSegmentAngle = winningIndex * anglePerSegment;

        const extraAngleToAlignMiddle = Math.PI / 2 + anglePerSegment / 2;
        let finalAngle = 2 * Math.PI - (winningSegmentAngle + extraAngleToAlignMiddle) % (2 * Math.PI);

        const initialRotations = this.options.fixedRotations || 3;
        finalAngle += 2 * Math.PI * initialRotations;

        const startTimestamp = Date.now();
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTimestamp;
            if (elapsed < this.options.spinDuration) {
                const progress = elapsed / this.options.spinDuration;
                const easeOutProgress = 1 - (1 - progress) * (1 - progress);
                this.currentAngle = easeOutProgress * finalAngle;
                this.drawWheel();
                requestAnimationFrame(animate);
            } else {
                this.currentAngle = finalAngle % (2 * Math.PI);
                this.drawWheel();
                this.isSpinning = false;
                this.options.onGameResult(winnerInfo.prize);
            }
        };

        animate();
    }



    drawGoldenBorder() {
        const { ctx, canvas } = this;
        const borderWidth = 20;
        const outerRadius = (canvas.width / 2) - borderWidth;
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, outerRadius,
            canvas.width / 2, canvas.height / 2, outerRadius + borderWidth
        );

        gradient.addColorStop(0, '#f0e329');
        gradient.addColorStop(1, '#da7027');

        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, outerRadius + (borderWidth / 2), 0, 2 * Math.PI);
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = gradient;
        ctx.stroke();
        ctx.restore();
    }

    drawCenterCircle() {
        const { ctx, canvas } = this;
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, 2 * Math.PI);
        ctx.fillStyle = this.spinsLeft > 0 ? '#321a0e' : 'gray';  // Change color to gray when spins are 0
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.spinsLeft.toString(), canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }

    drawPointer() {
        const { ctx, canvas } = this;
        ctx.save();
        ctx.beginPath();
        const pointerHeight = 30;
        const pointerWidth = 20;
        const centerX = canvas.width / 2;

        ctx.moveTo(centerX - pointerWidth / 2, 0);
        ctx.lineTo(centerX + pointerWidth / 2, 0);
        ctx.lineTo(centerX, pointerHeight);
        ctx.closePath();

        ctx.fillStyle = '#0a0a0a';
        ctx.fill();
        ctx.restore();
    }

    determineWinner() {
        const totalRatio = this.options.winRatios.reduce((acc, val) => acc + val, 0);
        const randomValue = Math.random() * totalRatio;
        let cumulative = 0;
        for (let i = 0; i < this.options.winRatios.length; i++) {
            cumulative += this.options.winRatios[i];
            if (randomValue <= cumulative) {

                return { prize: this.options.prizes[i], index: i };
            }
        }
        return { prize: this.options.prizes[this.options.prizes.length - 1], index: this.options.prizes.length - 1 };
    }

}
