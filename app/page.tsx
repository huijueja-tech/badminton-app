"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Save, Trophy, LayoutDashboard, Settings as SettingsIcon, 
  Home, Search, CheckCircle2, Circle, QrCode, Users, TrendingUp, Wallet, 
  Clock, Edit3, Trash, AlertCircle, Star, Award, UserCheck, ChevronRight, Copy, Share2, 
  UserPlus, History, BarChart3, RefreshCw, XCircle
} from 'lucide-react';

// --- CONFIG SUPABASE ---
const supabaseUrl = 'https://bpyudijkydvpdbwzflgl.supabase.co';
const supabaseKey = 'sb_publishable_sidEH7PMpoZ0i_eLjlGEPg_UnpIFTAj';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BadmintonUltimatePro() {
  // --- [1] STATES ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [courts, setCourts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, name: '' });
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });

  // Settings (ตาราง settings ID: 1)
  const [settings, setSettings] = useState({
    id: 1,
    game_rule_name: 'ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸',
    fixed_entry_fee: 90,
    shuttle_price: 20,
    bank_name: 'ธนาคารกสิกรไทย',
    account_number: '000-0-0000-000',
    account_name: 'ระบุชื่อบัญชี',
    calc_model: 'case1' // case1: fee + shuttle, case2: fixed
  });

  // --- [2] FETCH & REALTIME ---
  const fetchData = async () => {
    try {
      // 1. ดึงข้อมูลผู้เล่น
      const { data: p, error: pErr } = await supabase.from('players').select('*').order('points', { ascending: false });
      if (p) setPlayers(p);
      
      // 2. ดึงข้อมูลสนาม
      const { data: c, error: cErr } = await supabase.from('courts').select('*').order('name', { ascending: true });
      if (c) setCourts(c);
      
      // 3. ดึงค่า Settings
      const { data: s, error: sErr } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (s) setSettings(s);

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Subscribe Real-time ทั้ง 3 ตาราง
    const channel = supabase.channel('pro-badminton-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- [3] LOGIC FUNCTIONS ---
  
  // คำนวณค่าใช้จ่ายรายคน
  const calculateFee = (p) => {
    if (settings.calc_model === 'case2') return settings.fixed_entry_fee;
    return (settings.fixed_entry_fee || 0) + ((p.shuttlesInvolved || 0) * (settings.shuttle_price || 0));
  };

  // เพิ่มผู้เล่นใหม่
  const handleAddPlayer = async () => {
    if (!playerName.trim()) return;
    const { error } = await supabase.from('players').insert([{
      name: playerName.trim(),
      status: 'waiting',
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      shuttlesInvolved: 0,
      paid: false,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName.trim()}`
    }]);
    
    if (error) {
      setAlertModal({ show: true, title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเพิ่มชื่อได้', type: 'error' });
    } else {
      setPlayerName('');
      setConfirmModal({ show: false, name: '' });
    }
  };

  // ลบผู้เล่น
  const deletePlayer = async (id) => {
    if (confirm("ยืนยันการลบสมาชิกออกจากก๊วนวันนี้?")) {
      await supabase.from('players').delete().eq('id', id);
    }
  };

  // สุ่มทีม (Queue System)
  const autoMatch = async (courtId) => {
    // เลือกคนที่มีสถานะ waiting และเล่นน้อยที่สุด (Sort by gamesPlayed)
    const waitingPlayers = players
      .filter(p => p.status === 'waiting')
      .sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0));

    if (waitingPlayers.length < 4) {
      setAlertModal({ show: true, title: 'คนไม่พอจ้า', message: 'ต้องมีสมาชิกสถานะ "รอเล่น" อย่างน้อย 4 ท่าน', type: 'info' });
      return;
    }

    const selected = waitingPlayers.slice(0, 4);
    // สุ่มแบ่งทีม A/B
    const shuffled = [...selected].sort(() => 0.5 - Math.random());
    const teamA = [shuffled[0], shuffled[1]];
    const teamB = [shuffled[2], shuffled[3]];

    // อัปเดตสถานะผู้เล่น
    await supabase.from('players').update({ status: 'playing' }).in('id', selected.map(p => p.id));
    
    // อัปเดตสนาม
    await supabase.from('courts').update({
      status: 'busy',
      teamA: teamA,
      teamB: teamB,
      start_time: new Date().toLocaleTimeString('th-TH')
    }).eq('id', courtId);
  };

  // จบเกมและบันทึกผล
  const finalizeMatch = async (courtId, winner, numShuttles) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const allParticipants = [...court.teamA, ...court.teamB];

    for (const p of allParticipants) {
      const isTeamA = court.teamA.some(m => m.id === p.id);
      const isWinner = (winner === 'A' && isTeamA) || (winner === 'B' && !isTeamA);
      
      // สูตรคะแนน: ชนะ +10, แพ้ +2 (สะสมเป็นเวล)
      const pointAdd = isWinner ? 10 : 2;

      await supabase.from('players').update({
        status: 'waiting',
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        wins: isWinner ? (p.wins || 0) + 1 : (p.wins || 0),
        points: (p.points || 0) + pointAdd,
        shuttlesInvolved: (p.shuttlesInvolved || 0) + numShuttles
      }).eq('id', p.id);
    }

    // รีเซ็ตสนาม
    await supabase.from('courts').update({
      status: 'available',
      teamA: [],
      teamB: [],
      start_time: null
    }).eq('id', courtId);

    setShuttleModal({ show: false, courtId: null, winner: null });
  };

  // ก๊อปปี้สรุปยอดเข้า Line
  const copyToLine = () => {
    const unpaid = players.filter(p => !p.paid);
    const summaryHeader = `🏸 สรุปยอดค่าแบด: ${settings.game_rule_name}\nประจำวันที่: ${new Date().toLocaleDateString('th-TH')}\n------------------\n`;
    const summaryList = players.map(p => `${p.paid ? '✅' : '🔴'} ${p.name}: ${calculateFee(p)} บ.`).join('\n');
    const summaryFooter = `\n------------------\n💰 โอนที่: ${settings.bank_name}\nเลขบัญชี: ${settings.account_number}\nชื่อ: ${settings.account_name}\nขอบคุณทุกท่านที่มาสนุกกันครับ! 🙏`;
    
    navigator.clipboard.writeText(summaryHeader + summaryList + summaryFooter);
    setAlertModal({ show: true, title: 'คัดลอกสำเร็จ!', message: 'ข้อมูลสรุปยอดอยู่ใน Clipboard แล้ว', type: 'success' });
  };

  // --- [4] RENDER SUB-COMPONENTS ---
  
  const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-xl font-black text-slate-700">{value}</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
      <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black text-pink-500 animate-pulse uppercase tracking-widest">กำลังเชื่อมต่อข้อมูลก๊วนเสน่ห์...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-32 text-slate-700 select-none" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER: แบบไฟล์ page_local_storage */}
      <header className="bg-white/90 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-pink-200">🏸</div>
          <div>
            <h1 className="text-[20px] font-black text-pink-500 leading-none">{settings.game_rule_name}</h1>
            <p className="text-[12px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">🏸 สถานะ: ออนไลน์ (สมาชิก {players.length} คน)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchData()} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:rotate-180 transition-all">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* --- TAB: HOME (หน้าสนาม) --- */}
        {activeTab === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* กล่องเพิ่มชื่อ */}
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input 
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && setConfirmModal({ show: true, name: playerName.trim() })}
                    placeholder="ใส่ชื่อเล่นคนเก่ง..." 
                    className="w-full p-4 bg-pink-50/30 rounded-2xl outline-none font-bold text-pink-600 placeholder:text-pink-200 border-2 border-transparent focus:border-pink-200 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300"><UserPlus size={20} /></div>
                </div>
                <button 
                  onClick={() => setConfirmModal({ show: true, name: playerName.trim() })}
                  disabled={!playerName.trim()}
                  className="bg-pink-500 text-white px-6 rounded-2xl font-black shadow-lg shadow-pink-100 active:scale-95 disabled:opacity-30 transition-all"
                >
                  <PlusCircle size={24} />
                </button>
              </div>
            </section>

            {/* รายการสนาม */}
            {courts.map((court, idx) => (
              <div key={court.id} className="bg-white p-6 rounded-[3rem] shadow-sm border border-indigo-50 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center font-black">
                      {idx + 1}
                    </div>
                    <span className="text-[18px] font-black text-slate-700 uppercase">คอร์ด # {court.name}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black ${court.status === 'busy' ? 'bg-orange-100 text-orange-500 animate-pulse' : 'bg-emerald-100 text-emerald-500'}`}>
                    {court.status === 'busy' ? (
                      <><Clock size={12} /> กำลังแข่ง ({court.start_time})</>
                    ) : (
                      <><CheckCircle2 size={12} /> สนามว่าง</>
                    )}
                  </div>
                </div>

                {court.status === 'busy' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <div className="flex-1 bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-[1.8rem] text-center shadow-md">
                          <p className="text-[10px] text-white/70 font-bold uppercase mb-1">TEAM A</p>
                          <p className="text-white font-black truncate">{court.teamA.map(p => p.name).join(' & ')}</p>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 z-10 shadow-inner">VS</div>
                       <div className="flex-1 bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-[1.8rem] text-center shadow-md">
                          <p className="text-[10px] text-white/70 font-bold uppercase mb-1">TEAM B</p>
                          <p className="text-white font-black truncate">{court.teamB.map(p => p.name).join(' & ')}</p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'A' })} className="flex-1 bg-white border-2 border-indigo-500 text-indigo-500 py-3 rounded-2xl font-black text-sm hover:bg-indigo-500 hover:text-white transition-all shadow-sm">A ชนะ</button>
                      <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'B' })} className="flex-1 bg-white border-2 border-pink-500 text-pink-500 py-3 rounded-2xl font-black text-sm hover:bg-pink-500 hover:text-white transition-all shadow-sm">B ชนะ</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => autoMatch(court.id)}
                    className="w-full py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 font-black hover:bg-indigo-50/30 hover:border-indigo-200 hover:text-indigo-400 transition-all flex flex-col items-center gap-2"
                  >
                    <Users size={32} />
                    <span>กดเพื่อเรียกคิวลงสนาม</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- TAB: LEADERBOARD (อันดับ) --- */}
        {activeTab === 'leaderboard' && (
           <div className="animate-in fade-in duration-500 space-y-4">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                 <Trophy className="absolute right-[-10px] bottom-[-10px] opacity-20 rotate-12" size={120} />
                 <p className="text-[12px] opacity-70 font-black uppercase tracking-widest mb-1">MVP OF THE DAY</p>
                 <h2 className="text-3xl font-black">{players[0]?.name || 'ยังไม่มีข้อมูล'}</h2>
                 <p className="text-[14px] mt-2 bg-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-sm">สะสมไปแล้ว {players[0]?.points || 0} แต้ม</p>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
                {players.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="p-5 flex justify-between items-center border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[12px] ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-50 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-black text-slate-700">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">ชนะ {p.wins} / ทั้งหมด {p.gamesPlayed} เกม</p>
                      </div>
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

        {/* --- TAB: FINANCE (การเงิน) --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-200">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[12px] opacity-70 font-black uppercase tracking-widest mb-1">ยอดรวมวันนี้</p>
                    <h2 className="text-5xl font-black">฿{players.reduce((sum, p) => sum + calculateFee(p), 0).toLocaleString()}</h2>
                  </div>
                  <div className="bg-white/10 p-3 rounded-2xl">
                    <Wallet size={24} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3 mt-8">
                 <button onClick={copyToLine} className="bg-white/20 hover:bg-white/30 p-4 rounded-[1.5rem] text-[12px] font-black flex items-center justify-center gap-2 transition-all">
                    <Share2 size={16} /> ก๊อปปี้ส่ง Line
                 </button>
                 <button className="bg-white text-indigo-600 p-4 rounded-[1.5rem] text-[12px] font-black flex items-center justify-center gap-2 shadow-lg">
                    <QrCode size={16} /> QR รับเงิน
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <StatsCard title="จ่ายแล้ว" value={players.filter(p => p.paid).length} icon={CheckCircle2} color="bg-emerald-500" />
               <StatsCard title="ยังไม่จ่าย" value={players.filter(p => !p.paid).length} icon={AlertCircle} color="bg-rose-500" />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
               <div className="p-4 border-b border-slate-50">
                  <div className="relative">
                    <input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ค้นชื่อเพื่อน..." 
                      className="w-full p-3 pl-10 bg-slate-50 rounded-xl text-sm font-bold border-none"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  </div>
               </div>
               {players.filter(p => p.name.includes(searchQuery)).map(p => (
                 <div key={p.id} className="p-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => supabase.from('players').update({ paid: !p.paid }).eq('id', p.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${p.paid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 scale-105' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {p.paid ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div>
                        <p className={`font-black ${p.paid ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">ใช้ลูก {p.shuttlesInvolved} ลูก | {p.paid ? 'จ่ายเรียบร้อย' : 'รอชำระเงิน'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`font-black text-[18px] ${p.paid ? 'text-slate-300' : 'text-indigo-600'}`}>฿{calculateFee(p)}</span>
                       <button onClick={() => deletePlayer(p.id)} className="p-2 text-rose-100 hover:text-rose-500 transition-colors">
                         <Trash2 size={18} />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* --- TAB: SETTINGS (ตั้งค่า) --- */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-500 space-y-6 pb-10">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center"><SettingsIcon size={20} /></div>
                   <h3 className="font-black text-slate-700 text-lg uppercase">ตั้งค่าระบบก๊วน</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">ชื่อก๊วนสุดเท่</label>
                    <input 
                      value={settings.game_rule_name} 
                      onChange={(e) => setSettings({...settings, game_rule_name: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1 border-none focus:ring-2 ring-pink-500/20 outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">ค่าเข้า (฿)</label>
                      <input 
                        type="number"
                        value={settings.fixed_entry_fee} 
                        onChange={(e) => setSettings({...settings, fixed_entry_fee: Number(e.target.value)})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">ค่าลูกแบด (฿)</label>
                      <input 
                        type="number"
                        value={settings.shuttle_price} 
                        onChange={(e) => setSettings({...settings, shuttle_price: Number(e.target.value)})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1" 
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-50">
                    <p className="text-[10px] font-black text-indigo-400 ml-2 uppercase tracking-widest mb-3">ข้อมูลสำหรับรับโอน</p>
                    <input 
                      placeholder="ชื่อธนาคาร"
                      value={settings.bank_name} 
                      onChange={(e) => setSettings({...settings, bank_name: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" 
                    />
                    <input 
                      placeholder="เลขที่บัญชี"
                      value={settings.account_number} 
                      onChange={(e) => setSettings({...settings, account_number: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" 
                    />
                    <input 
                      placeholder="ชื่อบัญชี (Account Name)"
                      value={settings.account_name} 
                      onChange={(e) => setSettings({...settings, account_name: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-2 border-none" 
                    />
                  </div>
                </div>
                
                <button 
                  onClick={async () => {
                    const { error } = await supabase.from('settings').update(settings).eq('id', 1);
                    if (!error) setAlertModal({ show: true, title: 'บันทึกเรียบร้อย!', message: 'ข้อมูลก๊วนอัปเดตเข้าระบบ Cloud แล้วจ้า', type: 'success' });
                  }}
                  className="w-full py-5 bg-pink-500 text-white rounded-[2rem] font-black shadow-xl shadow-pink-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} /> บันทึกการตั้งค่า
                </button>

                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mt-4">
                  <p className="text-[11px] text-orange-600 font-bold leading-relaxed">
                    * ข้อมูลเหล่านี้จะถูกบันทึกลงในฐานข้อมูลหลัก และจะมีผลกับแอปฯ ของสมาชิกทุกคนทันที
                  </p>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* --- FOOTER NAV --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-pink-50 px-8 py-4 flex justify-between items-center z-50 rounded-t-[3rem] shadow-[0_-10px_50px_rgba(0,0,0,0.06)]">
        {[
          { id: 'home', label: 'สนาม', icon: <Home size={22} /> },
          { id: 'leaderboard', label: 'อันดับ', icon: <Trophy size={22} /> },
          { id: 'dashboard', label: 'การเงิน', icon: <Wallet size={22} /> },
          { id: 'settings', label: 'ตั้งค่า', icon: <SettingsIcon size={22} /> }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === tab.id ? 'scale-110 text-pink-500' : 'text-slate-300 opacity-60 hover:opacity-100'}`}
          >
            <div className={`p-2 rounded-2xl ${activeTab === tab.id ? 'bg-pink-50' : 'bg-transparent'}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* --- MODALS --- */}

      {/* Modal: เลือกจำนวนลูกแบดเมื่อจบเกม */}
      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 text-center shadow-2xl border-b-[10px] border-indigo-500">
            <h3 className="text-[20px] font-black mb-2 text-indigo-600 uppercase">จบแมตช์แล้วจ้า! 🏸</h3>
            <p className="text-slate-400 font-bold mb-6 text-[14px]">แมตช์นี้ใช้ลูกแบดไปทั้งหมดกี่ลูกเอ่ย?</p>
            <div className="grid grid-cols-3 gap-3 my-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button 
                  key={n} 
                  onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} 
                  className="py-6 bg-slate-50 hover:bg-indigo-500 hover:text-white rounded-[1.8rem] font-black text-2xl transition-all active:scale-90 border-2 border-transparent hover:shadow-lg"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => setShuttleModal({show:false, courtId:null, winner:null})} className="text-slate-300 font-bold text-xs uppercase tracking-widest hover:text-slate-500">ยกเลิกการบันทึก</button>
          </div>
        </div>
      )}

      {/* Modal: ยืนยันการเพิ่มสมาชิก */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-pink-900/10 backdrop-blur-sm animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-t-[10px] border-pink-500">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserPlus className="text-pink-500" size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-700">ยินดีต้อนรับคุณ {confirmModal.name}</h3>
            <p className="text-slate-400 font-bold mb-8 text-sm leading-relaxed">ต้องการเพิ่มรายชื่อเข้าสู่ก๊วนในวันนี้ใช่หรือไม่?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleAddPlayer} 
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
              >
                ใช่แล้ว เพิ่มเลย!
              </button>
              <button 
                onClick={() => setConfirmModal({show:false, name:''})} 
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                ขอเช็กอีกที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: แจ้งเตือน (Alert) */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl overflow-hidden relative">
            <div className={`h-2 w-full absolute top-0 left-0 ${alertModal.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
            <h3 className="text-[22px] font-black mb-2 text-slate-800 mt-4">{alertModal.title}</h3>
            <p className="text-slate-400 font-bold mb-8 text-[15px] leading-relaxed px-4">{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal({ ...alertModal, show: false })} 
              className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
            >
              รับทราบจ้า ❤️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}>
          </div>
        </div>
      )}
    </div>
  );
}



































