"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function BadmintonUltimatePro() {
  // --- [1] STATES ---
  const [activeTab, setActiveTab] = useState('home'); 
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [courts, setCourts] = useState([]);
  const [newCourtNumber, setNewCourtNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, name: '' });
  const [shuttleModal, setShuttleModal] = useState({ show: false, courtId: null, winner: null });

  // --- [2] ADMIN & RULES ---
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

  // --- [3] PERSISTENCE & AUTO-SAVE ---
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const saved = localStorage.getItem('badminton_v26_pro');
    if (saved) {
      const d = JSON.parse(saved);
      setPlayers(d.players || []);
      setCourts(d.courts || []);
      setGameRuleName(d.gameRuleName || 'ก๊วนเสน่ห์ แบดมินตันอบอุ่น 🏸');
      setMaxMembers(d.maxMembers || 30);
      setCalcModel(d.calcModel || 'case1');
      setGameFormat(d.gameFormat || '2sets');
      setFixedEntryFee(d.fixedEntryFee || 90);
      setShuttlePrice(d.shuttlePrice || 20);
      setFixedPricePerPerson(d.fixedPricePerPerson || 200);
      setTotalCourtCost(d.totalCourtCost || 0);
      setBankName(d.bankName || 'ธนาคารกสิกรไทย');
      setAccountNumber(d.accountNumber || '000-0-0000-000');
      setAccountName(d.accountName || 'ระบุชื่อบัญชี');
      setBankQRImage(d.bankQRImage || null);
    }
  }, []);

  useEffect(() => {
    const data = { players, courts, gameRuleName, maxMembers, calcModel, gameFormat, fixedEntryFee, shuttlePrice, fixedPricePerPerson, totalCourtCost, bankName, accountNumber, accountName, bankQRImage };
    localStorage.setItem('badminton_v26_pro', JSON.stringify(data));
  }, [players, courts, gameRuleName, maxMembers, calcModel, gameFormat, fixedEntryFee, shuttlePrice, fixedPricePerPerson, totalCourtCost, bankName, accountNumber, accountName, bankQRImage]);

  // --- [4] LOGIC FUNCTIONS ---
  const handleAddPlayer = () => {
    if (!playerName.trim()) return;
    if (players.length >= maxMembers) {
      setAlertModal({ 
        show: true, 
        title: 'ก๊วนอบอุ่นจนเต็มแล้วจ้า! 🏠', 
        message: `ตอนนี้เพื่อนๆ มาจอยกันครบ ${maxMembers} คนแล้วจ้ะ ไว้รอบหน้ามาสนุกด้วยกันใหม่น้า`,
        type: 'info'
      });
      return;
    }
    setConfirmModal({ show: true, name: playerName });
  };

  const calculateFee = (p) => {
    if (calcModel === 'case1') return fixedEntryFee + ((p.shuttlesInvolved || 0) * shuttlePrice);
    if (calcModel === 'case2') return fixedPricePerPerson;
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

  const finalizeMatch = (courtId, winner, numShuttles) => {
    const court = courts.find(c => c.id === courtId);
    const participants = [...court.teamA.map(p=>p.id), ...court.teamB.map(p=>p.id)];
    setPlayers(prev => prev.map(p => {
      if (participants.includes(p.id)) {
        const isWin = (winner === 'A' && court.teamA.some(a=>a.id===p.id)) || (winner === 'B' && court.teamB.some(b=>b.id===p.id));
        const pts = winner === 'Draw' ? 5 : (isWin ? 10 : 2);
        return { ...p, status: 'waiting', gamesPlayed: p.gamesPlayed + 1, wins: isWin ? p.wins + 1 : p.wins, points: p.points + pts, shuttlesInvolved: (p.shuttlesInvolved || 0) + numShuttles };
      }
      return p;
    }));
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'available', teamA: [], teamB: [], startTime: null } : c));
    setShuttleModal({ show: false, courtId: null, winner: null });
  };

  const handleResetDay = () => {
    if (confirm('ต้องการล้างรายชื่อนักกีฬาเพื่อเริ่มวันใหม่ใช่ไหม? (ข้อมูลการจ่ายเงินจะหายไป)')) {
      setPlayers([]);
      setCourts(courts.map(c => ({ ...c, status: 'available', teamA: [], teamB: [] })));
    }
  };

  // --- ฟังก์ชันเสริม: สรุปยอดสำหรับ LINE (ก๊วนเสน่ห์) ---
  const generateLineSummary = () => {
    const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' });
    let summaryText = `✨ *** สรุปยอดก๊วนเสน่ห์ (${dateStr}) *** ✨\n`;
    summaryText += `--------------------------\n`;
    players.forEach((p, index) => {
      const fee = calculateFee(p);
      const payStatus = p.paid ? `✅ (${p.payType})` : `⏳ รอโอนน้า`;
      summaryText += `${index + 1}. ${p.name}: ${fee.toFixed(0)}.- ${payStatus}\n`;
    });
    summaryText += `--------------------------\n`;
    if (calcModel === 'case1') summaryText += `📝 ค่าสนาม ${fixedEntryFee}.- + ลูกแบดลูกละ ${shuttlePrice}.-\n`;
    else if (calcModel === 'case2') summaryText += `📝 ราคาเหมาจ่ายอบอุ่นคนละ ${fixedPricePerPerson}.-\n`;
    else if (calcModel === 'case3') summaryText += `📝 หารเฉลี่ยค่าความสนุกเท่ากันทุกคนจ้า\n`;
    summaryText += `\n💰 รวมยอดวันนี้: ${totalIncome.toFixed(0)} บาท\n`;
    summaryText += `🏦 ${bankName}\nเลขบัญชี: ${accountNumber}\nชื่อ: ${accountName}\n`;
    summaryText += `\nขอบคุณที่มาเติมเต็มรอยยิ้มให้กันนะจ๊ะ! ❤️🏸`;
    navigator.clipboard.writeText(summaryText).then(() => {
      setAlertModal({ show: true, title: 'คัดลอกเรียบร้อย! 💌', message: 'นำไปวางใน LINE แจ้งเพื่อนๆ ได้เลยน้า ข้อมูลอยู่ในเครื่องแล้วจ้า' });
    });
  };

  // Finance Summary
  const paidCount = players.filter(p => p.paid).length;
  const unpaidCount = players.length - paidCount;
  const totalIncome = players.reduce((sum, p) => sum + calculateFee(p), 0);
  const receivedIncome = players.filter(p => p.paid).reduce((sum, p) => sum + calculateFee(p), 0);

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-36 text-slate-700" style={{ fontFamily: "'Mali', cursive" }}>
      
      {/* HEADER */}
      <header className="bg-white/95 backdrop-blur-md p-6 sticky top-0 z-40 border-b border-pink-50 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-[20px] font-bold text-pink-500 leading-none">{gameRuleName}</h1>
          <p className="text-[14px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Active: {players.length}/{maxMembers}</p>
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

            <div className="space-y-4">
              {courts.map(court => (
                <div key={court.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-indigo-400 font-black text-[14px] uppercase tracking-tighter">Court {court.id}</span>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${court.status === 'busy' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {court.status === 'busy' ? `กำลังปล่อยพลัง (เริ่ม ${court.startTime})` : 'สนามว่างรอเพื่อนๆ'}
                    </span>
                  </div>
                  {court.status === 'busy' ? (
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
                  ) : (
                    <button onClick={() => {
                      const waiting = players.filter(p => p.status === 'waiting');
                      if (waiting.length < 4) return setAlertModal({show:true, title:'เพื่อนยังมาไม่ครบจ้า', message:'ต้องการนักกีฬาที่ว่างอย่างน้อย 4 คนนะจ๊ะ'});
                      const selected = [...waiting].sort((a,b)=>a.gamesPlayed - b.gamesPlayed).slice(0,4).sort(()=>Math.random()-0.5);
                      setPlayers(players.map(p=>selected.find(s=>s.id===p.id)?{...p, status:'playing'}:p));
                      setCourts(courts.map(c=>c.id===court.id?{...c, status:'busy', teamA:selected.slice(0,2), teamB:selected.slice(2,4), startTime:new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}:c));
                    }} className="w-full py-12 border-2 border-dashed border-indigo-100 rounded-[2.5rem] text-indigo-300 font-black text-[16px] flex flex-col items-center gap-2 active:scale-95 transition-all">
                      <span className="text-4xl">🏸</span><span>จัดทีมลงสนาม</span>
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

             <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl">
                <p className="text-[12px] font-bold opacity-60 border-b border-white/20 pb-1 mb-4">{bankName}</p>
                <p className="text-[28px] font-black tracking-widest leading-none mb-1">{accountNumber}</p>
                <p className="text-[16px] font-bold opacity-90">{accountName}</p>
                {bankQRImage && <div className="flex justify-center mt-6"><img src={bankQRImage} className="w-40 h-40 bg-white p-3 rounded-[2rem] shadow-inner" /></div>}
             </div>

             <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center px-2">
                   <h3 className="font-black text-slate-700 text-[14px]">บันทึกความสุข</h3>
                   <input placeholder="🔍 ค้นหาเพื่อน..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-1/2 p-3 bg-slate-50 rounded-2xl text-[14px] outline-none border border-slate-100" />
                </div>
                
                {players.filter(p=>p.name.includes(searchQuery)).map(p => (
                  <div key={p.id} className={`flex justify-between items-center p-4 rounded-3xl border-2 transition-all ${p.paid ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-rose-50 border-rose-300 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                         <img src={p.avatar} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm" />
                         <button onClick={()=>setPlayers(players.filter(pl=>pl.id!==p.id))} className="absolute -top-2 -left-2 bg-white shadow-md rounded-full w-6 h-6 text-[10px] flex items-center justify-center text-rose-500 border border-rose-100 font-bold">✕</button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className={`text-[16px] font-black ${p.paid ? 'text-emerald-700' : 'text-rose-700'}`}>{p.name}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold">เกมที่เล่น: {p.gamesPlayed} | ลูกแบด: {p.shuttlesInvolved || 0}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[20px] font-black ${p.paid ? 'text-emerald-600' : 'text-rose-600'}`}>{calculateFee(p).toFixed(0)}.-</p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={()=>setPlayers(players.map(pl=>pl.id===p.id?{...pl, paid:!pl.paid, payType:'โอน'}:pl))} className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 ${p.paid && p.payType==='โอน' ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>โอน</button>
                        <button onClick={()=>setPlayers(players.map(pl=>pl.id===p.id?{...pl, paid:!pl.paid, payType:'เงินสด'}:pl))} className={`text-[10px] font-black px-3 py-2 rounded-xl border-2 ${p.paid && p.payType==='เงินสด' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>สด</button>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB: RANKING - อันดับ */}
        {activeTab === 'ranking' && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
            <h2 className="text-[20px] font-black px-2 flex justify-between items-center">
                ทำเนียบยอดฝีมือ 🏆
                <span className="text-[10px] font-bold text-slate-300">รอยยิ้มสำคัญกว่าชัยชนะ</span>
            </h2>
            {players.sort((a,b)=>b.points - a.points).map((p,idx)=>{
              const crowns = ["🥇", "🥈", "🥉"];
              const titles = ["🌟 ขวัญใจก๊วนเสน่ห์", "🔥 จอมพลังประจำบ้าน", "☁️ รอยยิ้มของสนาม"];
              return (
                <div key={p.id} className={`bg-white p-5 rounded-[2rem] flex items-center justify-between border-2 ${idx < 3 ? 'border-amber-100 shadow-amber-50 shadow-lg' : 'border-slate-50'}`}>
                   <div className="flex items-center gap-4">
                      <span className="text-[20px] font-black w-8 text-center text-slate-200">{idx > 2 ? idx+1 : crowns[idx]}</span>
                      <img src={p.avatar} className="w-14 h-14 rounded-3xl bg-pink-50 border border-pink-100" />
                      <div>
                        <p className="font-black text-[18px] text-slate-700">{p.name}</p>
                        <p className="text-[12px] text-indigo-400 font-bold">{idx < 3 ? titles[idx] : `สถิติวันนี้ ชนะ ${p.wins} ครั้ง`}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[22px] font-black text-indigo-500 leading-none">{p.points}</p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase">Points</p>
                   </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: ADMIN - ตั้งค่าเต็มรูปแบบ */}
        {activeTab === 'admin' && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-500 text-[14px]">
             <h2 className="text-[20px] font-black px-2">ดูแลระบบก๊วน ⚙️</h2>
             <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8">
                
                <div className="space-y-4">
                   <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">1. ข้อมูลก๊วน & จำนวนคน</p>
                   <div>
                      <label className="text-[11px] text-slate-400 font-bold ml-2">ชื่อบ้านแบดเรา</label>
                      <input value={gameRuleName} onChange={(e)=>setGameRuleName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-indigo-600" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[11px] text-slate-400 font-bold ml-2">สมาชิกสูงสุด</label>
                         <input type="number" value={maxMembers} onChange={(e)=>setMaxMembers(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black" />
                      </div>
                      <div>
                         <label className="text-[11px] text-slate-400 font-bold ml-2">รูปแบบเซต</label>
                         <select value={gameFormat} onChange={(e)=>setGameFormat(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black">
                            <option value="1set">1 เซตจบ</option>
                            <option value="2sets">2 เซต (มีเสมอ)</option>
                         </select>
                      </div>
                   </div>
                </div>
<div className="space-y-4">
  <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">2. รูปแบบค่าใช้จ่าย</p>
  <select value={calcModel} onChange={(e)=>setCalcModel(e.target.value)} className="w-full p-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl border-2 border-indigo-100">
    <option value="case1">แบบที่ 1: ค่าสนาม + ลูกตามจริง</option>
    <option value="case2">แบบที่ 2: เหมาจ่ายราคาเดียว</option>
    <option value="case3">แบบที่ 3: หารเฉลี่ยทั้งหมด</option>
  </select>

  <div className="grid grid-cols-2 gap-4">
    {/* แบบที่ 1: ค่าสนาม + ลูกตามจริง */}
    {calcModel === 'case1' && (
      <>
        <div>
          <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลงสนาม</label>
          <input type="number" value={fixedEntryFee} onChange={(e)=>setFixedEntryFee(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลูกแบด</label>
          <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
        </div>
      </>
    )}

    {/* แบบที่ 2: เหมาจ่ายราคาเดียว */}
    {calcModel === 'case2' && (
      <div className="col-span-2">
        <label className="text-[11px] text-slate-400 font-bold block text-center mb-1">ราคาเหมาจ่าย</label>
        <input type="number" value={fixedPricePerPerson} onChange={(e)=>setFixedPricePerPerson(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center" />
      </div>
    )}

    {/* แบบที่ 3: หารเฉลี่ยทั้งหมด */}
    {calcModel === 'case3' && (
      <>
        <div>
          <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าสนามทั้งหมด</label>
          <input type="number" value={totalCourtCost} onChange={(e)=>setTotalCourtCost(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 font-bold ml-2">ค่าลูกแบด</label>
          <input type="number" value={shuttlePrice} onChange={(e)=>setShuttlePrice(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
        </div>
      </>
    )}
  </div>
</div>
                <div className="space-y-4">
                   <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">3. ช่องทางสนับสนุนก๊วน (QR)</p>
                   <input value={bankName} onChange={(e)=>setBankName(e.target.value)} placeholder="ชื่อธนาคาร" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
                   <input value={accountNumber} onChange={(e)=>setAccountNumber(e.target.value)} placeholder="เลขบัญชี" className="w-full p-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl" />
                   <input value={accountName} onChange={(e)=>setAccountName(e.target.value)} placeholder="ชื่อบัญชี" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
                   <div onClick={()=>fileInputRef.current.click()} className="w-full aspect-square max-w-[140px] mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden active:scale-95 transition-all">
                      {bankQRImage ? <img src={bankQRImage} className="w-full h-full object-contain" /> : <span className="text-[12px] text-slate-400 font-bold uppercase">อัปโหลด QR</span>}
                   </div>
                   <input type="file" ref={fileInputRef} onChange={(e)=>{const f=e.target.files[0]; if(f){const r=new FileReader(); r.onloadend=()=>setBankQRImage(r.result); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
                </div>

                <div className="space-y-4">
                   <p className="text-[12px] font-black text-pink-500 uppercase border-b border-pink-50 pb-2">4. จัดการสนาม</p>
                   <div className="flex gap-2">
                      <input value={newCourtNumber} onChange={(e)=>setNewCourtNumber(e.target.value)} placeholder="เลขสนาม เช่น 5" className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold" />
                      <button onClick={()=>{if(newCourtNumber){setCourts([...courts,{id:newCourtNumber, status:'available', teamA:[], teamB:[]}]); setNewCourtNumber('');}}} className="bg-emerald-500 text-white px-8 rounded-2xl font-black text-[20px] shadow-md shadow-emerald-100">+</button>
                   </div>
                   <div className="flex flex-wrap gap-2">{courts.map(c=><span key={c.id} onClick={()=>setCourts(courts.filter(ct=>ct.id!==c.id))} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-2xl text-[12px] font-black border border-rose-100 cursor-pointer">Court {c.id} ✕</span>)}</div>
                </div>
                
                <button onClick={()=>{if(confirm('ต้องการล้างการตั้งค่าทั้งหมดใช่ไหม? ข้อมูลจะหายถาวร!')){localStorage.clear();window.location.reload();}}} className="w-full text-rose-300 text-[12px] font-black underline py-4">ล้างข้อมูลแอปทั้งหมด (Factory Reset)</button>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER NAVIGATION */}
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

      {/* MODALS SECTION */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-t-8 border-pink-500">
            <h3 className="text-[22px] font-black mb-2 text-slate-700">พร้อมสนุกหรือยังจ๊ะ? 🏠</h3>
            <p className="text-slate-400 mb-8 font-bold text-[16px]">ยินดีต้อนรับคุณ <span className="text-pink-500">{confirmModal.name}</span> กลับบ้านนะจ๊ะ พร้อมลุยหรือยังเอ่ย?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => {
                const newP = { id: Date.now(), name: confirmModal.name, gamesPlayed: 0, wins: 0, points: 0, status: 'waiting', shuttlesInvolved: 0, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${confirmModal.name + Math.random()}`, paid: false, payType: '' };
                setPlayers([...players, newP]); 
                setPlayerName(''); 
                setConfirmModal({ show: false, name: '' });
                setAlertModal({ show: true, title: 'บันทึกเรียบร้อยจ้า! ✨', message: 'ลงชื่อสำเร็จแล้วน้า ขอให้เป็นวันที่สนุกที่สุดนะจ๊ะ' });
              }} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[18px] shadow-lg">ยืนยันเลยจ้า!</button>
              <button onClick={() => setConfirmModal({ show: false, name: '' })} className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold">วอร์มร่างกายก่อนนะ</button>
            </div>
          </div>
        </div>
      )}

      {alertModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-xl border-b-8 border-indigo-500">
            <h3 className="text-[22px] font-black mb-2 text-indigo-600">{alertModal.title}</h3>
            <p className="text-slate-500 mb-8 font-bold text-[16px] leading-relaxed">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ ...alertModal, show: false })} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-[18px]">รับทราบจ้า ❤️</button>
          </div>
        </div>
      )}

      {shuttleModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl">
            <h3 className="text-[20px] font-black mb-2 text-indigo-600 uppercase tracking-tighter">เหนื่อยไหมจ๊ะ? ใช้ลูกแบดกี่ลูกเอ่ย? 🏸</h3>
            <p className="text-slate-400 font-bold mb-6 text-[14px]">พักจิบน้ำแล้วบอกนิดนึงนะจ๊ะ</p>
            <div className="grid grid-cols-3 gap-3 my-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => finalizeMatch(shuttleModal.courtId, shuttleModal.winner, n)} className="py-5 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-2xl font-black text-[22px] transition-all active:scale-90 shadow-sm border border-indigo-100">{n}</button>
              ))}
            </div>
            <button onClick={() => setShuttleModal({ show: false, courtId: null, winner: null })} className="text-slate-300 font-bold text-[14px] underline">ยกเลิกบันทึก</button>
          </div>
        </div>
      )}
    </div>
  );
}




