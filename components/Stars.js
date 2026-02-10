"use client";

import { useEffect, useRef } from "react";

export default function Stars() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 160 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      a: Math.random() * 0.7 + 0.3,
    }));

    const meteors = [];

    function spawnMeteor() {
      meteors.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height / 2),
        vx: -8 - Math.random() * 6,
        vy: 6 + Math.random() * 4,
        life: 0,
        max: 40 + Math.random() * 30
      });
      if (meteors.length > 8) meteors.shift();
    }

    let t = 0;
    let raf;
    function draw() {
      t++;
      ctx.fillStyle = "#020414";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // stars
      for (const s of stars) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // meteors
      if (t % 35 === 0) spawnMeteor();
      for (const m of meteors) {
        m.x += m.vx;
        m.y += m.vy;
        m.life++;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 4, m.y - m.vy * 4);
        ctx.stroke();
      }

      // keep meteors alive
      for (let i = meteors.length - 1; i >= 0; i--) {
        if (meteors[i].life > meteors[i].max) meteors.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    />
  );
}
