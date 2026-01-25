"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, Trash2, Save, Trophy, LayoutDashboard, Settings as SettingsIcon, 
  Home, Search, CheckCircle2, Circle, QrCode, Users, TrendingUp, Wallet, 
  Clock, Edit3, Trash, AlertCircle, Star, Award, UserCheck, ChevronRight
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
  const [newCourtNumber, setNewCourtNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, name: '' });
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });
  
  // เพิ่ม State สำหรับเวลา
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // กำลังจบเกมที่สนามไหน
  const [selectedCourtForEnd, setSelectedCourtForEnd] = useState(null);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);

  // --- [2] ADMIN & RULES STATES ---
  const [gameRuleName, setGameRuleName] = useState('ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸');
  const [maxMembers, setMaxMembers] = useState(30);
  const [calcModel, setCalcModel] = useState('case1'); 
  const [gameFormat, setGameFormat] = useState('2sets'); 
  const [fixedEntryFee, setFixedEntryFee] = useState(90); 
  const [shuttlePrice, setShuttlePrice] = useState(20);
  const [fixedPricePerPerson, setFixedPricePerPerson] = useState(200); 
  const [totalCourtCost, setTotalCourtCost] = useState(0); 
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย');
  const [accountNumber, setAccountNumber] = useState('000-0-0000-000');
  const [accountName, setAccountName] = useState('ระบุชื่อบัญชี'); 
  const [bankQRImage, setBankQRImage] = useState(null); 
  const fileInputRef = useRef(null);

  // --- [3] FETCH & REALTIME ---
  const fetchOnlineData = async () => {
    try {
      const { data: p, error: pErr } = await supabase.from('players').select('*').order('created_at', { ascending: true }); //เรียงลำดับผู้เล่น
      if (p) setPlayers(p);
      
      const { data: c, error: cErr } = await supabase.from('courts').select('*').order('name', { ascending: true });
      if (c) setCourts(c);
      
      const { data: s, error: sErr } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (s) {
        setGameRuleName(s.game_rule_name || 'ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸');
        setMaxMembers(s.max_members || 30);
        setCalcModel(s.calc_model || 'case1');
        setGameFormat(s.game_format || '2sets');
        setBankName(s.bank_name || '');
        setAccountNumber(s.account_number || '');
        setAccountName(s.account_name || '');
        setBankQRImage(s.bank_qr_image || null);
        setFixedEntryFee(s.fixed_entry_fee || 0);
        setShuttlePrice(s.shuttle_price || 0);
        setFixedPricePerPerson(s.fixed_price_per_person || 0);
        setTotalCourtCost(s.total_court_cost || 0);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // โหลด Font Mali
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    fetchOnlineData();

    // เปิด Realtime Channel
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        fetchOnlineData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- [4] LOGIC FUNCTIONS ---
  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    if (players.length >= maxMembers) {
      setAlertModal({ 
        show: true, 
        title: 'ก๊วนอบอุ่นจนเต็มแล้วจ้า! 🏠', 
        message: `ตอนนี้เพื่อนๆ มาจอยกันครบ ${maxMembers} คนแล้วจ้ะ ไว้โอกาสหน้านะคะ`, 
        type: 'info' 
      });
      return;
    }
    setConfirmModal({ show: true, name: playerName.trim() });
  };

  const confirmAddPlayer = async () => {
    const newP = {
      name: confirmModal.name,
      gamesPlayed: 0,
      wins: 0,
      points: 0,
      status: 'waiting',
      shuttlesInvolved: 0,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${confirmModal.name + Date.now()}`,
      paid: false
    };
    const { error } = await supabase.from('players').insert([newP]);
    if (error) alert(error.message);
    setPlayerName('');
    setConfirmModal({ show: false, name: '' });
  };

  const handleDeletePlayer = async (id) => {
    if (confirm('แน่ใจไหมจ๊ะว่าจะลบเพื่อนคนนี้ออก?')) {
      await supabase.from('players').delete().eq('id', id);
    }
  };

  const handleMatchMaking = async (courtId) => {
    const waitingPlayers = players
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.gamesPlayed - b.gamesPlayed);

    if (waitingPlayers.length < 4) {
      setAlertModal({ 
        show: true, 
        title: 'คนไม่พอจ้าาา 🏸', 
        message: 'ต้องการนักกีฬาอย่างน้อย 4 คน เพื่อจัดทีมลงสนามนะจ๊ะ', 
        type: 'info' 
      });
      return;
    }

    const selected = waitingPlayers.slice(0, 4).sort(() => Math.random() - 0.5);
    const startTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    await supabase.from('players').update({ status: 'playing' }).in('id', selected.map(p => p.id));
    await supabase.from('courts').update({
      status: 'busy',
      teamA: selected.slice(0, 2),
      teamB: selected.slice(2, 4),
      start_time: startTime
    }).eq('id', courtId);
  };

  const finalizeMatch = async (courtId, winner, numShuttles) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const allParticipants = [...court.teamA, ...court.teamB];

    for (const p of allParticipants) {
      const isTeamA = court.teamA.some(m => m.id === p.id);
      const isWinner = (winner === 'A' && isTeamA) || (winner === 'B' && !isTeamA);
      const pts = winner === 'Draw' ? 5 : (isWinner ? 10 : 2);

      await supabase.from('players').update({
        status: 'waiting',
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        wins: isWinner ? (p.wins || 0) + 1 : (p.wins || 0),
        points: (p.points || 0) + pts,
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

  const calculateFee = (p) => {
    if (calcModel === 'case1') return fixedEntryFee + (p.shuttlesInvolved * shuttlePrice);
    if (calcModel === 'case2') return fixedPricePerPerson;
    if (calcModel === 'case3') {
      const totalShuttles = players.reduce((sum, pl) => sum + pl.shuttlesInvolved, 0) / 4;
      const totalCost = totalCourtCost + (totalShuttles * shuttlePrice);
      return players.length > 0 ? Math.ceil(totalCost / players.length) : 0;
    }
    return 0;
  };

  const saveSettings = async () => {
    const { error } = await supabase.from('settings').update({
      game_rule_name: gameRuleName,
      max_members: maxMembers,
      calc_model: calcModel,
      game_format: gameFormat,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      bank_qr_image: bankQRImage,
      fixed_entry_fee: fixedEntryFee,
      shuttle_price: shuttlePrice,
      fixed_price_per_person: fixedPricePerPerson,
      total_court_cost: totalCourtCost
    }).eq('id', 1);

    if (error) alert(error.message);
    else alert('บันทึกข้อมูลเรียบร้อยแล้วจ้า! 💖');
  };

  const copyLineSummary = () => {
  const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' });
  let text = `🏸 *** สรุปยอดก๊วนเสน่ห์ (${dateStr}) *** 🏸\n`;
  text += `------------------------------\n`;
  
  players.forEach((p, i) => {
    const fee = calculateFee(p);
    const status = p.paid ? (p.pay_type === 'cash' ? '✅ [เงินสด]' : '✅ [โอน]') : '⏳ [ยังไม่จ่าย]';
    text += `${i + 1}. ${p.name}: ${fee}.- ${status}\n`;
  });

  const total = players.reduce((sum, p) => sum + calculateFee(p), 0);
  text += `------------------------------\n`;
  text += `💰 รวมยอดทั้งหมด: ${total} บาท\n`;
  text += `🏦 ${bankName}\n`;
  text += `💳 ${accountNumber}\n`;
  text += `👤 ${accountName}\n`;
  text += `------------------------------\n`;
  text += `ขอบคุณเพื่อนๆ ทุกคนมากจ้า! 🙏✨`;

  navigator.clipboard.writeText(text);
  setAlertModal({ show: true, title: 'คัดลอกสำเร็จ! ✅', message: 'สรุปยอดถูกก๊อปปี้ลงเครื่องแล้ว นำไปวางในกลุ่ม Line ได้เลยจ้า', type: 'success' });
};
  
  // ฟังก์ชันแปลงวันที่เป็นภาษาไทย
  const formatThaiDate = (date) => {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const dayName = days[date.getDay()];
  const dateStr = date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const timeStr = date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `วัน${dayName} ที่ ${dateStr} เวลา ${timeStr} น.`;
};
  // สร้างฟังก์ชันล้างข้อมูลพร้อมบันทึกสถิติ
  const handleResetDay = async () => {
  if (!confirm('ยืนยันปิดยอดก๊วน? ระบบจะบันทึกสถิติและล้างรายชื่อผู้เล่น')) return;
  setLoading(true);

  try {
    // 1. บันทึกสถิติลงตารางตลอดกาล
    for (const p of players) {
      const { data: existingStat } = await supabase
        .from('player_stats')
        .select('*')
        .eq('name', p.name)
        .single();

      if (existingStat) {
        await supabase.from('player_stats').update({
          total_games: (existingStat.total_games || 0) + (p.gamesPlayed || 0),
          total_wins: (existingStat.total_wins || 0) + (p.wins || 0),
          total_points: (existingStat.total_points || 0) + (p.points || 0)
        }).eq('name', p.name);
      } else {
        await supabase.from('player_stats').insert([{
          name: p.name,
          total_games: p.gamesPlayed,
          total_wins: p.wins,
          total_points: p.points
        }]);
      }
    }

    // 2. ล้างข้อมูลรายวัน
    await supabase.from('players').delete().neq('id', 0);
    
    // 3. รีเซ็ตสนามทั้งหมด
    await supabase.from('courts').update({
      status: 'available',
      teamA: [],
      teamB: [],
      start_time: null
    }).neq('id', 0);

    alert('บันทึกสถิติและล้างข้อมูลเรียบร้อยแล้วจ้า! 🏸');
    await fetchOnlineData(); // รีเฟรชหน้าจอ
    
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
  } finally {
    setLoading(false);
  }
};
  
  const filteredPlayers = useMemo(() => {
    return players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [players, searchQuery]);

  // 💻 โค้ดฟังก์ชัน confirmEndMatch
  const confirmEndMatch = async (shuttles) => {
  if (!selectedCourtForEnd) return;
  setLoading(true); // ป้องกันการกดซ้ำ

  try {
    // ดึงรายชื่อผู้เล่นทั้งหมดจากสนามที่กำลังจะจบเกม
    const court = selectedCourtForEnd;
    // รวมผู้เล่นจากทั้งสองทีม โดยดึงเอา Object ผู้เล่นออกมา
    const allParticipants = [...(court.teamA || []), ...(court.teamB || [])];

    for (const playerObj of allParticipants) {
      // ดึงข้อมูลเดิมด้วย name จาก Object
      const { data: pData } = await supabase
        .from('players')
        .select('gamesPlayed, shuttlesInvolved')
        .eq('name', playerObj.name) 
        .single();

      if (pData) {
        await supabase.from('players').update({
          gamesPlayed: (pData.gamesPlayed || 0) + 1,
          shuttlesInvolved: (pData.shuttlesInvolved || 0) + shuttles,
          status: 'waiting'
        }).eq('name', playerObj.name);
      }
    }

    // รีเซ็ตสนาม
    await supabase.from('courts').update({
      status: 'available',
      teamA: [],
      teamB: [],
      start_time: null
    }).eq('id', court.id);

    setShowEndMatchModal(false);
    setSelectedCourtForEnd(null);
    
    // สำคัญ: ต้องเรียกฟังก์ชันนี้เพื่อให้หน้าจออัปเดต
    await fetchOnlineData(); 
    
    setAlertModal({ 
      show: true, 
      title: 'จบเกมเรียบร้อย! 🏸', 
      message: `บันทึกสถิติและใช้แบดไป ${shuttles} ลูกจ้า`, 
      type: 'success' 
    });

    } catch (error) {
      console.error('Error ending match:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // --- [5] RENDER UI ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white text-pink-500 font-bold" style={{fontFamily: "'Mali', cursive"}}>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-bounce text-4xl">🏸</div>
        <p>กำลังเตรียมความพร้อมให้ก๊วนแบด...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 text-slate-700" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER */}
      <header className="bg-white/95 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-500 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-pink-100">🏸</div>
          <div>
            <h1 className="text-[18px] font-bold text-pink-500 leading-none">{gameRuleName}</h1>
            {/* บรรทัดวันที่/เวลาที่เพิ่มใหม่ */}
            <p className="text-[11px] text-pink-300 font-bold mt-0.5">
            {formatThaiDate(currentTime)}
            </p>  
            {/* บรรทัดสมาชิก */}
            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">
            สมาชิกวันนี้ {players.length} / {maxMembers} คน
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[12px] font-black bg-indigo-50 text-indigo-400 px-3 py-1 rounded-full uppercase mb-1">
            {calcModel === 'case1' ? 'Actual Shuttle' : 'Fixed Price'}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-slate-300">CLOUD SYNCED</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* --- HOME TAB --- */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* ส่วนเพิ่มสมาชิก */}
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Star className="text-pink-400 fill-pink-400" size={16} />
                <h3 className="font-bold text-slate-500 text-[14px]">ต้อนรับนักแบดมือโปรคนใหม่</h3>
              </div>
              <div className="flex flex-col gap-3">
                <input 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)} 
                  placeholder="พิมพ์ชื่อเล่นคนเก่งตรงนี้จ้ะ..." 
                  className="w-full p-4 bg-pink-50/50 rounded-2xl outline-none font-bold text-[16px] text-pink-600 placeholder:text-pink-200 border-2 border-transparent focus:border-pink-100 transition-all"
                />
                <button 
                  onClick={handleAddPlayer} 
                  className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black text-[18px] shadow-lg shadow-pink-100 active:scale-95 transition-all"
                >
                  มาจอยกันเลย!
                </button>
              </div>
            </section>

            {/* ส่วนสถานะสนาม */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center px-4">
                <h3 className="font-bold text-slate-400 text-[12px] uppercase tracking-widest">ความเคลื่อนไหวในสนาม</h3>
                <div className="flex gap-2 text-[12px] font-bold">
                   <span className="text-emerald-500">ว่าง {courts.filter(c=>c.status==='available').length}</span>
                   <span className="text-orange-500">แข่ง {courts.filter(c=>c.status==='busy').length}</span>
                </div>
              </div>

              {courts.map(court => (
                <div key={court.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${court.status === 'busy' ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                      <span className="text-indigo-500 font-black text-[16px] uppercase"> คอร์ด # {court.name}</span>
                    </div>
                    {court.status === 'busy' && (
                      <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full">
                        <Clock size={12} className="text-indigo-400" />
                        <span className="text-indigo-500 font-bold text-[11px]">{court.start_time}</span>
                      </div>
                    )}
                  </div>

                  {court.status === 'busy' ? (
                    <div className="space-y-4">
                       <div className="flex justify-around items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100 relative">
                          <div className="text-center flex-1">
                             <div className="space-y-1 mb-3">
                                {court.teamA?.map(p => <p key={p.id} className="font-bold text-slate-700 text-[16px]">{p.name}</p>)}
                             </div>
                             <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'A' })} className="bg-emerald-500 text-white px-5 py-1.5 rounded-full text-[12px] font-bold shadow-md shadow-emerald-50 active:scale-90">TEAM A ชนะ</button>
                          </div>
                          <div className="px-4 font-black text-slate-200 italic text-[18px]">VS</div>
                          <div className="text-center flex-1">
                             <div className="space-y-1 mb-3">
                                {court.teamB?.map(p => <p key={p.id} className="font-bold text-slate-700 text-[16px]">{p.name}</p>)}
                             </div>
                             <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'B' })} className="bg-emerald-500 text-white px-5 py-1.5 rounded-full text-[12px] font-bold shadow-md shadow-emerald-50 active:scale-90">TEAM B ชนะ</button>
                          </div>
                       </div>
                       <button onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'Draw' })} className="w-full py-3 bg-white border-2 border-slate-50 text-slate-300 rounded-2xl text-[12px] font-bold hover:bg-slate-50">เสมอ (1-1 เซต)</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleMatchMaking(court.id)} 
                      className="w-full py-12 border-2 border-dashed border-indigo-100 rounded-[2.5rem] flex flex-col items-center gap-2 group-hover:bg-indigo-50 transition-all active:scale-95"
                    >
                      <span className="text-4xl">🏸</span>
                      <span className="text-indigo-300 font-black text-[16px]">จัดทีมลงสนาม</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
            
        {/* 1. ส่วนบัตรธนาคารและสรุปยอด (Classic Version) */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[12px] font-bold opacity-70 mb-1 uppercase tracking-[0.2em]">{bankName}</p>
              <p className="text-[26px] font-black tracking-widest leading-none mb-1">{accountNumber}</p>
              <p className="text-[14px] font-bold opacity-80 mb-6">{accountName}</p>
      
        {/* สรุปยอดคนจ่าย/ค้างจ่าย (Classic UI) */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-[14px] font-bold opacity-60 uppercase">จ่ายแล้ว</p>
              <p className="text-[18px] font-black">{players.filter(p => p.paid).length} <span className="text-[14px] opacity-60">คน</span></p>
            </div>
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-[14px] font-bold opacity-60 uppercase text-rose-200">ค้างชำระ</p>
              <p className="text-[18px] font-black text-rose-300">{players.filter(p => !p.paid).length} <span className="text-[14px] opacity-60">คน</span></p>
            </div>
              </div>

        {/* ยอดเงินรวมทั้งหมด */}
              <div className="mb-6 text-center">
                <p className="text-[14px] font-bold opacity-60 uppercase tracking-widest mb-1">ยอดเงินรวมทั้งหมด</p>
                <p className="text-[32px] font-black leading-none italic">
                  ฿{players.reduce((sum, p) => sum + (calculateFee(p) || 0), 0).toLocaleString()}
                </p>
              </div>
    
    <div className="flex gap-3">
      <button 
        onClick={copyLineSummary}
        className="flex-1 py-3 bg-white text-indigo-600 rounded-2xl flex items-center justify-center gap-2 font-black text-[14px] shadow-lg active:scale-95 transition-all"
      >
        📋 คัดลอกสรุปยอด (Line)
      </button>
    </div>
  </div>
  
  <div className="absolute -right-10 -bottom-10 opacity-10">
     <QrCode size={180} />
  </div>
</div>

{/* 2. QR Code (ถ้ามี) */}
{bankQRImage && (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 text-center animate-in zoom-in duration-300">
     <img src={bankQRImage} alt="QR" className="mx-auto w-44 h-44 rounded-3xl border-4 border-slate-50" />
     <p className="mt-3 text-[11px] font-bold text-slate-300 uppercase tracking-widest">สแกนเพื่อจ่ายเงิน</p>
  </div>
)}
        
            {/* 3. รายชื่อผู้เล่นและการจัดการเงิน (ไม่มี Scroll แยก) */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 text-[16px]">ตรวจสอบการชำระเงิน</h3>
                  <span className="text-[11px] font-black text-indigo-400 bg-indigo-50 px-3 py-1 rounded-full">
                    ค้างชำระ: {players.filter(p => !p.paid).length} คน
                  </span>
                </div>
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อเพื่อนเพื่อเช็คยอด..."
                  className="w-full p-4 bg-white rounded-2xl outline-none text-[15px] font-bold text-slate-600 border-2 border-transparent focus:border-indigo-100 shadow-inner transition-all"
                />
              </div>
        
              {/* ส่วนรายชื่อ: แสดงผลยาวลงไปตามจำนวนคน ไม่มีการดัก Scroll ที่นี่ */}
              <div className="divide-y divide-slate-50">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map(p => (
                    <div key={p.id} className={`p-6 flex flex-col gap-4 transition-all ${p.paid ? 'bg-emerald-50/30 opacity-70' : 'bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={p.avatar} className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm" />
                            {p.paid && (
                              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                                <CheckCircle2 size={12} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`font-bold text-[18px] ${p.paid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{p.name}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                              เกม: {p.gamesPlayed} | ชนะ: {p.wins} | แบด: {p.shuttlesInvolved} ลูก
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <p className={`font-black text-[22px] leading-none ${p.paid ? 'text-slate-300' : 'text-indigo-600'}`}>
                            ฿{calculateFee(p).toFixed(0)}
                          </p>
                          {/* ปุ่มลบผู้เล่นรายบุคคล */}
                          <button 
                            onClick={async () => {
                              if(confirm(`ลบ ${p.name} ออกจากรายการวันนี้? (ข้อมูลสถิติวันนี้จะหายไปด้วย)`)) {
                                await supabase.from('players').delete().eq('id', p.id);
                                await fetchOnlineData(); // เพิ่มบรรทัดนี้
                              }
                            }}
                            className="mt-2 text-rose-300 hover:text-rose-500 transition-colors p-1"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
        
                      {/* ปุ่มเลือกประเภทการจ่ายเงิน */}
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={async () => {
                            const nextStatus = !(p.paid && p.pay_type === 'transfer');
                            await supabase.from('players').update({ paid: nextStatus, pay_type: 'transfer' }).eq('id', p.id);
                          }}
                          className={`flex-1 py-3 rounded-2xl text-[12px] font-black border-2 transition-all flex items-center justify-center gap-2 ${p.paid && p.pay_type === 'transfer' ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          <LayoutDashboard size={14} /> {p.paid && p.pay_type === 'transfer' ? 'จ่ายโอนแล้ว' : 'โอนเงิน'}
                        </button>
                        <button 
                          onClick={async () => {
                            const nextStatus = !(p.paid && p.pay_type === 'cash');
                            await supabase.from('players').update({ paid: nextStatus, pay_type: 'cash' }).eq('id', p.id);
                          }}
                          className={`flex-1 py-3 rounded-2xl text-[12px] font-black border-2 transition-all flex items-center justify-center gap-2 ${p.paid && p.pay_type === 'cash' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          <Wallet size={14} /> {p.paid && p.pay_type === 'cash' ? 'จ่ายสดแล้ว' : 'เงินสด'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center text-slate-300 font-bold">
                    <p className="text-4xl mb-2">🔍</p>
                    <p>ไม่พบชื่อเพื่อนที่ค้นหาจ้า</p>
                  </div>
                )}
              </div>
            </div>
        
            {/* 4. ปุ่มล้างข้อมูลท้ายหน้า (Reset Day) */}
            <div className="px-4 pb-12 pt-4">
              <div className="bg-rose-50/50 p-6 rounded-[2.5rem] border-2 border-dashed border-rose-100 text-center space-y-4">
                <div>
                  <p className="text-rose-500 font-black text-[16px]">ปิดยอดก๊วนวันนี้ 🏁</p>
                  <p className="text-rose-300 text-[11px] font-bold">ระบบจะโอนคะแนนไปเก็บที่สถิติตลอดกาลให้จ้า</p>
                </div>
                <button 
                  onClick={handleResetDay}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-[16px] shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} /> ล้างข้อมูลและบันทึกสถิติ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- RANKING TAB --- */}
        {activeTab === 'ranking' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-[3rem] text-white shadow-xl flex items-center gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                   <Award size={36} />
                </div>
                <div>
                  <h2 className="text-[24px] font-black italic">HALL OF FAME</h2>
                  <p className="text-yellow-100 text-[11px] font-bold uppercase tracking-widest">ทำเนียบนักแบดมือทอง</p>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden p-2">
                {players.map((p, i) => (
                  <div key={p.id} className="p-6 flex items-center justify-between border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black border-2 border-white shadow-md ${i===0 ? 'bg-yellow-400 text-white' : i===1 ? 'bg-slate-300 text-white' : i===2 ? 'bg-orange-300 text-white' : 'bg-white text-slate-300'}`}>
                          {i+1}
                        </span>
                        <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-[17px]">{p.name}</p>
                        <p className="text-[12px] font-bold text-emerald-500 uppercase">WIN {p.wins} / PLAY {p.gamesPlayed}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-black text-indigo-600 leading-none">{p.points}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">POINTS</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- ADMIN TAB --- */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700 pb-10">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
                {/* 1. ข้อมูลก๊วน */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Home size={14} /> 1. ข้อมูลบ้านแบด
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-400 ml-4">ชื่อกลุ่ม</label>
                      <input value={gameRuleName} onChange={(e)=>setGameRuleName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-400 ml-4">จำนวนสมาชิกสูงสุด (คน)</label>
                      <input type="number" value={maxMembers} onChange={(e)=>setMaxMembers(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                  </div>
                </div>

                {/* 2. การชำระเงิน */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Wallet size={14} /> 2. ข้อมูลธนาคาร & QR
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <input value={bankName} onChange={(e)=>setBankName(e.target.value)} placeholder="ชื่อธนาคาร" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    <input value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} placeholder="เลขบัญชี" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    <input value={accountName} onChange={(e)=>setAccountName(e.target.value)} placeholder="ชื่อเจ้าของบัญชี" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center gap-2 text-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                       <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                         const file = e.target.files[0];
                         if(file) {
                           const reader = new FileReader();
                           reader.onloadend = () => setBankQRImage(reader.result);
                           reader.readAsDataURL(file);
                         }
                       }} />
                       {bankQRImage ? <img src={bankQRImage} className="w-32 h-32 rounded-xl" /> : <><PlusCircle size={32} /> <span className="text-[12px] font-bold uppercase">อัปโหลด QR Code</span></>}
                    </div>
                  </div>
                </div>

                {/* 3-5. โมเดลราคา */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <TrendingUp size={14} /> 3-5. รูปแบบการหารค่าใช้จ่าย
                  </h4>
                  <div className="space-y-4 px-2">
                    <div className="flex justify-between items-center p-4 bg-indigo-50/50 rounded-2xl">
                      <span className="text-[13px] font-bold text-indigo-600 uppercase">ระบบคิดเงิน</span>
                      <select value={calcModel} onChange={(e)=>setCalcModel(e.target.value)} className="bg-transparent font-black text-indigo-600 outline-none text-right">
                         <option value="case1">ค่าสนาม + ลูกตามจริง</option>
                         <option value="case2">ราคาเหมาจ่าย</option>
                         <option value="case3">หารเฉลี่ยทุกคน</option>
                      </select>
                    </div>
                    {calcModel === 'case1' ? (
                      <div className="grid grid-cols-2 gap-3">
                         <input type="number" value={fixedEntryFee} onChange={(e)=>setFixedEntryFee(Number(e.target.value))} placeholder="ค่าเข้า (฿)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                         <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} placeholder="ลูกละ (฿)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                    ) : calcModel === 'case2' ? (
                      <input type="number" value={fixedPricePerPerson} onChange={(e)=>setFixedPricePerPerson(Number(e.target.value))} placeholder="เหมาจ่ายต่อคน (฿)" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                         <input type="number" value={totalCourtCost} onChange={(e)=>setTotalCourtCost(Number(e.target.value))} placeholder="ค่าสนามรวม" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                         <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} placeholder="ลูกละ (฿)" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. จัดการสนาม */}
                <div className="space-y-4">
                <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                <LayoutDashboard size={14} /> 6. จัดการเลขสนามแบด
                </h4>
                  <div className="grid grid-cols-2 gap-3 px-2">
                    <input 
                      value={newCourtNumber} 
                      onChange={(e) => setNewCourtNumber(e.target.value)}
                      placeholder="เลขสนาม (เช่น 7)" 
                      className="w-full p-4 bg-slate-50 rounded-2xl text-[15px] font-bold outline-none border-2 border-transparent focus:border-indigo-100"
                    />
                    <button 
                      onClick={async () => {
                        if (!newCourtNumber.trim()) return; // กันการกดเล่นโดยไม่พิมพ์เลข
                  
                        // บันทึกลง Supabase
                        const { error } = await supabase
                          .from('courts')
                          .insert([{ 
                            name: newCourtNumber.trim(), 
                            status: 'available', 
                            teamA: [], 
                            teamB: [] 
                          }]);
                  
                        if (error) {
                          alert("เกิดข้อผิดพลาด: " + error.message);
                        } else {
                          setNewCourtNumber(''); // ล้างช่องกรอกเมื่อสำเร็จ
                        }
                      }} 
                      className="bg-indigo-500 text-white rounded-2xl font-bold active:scale-95 transition-all py-4">
                      + เพิ่มสนาม
                    </button>
                  </div>           
                  
                  <div className="flex flex-wrap gap-2 px-2">
                    {courts.map(c => (
                      <div key={c.id} className="bg-slate-50 pl-4 pr-1 py-1 rounded-xl flex items-center gap-3 border border-slate-100">
                        <span className="text-[12px] font-bold text-slate-500 uppercase">{c.name}</span>
                        <button onClick={async() => {if(confirm(`ลบ ${c.name}?`)) await supabase.from('courts').delete().eq('id',c.id)}} className="w-8 h-8 flex items-center justify-center text-rose-300 hover:text-rose-500"><Trash size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* บันทึก */}
                <button 
                  onClick={saveSettings} 
                  className="w-full py-5 bg-pink-500 text-white rounded-[2.5rem] font-black text-[18px] shadow-lg shadow-pink-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Save size={24} /> บันทึกการตั้งค่าทั้งหมด
                </button>

                <button 
                  onClick={async () => {
                    if(confirm('ต้องการเริ่มวันใหม่? (รายชื่อนักกีฬาและคะแนนจะหายไปทั้งหมด)')){
                      await supabase.from('players').delete().neq('id', 0);
                      await supabase.from('courts').update({status:'available', teamA:[], teamB:[], start_time:null}).neq('id', 0);
                      alert('ล้างข้อมูลเรียบร้อยแล้วจ้า! 🏸');
                    }
                  }}
                  className="w-full text-rose-300 text-[11px] font-bold underline"
                >
                  ล้างข้อมูลเพื่อเริ่มวันใหม่
                </button>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-50 px-6 py-5 flex justify-between items-center z-50 rounded-t-[3rem] shadow-2xl shadow-slate-200">
        {[
          { id: 'home', label: 'หน้าสนาม', icon: '🏠' },
          { id: 'dashboard', label: 'การเงิน', icon: '💰' },
          { id: 'ranking', label: 'อันดับ', icon: '🏆' },
          { id: 'admin', label: 'ตั้งค่า', icon: '⚙️' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'scale-110 text-pink-500 font-black' : 'text-slate-300 font-bold opacity-70'}`}
          >
            <span className="text-[26px]">{tab.icon}</span>
            <span className="text-[11px] uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

     {/* --- MODALS --- */}
      
      {/* 1. Modal ยืนยันเพิ่มผู้เล่น */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-t-8 border-pink-500">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500 text-3xl">🏸</div>
            <h3 className="text-[22px] font-black mb-2 text-slate-700 leading-tight">ยินดีต้อนรับนะจ๊ะ<br/>คุณ {confirmModal.name}!</h3>
            <p className="text-slate-400 font-bold mb-8 text-[15px]">พร้อมที่จะปล่อยพลังในสนามหรือยังเอ่ย?</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmAddPlayer} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[18px] shadow-lg shadow-emerald-50">ยืนยันเลยจ้า!</button>
              <button onClick={() => setConfirmModal({show:false, name:''})} className="w-full py-4 text-slate-300 font-bold text-[14px]">ขอเปลี่ยนชื่ออีกที</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal จบเกม (แบบดั้งเดิม) */}
      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl">
            <h3 className="text-[20px] font-black mb-2 text-indigo-600 uppercase tracking-tighter italic">เก่งมากจ้า! ใช้ลูกแบดกี่ลูกเอ่ย? 🏸</h3>
            <p className="text-slate-400 font-bold mb-6 text-[14px]">จิบน้ำให้หายเหนื่อยก่อนได้นะจ๊ะ</p>
            <div className="grid grid-cols-3 gap-3 my-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button 
                  key={n} 
                  onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} 
                  className="py-6 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-[1.8rem] font-black text-[24px] transition-all active:scale-90"
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => setShuttleModal({show:false, courtId:null, winner:null})} className="text-slate-300 font-bold text-[12px] uppercase">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* 3. Modal แจ้งเตือน (Alert) */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-b-[12px] border-indigo-500">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
               <AlertCircle size={32} />
            </div>
            <h3 className="text-[22px] font-black mb-2 text-slate-800">{alertModal.title}</h3>
            <p className="text-slate-400 font-bold mb-8 text-[14px] leading-relaxed">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ ...alertModal, show: false })} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-[18px]">รับทราบจ้า ❤️</button>
          </div>
        </div>
      )}
      
      {/* 4. Modal "จิบน้ำ" (End Match) ที่เพิ่งเพิ่มใหม่ */}
      {showEndMatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <span className="text-5xl mb-4 block">🏸</span>
            <h3 className="text-[20px] font-black text-slate-700 mb-2">เก่งมากจ้า! จบเกมแล้ว</h3>
            <p className="text-slate-400 text-[14px] font-bold mb-6 leading-relaxed">
              จิบน้ำให้หายเหนื่อยก่อนได้นะจ๊ะ <br/> แล้วบอกนิดนึง... รอบนี้ใช้แบดไปกี่ลูกเอ่ย?
            </p>
            
            {calcModel !== 'case2' && (
              <div className="flex justify-center gap-4 mb-8">
                {[1, 2, 3].map(num => (
                  <button key={num} onClick={() => confirmEndMatch(num)} className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 text-xl font-black hover:bg-indigo-500 hover:text-white transition-all">
                    {num}
                  </button>
                ))}
                <input 
                  type="number" 
                  placeholder="อื่นๆ" 
                  className="w-16 h-16 rounded-2xl bg-slate-50 text-center font-black outline-none border-2 border-transparent focus:border-indigo-200"
                  onKeyDown={(e) => { if(e.key === 'Enter') confirmEndMatch(Number(e.currentTarget.value)); }}
                />
              </div>
            )}
            
            {calcModel === 'case2' && (
              <button onClick={() => confirmEndMatch(0)} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-100">
                บันทึกจบเกม
              </button>
            )}
            <button onClick={() => setShowEndMatchModal(false)} className="mt-4 text-slate-300 font-bold text-[12px]">ยกเลิก</button>
          </div>
        </div>
      )}

    </div> // ปิด DIV หลักของ Return
  ); // ปิด Return
} // ปิด Function






























































































