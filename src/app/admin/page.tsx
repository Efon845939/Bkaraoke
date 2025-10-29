"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VHSStage from "@/components/VHSStage";

const ADMIN_PASS = "90'sKaraoke";

export default function AdminPage() {
  const [auth,setAuth]=useState(false);
  const [pw,setPw]=useState("");
  const [rows,setRows]=useState<any[]>([]);
  const [load,setLoad]=useState(false);
  const [err,setErr]=useState<string|null>(null);

  async function loadSongs(){
    setLoad(true); setErr(null);
    try {
      const snap = await getDocs(query(collection(db,"song_requests"), orderBy("timestamp","desc")));
      setRows(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    } catch(e:any) {
      console.error(e); setErr(e?.message||"Yükleme hatası");
    } finally { setLoad(false); }
  }
  async function setStatus(id:string,status:"approved"|"rejected"){
    await updateDoc(doc(db,"song_requests",id),{ status });
    loadSongs();
  }

  useEffect(()=>{ if(auth) loadSongs(); },[auth]);

  if(!auth){
    return (
      <div className="min-h-screen grid place-items-center relative">
        <div className="relative rounded-[28px] border border-white/12 bg-white/10 backdrop-blur-xl p-8 w-[min(420px,92%)]">
          <h1 className="text-2xl font-black mb-4 text-fuchsia-300">Yönetici Girişi</h1>
          <input type="password" className="retro-input-soft vhs-interact" placeholder="Şifre" value={pw} onChange={e=>setPw(e.target.value)} />
          <button onClick={()=>setAuth(pw===ADMIN_PASS)} className="retro-btn-soft vhs-interact w-full mt-4">Giriş</button>
          {pw && pw!==ADMIN_PASS && <p className="mt-2 text-sm text-red-300">Yanlış şifre.</p>}
        </div>
        <VHSStage intensity={0.1} sfxVolume={0.35} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      <div className="mx-auto w-[min(1100px,92%)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black">Tüm İstekler</h1>
          <div className="flex gap-2">
            <button onClick={loadSongs} className="retro-btn-soft vhs-interact">{load?"Yükleniyor…":"Yenile"}</button>
            <button onClick={()=>setAuth(false)} className="rounded-2xl px-4 py-3 border border-white/20">Çıkış</button>
          </div>
        </div>

        {err && <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-3">{err}</div>}

        <div className="grid gap-2">
          {rows.map((s:any)=>(
            <div key={s.id} className="border border-white/15 rounded-2xl p-3 flex justify-between items-center bg-white/5 backdrop-blur">
              <div>
                <strong>{s.firstName} {s.lastName}</strong> — {s.songTitle}
                <div className="text-sm text-white/70">{s.songUrl}</div>
                <div className={`text-xs mt-1 ${s.status==="approved"?"text-green-400":s.status==="rejected"?"text-red-400":"text-white/60"}`}>{s.status||"pending"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setStatus(s.id,"approved")} className="rounded-xl px-3 py-2 bg-green-500/80">Onayla</button>
                <button onClick={()=>setStatus(s.id,"rejected")} className="rounded-xl px-3 py-2 bg-red-500/80">Reddet</button>
              </div>
            </div>
          ))}
          {rows.length===0 && <p className="text-white/70">Henüz istek yok.</p>}
        </div>
      </div>
      <VHSStage intensity={0.1} sfxVolume={0.35} />
    </div>
  );
}
