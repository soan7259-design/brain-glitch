import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Brain, Heart, Trophy, Share2, User, School, Volume2, VolumeX, Flame, Swords, Crown, Pause, Play, AlertTriangle, Edit3, Zap, Instagram } from 'lucide-react';

// --- Firebase Initialization ---
// ⚠️ 나중에 실제 서버로 연결할 때 이 부분을 본인의 Firebase 설정값으로 바꿔야 합니다!
const firebaseConfig = {
  apiKey: "AIzaSyDCmU-flSumtL017Pk2bWf_MhnNOKzDuxQ",
  authDomain: "brain-glitch.firebaseapp.com",
  projectId: "brain-glitch",
  storageBucket: "brain-glitch.firebasestorage.app",
  messagingSenderId: "905708629011",
  appId: "1:905708629011:web:bf770b1fd0c32d3560a3e6"
};
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

// --- 🌟 애매한 것 배제 & 직관성 100% 룰 세트 🌟 ---
const RULE_SETS = [
  { id: 'color', leftText: "🔵 파란색", rightText: "🔴 빨간색", left: ["💧", "📘", "💎", "🧢", "👖", "🐬"], right: ["🍎", "🍓", "🎈", "🥊", "🍅", "🍒"] },
  { id: 'color_rev', leftText: "🔴 빨간색", rightText: "🔵 파란색", left: ["🍎", "🍓", "🎈", "🥊", "🍅", "🍒"], right: ["💧", "📘", "💎", "🧢", "👖", "🐬"] },
  { id: 'food', leftText: "💻 전자기기", rightText: "🍔 음식", left: ["💻", "📱", "🎧", "📷", "📺", "⌨️"], right: ["🍔", "🍕", "🍣", "🍩", "🍗", "🥐"] },
  { id: 'food_rev', leftText: "🍔 음식", rightText: "💻 전자기기", left: ["🍔", "🍕", "🍣", "🍩", "🍗", "🥐"], right: ["💻", "📱", "🎧", "📷", "📺", "⌨️"] },
  { id: 'nature', leftText: "🌲 식물", rightText: "🐶 동물", left: ["🌲", "🌻", "🌵", "🌴", "🍀", "🌷"], right: ["🐶", "🐱", "🦊", "🐯", "🐰", "🐼"] },
  { id: 'nature_rev', leftText: "🐶 동물", rightText: "🌲 식물", left: ["🐶", "🐱", "🦊", "🐯", "🐰", "🐼"], right: ["🌲", "🌻", "🌵", "🌴", "🍀", "🌷"] },
  { id: 'temp', leftText: "🔥 뜨거운 것", rightText: "🧊 차가운 것", left: ["🔥", "☀️", "🌋", "♨️", "🍵", "🍳"], right: ["🧊", "⛄", "🍦", "❄️", "🍧", "🐧"] },
  { id: 'temp_rev', leftText: "🧊 차가운 것", rightText: "🔥 뜨거운 것", left: ["🧊", "⛄", "🍦", "❄️", "🍧", "🐧"], right: ["🔥", "☀️", "🌋", "♨️", "🍵", "🍳"] },
  { id: 'speed', leftText: "🚀 빠른 것", rightText: "🐢 느린 것", left: ["🚀", "⚡", "✈️", "🚅", "🏎️", "🐆"], right: ["🐢", "🦥", "🚜", "🚲", "🐨", "⛴️"] },
  { id: 'speed_rev', leftText: "🐢 느린 것", rightText: "🚀 빠른 것", left: ["🐢", "🦥", "🚜", "🚲", "🐨", "⛴️"], right: ["🚀", "⚡", "✈️", "🚅", "🏎️", "🐆"] },
];

