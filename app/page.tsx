"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; 
// (ถ้าไฟล์ lib อยู่ข้างนอกโฟลเดอร์ app)
import { 
  UserPlus, Users, ClipboardCheck, Trash2, Layout, 
  Settings, Trophy, Wallet, ChevronRight, Star, 
  PlusCircle, MinusCircle, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function BadmintonUltimatePro() {
  // --- [1] STATES ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [courts, setCourts] = useState([]);
  const [newCourtNumber, setNewCourtNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- [ADD] เพิ่ม States สำหรับรองรับการตั้งค่าจาก Supabase ---
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [costPerPerson, setCostPerPerson] = useState(150);
  const [shuttlePrice, setShuttlePrice] = useState(30);
  const [matchType, setMatchType] = useState('random');
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, name: '' });
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });

// --- [NEW] ระบบดึงข้อมูลและซิงค์แบบ Realtime ---
  useEffect(() => {
    fetchOnlineData(); // ดึงข้อมูลครั้งแรกเมื่อเปิดหน้าเว็บ
    
    // เปิดช่องทาง Realtime เพื่อให้คอมและมือถือซิงค์กันอัตโนมัติ
    const channel = supabase
      .channel('db-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Database updated:', payload);
        fetchOnlineData(); // เมื่อมีการเปลี่ยนแปลงใน DB ให้โหลดข้อมูลใหม่ทันที
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courts.length]);

  // 2. ย้ายฟังก์ชันจัดการสนาม มาไว้ข้างนอก useEffect (เพื่อใช้กับปุ่ม onClick ได้)
const addCourt = async () => {
  const newName = `สนาม ${courts.length + 1}`;
  await supabase.from('courts').insert([{ 
    name: newName, 
    status: 'available', 
    teamA: [], 
    teamB: [],
    start_time: null 
  }]);
};

const removeCourt = async () => {
  if (courts.length === 0) return;
  const lastCourt = courts[courts.length - 1];
  await supabase.from('courts').delete().eq('id', lastCourt.id);
};

