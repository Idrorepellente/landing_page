"use client";
import { useEffect, useRef } from "react";

// Sfondo neurale animato full-page (portato da behaviors.js della landing).
// Il colore della scia segue il tema (variabile CSS --neural-fade) e si aggiorna
// al cambio tema. Rispetta prefers-reduced-motion (in tal caso resta statico).
export function NeuralBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const container = canvas.parentElement as HTMLElement;

    const palette = ["#6366F1", "#14B8A6", "#4F46E5", "#818CF6", "#2DD4BF"];
    const speed = 0.9;
    const trailOpacity = 0.1;
    const particleCount = 240;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    const mouse = { x: -1000, y: -1000 };
    let raf = 0;

    const getFade = () => {
      try {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--neural-fade").trim();
        return v || "246,248,251";
      } catch {
        return "246,248,251";
      }
    };
    let fadeRgb = getFade();

    class P {
      x = 0; y = 0; vx = 0; vy = 0; age = 0; life = 0; color = palette[0];
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width; this.y = Math.random() * height;
        this.vx = 0; this.vy = 0; this.age = 0;
        this.life = Math.random() * 200 + 100;
        this.color = palette[(Math.random() * palette.length) | 0];
      }
      update() {
        const a = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
        this.vx += Math.cos(a) * 0.2 * speed; this.vy += Math.sin(a) * 0.2 * speed;
        const dx = mouse.x - this.x, dy = mouse.y - this.y, d = Math.hypot(dx, dy), r = 150;
        if (d < r) { const f = (r - d) / r; this.vx -= dx * f * 0.05; this.vy -= dy * f * 0.05; }
        this.x += this.vx; this.y += this.vy; this.vx *= 0.95; this.vy *= 0.95; this.age++;
        if (this.age > this.life) this.reset();
        if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
      }
      draw() {
        ctx!.fillStyle = this.color;
        ctx!.globalAlpha = 0.7 * (1 - Math.abs(this.age / this.life - 0.5) * 2);
        ctx!.fillRect(this.x, this.y, 1.6, 1.6);
      }
    }

    let particles: P[] = [];
    const initParticles = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = width + "px"; canvas.style.height = height + "px";
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new P());
    };
    const drawFrame = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(" + fadeRgb + "," + trailOpacity + ")";
      ctx.fillRect(0, 0, width, height);
      for (const p of particles) { p.update(); p.draw(); }
    };
    const animate = () => { drawFrame(); raf = requestAnimationFrame(animate); };

    const onResize = () => { width = container.clientWidth || window.innerWidth; height = container.clientHeight || window.innerHeight; initParticles(); };
    const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    const onTheme = () => {
      fadeRgb = getFade();
      // Ripulisce l'accumulo del vecchio colore così lo sfondo del tema (dietro) si
      // vede subito; con reduced-motion (loop fermo) ridisegna lo stato statico.
      ctx.clearRect(0, 0, width, height);
      if (reduce) { for (let i = 0; i < 60; i++) drawFrame(); }
    };

    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    initParticles();
    if (reduce) {
      // Un solo passaggio statico, senza loop.
      for (let i = 0; i < 60; i++) drawFrame();
    } else {
      animate();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("qs-theme-change", onTheme as EventListener);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("qs-theme-change", onTheme as EventListener);
    };
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none", background: "var(--bg)" }}>
      <canvas ref={ref} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
