
"use client";
import { useEffect, useRef } from "react";

export default function VHSStage({ intensity = 0.1, sfxVolume = 0.35 }:{ intensity?: number; sfxVolume?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  function playBuzz(vol = sfxVolume, freq = 700) {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioRef.current!;
      const dur = 0.05; // Shorter duration for a "snap"
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // Using a sharp decay instead of pure random noise
        data[i] = Math.pow(1 - i / data.length, 3) * (Math.random() * 2 - 1);
      }
      const src = ctx.createBufferSource(); src.buffer = buffer;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 5; // Higher Q for a more resonant "snap"
      const gain = ctx.createGain(); const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t); 
      gain.gain.linearRampToValueAtTime(vol * 1.5, t + 0.01); // Sharper attack
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur); // Faster decay
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination); src.start(); src.stop(t + dur);
    } catch {}
  }
  function spawnSpark(x:number,y:number,small=false){
    const el = containerRef.current; if(!el) return;
    const d = document.createElement("div");
    d.className = "vhs-spark"; d.style.left = x+"px"; d.style.top = y+"px"; d.style.setProperty("--scale", small ? "0.7" : "1");
    el.appendChild(d); setTimeout(()=>d.remove(), 240);
  }

  useEffect(() => {
    function onDown(e:MouseEvent){ playBuzz(sfxVolume, 800); spawnSpark(e.clientX, e.clientY, false); }
    function onKey(e:KeyboardEvent){
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") {
        playBuzz(sfxVolume * 0.6, 600);
        const ae = document.activeElement as HTMLElement | null;
        const r = ae?.getBoundingClientRect(); if (r) spawnSpark(r.left + r.width - 18, r.top + r.height / 2, true);
      }
    }
    window.addEventListener("mousedown", onDown, { passive: true }); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [sfxVolume]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[5]">
      <div style={{ opacity: intensity }} className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,.7)_0,rgba(255,255,255,.7)_1px,transparent_1px,transparent_3px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.6))] mix-blend-multiply" />
      <div className="absolute inset-0 opacity-[0.04] [background:radial-gradient(black_1px,transparent_1px)] [background-size:3px_3px]" />
      <style jsx global>{`
        .vhs-spark{ position:fixed;width:12px;height:12px;border-radius:9999px;pointer-events:none;
          transform:translate(-50%,-50%) scale(var(--scale,1));
          background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(168,85,247,0.7) 60%, transparent 70%);
          box-shadow: 0 0 10px rgba(168,85,247,0.8), 0 0 20px rgba(59,130,246,0.5), 0 0 30px rgba(255,255,255,0.35);
          animation:spark-pop 220ms ease-out forwards;
        }
        @keyframes spark-pop { 0%{opacity:0;transform:translate(-50%,-50%) scale(calc(var(--scale,1)*0.4));}
          40%{opacity:1;} 100%{opacity:0;transform:translate(-50%,-60%) scale(calc(var(--scale,1)*1.6));} }
      `}</style>
    </div>
  );
}
