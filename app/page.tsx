"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Save, Trophy, LayoutDashboard, Settings as SettingsIcon, 
  Home, Search, CheckCircle2, Circle, QrCode, Users, TrendingUp, Wallet, 
  Clock, Edit3, Trash, AlertCircle, Star, Award, UserCheck, ChevronRight, Copy, Share2,
  UserPlus, RefreshCw, ChevronDown, Award as TrophyIcon, Zap, Target
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
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchAllData())
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
      shuttlesInvolved: 0
    }]);
    if (!error) { setPlayerName(''); setConfirmModal({ show: false, name: '' }); }
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

    await supabase.from('courts').update({ status: 'available', teamA: [], teamB: [], start_time: null }).eq('id', courtId);
    setShuttleModal({ show: false, courtId: null, winner: null });
  };

  const copyToLine = () => {
    const summary = players.map(p => `${p.paid ? '✅' : '🔴'} ${p.name}: ${calculateFee(p)}บ.`).join('\n');
    const text = `🏸 ${settings.game_rule_name}\nสรุปยอด:\n${summary}\n\n💰 โอน: ${settings.bank_name}\n${settings.account_number}\nชื่อ: ${settings.account_name}`;
    navigator.clipboard.writeText(text);
    setAlertModal({ show: true, title: 'คัดลอกสำเร็จ!', message: 'ส่งลงกลุ่ม Line ได้เลยจ้า', type: 'success' });
  };

  // --- [5] UI RENDERING ---
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFCFB] font-bold text-pink-500 animate-pulse">กำลังโหลดข้อมูลก๊วน...</div>;

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32 text-slate-700" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-pink-200 animate-bounce">🏸</div>
          <div>
            <h1 className="text-[20px] font-black text-pink-500 leading-none">{settings.game_rule_name}</h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-widest">สมาชิกทั้งหมด {players.length} ท่าน</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* TAB: HOME (หน้าสนาม) */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50">
              <div className="flex gap-2">
                <input 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="ใส่ชื่อเล่น..." 
                  className="flex-1 p-4 bg-pink-50/30 rounded-2xl outline-none font-bold text-pink-600 placeholder:text-pink-200"
                />
                <button 
                  onClick={() => setConfirmModal({ show: true, name: playerName.trim() })}
                  disabled={!playerName.trim()}
                  className="bg-pink-500 text-white px-6 rounded-2xl font-black shadow-lg shadow-pink-100"
                >
                  <PlusCircle />
                </button>
              </div>
            </section>

            {courts.map((court) => (
              <div key={court.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-indigo-50 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[18px] font-black text-indigo-600">คอร์ด # {court.name}</span>
                  <span className={`px-4 py-1 rounded-full text-[11px] font-black ${court.status === 'busy' ? 'bg-orange-100 text-orange-500' : 'bg-emerald-100 text-emerald-500'}`}>
                    {court.status === 'busy' ? 'กำลังแข่ง' : 'ว่าง'}
                  </span>
                </div>

                {court.status === 'busy' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                       <div className="flex-1 text-center font-black text-indigo-500">{court.teamA.map(p => p.name).join(' & ')}</div>
                       <div className="text-[10px] font-bold text-slate-300">VS</div>
                       <div className="flex-1 text-center font-black text-pink-500">{court.teamB.map(p => p.name).join(' & ')}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'A' })} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-sm">A ชนะ</button>
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'B' })} className="flex-1 bg-indigo-500 text-white py-3 rounded-2xl font-black text-sm">B ชนะ</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => startMatch(court.id)}
                    className="w-full py-10 border-2 border-dashed border-indigo-100 rounded-[2.5rem] text-indigo-300 font-black hover:bg-indigo-50/50 transition-all"
                  >
                    กดเพื่อลงสนาม
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB: DASHBOARD (การเงิน) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] text-white shadow-xl">
                <p className="text-[12px] opacity-70 font-bold uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
                <h2 className="text-4xl font-black">฿{players.reduce((s, p) => s + calculateFee(p), 0).toLocaleString()}</h2>
                <button onClick={copyToLine} className="mt-6 w-full bg-white/20 hover:bg-white/30 py-3 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 backdrop-blur-sm">
                   <Share2 size={16} /> ส่งสรุปยอดเข้ากลุ่ม Line
                </button>
             </div>

             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden divide-y divide-slate-50">
                {players.map(p => (
                  <div key={p.id} className="p-5 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => supabase.from('players').update({ paid: !p.paid }).eq('id', p.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${p.paid ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {p.paid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div>
                        <p className={`font-black ${p.paid ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">เล่น {p.gamesPlayed} เกม | {p.shuttlesInvolved} ลูก</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="font-black text-indigo-600 text-[18px]">฿{calculateFee(p)}</span>
                       <button onClick={() => deletePlayer(p.id)} className="p-2 text-rose-100 hover:text-rose-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB: SETTINGS (ตั้งค่า) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 ml-2 uppercase">ชื่อก๊วน</label>
                    <input value={settings.game_rule_name} onChange={(e)=>setSettings({...settings, game_rule_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1 outline-none focus:ring-2 ring-pink-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-400 ml-2 uppercase">ค่าเข้า (฿)</label>
                      <input type="number" value={settings.fixed_entry_fee} onChange={(e)=>setSettings({...settings, fixed_entry_fee: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 ml-2 uppercase">ลูกแบด (฿)</label>
                      <input type="number" value={settings.shuttle_price} onChange={(e)=>setSettings({...settings, shuttle_price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <label className="text-xs font-black text-indigo-400 ml-2 uppercase">ข้อมูลรับโอน</label>
                    <input placeholder="ธนาคาร" value={settings.bank_name} onChange={(e)=>setSettings({...settings, bank_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" />
                    <input placeholder="เลขบัญชี" value={settings.account_number} onChange={(e)=>setSettings({...settings, account_number: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" />
                    <input placeholder="ชื่อบัญชี" value={settings.account_name} onChange={(e)=>setSettings({...settings, account_name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" />
                  </div>
                </div>
                <button 
                  onClick={async () => { await supabase.from('settings').update(settings).eq('id', 1); alert('บันทึกสำเร็จ!'); }}
                  className="w-full py-4 bg-pink-500 text-white rounded-2xl font-black shadow-lg shadow-pink-100"
                >
                  บันทึกข้อมูล
                </button>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-pink-50 px-10 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-2xl">
        {[
          { id: 'home', label: 'สนาม', icon: <Home size={22} /> },
          { id: 'dashboard', label: 'การเงิน', icon: <Wallet size={22} /> },
          { id: 'settings', label: 'ตั้งค่า', icon: <SettingsIcon size={22} /> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === tab.id ? 'scale-110 text-pink-500' : 'text-slate-300 opacity-60'}`}
          >
            {tab.icon}
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl">
            <h3 className="text-[20px] font-black mb-6 text-indigo-600 uppercase">ใช้ลูกแบดกี่ลูก? 🏸</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} className="py-5 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-2xl font-black text-2xl transition-all">{n}</button>
              ))}
            </div>
            <button onClick={() => setShuttleModal({show:false, courtId:null, winner:null})} className="text-slate-300 font-bold text-xs uppercase">ยกเลิก</button>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-pink-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl">
            <h3 className="text-xl font-black mb-2 text-slate-700">เพิ่มคุณ {confirmModal.name}?</h3>
            <p className="text-slate-400 font-bold mb-8 text-sm">ยินดีต้อนรับเข้าก๊วนจ้า!</p>
            <button onClick={handleAddPlayer} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg">ยืนยัน</button>
            <button onClick={() => setConfirmModal({show:false, name:''})} className="mt-4 text-slate-300 font-bold text-xs uppercase">ยกเลิก</button>
          </div>
        </div>
      )}

      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl">
            <h3 className="text-[20px] font-black mb-2 text-slate-800">{alertModal.title}</h3>
            <p className="text-slate-400 font-bold mb-8 text-[14px]">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ ...alertModal, show: false })} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black">ตกลงจ้า ❤️</button>
          </div>
        </div>
      )}
    </div>
  );
}




































