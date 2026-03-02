'use client';

import { useEffect, useRef } from 'react';

/**
 * CosmicBackground — Multi-layer parallax starfield + nebula rendered on Canvas2D.
 * Far more performant than R3F particles for static/parallax stars.
 * Renders 3 star layers + data streams at different parallax speeds.
 */
export default function CosmicBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animId: number;
        let scrollY = 0;
        let mouseX = 0.5;
        let mouseY = 0.5;

        // High-DPI setup
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };
        resize();

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;

        // Generate star layers
        interface Star {
            x: number; y: number; r: number; alpha: number; speed: number;
            twinkleOffset: number; color: string;
        }

        const starColors = ['#e8f0ff', '#c8dbff', '#aaccff', '#80e5d8', '#d0b8ff'];

        const makeStars = (count: number, minR: number, maxR: number, speed: number): Star[] => {
            return Array.from({ length: count }, () => ({
                x: Math.random() * 3000,
                y: Math.random() * 6000,
                r: minR + Math.random() * (maxR - minR),
                alpha: 0.3 + Math.random() * 0.7,
                speed,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: starColors[Math.floor(Math.random() * starColors.length)],
            }));
        };

        // 3 layers: deep (slow, many tiny), mid (medium), foreground (few, brighter)
        const deepStars = makeStars(600, 0.3, 0.8, 0.02);
        const midStars = makeStars(200, 0.5, 1.2, 0.06);
        const fgStars = makeStars(60, 0.8, 1.8, 0.12);

        // Data streams — thin flowing lines
        interface DataStream {
            x: number; y: number; length: number; speed: number; alpha: number; angle: number;
        }

        const streams: DataStream[] = Array.from({ length: 4 }, () => ({
            x: Math.random() * 3000,
            y: Math.random() * 6000,
            length: 60 + Math.random() * 140,
            speed: 0.3 + Math.random() * 0.5,
            alpha: 0.04 + Math.random() * 0.06,
            angle: -0.3 + Math.random() * 0.6,
        }));

        // Nebula positions (removed the strong purple one causing the circle issue)
        const nebulae = [
            { x: 0.2, y: 0.15, r: 300, color: '0,229,200', alpha: 0.03 },
            { x: 0.4, y: 0.85, r: 280, color: '0,212,255', alpha: 0.02 },
            { x: 0.85, y: 0.2, r: 200, color: '255,171,64', alpha: 0.015 },
        ];

        const drawStar = (star: Star, t: number, parallaxX: number, parallaxY: number) => {
            const twinkle = 0.5 + 0.5 * Math.sin(t * 0.8 + star.twinkleOffset);
            const a = star.alpha * twinkle;
            const x = ((star.x + parallaxX) % W() + W()) % W();
            const y = ((star.y - scrollY * star.speed + parallaxY) % H() + H()) % H();

            ctx.beginPath();
            ctx.arc(x, y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = a;
            ctx.fill();

            // Bright stars get a subtle glow
            if (star.r > 1.2 && a > 0.6) {
                ctx.beginPath();
                ctx.arc(x, y, star.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = star.color;
                ctx.globalAlpha = a * 0.08;
                ctx.fill();
            }
        };

        const drawStream = (stream: DataStream, t: number) => {
            const x = stream.x;
            const baseY = ((stream.y + t * stream.speed * 60) % (H() + stream.length * 2)) - stream.length;
            const endX = x + Math.sin(stream.angle) * stream.length;
            const endY = baseY + Math.cos(stream.angle) * stream.length;

            const gradient = ctx.createLinearGradient(x, baseY, endX, endY);
            gradient.addColorStop(0, `rgba(0,229,200,0)`);
            gradient.addColorStop(0.4, `rgba(0,229,200,${stream.alpha})`);
            gradient.addColorStop(0.6, `rgba(0,229,200,${stream.alpha})`);
            gradient.addColorStop(1, `rgba(0,229,200,0)`);

            ctx.beginPath();
            ctx.moveTo(x % W(), baseY);
            ctx.lineTo(endX % W(), endY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 1;
            ctx.stroke();
        };

        let lastFrameTime = 0;
        const targetInterval = 1000 / 30; // 30fps cap

        const render = (t: number) => {
            animId = requestAnimationFrame(render);

            // Throttle to 30fps
            if (t - lastFrameTime < targetInterval) return;
            lastFrameTime = t;
            const w = W();
            const h = H();
            t = t / 1000;

            // Clear with deep void
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#030512';
            ctx.fillRect(0, 0, w, h);

            // Nebula glow
            nebulae.forEach(neb => {
                const pulse = 1 + 0.15 * Math.sin(t * 0.3 + neb.x * 10);
                const nx = neb.x * w + (mouseX - 0.5) * 15;
                const ny = neb.y * h + (mouseY - 0.5) * 10 - scrollY * 0.03;
                const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, neb.r * pulse);
                grad.addColorStop(0, `rgba(${neb.color},${neb.alpha * pulse})`);
                grad.addColorStop(1, `rgba(${neb.color},0)`);
                ctx.globalAlpha = 1;
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            });

            // Parallax offsets from mouse/touch
            const px = (mouseX - 0.5) * 20;
            const py = (mouseY - 0.5) * 12;

            // Deep stars (slowest parallax)
            deepStars.forEach(s => drawStar(s, t, px * 0.2, py * 0.2));

            // Mid stars
            midStars.forEach(s => drawStar(s, t, px * 0.5, py * 0.5));

            // Data streams
            streams.forEach(s => drawStream(s, t));

            // Foreground stars (fastest parallax)
            fgStars.forEach(s => drawStar(s, t, px, py));

            ctx.globalAlpha = 1;
        };

        // Event listeners
        const onScroll = () => { scrollY = window.scrollY; };
        const onMouse = (e: MouseEvent) => {
            mouseX = e.clientX / W();
            mouseY = e.clientY / H();
        };
        const onTouch = (e: TouchEvent) => {
            if (e.touches[0]) {
                mouseX = e.touches[0].clientX / W();
                mouseY = e.touches[0].clientY / H();
            }
        };
        const onOrientation = (e: DeviceOrientationEvent) => {
            if (e.gamma != null && e.beta != null) {
                mouseX = 0.5 + (e.gamma / 90) * 0.3;
                mouseY = 0.5 + ((e.beta - 45) / 90) * 0.3;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('mousemove', onMouse, { passive: true });
        window.addEventListener('touchmove', onTouch, { passive: true });
        window.addEventListener('deviceorientation', onOrientation, { passive: true });
        window.addEventListener('resize', resize);

        animId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('mousemove', onMouse);
            window.removeEventListener('touchmove', onTouch);
            window.removeEventListener('deviceorientation', onOrientation);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="cosmic-bg"
            aria-hidden="true"
        />
    );
}