const startMatch = async (courtId) => {
  const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  await supabase
    .from('courts')
    .update({ start_time: now, status: 'busy' })
    .eq('id', courtId);
};

  const fetchOnlineData = async () => {
    try {
      // 1. ดึงข้อมูลรายชื่อนักกีฬา
      const { data: pData } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true });
      
      // 2. ดึงข้อมูลสนาม
      const { data: cData } = await supabase
        .from('courts')
        .select('*')
        .order('id', { ascending: true });

      // 3. ดึงข้อมูลการตั้งค่าจากตาราง settings (ID: 1)
      const { data: sData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      // อัปเดตข้อมูลนักกีฬาและสนาม
      if (pData) setPlayers(pData);
      if (cData) setCourts(cData);
      
      // อัปเดตค่าตั้งค่าให้ตรงกันทุกเครื่อง (คอม/มือถือ)
      if (sData) {
        setMaxPlayers(sData.maxPlayers);
        setCostPerPerson(sData.costPerPerson);
        setShuttlePrice(sData.shuttlePrice);
        if (sData.matchType) setMatchType(sData.matchType);
      }
    } catch (err) {
      console.error('Error fetching online data:', err);
    }
  };

  // --- [2] ADMIN & RULES ---
  const [gameRuleName, setGameRuleName] = useState('ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸');
  const [calcModel, setCalcModel] = useState('case1'); 
  const [gameFormat, setGameFormat] = useState('2sets'); 
  const [fixedEntryFee, setFixedEntryFee] = useState(90); 
  const [totalCourtCost, setTotalCourtCost] = useState(0); 
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย');
  const [accountNumber, setAccountNumber] = useState('000-0-0000-000');
  const [accountName, setAccountName] = useState('ระบุชื่อบัญชี'); 
  const [bankQRImage, setBankQRImage] = useState(null); 
  const fileInputRef = useRef(null);

  // --- [3] PERSISTENCE & ONLINE-SYNC ---
  useEffect(() => {
    // 1. โหลด Font Mali ให้สวยงามเหมือนเดิม
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // หมายเหตุ: เราไม่ใช้ localStorage แล้ว เพราะเราดึงข้อมูลจาก fetchOnlineData ในส่วนที่ 1 แทนครับ
  }, []);

  // --- [4] LOGIC FUNCTIONS ---
  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    if (players.length >= maxPlayers) {
      setAlertModal({ 
        show: true, 
        title: 'ก๊วนอบอุ่นจนเต็มแล้วจ้า! 🏠', 
        message: `ตอนนี้เพื่อนๆ มาจอยกันครบ ${maxPlayers} คนแล้วจ้ะ ไว้รอบหน้ามาสนุกด้วยกันใหม่น้า`,
        type: 'info'
      });
      return;
    }
    setConfirmModal({ show: true, name: playerName });
  };

  const calculateFee = (p) => {
    if (calcModel === 'case1') return fixedEntryFee + ((p.shuttlesInvolved || 0) * shuttlePrice);
    if (calcModel === 'case2') return costPerPerson;
    if (calcModel === 'case3') {
      // รวมจำนวนลูกจากทุกคน แล้วหาร 4 เพื่อให้ได้จำนวนลูกที่ใช้จริงในสนาม
      const totalShuttlesUsed = players.reduce((s, pl) => s + (pl.shuttlesInvolved || 0), 0) / 4;
      // สูตร: (ค่าสนามรวม + (จำนวนลูกจริง x ราคาต่อลูก)) / จำนวนคนเล่นทั้งหมด
      const grandTotal = totalCourtCost + (totalShuttlesUsed * shuttlePrice);
      return players.length > 0 ? (grandTotal / players.length) : 0;
    }
    return 0;
  };

  const handleEndMatchClick = (courtId, winner) => {
    if (calcModel === 'case2') {
      finalizeMatch(courtId, winner, 0); 
    } else {
      setShuttleModal({ show: true, courtId, winner });
    }
  };

 const finalizeMatch = async (courtId, winner, numShuttles) => {
  const court = courts.find(c => c.id === courtId);
  const participants = [...court.teamA.map(p => p.id), ...court.teamB.map(p => p.id)];

  // 1. เตรียมข้อมูลใหม่และอัปเดตผู้เล่นแต่ละคนขึ้น Cloud
  const updatedPlayers = await Promise.all(players.map(async (p) => {
    if (participants.includes(p.id)) {
      const isWin = (winner === 'A' && court.teamA.some(a => a.id === p.id)) || (winner === 'B' && court.teamB.some(b => b.id === p.id));
      const pts = winner === 'Draw' ? 5 : (isWin ? 10 : 2);
      
      const newData = { 
        ...p, 
        status: 'waiting', 
        gamesPlayed: p.gamesPlayed + 1, 
        wins: isWin ? p.wins + 1 : p.wins, 
        points: p.points + pts, 
        shuttlesInvolved: (p.shuttlesInvolved || 0) + numShuttles 
      };

      // --- [NEW] อัปเดตข้อมูลรายคนขึ้น Cloud ---
      await supabase.from('players').update({
        status: newData.status,
        games_played: newData.gamesPlayed,
        wins: newData.wins,
        points: newData.points,
        shuttles_involved: newData.shuttlesInvolved
      }).eq('id', p.id);

      return newData;
    }
    return p;
  }));

  setPlayers(updatedPlayers);

  // 2. เคลียร์สนามบน Cloud และในเครื่อง
  await supabase.from('courts').update({ 
    status: 'available', 
    teamA: [], 
    teamB: [], 
    startTime: null 
  }).eq('id', courtId);

  setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'available', teamA: [], teamB: [], startTime: null } : c));
  setShuttleModal({ show: false, courtId: null, winner: null });

  // 3. ดึงข้อมูลล่าสุดจาก Cloud มาแสดงผล
  await fetchOnlineData();
}; // <--- ปีกกาปิดฟังก์ชัน finalizeMatch ต้องอยู่ตรงนี้

