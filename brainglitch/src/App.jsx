import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Brain, Heart, Trophy, Share2, User, School, Volume2, VolumeX, Flame, Swords, Crown, Pause, Play, AlertTriangle, Edit3, Zap, Instagram } from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDCmU-flSumtL017Pk2bWf_MhnNOKzDuxQ",
  authDomain: "brain-glitch.firebaseapp.com",
  projectId: "brain-glitch",
  storageBucket: "brain-glitch.firebasestorage.app",
  messagingSenderId: "905708629011",
  appId: "1:905708629011:web:bf770b1fd0c32d3560a3e6"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'brain-glitch-fairplay-v1';

// --- Tier Data ---
const TIERS = [
  { min: 0, name: "단세포", emoji: "🫧" },
  { min: 11, name: "플랑크톤", emoji: "🌿" },
  { min: 21, name: "금붕어", emoji: "🐠" },
  { min: 31, name: "침팬지", emoji: "🦧" },
  { min: 41, name: "일반인", emoji: "🧍" }, 
  { min: 51, name: "지성체", emoji: "🧠" }, 
  { min: 71, name: "천재", emoji: "🔮" },
  { min: 101, name: "멘사", emoji: "⚛️" },
  { min: 151, name: "초인", emoji: "⚡" },
  { min: 201, name: "신", emoji: "👑" },
];

const getTier = (s) => [...TIERS].reverse().find(t => s >= t.min) || TIERS[0];

const RULE_SETS = [
  { id: 'color', leftText: "🔵 파란색", rightText: "🔴 빨간색", left: ["💧", "📘", "💎", "🧢", "👖", "🐬"], right: ["🍎", "🍓", "🎈", "🥊", "🍅", "🍒"] },
  { id: 'color_rev', leftText: "🔴 빨간색", rightText: "🔵 파란색", left: ["🍎", "🍓", "🎈", "🥊", "🍅", "🍒"], right: ["💧", "📘", "💎", "🧢", "👖", "🐬"] },
  { id: 'food', leftText: "💻 전자기기", rightText: "🍔 음식", left: ["💻", "📱", "🎧", "📷", "📺", "⌨️"], right: ["🍔", "🍕", "🍣", "🍩", "🍗", "🥐"] },
  { id: 'nature', leftText: "🌲 식물", rightText: "🐶 동물", left: ["🌲", "🌻", "🌵", "🌴", "🍀", "🌷"], right: ["🐶", "🐱", "🦊", "🐯", "🐰", "🐼"] },
  { id: 'temp', leftText: "🔥 뜨거운 것", rightText: "🧊 차가운 것", left: ["🔥", "☀️", "🌋", "♨️", "🍵", "🍳"], right: ["🧊", "⛄", "🍦", "❄️", "🍧", "🐧"] },
  { id: 'speed', leftText: "🚀 빠른 것", rightText: "🐢 느린 것", left: ["🚀", "⚡", "✈️", "🚅", "🏎️", "🐆"], right: ["🐢", "🦥", "🚜", "🚲", "🐨", "⛴️"] },
];

