"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Save, Trophy, LayoutDashboard, Settings as SettingsIcon, 
  Home, Search, CheckCircle2, Circle, QrCode, Users, TrendingUp, Wallet, 
  Clock, Edit3, Trash, AlertCircle, Star, Award, UserCheck, ChevronRight, Copy, Share2,
  UserPlus, RefreshCw, ChevronDown, Award as TrophyIcon, Zap, Target, History,
  BarChart3, XCircle, ChevronUp, UserMinus, Info
} from 'lucide-react';

// --- [1] CONNECT SUPABASE ---
const supabaseUrl = 'https://bpyudijkydvpdbwzflgl.supabase.co';
const supabaseKey = 'sb_publishable_sidEH7PMpoZ0i_eLjlGEPg_UnpIFTAj';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BadmintonUltimatePro() {
  // --- [2] STATES ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [players, setPlayers] = useState([]);
  const [courts, setCourts] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Settings จาก Table settings ID: 1
  const [settings, setSettings] = useState({
    id: 1,
    game_rule_name: 'ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸',
    fixed_entry_fee: 90,
    shuttle_price: 20,
    bank_name: 'ธนาคารกสิกรไทย',
    account_number: '000-0-0000-000',
    account_name: 'ระบุชื่อบัญชี',
    calc_model: 'case1'
  });

  // Modals
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, name: '' });
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });

  // --- [3] DATA FETCHING & REAL-TIME ---
  const fetchAllData = async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        supabase.from('players').select('*').order('points', { ascending: false }),
        supabase.from('courts').select('*').order('name', { ascending: true }),
        supabase.from('settings').select('*').eq('id', 1).single()
      ]);

      if (pRes.data) setPlayers(pRes.data);
      if (cRes.data) setCourts(cRes.data);
      if (sRes.data) setSettings(sRes.data);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const channel = supabase.channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- [4] CORE LOGIC ---
  const calculateFee = (p) => {
    return (settings.fixed_entry_fee || 0) + ((p.shuttlesInvolved || 0) * (settings.shuttle_price || 0));
  };

  const handleAddPlayer = async () => {
    if (!playerName.trim()) return;
    const { error } = await supabase.from('players').insert([{
      name: playerName.trim(),
      status: 'waiting',
      points: 0,
      paid: false,
      gamesPlayed: 0,
      wins: 0,
      shuttlesInvolved: 0,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName.trim()}`
    }]);
    if (!error) { 
        setPlayerName(''); 
        setConfirmModal({ show: false, name: '' });
        setAlertModal({ show: true, title: 'สำเร็จ!', message: `เพิ่มคุณ ${playerName} เข้าก๊วนแล้ว`, type: 'success' });
    }
  };

  const deletePlayer = async (id) => {
    if (confirm("ต้องการลบเพื่อนออกจากรายการวันนี้?")) {
      await supabase.from('players').delete().eq('id', id);
    }
  };

  const startMatch = async (courtId) => {
    const waiting = players.filter(p => p.status === 'waiting')
                          .sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0));
    
    if (waiting.length < 4) {
      setAlertModal({ show: true, title: 'คนไม่พอสุ่มจ้า', message: 'ต้องมีสมาชิกสถานะ "รอเล่น" อย่างน้อย 4 ท่าน', type: 'error' });
      return;
    }

    const selected = waiting.slice(0, 4).sort(() => 0.5 - Math.random());
    const tA = [selected[0], selected[1]];
    const tB = [selected[2], selected[3]];

    await supabase.from('players').update({ status: 'playing' }).in('id', selected.map(x => x.id));
    await supabase.from('courts').update({
      status: 'busy',
      teamA: tA,
      teamB: tB,
      start_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }).eq('id', courtId);
  };

  const finalizeMatch = async (courtId, winner, numShuttles) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;
    const participants = [...court.teamA, ...court.teamB];

    for (const p of participants) {
      const isTeamA = court.teamA.some(m => m.id === p.id);
      const isWinner = (winner === 'A' && isTeamA) || (winner === 'B' && !isTeamA);
      
      await supabase.from('players').update({
        status: 'waiting',
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        wins: isWinner ? (p.wins || 0) + 1 : (p.wins || 0),
        points: (p.points || 0) + (isWinner ? 10 : 2),
        shuttlesInvolved: (p.shuttlesInvolved || 0) + numShuttles
      }).eq('id', p.id);
    }

    await supabase.from('courts').update({ 
        status: 'available', 
        teamA: [], 
        teamB: [], 
        start_time: null 
    }).eq('id', courtId);
    
    setShuttleModal({ show: false, courtId: null, winner: null });
  };

  const copyToLine = () => {
    const summary = players.map(p => `${p.paid ? '✅' : '🔴'} ${p.name}: ${calculateFee(p)}บ.`).join('\n');
    const text = `🏸 ${settings.game_rule_name}\nสรุปยอดวันที่ ${new Date().toLocaleDateString('th-TH')}:\n${summary}\n\n💰 โอนที่: ${settings.bank_name}\n${settings.account_number}\nชื่อ: ${settings.account_name}`;
    navigator.clipboard.writeText(text);
    setAlertModal({ show: true, title: 'คัดลอกสำเร็จ!', message: 'ส่งลงกลุ่ม Line ได้เลยจ้า', type: 'success' });
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFB] text-pink-500">
      <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black animate-pulse">กำลังซิงค์ข้อมูลก๊วนเสน่ห์...</p>
    </div>
  );

return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32 text-slate-700 select-none" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER: UI ก๊วนเสน่ห์ */}
      <header className="bg-white/95 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-pink-200">🏸</div>
          <div>
            <h1 className="text-[19px] font-black text-pink-500 leading-none">{settings.game_rule_name}</h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest italic">✨ สังคมดี แบดมินตันสนุก ✨</p>
          </div>
        </div>
        <button onClick={() => fetchAllData()} className="p-2 text-pink-300 hover:text-pink-500 transition-colors">
          <RefreshCw size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* TAB 1: หน้าสนาม (Home) */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50">
              <div className="flex gap-3">
                <input 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && setConfirmModal({ show: true, name: playerName.trim() })}
                  placeholder="เพิ่มชื่อเล่นคนเก่ง..." 
                  className="flex-1 p-4 bg-pink-50/30 rounded-2xl outline-none font-bold text-pink-600 placeholder:text-pink-200"
                />
                <button 
                  onClick={() => setConfirmModal({ show: true, name: playerName.trim() })}
                  disabled={!playerName.trim()}
                  className="bg-pink-500 text-white px-6 rounded-2xl font-black shadow-lg shadow-pink-100 active:scale-90 transition-transform disabled:opacity-20"
                >
                  <PlusCircle />
                </button>
              </div>
            </section>

            {courts.map((court) => (
              <div key={court.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-indigo-50 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                    <span className="text-[18px] font-black text-slate-700 uppercase">คอร์ด # {court.name}</span>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1.5 ${court.status === 'busy' ? 'bg-orange-100 text-orange-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {court.status === 'busy' ? <><Clock size={12} /> {court.start_time}</> : 'สนามว่าง'}
                  </div>
                </div>

                {court.status === 'busy' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <div className="flex-1 bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-[2rem] text-center shadow-md">
                          <p className="text-white font-black truncate">{court.teamA.map(p => p.name).join(' & ')}</p>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 z-10">VS</div>
                       <div className="flex-1 bg-gradient-to-br from-pink-500 to-pink-600 p-5 rounded-[2rem] text-center shadow-md">
                          <p className="text-white font-black truncate">{court.teamB.map(p => p.name).join(' & ')}</p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'A' })} className="flex-1 bg-emerald-500 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-emerald-50 active:scale-95 transition-all">A ชนะ</button>
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'B' })} className="flex-1 bg-indigo-500 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-indigo-50 active:scale-95 transition-all">B ชนะ</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => startMatch(court.id)}
                    className="w-full py-12 border-2 border-dashed border-indigo-100 rounded-[2.5rem] text-indigo-300 font-black hover:bg-indigo-50/50 hover:border-indigo-300 transition-all flex flex-col items-center gap-2"
                  >
                    <Users size={32} />
                    <span>กดเรียกคิวลงสนาม</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: การเงิน (Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3.5rem] text-white shadow-xl shadow-indigo-100">
                <p className="text-[12px] opacity-70 font-bold uppercase tracking-widest mb-1">ยอดรวมวันนี้</p>
                <h2 className="text-5xl font-black tracking-tighter">฿{players.reduce((s, p) => s + calculateFee(p), 0).toLocaleString()}</h2>
                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button onClick={copyToLine} className="bg-white/20 hover:bg-white/30 p-4 rounded-[1.5rem] text-[12px] font-black flex items-center justify-center gap-2 backdrop-blur-sm transition-all">
                    <Share2 size={16} /> ส่งสรุปยอดเข้า Line
                  </button>
                  <button className="bg-white text-indigo-600 p-4 rounded-[1.5rem] text-[12px] font-black flex items-center justify-center gap-2 shadow-lg">
                    <QrCode size={16} /> QR รับเงิน
                  </button>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden divide-y divide-slate-50">
                <div className="p-4 bg-slate-50/50">
                   <div className="relative">
                     <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="ค้นชื่อเพื่อน..." className="w-full p-3 pl-10 rounded-xl bg-white border-none text-sm font-bold shadow-sm outline-none" />
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                   </div>
                </div>
                {players.filter(p => p.name.includes(searchQuery)).map(p => (
                  <div key={p.id} className="p-5 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => supabase.from('players').update({ paid: !p.paid }).eq('id', p.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${p.paid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                      >
                        {p.paid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div>
                        <p className={`font-black ${p.paid ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">เล่น {p.gamesPlayed} เกม | ใช้ {p.shuttlesInvolved} ลูก</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`font-black text-[18px] ${p.paid ? 'text-slate-300' : 'text-indigo-600'}`}>฿{calculateFee(p)}</span>
                       <button onClick={() => deletePlayer(p.id)} className="p-2 text-rose-100 hover:text-rose-500 active:scale-90 transition-all">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB 3: อันดับ (Leaderboard) */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className="bg-pink-500 p-8 rounded-[3rem] text-white shadow-xl shadow-pink-100 relative overflow-hidden">
                <TrophyIcon className="absolute right-[-10px] bottom-[-10px] opacity-20 rotate-12" size={120} />
                <p className="text-[12px] opacity-70 font-black uppercase tracking-widest mb-1">MVP OF THE DAY</p>
                <h2 className="text-3xl font-black">{players[0]?.name || 'N/A'}</h2>
                <p className="text-[14px] mt-2 bg-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-sm italic">สะสมไปแล้ว {players[0]?.points || 0} แต้ม</p>
             </div>
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden divide-y divide-slate-50">
               {players.slice(0, 15).map((p, idx) => (
                 <div key={p.id} className="p-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[12px] ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-50 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <p className="font-black text-slate-700">{p.name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-indigo-600 font-black">{p.points}</p>
                       <p className="text-[9px] text-slate-300 font-bold uppercase">Points</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* TAB 4: ตั้งค่า (Settings) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center"><SettingsIcon size={20} /></div>
                   <h3 className="font-black text-slate-700 text-lg">ตั้งค่าข้อมูลก๊วน</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">ชื่อก๊วน</label>
                    <input value={settings.game_rule_name} onChange={(e)=>setSettings({...settings, game_rule_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1 outline-none border-none focus:ring-2 ring-pink-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">ค่าเข้า (฿)</label>
                      <input type="number" value={settings.fixed_entry_fee} onChange={(e)=>setSettings({...settings, fixed_entry_fee: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">ลูกแบด (฿)</label>
                      <input type="number" value={settings.shuttle_price} onChange={(e)=>setSettings({...settings, shuttle_price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-indigo-400 ml-2 uppercase mb-3">บัญชีธนาคาร</p>
                    <input placeholder="ธนาคาร" value={settings.bank_name} onChange={(e)=>setSettings({...settings, bank_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-2 border-none" />
                    <input placeholder="เลขบัญชี" value={settings.account_number} onChange={(e)=>setSettings({...settings, account_number: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-2 border-none" />
                    <input placeholder="ชื่อบัญชี" value={settings.account_name} onChange={(e)=>setSettings({...settings, account_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none" />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('settings').update(settings).eq('id', 1);
                    if(!error) setAlertModal({ show: true, title: 'บันทึกสำเร็จ!', message: 'ข้อมูลก๊วนถูกอัปเดตเข้าระบบแล้ว', type: 'success' });
                  }}
                  className="w-full py-5 bg-pink-500 text-white rounded-3xl font-black shadow-xl shadow-pink-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} /> บันทึกการตั้งค่า
                </button>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER NAV (UI ก๊วนเสน่ห์) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-pink-50 px-8 py-5 flex justify-between items-center z-50 rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.06)]">
        {[
          { id: 'home', label: 'สนาม', icon: <Home size={22} /> },
          { id: 'leaderboard', label: 'อันดับ', icon: <TrophyIcon size={22} /> },
          { id: 'dashboard', label: 'การเงิน', icon: <Wallet size={22} /> },
          { id: 'settings', label: 'ตั้งค่า', icon: <SettingsIcon size={22} /> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === tab.id ? 'scale-110 text-pink-500' : 'text-slate-300 opacity-60'}`}
          >
            <div className={`p-2 rounded-2xl ${activeTab === tab.id ? 'bg-pink-50 shadow-sm' : 'bg-transparent'}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 text-center shadow-2xl border-b-[10px] border-indigo-500">
            <h3 className="text-[20px] font-black mb-2 text-indigo-600 uppercase">แมตช์นี้ใช้ลูกแบดกี่ลูก? 🏸</h3>
            <p className="text-slate-400 font-bold mb-6 text-[14px]">กรุณาระบุเพื่อบันทึกค่าใช้จ่ายจ้า</p>
            <div className="grid grid-cols-3 gap-3 my-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button 
                  key={n} 
                  onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} 
                  className="py-6 bg-slate-50 hover:bg-indigo-500 hover:text-white rounded-[1.8rem] font-black text-2xl transition-all active:scale-90 shadow-sm"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => setShuttleModal({show:false, courtId:null, winner:null})} className="text-slate-300 font-bold text-[12px] uppercase tracking-widest">ยกเลิก</button>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-pink-900/10 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 text-center shadow-2xl border-t-[10px] border-pink-500">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus className="text-pink-500" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-700">ยืนยันเพิ่มคุณ {confirmModal.name}</h3>
            <p className="text-slate-400 font-bold mb-8 text-sm px-4">ต้องการเพิ่มชื่อสมาชิกใหม่เข้าระบบก๊วนวันนี้ใช่หรือไม่?</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleAddPlayer} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">ยืนยัน เพิ่มเลย!</button>
              <button onClick={() => setConfirmModal({show:false, name:''})} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-200 transition-all">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl relative overflow-hidden">
            <div className={`h-2 w-full absolute top-0 left-0 ${alertModal.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
            <h3 className="text-[22px] font-black mb-2 text-slate-800 mt-4">{alertModal.title}</h3>
            <p className="text-slate-400 font-bold mb-8 text-[15px] leading-relaxed px-4">{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal({ ...alertModal, show: false })} 
              className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              รับทราบจ้า ❤️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}





