// ⚠️ 함정 요소 (좌우가 아닌 '위로 스와이프' 해서 피해야 함)
const TRAPS = ["👾", "💣", "🛑", "⚠️"];

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ name: '', school: '', code: '' });
  
  const [gameState, setGameState] = useState('LOADING'); // LOADING, MENU, PLAYING, GAME_OVER
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

  // --- Audio System ---
  const initAudio = () => {
    try {
      if (!audioCtx.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx.current = new AudioContext();
      }
      if (audioCtx.current?.state === 'suspended') {
        audioCtx.current.resume().catch(e => console.warn("Audio Context Resume Blocked", e));
      }
    } catch (err) {}
  };

  const playSound = (type, param = 0) => {
    if (!soundEnabled || !audioCtx.current) return;
    try {
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      
      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 600 + Math.min(param * 30, 800); 
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 200, now + 0.05); 
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.15);
      } 
      else if (type === 'fail') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.4); 
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.4);
      }
      else if (type === 'dodge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1); 
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.15);
      }
      else if (type === 'glitch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(800, now + 0.05);
        osc.frequency.setValueAtTime(200, now + 0.1);
        osc.frequency.setValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.25);
      }
      else if (type === 'beat') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const base = isFever ? 90 : 65;
        osc.frequency.setValueAtTime(base * 2, now);
        osc.frequency.exponentialRampToValueAtTime(base, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.3);
      }
    } catch (err) {}
  };

  const triggerHaptic = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  const spawnParticles = (type = 'normal') => {
    const newPs = [];
    const color = type === 'fever' ? '#fde047' : '#ffffff';
    for(let i=0; i<8; i++) { newPs.push({ id: Math.random(), x: 50, y: 50, vx: Math.random()*20-10, vy: Math.random()*20-10, life: 1, color }); }
    setParticles(prev => [...prev, ...newPs].slice(-40));
  };

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx*0.2, y: p.y + p.vy*0.2, life: p.life - 0.05 })).filter(p => p.life > 0)), 16);
    return () => clearInterval(interval);
  }, [particles]);

  // --- Auth & Initialize ---
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

  useEffect(() => {
    if (showSetup) {
      setFormName(profile.name || "");
      setFormSchool(profile.school || "");
    }
  }, [showSetup, profile]);

  const handleSetup = (e) => {
    e.preventDefault(); 
    initAudio(); 
    const n = formName.trim();
    const s = formSchool.trim();
    if (!n) return;
    
    const c = profile.code || Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('bg_fair_n', n); 
    localStorage.setItem('bg_fair_s', s); 
    localStorage.setItem('bg_fair_c', c);
    
    setProfile({ name: n, school: s, code: c }); 
    setShowSetup(false); 
    playSound('success', 0);
  };

  const getNextItem = (rule) => {
    if (score > 15 && Math.random() < 0.15) {
      return TRAPS[Math.floor(Math.random() * TRAPS.length)];
    }
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
    setGameState('GAME_OVER'); 
    setCountdown(4); setIsFever(false); setIsPaused(false);
    if (user && profile.name) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', user.uid), 
      { uid: user.uid, name: profile.name, school: profile.school, code: profile.code, score, updatedAt: Date.now() }, { merge: true });
    }
  }, [score, user, profile]);

  const endTurn = useCallback(() => {
    playSound('fail'); triggerHaptic(200);
    finalizeGameOver();
  }, [finalizeGameOver]);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    musicRef.current = setInterval(() => playSound('beat'), isFever ? 400 : 900);
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 0) {
          setLives(l => { 
            if (l <= 1) { endTurn(); return 0; } 
            setWrongShake(true); setTimeout(() => setWrongShake(false), 300); setCombo(0); playSound('fail'); triggerHaptic(100); return l - 1; 
          });
          return 100;
        }
        let m = score <= 41 ? 0.5 + (score * 0.015) : 1.2 + ((score - 41) * 0.15);
        if (isFever) m *= 1.3;
        return p - (0.8 * Math.min(m, 8.5));
      });
    }, 50);
    return () => { clearInterval(timerRef.current); clearInterval(musicRef.current); };
  }, [gameState, score, isFever, endTurn]);

  const handleRankingInteraction = useCallback(() => {
    setIsPaused(true); if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsPaused(false), 3000);
  }, []);

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

    if (isTrap) {
      correct = (dir === 'up');
    } else {
      correct = (dir === 'left' && currentRule.left.includes(currentItem)) || (dir === 'right' && currentRule.right.includes(currentItem));
    }
    
    setTimeout(() => {
      if (correct) {
        const nextCombo = combo + 1;
        const pointsToAdd = isFever ? 4 : (isTrap ? 3 : (nextCombo >= 2 ? 2 : 1)); 
        const nextScore = score + pointsToAdd;
        
        setScore(nextScore); setCombo(nextCombo); 
        playSound(isTrap ? 'dodge' : 'success', nextCombo); 
        triggerHaptic(isTrap ? [20, 20] : 15); 
        spawnParticles(isFever ? 'fever' : 'normal');
        
        setTimeLeft(p => Math.min(100, p + (nextScore > 41 ? 8 : 15)));

        if (nextCombo > 0 && nextCombo % 20 === 0) setLives(l => Math.min(5, l + 1));
        if (nextCombo > 0 && nextCombo % 10 === 0) {
           playSound('glitch'); 
           if(nextCombo === 10) { setIsFever(true); setTimeout(() => setIsFever(false), 8000); }
        }

        if (nextScore > 0 && nextScore % 6 === 0) {
          setRuleChanging(true); playSound('glitch'); triggerHaptic([30, 30, 30]);
          let r; do { r = RULE_SETS[Math.floor(Math.random() * RULE_SETS.length)]; } while (r.id === currentRule.id); 
          setCurrentRule(r); 
          setTimeout(() => {
            setCurrentItem(getNextItem(r));
            setRuleChanging(false);
          }, 500); 
        } else {
          setCurrentItem(getNextItem(currentRule));
        }
      } else {
        setLives(l => { if (l <= 1) { endTurn(); return 0; } return l - 1; });
        setCombo(0); setIsFever(false); playSound('fail'); triggerHaptic(100); setWrongShake(true);
        setTimeout(() => setWrongShake(false), 300); setTimeLeft(p => Math.max(0, p - 30));
      }
      setSwipeAnim(null);
    }, 120); 
  };

  const getRankData = () => {
    let list = [...leaderboard];
    if (tab === 'school') list = list.filter(i => i.school === profile.school);
    return list.sort((a,b) => b.score - a.score).slice(0, 10);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // 📝 텍스트와 링크를 함께 조합하는 함수
  const getShareText = () => {
    const gameLink = window.location.href; 
    
    return `🔥 ${profile.name}님이 도전장을 보냈습니다! 🔥\n\n🏆 최고 기록: ${score}점 (${getTier(score).emoji} ${getTier(score).name} 클래스)\n🏫 소속: ${profile.school}\n\n지금 바로 도전해서 ${profile.name}님의 기록을 깨보세요! 😎\n\n👇 게임 링크 👇\n${gameLink}`;
  };

  const handleCopy = () => {
    const textToShare = getShareText();
    
    if (navigator.share) {
      navigator.share({
        title: 'Brain Glitch 기록 공유',
        text: textToShare,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      const el = document.createElement('textarea'); 
      el.value = textToShare; 
      document.body.appendChild(el); 
      el.select(); 
      document.execCommand('copy'); 
      document.body.removeChild(el); 
      showToast("게임 링크와 기록이 클립보드에 복사되었습니다! 🚀");
    }
  };

  // --- Story Image Generator ---
  const handleInstaShare = () => {
    showToast("스토리용 이미지를 생성 중입니다... 📸");
    
    setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        // 1. 그라데이션 배경
        const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
        grad.addColorStop(0, '#ffc3a0');
        grad.addColorStop(1, '#fbc2eb');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1920);

        // 2. 카드 (둥근 사각형 호환성 함수)
        const drawRoundRect = (x, y, w, h, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        };

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 50;
        drawRoundRect(140, 400, 800, 1120, 80);
        ctx.fill();
        ctx.shadowBlur = 0; 

        // 3. 텍스트 설정
        ctx.textAlign = 'center';
        
        ctx.font = '900 85px sans-serif';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.fillText('BRAIN GLITCH', 540, 250);
        
        ctx.font = 'bold 45px sans-serif';
        ctx.shadowBlur = 0;
        ctx.fillText('실시간 뇌지컬 배틀', 540, 330);

        // 티어 이모지
        ctx.font = '220px sans-serif';
        ctx.fillText(getTier(score).emoji, 540, 700);

        // 티어 이름
        ctx.font = '900 70px sans-serif';
        ctx.fillStyle = '#334155';
        ctx.fillText(`${getTier(score).name} 클래스`, 540, 860);

        // 점수
        ctx.font = '900 280px sans-serif';
        ctx.fillStyle = '#ec4899';
        ctx.fillText(score.toString(), 540, 1180);

        // 학교 | 이름
        ctx.font = 'bold 50px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${profile.school} | ${profile.name}`, 540, 1380);

        // 푸터
        ctx.font = 'bold 55px sans-serif';
        ctx.fillStyle = 'white';
        ctx.fillText('👇 내 기록 깰 수 있겠어?', 540, 1750);

        const dataUrl = canvas.toDataURL('image/png');
        
        if (navigator.share) {
          try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], 'brainglitch_story.png', { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Brain Glitch 기록',
                text: getShareText()
              });
              return; 
            }
          } catch (err) {
            console.log('Share API cancelled or failed:', err);
          }
        }
        
        setStoryImage(dataUrl);

      } catch (e) {
        showToast("이미지 생성에 실패했습니다. 화면을 캡처해주세요!");
      }
    }, 300); 
  };

  return (
    <div className="flex justify-center items-center w-full h-screen bg-white font-sans select-none text-slate-800 overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; }
        @keyframes aurora { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
        /* 🌸 밝고 귀여운 파스텔 오로라 테마 */
        .bg-aesthetic { background: linear-gradient(-45deg, #ffc3a0, #ffafbd, #a1c4fd, #c2e9fb, #fbc2eb); background-size: 300% 300%; animation: aurora 15s ease infinite; }
        
        .glass-panel { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05); }
        .glass-card-solid { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 1); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08); }
        .pill-btn { background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.8); border-radius: 9999px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #334155; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
        .pill-btn:active { transform: scale(0.95); background: rgba(255, 255, 255, 0.8); }
        .pill-btn-danger { background: linear-gradient(135deg, #f43f5e, #be123c); color: white; border: none; font-weight: 900; }
        .pill-input { background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(255,255,255,0.8); border-radius: 9999px; outline: none; transition: all 0.3s; color: #1e293b; }
        .pill-input:focus { background: rgba(255, 255, 255, 0.95); box-shadow: 0 0 0 4px rgba(255,255,255,0.4); border-color: white; }
        .text-glow { text-shadow: 0 2px 10px rgba(255,255,255,0.8); }
        .insta-gradient { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color: white !important; border: none !important; }
        
        .swipe-l { transform: translateX(-150px) rotate(-15deg); opacity: 0; transition: 0.15s ease-in; }
        .swipe-r { transform: translateX(150px) rotate(15deg); opacity: 0; transition: 0.15s ease-in; }
        .swipe-u { transform: translateY(-200px) scale(0.5); opacity: 0; transition: 0.15s ease-out; }
        
        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .particle { position: absolute; pointer-events: none; border-radius: 50%; background: #ffffff; box-shadow: 0 0 10px #ffffff; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      <div className={`relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-[3rem] bg-aesthetic shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ${wrongShake ? 'animate-shake' : ''}`}>
        
        {particles.map(p => (
          <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: '8px', height: '8px', opacity: p.life }} />
        ))}

        {/* Custom Toast Message */}
        {toastMsg && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-800/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm text-center animate-pop whitespace-nowrap">
            {toastMsg}
          </div>
        )}

        {/* --- Story Image Modal (Fallback) --- */}
        {storyImage && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-pop">
            <div className="flex flex-col items-center w-full max-w-sm">
              <p className="text-white font-bold text-center mb-5 leading-relaxed text-sm">
                👇 <span className="text-pink-400">이미지를 꾹 눌러서 저장</span>한 뒤<br/>인스타 스토리에 공유해보세요!
              </p>
              
              <img src={storyImage} alt="Story Share" className="w-[65%] rounded-3xl shadow-[0_0_40px_rgba(236,72,153,0.3)] mb-8 select-auto pointer-events-auto" />
              
              <div className="w-full space-y-3">
                <button onClick={() => window.location.href = "instagram://"} className="w-full py-4 pill-btn insta-gradient font-extrabold text-[13px] tracking-wide flex items-center justify-center gap-2 shadow-xl">
                  <Instagram size={18} /> 인스타그램 열기
                </button>
                <button onClick={() => setStoryImage(null)} className="w-full py-4 bg-transparent text-white/50 font-bold text-[13px] hover:text-white/80 transition-colors">
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {showSetup && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-white/10 backdrop-blur-md">
            <div className="w-full glass-card-solid rounded-[2.5rem] p-8 animate-pop">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <Swords size={32} className="text-pink-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">프로필 설정</h2>
              </div>
              <form onSubmit={handleSetup} className="space-y-4" autoComplete="off">
                <input name="username" type="text" placeholder="닉네임 (8자)" required maxLength={8} 
                       value={formName} onChange={e => setFormName(e.target.value)}
                       className="w-full pill-input py-4 px-6 text-center text-lg font-bold placeholder:text-slate-400" />
                <input name="schoolname" type="text" placeholder="소속/학교명 (10자)" required maxLength={10} 
                       value={formSchool} onChange={e => setFormSchool(e.target.value)}
                       className="w-full pill-input py-4 px-6 text-center text-lg font-bold placeholder:text-slate-400" />
                <button className="w-full py-4 mt-2 pill-btn font-extrabold text-lg tracking-wide text-pink-600 flex items-center justify-center gap-2">
                  <Flame size={20}/> {profile.name ? '정보 수정' : '전장으로 입장'}
                </button>
              </form>
            </div>
          </div>
        )}

        {gameState === 'MENU' && !showSetup && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-8 text-center animate-pop">
            <div className="absolute top-8 right-8">
               <button onClick={() => { initAudio(); setSoundEnabled(!soundEnabled); }} className="w-10 h-10 glass-panel rounded-full flex items-center justify-center text-white/90 hover:text-white transition-colors">
                 {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
               </button>
            </div>

            {topPlayer && (
              <div className="absolute top-20 left-0 w-full px-6 pointer-events-none">
                 <div className="glass-panel py-2 px-4 rounded-full inline-flex items-center gap-2 shadow-sm animate-pulse">
                    <Crown size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">현재 1위: {topPlayer.school} {topPlayer.name}</span>
                 </div>
              </div>
            )}

            <div className="mb-12 mt-16">
              <h1 className="text-[4.5rem] font-extrabold tracking-tighter text-white text-glow mb-2 leading-tight italic">실시간<br/>뇌지컬 배틀</h1>
              <p className="text-white/90 text-[12px] font-bold tracking-widest uppercase text-glow mt-2">School Ranking Battle</p>
            </div>
            
            <div className="w-full space-y-4 max-w-[280px]">
              <div 
                onClick={() => setShowSetup(true)}
                className="glass-panel py-3 px-5 rounded-full flex items-center justify-center gap-3 border border-white/50 cursor-pointer hover:bg-white/30 transition-all relative group"
              >
                <Swords size={16} className="text-white" />
                <span className="text-sm font-bold text-white tracking-wide truncate text-glow">{profile.name}</span>
                <span className="text-xs text-white/70">|</span>
                <span className="text-xs font-medium text-white/90 truncate text-glow">{profile.school}</span>
                <div className="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full p-1.5 shadow-md scale-0 group-hover:scale-100 transition-transform">
                   <Edit3 size={12} />
                </div>
              </div>
              <p className="text-[9px] text-white/80 font-bold tracking-widest mt-[-10px] drop-shadow-md">👆 터치하여 프로필 수정</p>
              
              <button onClick={startGame} className="w-full py-5 pill-btn font-extrabold text-xl tracking-tight text-pink-600 flex items-center justify-center gap-2 shadow-xl mt-2">
                <Flame size={24}/> 시스템 가동
              </button>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center p-6 pt-12 overflow-y-auto no-scrollbar animate-pop pb-24 bg-black/10 backdrop-blur-sm">
            <p className="text-white/90 font-bold text-sm uppercase tracking-[0.3em] mb-2 text-glow">Final Score</p>
            <h2 className="text-[7rem] font-black leading-none text-white text-glow mb-2">{score}</h2>
            
            <div className="px-6 py-2 rounded-full glass-panel bg-white/40 flex items-center gap-2 mb-6 shadow-sm border-white/80">
              <span className="text-xl">{getTier(score).emoji}</span>
              <span className="font-bold text-sm text-slate-700 tracking-widest">{getTier(score).name} 클래스</span>
            </div>

            <div className="w-full glass-card-solid rounded-[2rem] p-5 mb-6 shadow-xl"
                 onPointerDown={handleRankingInteraction} onScroll={handleRankingInteraction} onTouchStart={handleRankingInteraction} onWheel={handleRankingInteraction}>
              
              <div className="flex bg-slate-100 p-1 rounded-full mb-4">
                {['global', 'school'].map(t => (
                  <button key={t} onClick={(e) => { handleRankingInteraction(); setTab(t); }} 
                          className={`flex-1 py-2 rounded-full text-[11px] font-bold uppercase transition-all ${tab === t ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'global' ? '글로벌 랭킹' : '소속 랭킹'}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                {getRankData().map((r, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-2xl transition-all ${r.uid === user?.uid ? 'bg-pink-50 border border-pink-200 scale-[1.02] shadow-sm' : 'bg-transparent'}`}>
                    <div className="flex gap-4 items-center truncate">
                      <span className={`text-xs font-black w-4 ${i < 3 ? 'text-pink-400' : 'text-slate-400'}`}>{i+1}</span>
                      <div className="flex flex-col text-left truncate">
                        <span className="text-sm font-bold text-slate-800 truncate">{r.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate">{r.school}</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-pink-500">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-[85%] flex gap-3 mb-6">
              <button onClick={handleInstaShare} className="flex-1 py-3.5 pill-btn insta-gradient font-extrabold text-[13px] tracking-wide flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-transform">
                <Instagram size={18} /> 스토리에 자랑하기
              </button>
              <button onClick={handleCopy} className="flex-[0.7] py-3.5 pill-btn font-extrabold text-[13px] tracking-wide text-slate-700 bg-white/80 flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-transform border-white">
                <Share2 size={18} /> 링크 복사
              </button>
            </div>

            <div className="mt-auto flex flex-col items-center w-full">
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full mb-2 transition-colors shadow-sm ${isPaused ? 'bg-orange-500/20 text-orange-600' : 'bg-white/40 text-slate-600'}`}>
                 {isPaused ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                 <span className="text-[9px] font-bold uppercase tracking-widest text-glow">
                   {isPaused ? '랭킹 확인 중' : '자동 재시작'}
                 </span>
              </div>
              <div key={countdown + (isPaused?'p':'r')} className={`text-5xl font-black text-white text-glow transition-all duration-300 ${isPaused ? 'opacity-30 scale-90' : 'animate-pop'}`}>
                {countdown}
              </div>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <div className="flex-1 flex flex-col relative h-full">
            
            <div className="p-8 flex justify-between items-start z-30">
               <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-1 text-glow">Score</span>
                  <span className={`text-5xl font-black text-white leading-none text-glow ${ruleChanging ? 'text-pink-100' : ''}`}>{score}</span>
                  
                  <span className="text-[9px] font-black text-yellow-300 uppercase tracking-widest mt-1 drop-shadow-md">
                    {isFever ? "+4 점" : (TRAPS.includes(currentItem) ? "+3 점 (회피)" : (combo >= 2 ? "+2 점" : "+1 점"))}
                  </span>
               </div>
               
               <div className="flex flex-col items-end gap-2">
                  <div className="glass-panel px-4 py-2 rounded-full flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Heart key={i} size={14} className={`transition-all duration-300 ${i < lives ? 'text-pink-500 fill-pink-500' : 'text-white/40 fill-transparent'}`} />
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {isFever && <span className="text-[10px] font-black text-slate-800 bg-yellow-300 px-3 py-1 rounded-full animate-pulse shadow-md">FEVER x2</span>}
                    {combo >= 2 && (
                      <span key={combo} className="text-[11px] font-black text-pink-600 bg-white/80 px-3 py-1 rounded-full flex items-center gap-1 animate-pop shadow-sm border border-white">
                        <Flame size={12} fill="currentColor" /> {combo}
                      </span>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative touch-none z-20"
                 onTouchStart={e => {
                   touchStartX.current = e.touches[0].clientX;
                   touchStartY.current = e.touches[0].clientY;
                 }}
                 onTouchEnd={e => {
                   if(gameState !== 'PLAYING') return;
                   const dx = e.changedTouches[0].clientX - touchStartX.current;
                   const dy = e.changedTouches[0].clientY - touchStartY.current;
                   
                   if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                     handleSwipe(dx > 0 ? 'right' : 'left');
                   } else if (Math.abs(dy) > Math.abs(dx) && dy < -40) {
                     handleSwipe('up'); // 위로 스와이프 (함정 회피용)
                   }
                 }}>
              
              {isFever && <div className="absolute text-white/20 font-black text-[150px] italic pointer-events-none z-0 rotate-[-10deg]">FEVER</div>}
              {TRAPS.includes(currentItem) && <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-pulse mix-blend-multiply"></div>}
              
              <div className={`text-[11rem] transition-all duration-100 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] z-10
                    ${swipeAnim === 'left' ? 'swipe-l' : swipeAnim === 'right' ? 'swipe-r' : swipeAnim === 'up' ? 'swipe-u' : 'scale-100'}
                    ${TRAPS.includes(currentItem) ? 'filter drop-shadow-[0_10px_20px_rgba(239,68,68,0.5)] scale-110' : ''}`}>
                {currentItem}
              </div>
            </div>

            <div className="px-6 pb-12 w-full z-30 flex flex-col">
              
              <div className="w-full h-1.5 bg-white/40 rounded-full overflow-hidden mb-4 shadow-sm">
                 <div className={`h-full transition-all ease-linear ${isFever ? 'bg-yellow-300' : 'bg-white'}`} 
                      style={{ width: `${timeLeft}%`, transitionDuration: '50ms' }} />
              </div>

              <div className={`w-full backdrop-blur-xl p-5 rounded-[2rem] shadow-xl text-center transition-all duration-300 mb-4
                    ${ruleChanging ? 'bg-pink-500 scale-[1.05] shadow-[0_15px_40px_rgba(236,72,153,0.5)] border-pink-400' : 'bg-white/95 border-white/50 border'}`}>
                 <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-3 ${ruleChanging ? 'text-white animate-pulse' : 'text-slate-400'}`}>
                    {ruleChanging ? '⚠️ 뇌정지 경고: 패턴 반전!' : '현재 룰'}
                 </p>
                 <div className="flex justify-between items-center w-full px-2">
                    <div 
                      className="flex flex-col items-center flex-1 cursor-pointer active:scale-90 transition-transform hover:bg-slate-500/10 rounded-2xl py-2"
                      onClick={() => handleSwipe('left')}
                    >
                       <span className="text-3xl mb-1 drop-shadow-md opacity-80">👈</span>
                       <span className={`text-lg font-black tracking-tight ${ruleChanging ? 'text-white' : 'text-slate-800'}`}>{currentRule.leftText}</span>
                    </div>
                    
                    <div className={`w-1 h-12 rounded-full mx-2 transition-colors ${ruleChanging ? 'bg-white/50' : 'bg-slate-100'}`}></div>
                    
                    <div 
                      className="flex flex-col items-center flex-1 cursor-pointer active:scale-90 transition-transform hover:bg-slate-500/10 rounded-2xl py-2"
                      onClick={() => handleSwipe('right')}
                    >
                       <span className="text-3xl mb-1 drop-shadow-md opacity-80">👉</span>
                       <span className={`text-lg font-black tracking-tight ${ruleChanging ? 'text-white' : 'text-slate-800'}`}>{currentRule.rightText}</span>
                    </div>
                 </div>
              </div>
              
              {/* 함정 조작법 가이드 (귀여운 스타일) */}
              <div className="text-center animate-bounce">
                <span className="text-[10px] font-black text-red-500 bg-white/80 px-5 py-2.5 rounded-full border border-white shadow-sm inline-flex items-center gap-1">
                  ⚠️ 함정(👾, 🛑 등)은 위로(👆) 쳐내세요!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- Commercial AD Banner --- */}
        {gameState !== 'PLAYING' && !showSetup && !storyImage && (
          <div className="absolute bottom-0 left-0 w-full h-[68px] bg-white/90 backdrop-blur-md border-t border-white/50 flex items-center justify-between px-4 z-[55] shadow-[0_-10px_20px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-white transition-colors">
             <div className="flex items-center gap-3 truncate">
                <div className="w-11 h-11 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
                   <Zap size={22} fill="currentColor"/>
                </div>
                <div className="flex flex-col truncate text-left justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] font-black text-white bg-pink-400 px-1.5 py-0.5 rounded-sm tracking-wider">AD</span>
                    <span className="text-sm font-extrabold text-slate-800 truncate">피지컬 100% 상승 영양제</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate font-medium">뇌정지 방지 게이머 필수템 특가 💊</span>
                </div>
             </div>
             <button className="px-4 py-2 bg-pink-500 text-white font-black text-[11px] rounded-full shrink-0 shadow-md hover:scale-105 active:scale-95 transition-transform">
               알아보기
             </button>
          </div>
        )}
      </div>
    </div>
  );
}