const TRAPS = ["👾", "💣", "🛑", "⚠️"];

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ name: '', school: '', code: '' });
  const [gameState, setGameState] = useState('LOADING');
  const [showSetup, setShowSetup] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSchool, setFormSchool] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(100);
  const [currentItem, setCurrentItem] = useState("");
  const [currentRule, setCurrentRule] = useState(RULE_SETS[0]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topPlayer, setTopPlayer] = useState(null);
  const [tab, setTab] = useState('global');
  const [ruleChanging, setRuleChanging] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [swipeAnim, setSwipeAnim] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [storyImage, setStoryImage] = useState(null);

  const timerRef = useRef(null);
  const audioCtx = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const idleTimer = useRef(null);
  const musicRef = useRef(null);

  const initAudio = () => {
    try {
      if (!audioCtx.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx.current = new AudioContext();
      }
      if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();
    } catch (err) {}
  };

  const playSound = (type, param = 0) => {
    if (!soundEnabled || !audioCtx.current) return;
    try {
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      if (type === 'success') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(600 + Math.min(param * 30, 800), now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.1);
      } else if (type === 'fail') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(now + 0.3);
      }
    } catch (err) {}
  };

  const triggerHaptic = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  const spawnParticles = (type = 'normal') => {
    const newPs = [];
    const color = type === 'fever' ? '#fde047' : '#ffffff';
    for(let i=0; i<6; i++) { newPs.push({ id: Math.random(), x: 50, y: 50, vx: Math.random()*20-10, vy: Math.random()*20-10, life: 1, color }); }
    setParticles(prev => [...prev, ...newPs].slice(-30));
  };

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx*0.2, y: p.y + p.vy*0.2, life: p.life - 0.05 })).filter(p => p.life > 0)), 16);
    return () => clearInterval(interval);
  }, [particles]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (err) {}
    };
    initAuth();
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const n = localStorage.getItem('bg_fair_n'), s = localStorage.getItem('bg_fair_s'), c = localStorage.getItem('bg_fair_c');
      if (n && c) setProfile({ name: n, school: s || '무소속', code: c });
      else setShowSetup(true);
      setGameState('MENU');
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'), (snap) => {
      const data = snap.docs.map(doc => doc.data());
      setLeaderboard(data);
      const sorted = [...data].sort((a, b) => b.score - a.score);
      if (sorted.length > 0) setTopPlayer(sorted[0]);
    });
  }, [user]);

  const handleSetup = (e) => {
    e.preventDefault(); 
    initAudio(); 
    const n = formName.trim();
    const s = formSchool.trim() || '무소속';
    if (!n) return;
    const c = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('bg_fair_n', n); localStorage.setItem('bg_fair_s', s); localStorage.setItem('bg_fair_c', c);
    setProfile({ name: n, school: s, code: c }); 
    setShowSetup(false); playSound('success', 0);
  };

  const getNextItem = (rule) => {
    if (score > 15 && Math.random() < 0.15) return TRAPS[Math.floor(Math.random() * TRAPS.length)];
    return (Math.random() > 0.5 ? rule.left : rule.right)[Math.floor(Math.random() * rule.left.length)];
  };

  const startGame = () => {
    initAudio(); if (idleTimer.current) clearTimeout(idleTimer.current);
    setScore(0); setCombo(0); setIsFever(false); setLives(5); setTimeLeft(100); 
    setGameState('PLAYING'); setCountdown(4); setIsPaused(false);
    const r = RULE_SETS[Math.floor(Math.random() * RULE_SETS.length)];
    setCurrentRule(r); setCurrentItem(getNextItem(r));
    playSound('success', 0);
  };

  const finalizeGameOver = useCallback(() => {
    setGameState('GAME_OVER'); setCountdown(4);
    if (user && profile.name) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', user.uid), 
      { uid: user.uid, name: profile.name, school: profile.school, code: profile.code, score, updatedAt: Date.now() }, { merge: true });
    }
  }, [score, user, profile]);

  const endTurn = useCallback(() => {
    playSound('fail'); triggerHaptic(200); finalizeGameOver();
  }, [finalizeGameOver]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 0) {
          setLives(l => { 
            if (l <= 1) { endTurn(); return 0; } 
            setWrongShake(true); setTimeout(() => setWrongShake(false), 300); setCombo(0); playSound('fail'); triggerHaptic(100); return l - 1; 
          });
          return 100;
        }
        let m = score <= 41 ? 0.7 + (score * 0.02) : 1.8 + ((score - 41) * 0.2);
        return p - (0.9 * Math.min(m, 12));
      });
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [gameState, score, isFever, endTurn]);

  useEffect(() => {
    if (gameState === 'GAME_OVER' && !isPaused && !storyImage) {
      const timer = setInterval(() => { setCountdown(c => { if (c <= 1) { clearInterval(timer); startGame(); return 0; } return c - 1; }); }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, isPaused, storyImage]);

  const handleSwipe = (dir) => {
    if (gameState !== 'PLAYING' || swipeAnim || ruleChanging) return;
    setSwipeAnim(dir);
    const isTrap = TRAPS.includes(currentItem);
    let correct = false;
    if (isTrap) correct = (dir === 'up');
    else correct = (dir === 'left' && currentRule.left.includes(currentItem)) || (dir === 'right' && currentRule.right.includes(currentItem));
    
    setTimeout(() => {
      if (correct) {
        const nextScore = score + (isFever ? 4 : (isTrap ? 3 : (combo >= 2 ? 2 : 1)));
        setScore(nextScore); setCombo(c => c + 1); spawnParticles(isFever ? 'fever' : 'normal');
        playSound('success', combo); triggerHaptic(15);
        setTimeLeft(p => Math.min(100, p + (score > 41 ? 8 : 15)));
        if (combo % 10 === 9) { setIsFever(true); setTimeout(() => setIsFever(false), 8000); }
        if (nextScore % 6 === 0) {
          setRuleChanging(true);
          const r = RULE_SETS[Math.floor(Math.random() * RULE_SETS.length)];
          setCurrentRule(r); setTimeout(() => { setCurrentItem(getNextItem(r)); setRuleChanging(false); }, 500);
        } else setCurrentItem(getNextItem(currentRule));
      } else {
        setLives(l => { if (l <= 1) { endTurn(); return 0; } return l - 1; });
        setCombo(0); setWrongShake(true); setTimeout(() => setWrongShake(false), 300);
      }
      setSwipeAnim(null);
    }, 120);
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[100dvh] bg-aesthetic font-sans select-none text-slate-800 overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', sans-serif; box-sizing: border-box; }
        @keyframes aurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .bg-aesthetic { background: linear-gradient(-45deg, #ffc3a0, #ffafbd, #a1c4fd, #c2e9fb, #fbc2eb); background-size: 300% 300%; animation: aurora 15s ease infinite; }
        .glass-panel { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); }
        .glass-card-solid { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 1); }
        .swipe-l { transform: translateX(-150px) rotate(-15deg); opacity: 0; }
        .swipe-r { transform: translateX(150px) rotate(15deg); opacity: 0; }
        .swipe-u { transform: translateY(-200px) scale(0.5); opacity: 0; }
        @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />

      {/* 모바일 화면 비율 유지 및 중앙 정렬 컨테이너 */}
      <div className={`relative w-full max-w-md h-[100dvh] sm:h-[90vh] sm:max-h-[850px] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ${wrongShake ? 'animate-shake' : ''}`}>
        
        {particles.map(p => (
          <div key={p.id} className="absolute pointer-events-none rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, width: '8px', height: '8px', background: p.color, opacity: p.life }} />
        ))}

        {showSetup && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-white/10 backdrop-blur-md">
            <div className="w-full glass-card-solid rounded-[2.5rem] p-8 animate-pop text-center shadow-2xl">
              <h2 className="text-2xl font-black mb-6">프로필 설정</h2>
              <form onSubmit={handleSetup} className="space-y-4">
                <input placeholder="닉네임" required maxLength={8} value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-white/60 border border-white p-4 rounded-full text-center font-bold outline-none focus:bg-white shadow-inner" />
                <input placeholder="소속/학교명" required maxLength={10} value={formSchool} onChange={e => setFormSchool(e.target.value)} className="w-full bg-white/60 border border-white p-4 rounded-full text-center font-bold outline-none focus:bg-white shadow-inner" />
                <button className="w-full py-5 bg-pink-500 text-white rounded-full font-black text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all">전장으로 입장</button>
              </form>
            </div>
          </div>
        )}

        {gameState === 'MENU' && !showSetup && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pop">
            <h1 className="text-[4rem] font-black tracking-tighter text-white leading-tight italic drop-shadow-lg mb-10">실시간<br/>뇌지컬 배틀</h1>
            <div className="w-full max-w-[280px] space-y-4">
              <div onClick={() => setShowSetup(true)} className="glass-panel py-3 px-5 rounded-full text-white font-bold cursor-pointer hover:bg-white/30 transition-all shadow-sm">
                {profile.name} <span className="text-white/60 mx-2">|</span> {profile.school}
              </div>
              <button onClick={startGame} className="w-full py-6 bg-white text-pink-500 rounded-full font-black text-2xl shadow-xl active:scale-95 transition-transform hover:shadow-2xl">시작하기</button>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <div className="flex-1 flex flex-col relative h-full pt-12" onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }} onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartX.current; const dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) handleSwipe(dx > 0 ? 'right' : 'left');
            else if (Math.abs(dy) > Math.abs(dx) && dy < -40) handleSwipe('up');
          }}>
            <div className="px-8 flex justify-between items-start z-10">
              <div className="animate-pop">
                <p className="text-white font-black text-xs uppercase tracking-widest opacity-80 mb-1">Score</p>
                <p className="text-6xl font-black text-white drop-shadow-md leading-none">{score}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="glass-panel px-4 py-2 rounded-full flex gap-1 shadow-sm">
                  {[...Array(5)].map((_, i) => <Heart key={i} size={14} className={i < lives ? 'text-pink-500 fill-pink-500 animate-pulse' : 'text-white/40'} />)}
                </div>
                {isFever && <span className="bg-yellow-300 text-slate-800 text-[10px] font-black px-3 py-1 rounded-full animate-bounce shadow-md">FEVER x2</span>}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
              <div className={`text-[11rem] transition-all duration-100 drop-shadow-2xl pointer-events-none
                ${swipeAnim === 'left' ? 'swipe-l' : swipeAnim === 'right' ? 'swipe-r' : swipeAnim === 'up' ? 'swipe-u' : 'scale-100'}`}>
                {currentItem}
              </div>
            </div>

            <div className="p-8 space-y-4 bg-white/10 backdrop-blur-sm">
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full bg-white shadow-[0_0_15px_white] transition-all duration-75`} style={{ width: `${timeLeft}%` }} />
              </div>
              <div className={`w-full glass-card-solid p-6 rounded-[2.5rem] text-center shadow-xl border-2 transition-all duration-300 ${ruleChanging ? 'border-pink-500 scale-105 rotate-1' : 'border-white'}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">현재 룰</p>
                <div className="flex justify-between font-black text-lg text-slate-800">
                  <div className="flex-1 transition-transform active:scale-90" onClick={() => handleSwipe('left')}>👈 {currentRule.leftText}</div>
                  <div className="w-px h-6 bg-slate-200 mx-3 opacity-50" />
                  <div className="flex-1 transition-transform active:scale-90" onClick={() => handleSwipe('right')}>👉 {currentRule.rightText}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-pop text-center bg-white/10 backdrop-blur-sm">
            <h2 className="text-white font-black text-xl uppercase tracking-widest mb-2 opacity-80">Game Over</h2>
            <p className="text-[7rem] font-black text-white leading-none mb-6 drop-shadow-2xl">{score}</p>
            <div className="glass-card-solid px-8 py-3 rounded-full flex items-center gap-3 mb-8 shadow-xl">
              <span className="text-3xl">{getTier(score).emoji}</span>
              <span className="font-black text-slate-800 text-lg tracking-tight">{getTier(score).name} 클래스</span>
            </div>
            <div className="w-full glass-card-solid rounded-[2rem] p-5 mb-8 max-h-[220px] overflow-y-auto no-scrollbar shadow-inner">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top 10 Rankings</p>
              {getRankData().map((r, i) => (
                <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 font-bold group">
                  <span className={`text-sm w-5 ${i < 3 ? 'text-pink-500' : 'text-slate-400'}`}>{i+1}</span>
                  <span className="flex-1 text-left text-slate-700 truncate text-sm">{r.name}</span>
                  <span className="text-pink-500 font-black">{r.score}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 w-full px-2">
              <button onClick={startGame} className="flex-1 py-5 bg-white text-pink-500 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-transform">다시 도전</button>
              <button onClick={() => setGameState('MENU')} className="flex-1 py-5 glass-panel text-white rounded-3xl font-black text-lg shadow-md active:scale-95 transition-transform">메인으로</button>
            </div>
            <div className="mt-8 text-white font-black text-4xl animate-bounce drop-shadow-lg">{countdown}</div>
          </div>
        )}

        <div className="p-5 text-center text-[9px] text-white/50 font-black tracking-widest uppercase bg-white/5 backdrop-blur-md">© 2026 Brain Glitch Studio</div>
      </div>
    </div>
  );
}
