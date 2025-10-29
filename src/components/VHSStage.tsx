"use client";
import { useEffect, useRef } from "react";

/**
 * VHSStage:
 * - Arka planda sürekli VHS scanline + grain + vignette
 * - Mouse tıklayınca: kısa "cız" sesi + imleçte kıvılcım
 * - Klavyede her tuşta: düşük volümlü "cız" + input yakınında minik kıvılcım
 *
 * <VHSStage intensity={0.12} sfxVolume={0.35} />
 */
export default function VHSStage({
  intensity = 0.12,  // scanline opaklığı
  sfxVolume = 0.35,  // ses seviyesi 0..1
}: { intensity?: number; sfxVolume?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // WebAudio "cız" — kısa noise burst + hızlı envelope
  function playBuzz(vol = sfxVolume, freq = 1200) {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioRef.current!;
      const dur = 0.09;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // hafif jitter, VHS hissi
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      // Band-pass filtresi (telefon hoparlörü gibi)
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = freq;
      bp.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // hızlı atak, hızlı decay
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.stop(t + dur);
    } catch {}
  }

  // Kıvılcım: ekrana birkaç parça fırlat, 220ms'de söndür
  function spawnSpark(x: number, y: number, small = false) {
    const el = containerRef.current;
    if (!el) return;
    const spark = document.createElement("div");
    spark.className = "vhs-spark";
    spark.style.left = x + "px";
    spark.style.top = y + "px";
    spark.style.setProperty("--scale", small ? "0.7" : "1");
    el.appendChild(spark);
    // otomatik temizle
    setTimeout(() => spark.remove(), 250);
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      playBuzz(sfxVolume, 1400);
      spawnSpark(e.clientX, e.clientY, false);
    }
    function onKey(e: KeyboardEvent) {
      // yalnızca görünür tuşlarda minik efekt
      if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") {
        playBuzz(sfxVolume * 0.6, 1000);
        // aktif element konumu tahminî
        const ae = document.activeElement as HTMLElement | null;
        const r = ae?.getBoundingClientRect();
        if (r) spawnSpark(r.left + r.width - 18, r.top + r.height / 2, true);
      }
    }
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sfxVolume]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[5]">
      {/* VHS scanlines */}
      <div
        style={{ opacity: intensity }}
        className="absolute inset-0 [background:repeating-linear-gradient(180deg,rgba(255,255,255,.7)_0,rgba(255,255,255,.7)_1px,transparent_1px,transparent_3px)]"
      />
      {/* Grain + vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.6))] mix-blend-multiply" />
      <div className="absolute inset-0 opacity-[0.04] [background:radial-gradient(black_1px,transparent_1px)] [background-size:3px_3px]" />
      {/* Kıvılcımlar bu kapsayın altına eklenir */}
      <style jsx global>{`
        .vhs-spark {
          position: fixed;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(var(--scale, 1));
          background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(168,85,247,0.7) 60%, transparent 70%);
          box-shadow:
            0 0 10px rgba(168,85,247,0.8),
            0 0 20px rgba(59,130,246,0.5),
            0 0 30px rgba(255,255,255,0.35);
          animation: spark-pop 220ms ease-out forwards;
        }
        @keyframes spark-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(calc(var(--scale,1)*0.4)); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -60%) scale(calc(var(--scale,1)*1.6)); }
        }
      `}</style>
    </div>
  );
}