const handleResetDay = async () => {
    if (confirm('ต้องการล้างรายชื่อเพื่อเริ่มวันใหม่ใช่ไหม?')) {
      // ลบทุกคนในตาราง players บน Cloud
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      // รีเซ็ตทุกสนามบน Cloud
      await supabase.from('courts').update({ status: 'available', teamA: [], teamB: [] }).neq('id', 0);
      setPlayers([]);
      setCourts(prev => prev.map(c => ({ ...c, status: 'available', teamA: [], teamB: [] })));
    }
  };

  // --- ฟังก์ชันเสริม: สรุปยอดสำหรับ LINE (ก๊วนเสน่ห์) ---
  const generateLineSummary = () => {
    // 1. คำนวณยอดรวมทั้งหมดก่อนสรุป
    const totalIncome = players.reduce((sum, p) => sum + calculateFee(p), 0);
    
    const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' });
    let summaryText = `✨ *** สรุปยอดก๊วนเสน่ห์ (${dateStr}) *** ✨\n`;
    summaryText += `--------------------------\n`;
    
    players.forEach((p, index) => {
      const fee = calculateFee(p);
      const payStatus = p.paid ? `✅ (${p.payType})` : `⏳ รอโอนน้า`;
      summaryText += `${index + 1}. ${p.name}: ${fee.toFixed(0)}.- ${payStatus}\n`;
    });
    
    summaryText += `--------------------------\n`;
    // เช็ก Logic การคิดเงิน (ดึงมาจาก Admin Rules ในส่วนที่ 2)
    if (calcModel === 'case1') summaryText += `📝 ค่าสนาม ${fixedEntryFee}.- + ลูกแบดลูกละ ${shuttlePrice}.-\n`;
    else if (calcModel === 'case2') summaryText += `📝 ราคาเหมาจ่ายอบอุ่นคนละ ${costPerPerson}.-\n`;
    else if (calcModel === 'case3') summaryText += `📝 หารเฉลี่ยค่าความสนุกเท่ากันทุกคนจ้า\n`;
    
    summaryText += `\n💰 รวมยอดวันนี้: ${totalIncome.toFixed(0)} บาท\n`;
    summaryText += `🏦 ${bankName}\nเลขบัญชี: ${accountNumber}\nชื่อ: ${accountName}\n`;
    summaryText += `\nขอบคุณที่มาเติมเต็มรอยยิ้มให้กันนะจ๊ะ! ❤️🏸`;

    // คัดลอกลง Clipboard
    navigator.clipboard.writeText(summaryText).then(() => {
      setAlertModal({
        show: true,
        title: 'คัดลอกเรียบร้อย! 💌',
        message: 'นำไปวางใน LINE แจ้งเพื่อนๆ ได้เลยน้า ข้อมูลอยู่ในเครื่องแล้วจ้า',
        type: 'info'
      });
    });
  };

  // Finance Summary
  const paidCount = players.filter(p => p.paid).length;
  const unpaidCount = players.length - paidCount;
  const totalIncome = players.reduce((sum, p) => sum + calculateFee(p), 0);
  const receivedIncome = players.filter(p => p.paid).reduce((sum, p) => sum + calculateFee(p), 0);

  // --- [NEW] ฟังก์ชันยืนยันเพิ่มคนลง Cloud ---
  const handleConfirmJoin = async () => {
    const { data, error } = await supabase
      .from('players')
      .insert([{ 
        name: confirmModal.name, 
        status: 'waiting', 
        games_played: 0,
        wins: 0,
        points: 0,
        shuttles_involved: 0,
        paid: false,
        // เพิ่ม avatar ให้มีรูปสุ่ม
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${confirmModal.name + Date.now()}`
      }])
      .select();

    if (data) {
      setPlayers([...players, data[0]]);
      setConfirmModal({ show: false, name: '' });
      setPlayerName(''); 
      await fetchOnlineData(); // ซิงค์ข้อมูลล่าสุด
    } else if (error) {
      alert('เพิ่มคนไม่สำเร็จ: ' + error.message);
    }
  };

  // --- [NEW] ฟังก์ชันลบคนออกจาก Cloud (รวมร่างแล้ว) ---
  const removePlayer = async (id) => {
    if (confirm('ยืนยันลบเพื่อนคนนี้ออกจากกลุ่ม?')) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (!error) {
        setPlayers(players.filter(p => p.id !== id));
        await fetchOnlineData(); // ซิงค์ข้อมูลล่าสุดเพื่อให้คนอื่นเห็นว่าคนนี้ออกแล้ว
      } else {
        alert('ลบไม่สำเร็จ: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 text-slate-700" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER */}
      <header className="bg-white/95 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-[20px] font-bold text-pink-500 leading-none">{gameRuleName}</h1>
          <p className="text-[14px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Active: {players.length}/{maxPlayers}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] block font-bold text-slate-300">CALC MODEL</span>
          <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full text-[12px] font-bold uppercase">{calcModel}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">

        {/* TAB: HOME - หน้าสนาม */}

        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex justify-between items-center">
               <div className="flex gap-4">
                  <div className="text-center"><p className="text-[12px] text-slate-400 font-bold">ว่าง</p><p className="text-[18px] font-black text-emerald-500">{players.filter(p=>p.status==='waiting').length}</p></div>
                  <div className="text-center border-l pl-4"><p className="text-[12px] text-slate-400 font-bold">แข่งอยู่</p><p className="text-[18px] font-black text-orange-400">{players.filter(p=>p.status==='playing').length}</p></div>
               </div>
               <button onClick={handleResetDay} className="bg-slate-50 text-slate-400 px-4 py-2 rounded-2xl text-[12px] font-bold border border-slate-100 active:bg-rose-500 active:text-white transition-all">เริ่มวันใหม่</button>
            </div>

            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-4">
              <h3 className="font-bold text-pink-400 text-[14px]">ต้อนรับสมาชิกใหม่เข้าก๊วน 🏸</h3>
              <div className="flex flex-col gap-3">
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="ชื่อเล่นนักกีฬาคนเก่ง..." className="w-full p-4 bg-pink-50 rounded-2xl outline-none font-bold text-[16px] text-pink-600 placeholder:text-pink-200" />
                <button onClick={handleAddPlayer} className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black text-[18px] shadow-lg shadow-pink-100 active:scale-95 transition-all">มาจอยกันเลย!</button>
              </div>
            </section>

            {/* รายชื่อคอร์ด */}
            <div className="space-y-4">
              {courts.map(court => (
                <div key={court.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-indigo-400 font-black text-[14px] uppercase tracking-tighter">Court {court.id}</span>
                    {/* ส่วนแสดงผลเวลาเริ่มแข่ง */}
<div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
  <Star size={12} className="fill-blue-500 text-blue-500" />
  <span className="text-blue-600 font-black text-[12px]">{court.start_time || "--:--"}</span>
</div>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${court.status === 'busy' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {court.status === 'busy' ? `กำลังปล่อยพลัง (เริ่ม ${court.startTime})` : 'สนามว่างรอเพื่อนๆ'}
                    </span>
                  </div>

                  {court.status === 'busy' ? (
                    /* ส่วนโชว์ตอนคนกำลังแข่ง */
                    <div className="space-y-4">
                       <div className="flex justify-around items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100">
                          <div className="text-center">
                            {court.teamA.map(p=><p key={p.id} className="font-bold text-indigo-600 text-[16px]">{p.name}</p>)}
                            <button onClick={()=>handleEndMatchClick(court.id, 'A')} className="mt-3 bg-emerald-500 text-white px-6 py-2 rounded-full text-[14px] font-bold shadow-md">ชนะจ้า</button>
                          </div>
                          <div className="font-black text-slate-200 italic text-[20px]">VS</div>
                          <div className="text-center">
                            {court.teamB.map(p=><p key={p.id} className="font-bold text-indigo-600 text-[16px]">{p.name}</p>)}
                            <button onClick={()=>handleEndMatchClick(court.id, 'B')} className="mt-3 bg-emerald-500 text-white px-6 py-2 rounded-full text-[14px] font-bold shadow-md">ชนะจ้า</button>
                          </div>
                       </div>                      
                       <div className="flex gap-2">
                          {gameFormat === '2sets' && (
                            <button onClick={()=>handleEndMatchClick(court.id, 'Draw')} className="flex-1 py-4 bg-white border-2 border-slate-100 rounded-2xl text-[14px] font-bold text-slate-400">เสมอแบบมิตรภาพ (1-1)</button>
                          )}                          
                          <button onClick={() => {
                            if(confirm('สุ่มทีมใหม่สำหรับคอร์ดนี้?')){
                              const participants = [...court.teamA, ...court.teamB].sort(()=>Math.random()-0.5);
                              setCourts(courts.map(c=>c.id===court.id?{...c, teamA:participants.slice(0,2), teamB:participants.slice(2,4)}:c));
                            }
                          }} className="bg-slate-100 text-slate-400 px-4 rounded-2xl text-[18px]">🔄</button>
                       </div>
                    </div>
                  {/* ปุ่มสำหรับแอดมินกดบันทึกเวลาใหม่ */}
<button 
  onClick={() => startMatch(court.id)}
  className="w-full py-3 bg-slate-50 text-slate-400 rounded-2xl font-black text-[12px] mt-2 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
>
  🕒 บันทึก/แก้ไข เวลาเริ่มแข่ง
</button>
                  ) : (
                    /* ส่วนปุ่มกดตอนสนามว่าง (ที่แก้ไขใหม่) */
                    <button 
                      onClick={async () => {
                        const waiting = players.filter(p => p.status === 'waiting');
                        if (waiting.length < 4) return setAlertModal({show:true, title:'เพื่อนยังมาไม่ครบจ้า', message:'ต้องการนักกีฬาที่ว่างอย่างน้อย 4 คนนะจ๊ะ', type: 'info'});
                        
                        const selected = [...waiting].sort((a,b)=>a.gamesPlayed - b.gamesPlayed).slice(0,4).sort(()=>Math.random()-0.5);
                        const startTime = new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
                        const participantIds = selected.map(p => p.id);

                        await supabase.from('players').update({ status: 'playing' }).in('id', participantIds);
                        await supabase.from('courts').update({ 
                          status: 'busy', 
                          teamA: selected.slice(0,2), 
                          teamB: selected.slice(2,4), 
                          startTime: startTime 
                        }).eq('id', court.id);
                        await fetchOnlineData();
                      }} 
                      className="w-full py-12 border-2 border-dashed border-indigo-100 rounded-[2.5rem] text-indigo-300 font-black text-[16px] flex flex-col items-center gap-2 active:scale-95 transition-all"
                    >
                      <span className="text-4xl">🏸</span>
                      <span>จัดทีมลงสนาม</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD - การเงิน (ก๊วนเสน่ห์ Edition) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <button onClick={generateLineSummary} className="w-full py-5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-[2.5rem] font-black text-[18px] shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                📱 ส่งยอดเข้า LINE (Copy)
              </button>

              {/* สรุปยอดบน */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-lg">
                    <p className="text-[12px] font-bold opacity-80">ดูแลกันแล้ว ({paidCount})</p>
                    <p className="text-[24px] font-black">{receivedIncome.toFixed(0)}.-</p>
                </div>
                <div className="bg-rose-500 p-6 rounded-[2.5rem] text-white shadow-lg relative overflow-hidden">
                    <p className="text-[12px] font-bold opacity-80">รอสนับสนุน ({unpaidCount})</p>
                    <p className="text-[24px] font-black">{(totalIncome - receivedIncome).toFixed(0)}.-</p>
                    {unpaidCount > 0 && <span className="absolute -top-1 -right-1 animate-ping h-4 w-4 rounded-full bg-white opacity-75"></span>}
                </div>
              </div>

              {/* บัญชีธนาคาร */}
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl">
                <p className="text-[12px] font-bold opacity-60 border-b border-white/20 pb-1 mb-4">{bankName}</p>
                <p className="text-[28px] font-black tracking-widest leading-none mb-1">{accountNumber}</p>
                <p className="text-[16px] font-bold opacity-90">{accountName}</p>
                {bankQRImage && <div className="flex justify-center mt-6"><img src={bankQRImage} className="w-40 h-40 bg-white p-3 rounded-[2rem] shadow-inner" /></div>}
              </div>

              {/* รายชื่อเพื่อนๆ และสถานะจ่ายเงิน */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="font-black text-slate-700 text-[14px]">บันทึกความสุข</h3>
                    <input placeholder="🔍 ค้นหาเพื่อน..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-1/2 p-3 bg-slate-50 rounded-2xl text-[14px] outline-none border border-slate-100" />
                </div>
                
                {players.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-4 rounded-3xl border-2 transition-all ${p.paid ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-rose-50 border-rose-300 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                          <img src={p.avatar} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm" />
                          {/* แก้ไข className ที่พิมพ์ซ้อนกันแล้ว */}
                          <button 
                            onClick={async () => {
                              if(confirm(`ยืนยันลบ ${p.name} ออกจากกลุ่ม?`)) {
                                await supabase.from('players').delete().eq('id', p.id);
                                await fetchOnlineData();
                              }
                            }} 
                            className="absolute -top-2 -left-2 bg-white shadow-md rounded-full w-6 h-6 text-[10px] flex items-center justify-center text-rose-500 border border-rose-100 font-bold active:scale-90 transition-all"
                          >✕</button>
                      </div>
                      <div>
                          <p className={`text-[16px] font-black ${p.paid ? 'text-emerald-700' : 'text-rose-700'}`}>{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-bold">เกม: {p.gamesPlayed} | ลูก: {p.shuttlesInvolved || 0}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-[20px] font-black ${p.paid ? 'text-emerald-600' : 'text-rose-600'}`}>{calculateFee(p).toFixed(0)}.-</p>
                      <div className="flex gap-1 mt-1">
                        <button 
                          onClick={async () => {
                            const newStatus = !(p.paid && p.payType === 'โอน');
                            await supabase.from('players').update({ paid: newStatus, payType: 'โอน' }).eq('id', p.id);
                            await fetchOnlineData();
                          }} 
                          className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 transition-all ${p.paid && p.payType==='โอน' ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                        >โอน</button>

                        <button 
                          onClick={async () => {
                            const newStatus = !(p.paid && p.payType === 'เงินสด');
                            await supabase.from('players').update({ paid: newStatus, payType: 'เงินสด' }).eq('id', p.id);
                            await fetchOnlineData();
                          }} 
                          className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 transition-all ${p.paid && p.payType==='เงินสด' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                        >สด</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        )}

        {/* TAB: RANKING - อันดับ */}
        {activeTab === 'ranking' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-500 pb-20">
            <div className="flex justify-between items-end px-2 mb-2">
              <div>
                <h2 className="text-[24px] font-black text-slate-800">ทำเนียบยอดฝีมือ 🏆</h2>
                <p className="text-[12px] font-bold text-slate-400">รอยยิ้มสำคัญกว่าชัยชนะ</p>
              </div>
              {/* ปุ่ม Refresh แต้มเผื่อแอดมินอยากอัปเดตแต้มทันที */}
              <button 
                onClick={() => fetchOnlineData()} 
                className="bg-slate-100 p-2 rounded-xl text-[14px] active:rotate-180 transition-all duration-500"
              >
                🔄
              </button>
            </div>

            {/* เรียงลำดับจากแต้มมากไปน้อย และดึงข้อมูลมาแสดง */}
            {[...players].sort((a,b) => b.points - a.points).map((p, idx) => {
              const crowns = ["🥇", "🥈", "🥉"];
              const titles = ["🌟 ขวัญใจก๊วนเสน่ห์", "🔥 จอมพลังประจำบ้าน", "☁️ รอยยิ้มของสนาม"];
              
              return (
                <div 
                  key={p.id} 
                  className={`bg-white p-5 rounded-[2.5rem] flex items-center justify-between border-2 transition-all 
                    ${idx < 3 ? 'border-amber-100 shadow-xl shadow-amber-50/50 scale-[1.02]' : 'border-slate-50 opacity-90'}`}
                >
                  <div className="flex items-center gap-4">
                      {/* ลำดับที่ หรือ มงกุฎ */}
                      <div className="w-8 flex justify-center">
                        {idx < 3 ? (
                          <span className="text-[28px]">{crowns[idx]}</span>
                        ) : (
                          <span className="text-[18px] font-black text-slate-200">{idx + 1}</span>
                        )}
                      </div>

                      {/* รูปโปรไฟล์ */}
                      <div className="relative">
                        <img 
                          src={p.avatar} 
                          className={`w-14 h-14 rounded-[1.2rem] object-cover bg-slate-100 border-2 
                            ${idx === 0 ? 'border-amber-400' : 'border-white'}`} 
                        />
                        {idx === 0 && (
                          <span className="absolute -top-2 -right-2 text-[16px]">👑</span>
                        )}
                      </div>

                      {/* ชื่อและสถิติ */}
                      <div>
                        <p className="font-black text-[18px] text-slate-700 leading-tight">{p.name}</p>
                        <div className="flex items-center gap-1">
                          <p className={`text-[11px] font-bold ${idx < 3 ? 'text-indigo-500' : 'text-slate-400'}`}>
                            {idx < 3 ? titles[idx] : `สถิติวันนี้: ชนะ ${p.wins || 0} ครั้ง`}
                          </p>
                        </div>
                      </div>
                  </div>

                  {/* คะแนน */}
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl text-center min-w-[70px]">
                      <p className="text-[22px] font-black text-indigo-600 leading-none">{p.points || 0}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Points</p>
                  </div>
                </div>
              );
            })}

            {/* กรณีไม่มีนักกีฬาในลิสต์ */}
            {players.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-300 font-bold">ยังไม่มีข้อมูลยอดฝีมือในวันนี้...</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ADMIN - ตั้งค่าเต็มรูปแบบ */}
        {activeTab === 'admin' && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-500 text-[14px]">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-[20px] font-black">ดูแลระบบก๊วน ⚙️</h2>
              <span className="text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black">ONLINE MODE</span>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 border border-slate-50">
              
              {/* 1. ข้อมูลก๊วน */}
              <div className="space-y-4">
                <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">1. ข้อมูลก๊วน & จำนวนคน</p>
                <div>
                  <label className="text-[11px] text-slate-400 font-bold ml-2">ชื่อบ้านแบดเรา</label>
                  <input value={gameRuleName} onChange={(e)=>setGameRuleName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-indigo-600 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold ml-2">สมาชิกสูงสุด</label>
                    <input type="number" value={maxPlayers} onChange={(e)=>setMaxPlayers(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold ml-2">รูปแบบเซต</label>
                    <select value={gameFormat} onChange={(e)=>setGameFormat(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none">
                      <option value="1set">1 เซตจบ</option>
                      <option value="2sets">2 เซต (มีเสมอ)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. รูปแบบค่าใช้จ่าย */}
              <div className="space-y-4">
                <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">2. รูปแบบค่าใช้จ่าย</p>
                <select value={calcModel} onChange={(e)=>setCalcModel(e.target.value)} className="w-full p-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl border-2 border-indigo-100 outline-none">
                  <option value="case1">แบบที่ 1: ค่าสนาม + ลูกตามจริง</option>
                  <option value="case2">แบบที่ 2: เหมาจ่ายราคาเดียว</option>
                  <option value="case3">แบบที่ 3: หารเฉลี่ยทั้งหมด</option>
                </select>

                <div className="grid grid-cols-2 gap-4">
                  {calcModel === 'case1' && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลงสนาม (บาท)</label>
                        <input type="number" value={fixedEntryFee} onChange={(e)=>setFixedEntryFee(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลูกแบด (ต่อลูก)</label>
                        <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                    </>
                  )}

                  {calcModel === 'case2' && (
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-400 font-bold block text-center mb-1">ราคาเหมาจ่ายต่อคน (บาท)</label>
                      <input type="number" value={costPerPerson} onChange={(e)=>setCostPerPerson(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center outline-none" />
                    </div>
                  )}

                  {calcModel === 'case3' && (
                    <>
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าสนามรวม (บาท)</label>
                        <input type="number" value={totalCourtCost} onChange={(e)=>setTotalCourtCost(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลูกรวม (บาท)</label>
                        <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 3. ช่องทางสนับสนุน (Online) */}
              <div className="space-y-4">
                <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">3. ช่องทางสนับสนุนก๊วน (QR)</p>
                <input value={bankName} onChange={(e)=>setBankName(e.target.value)} placeholder="ชื่อธนาคาร" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                <input value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} placeholder="เลขบัญชี" className="w-full p-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl outline-none" />
                <input value={accountName} onChange={(e)=>setAccountName(e.target.value)} placeholder="ชื่อบัญชี" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                <div onClick={()=>fileInputRef.current.click()} className="w-full aspect-square max-w-[140px] mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden active:scale-95 transition-all">
                  {bankQRImage ? <img src={bankQRImage} className="w-full h-full object-contain" /> : <span className="text-[12px] text-slate-400 font-bold uppercase">อัปโหลด QR</span>}
                </div>
                <input type="file" ref={fileInputRef} onChange={(e)=>{const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>setBankQRImage(r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
              </div>

{/* 4. จัดการสนาม (Online) */}
<div className="space-y-4">
  <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">4. จัดการเพิ่ม/ลดสนาม</p>
  
  <div className="flex gap-2">
    {/* ปุ่มเพิ่มสนามแบบใหม่ (ไม่ต้องพิมพ์เลข ID เอง ระบบรันให้อัตโนมัติ) */}
    <button 
      onClick={addCourt} 
      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[16px] shadow-md shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2"
    >
      <PlusCircle size={20} /> เพิ่มสนามใหม่
    </button>

    {/* ปุ่มลบสนามล่าสุด */}
    <button 
      onClick={removeCourt} 
      className="px-6 py-4 bg-rose-100 text-rose-500 rounded-2xl font-black active:scale-95 transition-all"
    >
      <MinusCircle size={20} />
    </button>
  </div>

  {/* แสดงรายชื่อสนามที่มีอยู่ (กดเพื่อลบรายสนามได้) */}
  <div className="flex flex-wrap gap-2">
    {courts.map(c => (
      <span 
        key={c.id} 
        onClick={async () => {
          if(confirm(`ต้องการลบสนาม ${c.name} ใช่ไหม?`)) {
            await supabase.from('courts').delete().eq('id', c.id);
          }
        }} 
        className="bg-slate-50 text-slate-500 px-4 py-2 rounded-2xl text-[12px] font-black border border-slate-100 cursor-pointer hover:bg-rose-500 hover:text-white transition-all"
      >
        {c.name} ✕
      </span>
    ))}
  </div>
</div>

              <div className="pt-4 border-t border-slate-50">
                <button 
                  onClick={async () => {
                    if(confirm('คุณแน่ใจว่าต้องการล้างข้อมูลผู้เล่นทั้งหมด? (เริ่มก๊วนใหม่)')){
                      await supabase.from('players').delete().neq('id', '0'); // ลบทุกคน
                      await supabase.from('courts').update({ status: 'available', teamA: [], teamB: [], startTime: null }).neq('id', '0');
                      alert('ล้างข้อมูลสำเร็จ!');
                      await fetchOnlineData();
                    }
                  }} 
                  className="w-full py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[13px] active:bg-rose-500 active:text-white transition-all"
                >
                  ล้างรายชื่อนักกีฬา & เริ่มก๊วนใหม่
                </button>
              </div>
            </div>
          </div>
        )}
      
      </main>

    {/* FOOTER NAVIGATION - แถบเมนูด้านล่าง */}
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-50 px-6 py-5 flex justify-between items-center z-50 rounded-t-[3rem] shadow-2xl">
      <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-pink-500 font-black scale-110' : 'text-slate-300 font-bold'}`}>
        <span className="text-[26px]">🏠</span><span className="text-[12px]">หน้าสนาม</span>
      </button>
      <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-pink-500 font-black scale-110' : 'text-slate-300 font-bold'}`}>
        <span className="text-[26px]">💰</span><span className="text-[12px]">การเงิน</span>
      </button>
      <button onClick={() => setActiveTab('ranking')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ranking' ? 'text-pink-500 font-black scale-110' : 'text-slate-300 font-bold'}`}>
        <span className="text-[26px]">🏆</span><span className="text-[12px]">อันดับ</span>
      </button>
      <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'admin' ? 'text-pink-500 font-black scale-110' : 'text-slate-300 font-bold'}`}>
        <span className="text-[26px]">⚙️</span><span className="text-[12px]">ตั้งค่า</span>
      </button>
    </nav>

    {/* 1. CONFIRM MODAL - ยืนยันการเพิ่มสมาชิกใหม่ขึ้น Cloud */}
    {confirmModal.show && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-t-8 border-pink-500">
          <h3 className="text-[22px] font-black mb-2 text-slate-700">พร้อมสนุกหรือยังจ๊ะ? 🏠</h3>
          <p className="text-slate-400 mb-8 font-bold text-[16px]">ยินดีต้อนรับคุณ <span className="text-pink-500">{confirmModal.name}</span> กลับบ้านนะจ๊ะ พร้อมลุยหรือยังเอ่ย?</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={async () => {
                const newP = { 
                  name: confirmModal.name, 
                  gamesPlayed: 0, 
                  wins: 0, 
                  points: 0, 
                  status: 'waiting', 
                  shuttlesInvolved: 0, 
                  avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${confirmModal.name + Date.now()}`, 
                  paid: false, 
                  payType: '' 
                };
                
                // แก้ไข: ส่งข้อมูลขึ้น Supabase
                const { error } = await supabase.from('players').insert([newP]);
                
                if (error) {
                  alert('อุ๊ย! ลงชื่อไม่สำเร็จ ลองใหม่อีกครั้งนะจ๊ะ');
                } else {
                  setPlayerName(''); 
                  setConfirmModal({ show: false, name: '' });
                  setAlertModal({ show: true, title: 'บันทึกเรียบร้อยจ้า! ✨', message: 'ลงชื่อสำเร็จแล้วน้า ขอให้เป็นวันที่สนุกที่สุดนะจ๊ะ', type: 'info' });
                  await fetchOnlineData(); // ดึงข้อมูลใหม่เพื่อให้ชื่อปรากฏทันที
                }
              }} 
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[18px] shadow-lg active:scale-95 transition-all"
            >
              ยืนยันเลยจ้า!
            </button>
            <button onClick={() => setConfirmModal({ show: false, name: '' })} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold active:bg-slate-100">
              วอร์มร่างกายก่อนนะ
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 2. ALERT MODAL - แจ้งเตือนทั่วไป */}
    {alertModal.show && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-sm">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-xl border-b-8 border-indigo-500 animate-in zoom-in duration-300">
          <h3 className="text-[22px] font-black mb-2 text-indigo-600">{alertModal.title}</h3>
          <p className="text-slate-500 mb-8 font-bold text-[16px] leading-relaxed">{alertModal.message}</p>
          <button onClick={() => setAlertModal({ ...alertModal, show: false })} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-[18px] shadow-lg active:scale-95 transition-all">รับทราบจ้า ❤️</button>
        </div>
      </div>
    )}

    {/* 3. SHUTTLE MODAL - บันทึกจำนวนลูกแบดหลังจบเกม */}
    {shuttleModal.show && (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-900/60 backdrop-blur-md">
        <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <h3 className="text-[20px] font-black mb-2 text-indigo-600 uppercase tracking-tighter leading-tight">เหนื่อยไหมจ๊ะ? <br/>ใช้ลูกแบดกี่ลูกเอ่ย? 🏸</h3>
          <p className="text-slate-400 font-bold mb-6 text-[14px]">พักจิบน้ำแล้วบอกนิดนึงนะจ๊ะ</p>
          <div className="grid grid-cols-3 gap-3 my-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button 
                key={n} 
                onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} 
                className="py-5 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-2xl font-black text-[24px] transition-all active:scale-90 shadow-sm border border-indigo-100 text-indigo-600"
              >
                {n}
              </button>
            ))}
          </div>
          <button onClick={() => setShuttleModal({ show: false, courtId: null, winner: null })} className="text-slate-300 font-bold text-[14px] underline hover:text-rose-400 transition-colors">ยกเลิกบันทึก</button>
        </div>
      </div>
    )}
  </div>
);
}































