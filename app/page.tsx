"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  PlusCircle, MinusCircle, Star, Trash2, Save, RefreshCw, 
  Trophy, LayoutDashboard, Settings as SettingsIcon, Home,
  Search, CheckCircle2, Circle, QrCode, UserPlus, Users,
  TrendingUp, Wallet, ChevronRight, Award, Clock, 
  Edit3, Trash, UserCheck, AlertCircle
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
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });

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
      const { data: p } = await supabase.from('players').select('*').order('points', { ascending: false });
      if (p) setPlayers(p);
      
      const { data: c } = await supabase.from('courts').select('*').order('name', { ascending: true });
      if (c) setCourts(c);
      
      const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (s) {
        setGameRuleName(s.game_rule_name);
        setMaxMembers(s.max_members);
        setCalcModel(s.calc_model);
        setGameFormat(s.game_format);
        setBankName(s.bank_name);
        setAccountNumber(s.account_number);
        setAccountName(s.account_name);
        setBankQRImage(s.bank_qr_image);
        setFixedEntryFee(s.fixed_entry_fee);
        setShuttlePrice(s.shuttle_price);
        setFixedPricePerPerson(s.fixed_price_per_person);
        setTotalCourtCost(s.total_court_cost);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineData();
    const channel = supabase.channel('realtime_all_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchOnlineData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- [4] LOGIC FUNCTIONS ---
  
  const handleAddPlayer = async () => {
    if (!playerName.trim()) return;
    if (players.length >= maxMembers) {
      setAlertModal({ show: true, title: 'ก๊วนเต็มแล้วจ้า!', message: `ครบจำนวนที่กำหนดไว้ ${maxMembers} คนแล้วจ้ะ`, type: 'info' });
      return;
    }
    const newP = {
      name: playerName.trim(),
      gamesPlayed: 0,
      wins: 0,
      points: 0,
      status: 'waiting',
      shuttlesInvolved: 0,
      paid: false,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerName}${Date.now()}`
    };
    const { error } = await supabase.from('players').insert([newP]);
    if (error) alert(error.message);
    setPlayerName('');
  };

  const handleMatchMaking = async (courtId) => {
    // Logic: เลือกคนที่เล่นน้อยที่สุด (Queue)
    const waiting = players
      .filter(p => p.status === 'waiting')
      .sort((a, b) => (a.gamesPlayed || 0) - (b.gamesPlayed || 0));

    if (waiting.length < 4) {
      setAlertModal({ show: true, title: 'คนไม่พอจ้า', message: 'ต้องการนักกีฬาที่ว่างอย่างน้อย 4 คนนะ', type: 'info' });
      return;
    }

    // สุ่ม 4 คนแรกที่คิวถึง
    const selected = waiting.slice(0, 4).sort(() => Math.random() - 0.5);
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
    const participants = [...court.teamA, ...court.teamB];

    for (const p of participants) {
      const isTeamA = court.teamA.some(m => m.id === p.id);
      const isWin = (winner === 'A' && isTeamA) || (winner === 'B' && !isTeamA);
      const pts = winner === 'Draw' ? 5 : (isWin ? 10 : 2);
      
      await supabase.from('players').update({
        status: 'waiting',
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        wins: isWin ? (p.wins || 0) + 1 : (p.wins || 0),
        points: (p.points || 0) + pts,
        shuttlesInvolved: (p.shuttlesInvolved || 0) + numShuttles
      }).eq('id', p.id);
    }
    await supabase.from('courts').update({ status: 'available', teamA: [], teamB: [], start_time: null }).eq('id', courtId);
    setShuttleModal({ show: false, courtId: null, winner: null });
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
    
    if (error) alert('Error: ' + error.message);
    else alert('บันทึกการตั้งค่าลงฐานข้อมูลเรียบร้อยแล้ว! 💾');
  };

  const calculateFee = (p) => {
    if (calcModel === 'case1') return (fixedEntryFee || 0) + ((p.shuttlesInvolved || 0) * (shuttlePrice || 0));
    if (calcModel === 'case2') return (fixedPricePerPerson || 0);
    return 0;
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [players, searchQuery]);

  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBankQRImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- [5] RENDER UI ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin text-pink-500 text-4xl">🏸</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 text-slate-700 select-none" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-xl p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-600 leading-none mb-1">
            {gameRuleName}
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              สมาชิก {players.length} / {maxMembers}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-500 border border-indigo-100 uppercase mb-1">
            {calcModel === 'case1' ? 'Actual Shuttle' : 'Fixed Price'}
           </div>
           <p className="text-[9px] font-bold text-slate-300">SERVER: ONLINE</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* NAV TABS */}
        <nav className="flex justify-around bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-xl shadow-pink-50/50 border border-white sticky top-24 z-30">
          {[
            { id: 'home', icon: Home, label: 'สนาม' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'บัญชี' },
            { id: 'ranking', icon: Trophy, label: 'อันดับ' },
            { id: 'admin', icon: SettingsIcon, label: 'ตั้งค่า' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex flex-col items-center gap-1 px-5 py-3 rounded-[1.8rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-rose-200 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <tab.icon size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {/* Quick Summary */}
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">ว่างพร้อมลง</p>
                    <p className="text-[20px] font-black text-slate-700">{players.filter(p=>p.status==='waiting').length}</p>
                  </div>
               </div>
               <div className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">ในสนาม</p>
                    <p className="text-[20px] font-black text-slate-700">{players.filter(p=>p.status==='playing').length}</p>
                  </div>
               </div>
            </div>

            {/* Add Player */}
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50/50 space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
                <h3 className="font-bold text-slate-700 text-[15px]">เพิ่มสมาชิกเข้าก๊วน</h3>
              </div>
              <div className="flex flex-col gap-3 relative z-10">
                <div className="relative">
                  <input 
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)} 
                    placeholder="พิมพ์ชื่อเล่นนักกีฬา..." 
                    className="w-full p-5 bg-slate-50 rounded-[1.8rem] outline-none font-bold text-slate-700 placeholder:text-slate-300 border-2 border-transparent focus:border-pink-100 transition-all"
                  />
                  <div className="absolute right-5 top-5 text-pink-200"><Edit3 size={20} /></div>
                </div>
                <button 
                  onClick={handleAddPlayer} 
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-5 rounded-[1.8rem] font-black text-[18px] shadow-xl shadow-rose-100 active:scale-95 transition-all"
                >
                  เข้าร่วมกลุ่มเลย!
                </button>
              </div>
            </section>

            {/* Courts Map */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-slate-400 text-[12px] uppercase tracking-widest">สถานะสนามแบดมินตัน</h3>
                <span className="text-[10px] font-bold text-pink-400 bg-pink-50 px-3 py-1 rounded-full">REALTIME</span>
              </div>
              
              {courts.map(court => (
                <div key={court.id} className="bg-white p-6 rounded-[2.8rem] shadow-sm border border-slate-100 relative group transition-all">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${court.status === 'busy' ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                      <span className="text-indigo-600 font-black text-[18px] uppercase">{court.name}</span>
                    </div>
                    {court.status === 'busy' && (
                      <div className="flex items-center gap-1.5 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                        <Clock size={14} className="text-blue-500" />
                        <span className="text-blue-600 font-black text-[12px]">{court.start_time}</span>
                      </div>
                    )}
                  </div>

                  {court.status === 'busy' ? (
                    <div className="space-y-4">
                      <div className="flex justify-around items-center bg-gradient-to-b from-slate-50 to-white p-8 rounded-[2.2rem] border-2 border-dashed border-slate-100 relative">
                        <div className="text-center flex-1">
                          <div className="space-y-1 mb-4">
                            {court.teamA?.map(p => <p key={p.id} className="font-black text-slate-700 text-[17px]">{p.name}</p>)}
                          </div>
                          <button 
                            onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'A' })} 
                            className="bg-emerald-500 text-white px-7 py-2.5 rounded-full text-[13px] font-black shadow-lg shadow-emerald-100 active:scale-90"
                          >
                            TEAM A WIN
                          </button>
                        </div>
                        <div className="px-4 font-black text-slate-200 italic text-[22px]">VS</div>
                        <div className="text-center flex-1">
                          <div className="space-y-1 mb-4">
                            {court.teamB?.map(p => <p key={p.id} className="font-black text-slate-700 text-[17px]">{p.name}</p>)}
                          </div>
                          <button 
                            onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'B' })} 
                            className="bg-emerald-500 text-white px-7 py-2.5 rounded-full text-[13px] font-black shadow-lg shadow-emerald-100 active:scale-90"
                          >
                            TEAM B WIN
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShuttleModal({ show: true, courtId: court.id, winner: 'Draw' })} 
                        className="w-full py-4 bg-white border-2 border-slate-50 text-slate-400 rounded-2xl text-[12px] font-black hover:bg-slate-50 transition-all"
                      >
                        เสมอ (1-1 SETS)
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleMatchMaking(court.id)} 
                      className="w-full py-14 border-2 border-dashed border-indigo-100 rounded-[2.5rem] flex flex-col items-center gap-3 group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all active:scale-95"
                    >
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">🏸</div>
                      <span className="text-indigo-300 font-black text-[18px]">จัดทีมลงสนาม</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-2 text-indigo-200 mb-2">
                    <Wallet size={16} />
                    <p className="font-bold text-[12px] uppercase tracking-widest">สรุปยอดเงินทั้งหมด</p>
                  </div>
                  <h2 className="text-[52px] font-black leading-none mb-6">
                    ฿{players.reduce((sum, p) => sum + calculateFee(p), 0).toLocaleString()}
                  </h2>
                  <div className="flex gap-3">
                    <div className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10">
                       <p className="text-[10px] text-indigo-200 font-bold uppercase">จ่ายแล้ว</p>
                       <p className="text-[18px] font-black">{players.filter(p=>p.paid).length} คน</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10">
                       <p className="text-[10px] text-indigo-200 font-bold uppercase">ค้างชำระ</p>
                       <p className="text-[18px] font-black">{players.filter(p=>!p.paid).length} คน</p>
                    </div>
                  </div>
               </div>
               <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12">
                 <LayoutDashboard size={300} />
               </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 text-[18px]">รายชื่อและค่าใช้จ่าย</h3>
                  <RefreshCw 
                    size={18} 
                    className="text-slate-300 cursor-pointer hover:rotate-180 transition-all duration-500" 
                    onClick={fetchOnlineData}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อเพื่อน..." 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-[14px]"
                  />
                </div>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                {filteredPlayers.map(p => (
                  <div key={p.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-5">
                      <button 
                        onClick={async () => await supabase.from('players').update({ paid: !p.paid }).eq('id', p.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${p.paid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {p.paid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      <div>
                        <p className={`font-black text-[17px] ${p.paid ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{p.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">เล่น {p.gamesPlayed} เกม</span>
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">แบด {p.shuttlesInvolved} ลูก</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-[20px] ${p.paid ? 'text-slate-300' : 'text-indigo-600'}`}>฿{calculateFee(p)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Support */}
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-50 text-center space-y-6">
              <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                <QrCode size={48} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-[22px] mb-1">{bankName}</h3>
                <div className="inline-block bg-slate-50 px-6 py-2 rounded-full border border-slate-100">
                  <p className="font-black text-indigo-600 text-[20px] tracking-wider">{accountNumber}</p>
                </div>
                <p className="text-slate-400 font-bold text-[14px] mt-3 uppercase tracking-widest">{accountName}</p>
              </div>
              {bankQRImage && (
                <div className="relative inline-block">
                   <img src={bankQRImage} alt="QR Code" className="mx-auto rounded-[2.5rem] border-8 border-slate-50 shadow-2xl max-w-[240px]" />
                   <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-lg border border-slate-50 text-[12px] font-black text-slate-400">Scan to Pay</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RANKING TAB */}
        {activeTab === 'ranking' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-rose-500 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-orange-100 relative">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-2xl">
                     <Award size={48} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-[28px] font-black leading-tight italic">HALL OF FAME</h2>
                    <p className="text-orange-100 text-[12px] font-bold uppercase tracking-[0.2em]">อันดับนักตบประจำวัน</p>
                  </div>
               </div>
               <div className="absolute top-8 right-8 animate-bounce">
                  <Star className="text-yellow-200 fill-yellow-200" size={24} />
               </div>
            </div>

            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-50 overflow-hidden px-2">
              {players.length > 0 ? players.map((p, i) => (
                <div key={p.id} className="p-8 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <span className={`absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center rounded-full font-black text-[12px] shadow-lg border-2 border-white z-10 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-white text-slate-300'}`}>
                        {i + 1}
                      </span>
                      <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-[1.8rem] bg-slate-100 shadow-sm border-2 border-white group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-[19px]">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase flex items-center gap-1">
                          <TrendingUp size={12} /> WIN {p.wins}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase flex items-center gap-1">
                          PLAYED {p.gamesPlayed}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[28px] font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 leading-none">{p.points}</p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1.5">PTS</p>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-slate-300 font-bold">ยังไม่มีข้อมูลการแข่งขันจ้า</div>
              )}
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-700 pb-10">
            <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
              
              {/* Part 1: Group & Limit */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500"><Home size={20} /></div>
                   <p className="text-[14px] font-black text-slate-800 uppercase tracking-widest">1. ข้อมูลก๊วน & จำนวนคน</p>
                </div>
                <div className="space-y-4 px-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 ml-3 uppercase">ชื่อก๊วนแบดมินตัน</label>
                    <input value={gameRuleName} onChange={(e) => setGameRuleName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none border-2 border-transparent focus:border-pink-100 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 ml-3 uppercase">จำนวนสมาชิกสูงสุด (คน)</label>
                    <input type="number" value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none" />
                  </div>
                </div>
              </div>

              {/* Part 2: Payment Details */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500"><QrCode size={20} /></div>
                   <p className="text-[14px] font-black text-slate-800 uppercase tracking-widest">2. ข้อมูลการชำระเงิน</p>
                </div>
                <div className="grid grid-cols-1 gap-4 px-2">
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="ชื่อธนาคาร" className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none" />
                  <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="เลขบัญชี" className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none" />
                  <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="ชื่อเจ้าของบัญชี" className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none" />
                  <div className="p-10 border-4 border-dashed border-slate-50 rounded-[2.5rem] text-center cursor-pointer hover:bg-slate-50 transition-all group" onClick={() => fileInputRef.current.click()}>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleQRUpload} />
                    {bankQRImage ? (
                      <div className="relative inline-block">
                        <img src={bankQRImage} className="mx-auto max-w-[140px] rounded-[1.5rem] shadow-xl" />
                        <div className="absolute -top-2 -right-2 bg-pink-500 text-white p-2 rounded-full"><Edit3 size={14} /></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-indigo-300">
                        <PlusCircle size={40} strokeWidth={1.5} />
                        <span className="font-black text-[14px]">อัปโหลด QR Code จ้า</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Part 3-5: Calc Model */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500"><Wallet size={20} /></div>
                   <p className="text-[14px] font-black text-slate-800 uppercase tracking-widest">3-5. รูปแบบค่าใช้จ่าย</p>
                </div>
                <div className="space-y-4 px-2">
                   <div className="flex items-center justify-between p-5 bg-rose-50/50 rounded-[1.8rem] border border-rose-100">
                     <span className="text-[14px] font-black text-rose-600 uppercase">ระบบการคิดเงิน</span>
                     <select value={calcModel} onChange={(e) => setCalcModel(e.target.value)} className="bg-transparent font-black outline-none text-rose-600 text-right">
                       <option value="case1">ค่าสนาม + ลูกแบดตามจริง</option>
                       <option value="case2">เหมาจ่ายรายหัว</option>
                     </select>
                   </div>
                   
                   {calcModel === 'case1' ? (
                     <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-300 ml-3">ค่าสนามตั้งต้น (฿)</label>
                          <input type="number" value={fixedEntryFee} onChange={(e) => setFixedEntryFee(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-300 ml-3">ราคาลูกแบด (฿)</label>
                          <input type="number" value={shuttlePrice} onChange={(e) => setShuttlePrice(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black outline-none" />
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-2 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-slate-300 ml-3 uppercase tracking-widest">ราคาเหมาจ่ายต่อคน (฿)</label>
                        <input type="number" value={fixedPricePerPerson} onChange={(e) => setFixedPricePerPerson(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none" />
                     </div>
                   )}
                </div>
              </div>

              {/* Part 6: Courts Management */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><Edit3 size={20} /></div>
                   <p className="text-[14px] font-black text-slate-800 uppercase tracking-widest">6. จัดการสนาม (ระบุเลขเอง)</p>
                </div>
                <div className="space-y-4 px-2">
                  <div className="flex gap-3">
                    <input 
                      value={newCourtNumber} 
                      onChange={(e) => setNewCourtNumber(e.target.value)} 
                      placeholder="เช่น สนาม 7 หรือ คอร์ด 1" 
                      className="flex-1 p-5 bg-slate-50 rounded-[1.8rem] font-black outline-none border-2 border-transparent focus:border-emerald-100 transition-all" 
                    />
                    <button 
                      onClick={async () => {
                        if(!newCourtNumber) return;
                        await supabase.from('courts').insert([{name: newCourtNumber.trim(), status:'available', teamA:[], teamB:[]}]);
                        setNewCourtNumber('');
                      }} 
                      className="bg-emerald-500 text-white px-8 rounded-[1.8rem] font-black text-2xl shadow-lg shadow-emerald-100 active:scale-90 transition-all"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {courts.map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-white border-2 border-slate-50 pl-5 pr-2 py-2 rounded-2xl shadow-sm">
                        <span className="font-black text-[13px] text-slate-700 uppercase">{c.name}</span>
                        <button 
                          onClick={async () => { if(confirm(`ลบ ${c.name}?`)) await supabase.from('courts').delete().eq('id', c.id); }}
                          className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Master Save */}
              <button 
                onClick={saveSettings} 
                className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-[2.5rem] font-black text-[20px] shadow-2xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-4 group"
              >
                <Save size={28} className="group-hover:rotate-12 transition-transform" /> 
                บันทึกการตั้งค่าทั้งหมด
              </button>
            </div>
            
            <button 
              onClick={async () => {
                if(confirm('ต้องการเริ่มวันใหม่? (ข้อมูลผู้เล่นทุกคนและคะแนนจะถูกลบออกทั้งหมด)')){
                  await supabase.from('players').delete().neq('id', 0);
                  await supabase.from('courts').update({status:'available', teamA:[], teamB:[], start_time:null}).neq('id', 0);
                  alert('ล้างข้อมูลเรียบร้อย! พร้อมเริ่มความสนุกใหม่แล้วจ้า 🏸');
                }
              }} 
              className="w-full py-5 bg-white text-rose-400 rounded-[2rem] font-black text-[13px] border-2 border-rose-50 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
            >
              <AlertCircle size={18} /> ล้างข้อมูลเพื่อเริ่มวันใหม่
            </button>
          </div>
        )}
      </main>

      {/* SHUTTLE MODAL */}
      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-900/70 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-indigo-500 shadow-inner">
               <Star size={40} className="fill-indigo-500" />
            </div>
            <h3 className="text-[22px] font-black mb-2 text-indigo-600 uppercase tracking-tighter italic">แมตช์ที่ยอดเยี่ยมมาก!</h3>
            <p className="text-slate-400 font-bold mb-8 text-[15px]">พักเหนื่อยจิบน้ำแล้วบอกนิดนึงนะ <br/>เกมนี้ใช้ลูกแบดไปกี่ลูกจ๊ะ? 🏸</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button 
                  key={n} 
                  onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} 
                  className="py-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[1.8rem] font-black text-[24px] transition-all active:scale-90 shadow-sm border border-slate-100 hover:border-indigo-500"
                >
                  {n}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShuttleModal({ show: false, courtId: null, winner: null })} 
              className="text-slate-300 font-bold text-[14px] uppercase tracking-widest hover:text-slate-500 transition-colors"
            >
              ยกเลิก / บันทึกภายหลัง
            </button>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-b-[10px] border-rose-500 scale-in-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
               <AlertCircle size={32} strokeWidth={3} />
            </div>
            <h3 className="text-[24px] font-black mb-3 text-slate-800 tracking-tight">{alertModal.title}</h3>
            <p className="text-slate-500 mb-10 font-bold text-[16px] leading-relaxed px-2">{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal({ ...alertModal, show: false })} 
              className="w-full py-5 bg-gradient-to-r from-slate-800 to-indigo-900 text-white rounded-[1.8rem] font-black text-[18px] shadow-xl active:scale-95 transition-all uppercase tracking-widest"
            >
              รับทราบจ้า ❤️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

































