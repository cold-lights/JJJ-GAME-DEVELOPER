/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { 
  Home, 
  User, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Lightbulb,
  Download,
  RotateCcw,
  Play,
  X,
  Menu,
  GraduationCap,
  BookOpen,
  FileText,
  HelpCircle,
  Hash
} from 'lucide-react';

// --- Types ---
type Phase = 'cover' | 'introduction' | 'loading' | 'briefing' | 'level-selection' | 'level-nav' | 'level-resume-assessment' | 'level-previous-review' | 'level-1-directions' | 'level-1-rooms' | 'level-1-summary' | 'level-2-directions' | 'level-2-rooms' | 'level-2-summary' | 'level-coming-soon' | 'dashboard';

interface Player {
  name: string;
  code: string;
  rank: string;
  stars: number;
  progress: number;
  keys: number;
}

interface PerformanceRecord {
  result: string;
  input: string;
  difficulty: 'easy' | 'average' | 'difficult';
  attempts: number;
}

interface StudentRecord {
  player: Player;
  performance: Record<string, PerformanceRecord>; // key: "level-room"
}

interface RoomData {
  question: string;
  valid: string[];
  expl: string;
  hint: string;
  background: string;
  difficulty: 'easy' | 'average' | 'difficult';
}

// --- Constants ---
// OFFLINE: Silent placeholder audio to prevent playback errors without external dependencies
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

const LEVEL_1_ROOMS: Record<number, RoomData> = {
  1: { 
    question: "Three students — Alice (A), Ben (B), Carl (C) — need to sit in three chairs. List all possible arrangements.", 
    valid: ["ABC,ACB,BAC,BCA,CAB,CBA"], 
    expl: "All possible arrangements:<br>ABC → Alice, Ben, Carl<br>ACB → Alice, Carl, Ben<br>BAC → Ben, Alice, Carl<br>BCA → Ben, Carl, Alice<br>CAB → Carl, Alice, Ben<br>CBA → Carl, Ben, Alice<br><br>Concept: Order matters.",
    hint: "Think about all the ways Alice, Ben, and Carl can sit. Order matters!",
    background: "#1a2e26",
    difficulty: 'easy'
  },
  2: { 
    question: "A digital lock uses letters X (Xander), Y (Yara), Z (Zoe). List all possible arrangements for the password.", 
    valid: ["XYZ,XZY,YXZ,YZX,ZXY,ZYX"], 
    expl: "XYZ → Xander, Yara, Zoe<br>XZY → Xander, Zoe, Yara<br>YXZ → Yara, Xander, Zoe<br>YZX → Yara, Zoe, Xander<br>ZXY → Zoe, Xander, Yara<br>ZYX → Zoe, Yara, Xander<br><br>Concept: Order matters.",
    hint: "Arranging letters for a password usually means order is important.",
    background: "#2e1a1a",
    difficulty: 'easy'
  },
  3: { 
    question: "Choose 2 students from Alice (A), Ben (B), Carl (C), Dana (D). List all possible choices.", 
    valid: ["AB,AC,AD,BC,BD,CD"], 
    expl: "AB → Alice & Ben<br>AC → Alice & Carl<br>AD → Alice & Dana<br>BC → Ben & Carl<br>BD → Ben & Dana<br>CD → Carl & Dana<br><br>Concept: Combination (C) — order does not matter.",
    hint: "If you choose Alice and Ben, it's the same as Ben and Alice. Order doesn't matter.",
    background: "#1a1a2e",
    difficulty: 'average'
  },
  4: { 
    question: "Pick 2 snacks from Cookies (C), Juice (J), Kiwi (K). List all possible choices.", 
    valid: ["CJ,CK,JK"], 
    expl: "CJ → Cookies & Juice<br>CK → Cookies & Kiwi<br>JK → Juice & Kiwi<br><br>Concept: Combination (C) — order does not matter.",
    hint: "Selecting snacks for a bag doesn't depend on which one you pick first.",
    background: "#2e1a2e",
    difficulty: 'average'
  },
  5: { 
    question: "Three runners — Mia (M), Noah (N), Olivia (O) — receive Gold, Silver, Bronze. List all possible arrangements.", 
    valid: ["MNO,MON,NMO,NOM,OMN,ONM"], 
    expl: "MNO → Mia-Gold, Noah-Silver, Olivia-Bronze<br>MON → Mia-Gold, Olivia-Silver, Noah-Bronze<br>NMO → Noah-Gold, Mia-Silver, Noah-Bronze<br>NOM → Noah-Gold, Olivia-Silver, Mia-Bronze<br>OMN → Olivia-Gold, Mia-Silver, Noah-Bronze<br>ONM → Olivia-Gold, Noah-Silver, Mia-Bronze<br><br>Concept: Order matters.",
    hint: "Gold, Silver, and Bronze are specific positions. Order is key!",
    background: "#0a0a0a",
    difficulty: 'difficult'
  }
};

const LEVEL_1_SITUATIONS: Record<number, string> = {
  1: "Situation: “During class, the teacher asks Alice, Ben, and Carl to sit in front for a group activity. There are only three chairs, and they decide to switch seats to see all the possible ways they can sit.”",
  2: "Situation: “Imagine you are setting a simple 3-letter password using the letters X, Y, and Z. Let's figure out all the different ways you can arrange these three letters.”",
  3: "Situation: “Four talented students—Alice, Ben, Carl, and Dana—have volunteered for a community project. However, the task only requires a pair of students to work together. They want to find all possible pairs.”",
  4: "Situation: “A student is picking exactly 2 snacks from a menu of Cookies, Juice, and Kiwi for their afternoon break. They want to list all the possible pairs of snacks they could choose.”",
  5: "Situation: “The championship race is ending! Three runners—Mia, Noah, and Olivia—are about to cross the line for Gold, Silver, and Bronze. The crowd is calculating all the possible ways they could finish on the podium.”"
};

const LEVEL_2_ROOMS: Record<number, { situation: string; question: string; options: { id: string; text: string }[]; answer: string; hint: string; expl: string; background: string; difficulty: 'easy' | 'average' | 'difficult' }> = {
  1: {
    situation: "You enter the first room and the door locks behind you. On a stone table are three symbols: 🔺, 🔵, and ⭐. The correct arrangement will open the path. The position of the symbols is important.",
    question: "Which concept should you use to unlock the door?",
    options: [
      { id: 'A', text: "A. Choosing symbols where order does not matter" },
      { id: 'B', text: "B. Arranging symbols where order matters" },
      { id: 'C', text: "C. Selecting symbols randomly" },
      { id: 'D', text: "D. Grouping symbols without position" },
      { id: 'E', text: "E. Picking all symbols at once" }
    ],
    answer: 'B',
    hint: "Think about situations where the order or arrangement matters.",
    expl: "Since the position of the symbols is important, order matters in arrangements.",
    background: "#1a1a2e",
    difficulty: 'easy'
  },
  2: {
    situation: "You need to open a chest by picking a group of keys. The order you pick them up does not matter at all.",
    question: "Which concept helps you open the chest?",
    options: [
      { id: 'A', text: "A. Arranging keys in order" },
      { id: 'B', text: "B. Placing keys from first to last" },
      { id: 'C', text: "C. Selecting keys where order matters" },
      { id: 'D', text: "D. Choosing a group of keys where order does not matter" },
      { id: 'E', text: "E. Positioning the keys in sequence" }
    ],
    answer: 'D',
    hint: "Think about situations where you only choose a group and the order does not matter.",
    expl: "The note says order does not matter for the group of keys.",
    background: "#2e1a1a",
    difficulty: 'easy'
  },
  3: {
    situation: "A laboratory with glowing potions and a locked cabinet. Note: 'Arrange three potions on the stand in the correct order to reveal the secret.'",
    question: "Which idea is needed to solve the challenge?",
    options: [
      { id: 'A', text: "A. Grouping potions without order" },
      { id: 'B', text: "B. Choosing potions randomly" },
      { id: 'C', text: "C. Arranging potions where order matters" },
      { id: 'D', text: "D. Selecting potions without position" },
      { id: 'E', text: "E. Ignoring the order of potions" }
    ],
    answer: 'C',
    hint: "Think about whether the arrangement or position changes the outcome.",
    expl: "Arranging items in a specific order to reveal a secret is an arrangement problem where order matters.",
    background: "#1a2e1a",
    difficulty: 'average'
  },
  4: {
    situation: "A room filled with glowing gemstones. Locked box requires choosing three gems. Note: 'Only the correct set of gems will open the box. The order of choosing them does not matter.'",
    question: "Which concept applies to this challenge?",
    options: [
      { id: 'A', text: "A. Arranging gems in order" },
      { id: 'B', text: "B. Selecting a group of gems where order does not matter" },
      { id: 'C', text: "C. Placing gems from first to last" },
      { id: 'D', text: "D. Assigning positions to gems" },
      { id: 'E', text: "E. Arranging gems in sequence" }
    ],
    answer: 'B',
    hint: "Focus on selecting a group rather than arranging them.",
    expl: "Selecting a set where order doesn't matter is all about grouping.",
    background: "#2e1a2e",
    difficulty: 'average'
  },
  5: {
    situation: "A massive gate blocks your escape. Four glowing runes appear. Note: 'Place the runes in the correct sequence to activate the exit portal.'",
    question: "Which concept must you understand to unlock the final gate?",
    options: [
      { id: 'A', text: "A. Choosing runes without considering order" },
      { id: 'B', text: "B. Grouping runes randomly" },
      { id: 'C', text: "C. Arranging runes where order matters" },
      { id: 'D', text: "D. Ignoring rune positions" },
      { id: 'E', text: "E. Selecting runes without sequence" }
    ],
    answer: 'C',
    hint: "Think about challenges where the sequence or order changes the result.",
    expl: "A sequence or sequence-based activation requires the correct order.",
    background: "#0a0a0a",
    difficulty: 'difficult'
  }
};

const RESUME_QUIZ_DATA = [
  {
    question: "Choose 3 digits from {1, 2, 3, 4} to form a 3-digit code.",
    answer: "Permutation",
    explanation: "The arrangement of digits matters because different orders create different codes.",
    hint: "Does 123 mean the same thing as 321 in a code?"
  },
  {
    question: "Select 2 numbers from {5, 6, 7, 8} to create a pair for a team.",
    answer: "Combination",
    explanation: "The order does not matter since both selections form the same pair.",
    hint: "If you pick 5 then 6, is that a different team than 6 then 5?"
  },
  {
    question: "Form a 3-digit code using digits {2, 3, 4}.",
    answer: "Permutation",
    explanation: "Changing the order produces different codes, so arrangement matters.",
    hint: "Rearranging 2, 3, 4 makes 234, 243, etc."
  },
  {
    question: "Choose 3 students from a group of 10 to join a club.",
    answer: "Combination",
    explanation: "The selection is only about grouping, not arranging roles or order.",
    hint: "A 'group' of students doesn't usually care about rank."
  },
  {
    question: "Create a 4-digit code using {1, 2, 3, 4, 5} without repeating digits.",
    answer: "Permutation",
    explanation: "Different arrangements form different codes, so order is important.",
    hint: "Codes rely on specific placement."
  },
  {
    question: "Select 2 toppings from {cheese, pepperoni, ham, bacon} for a pizza.",
    answer: "Combination",
    explanation: "The order of choosing toppings does not change the final result.",
    hint: "Cheese then Ham is the same pizza as Ham then Cheese."
  },
  {
    question: "Choose 3 digits from {0, 1, 2, 3} to form a code.",
    answer: "Permutation",
    explanation: "The order of digits matters because each arrangement forms a different code.",
    hint: "Standard code rule applies."
  },
  {
    question: "Pick 4 students to form a group project team.",
    answer: "Combination",
    explanation: "The group is the same regardless of the order of selection.",
    hint: "Team membership doesn't change if you pick John first or last."
  },
  {
    question: "Choose 3 digits from {1, 2, 3, 4, 5} to form a security code where order matters.",
    answer: "Permutation",
    explanation: "Different arrangements of the same digits create different security codes.",
    hint: "Security codes are order-dependent by definition here."
  },
  {
    question: "Select 3 students from a class of 12 to represent the class.",
    answer: "Combination",
    explanation: "The selection only forms a group, so order is not important.",
    hint: "Representing as a group means individual order is ignored."
  }
];

// --- Components ---

// --- Components ---
const TacticalAssistant = ({ phase, playerName }: { phase: Phase, playerName: string }) => {
  const visiblePhases: Phase[] = ['cover', 'introduction', 'briefing', 'level-selection', 'level-nav', 'level-1-directions', 'level-1-summary', 'level-2-directions', 'level-2-summary', 'dashboard'];
  if (!visiblePhases.includes(phase)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1 }}
      className="fixed bottom-0 right-0 z-[200] pointer-events-none"
    >
      <div className="relative flex flex-col items-end">
        {/* Mobile Speech Bubble */}
        <div className="md:hidden bg-[rgba(10,17,24,0.9)] border border-[var(--solo-blue)] px-2 py-0.5 rounded text-[8px] font-black text-[var(--solo-blue)] mb-1 mr-4 uppercase tracking-tighter shadow-lg translate-y-4">
          ECHO // ACTIVE
        </div>
        
        <div className="relative">
          {/* OFFLINE SAFE AVATAR REPLACEMENT */}
          <div className="w-28 md:w-48 lg:w-64 aspect-square flex items-center justify-center border-2 border-[var(--solo-blue)] bg-[rgba(0,184,230,0.1)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--solo-blue)]/20 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 border border-[var(--solo-blue)] opacity-20 rotate-45 animate-spin-slow" />
            <div className="text-center">
               <div className="text-[var(--solo-blue)] font-black text-4xl mb-2 drop-shadow-[0_0_10px_var(--solo-blue)]">Σ</div>
               <div className="text-[8px] text-[var(--solo-blue)] font-mono animate-pulse">SYNC_READY</div>
            </div>
          </div>
          {/* Desktop Detail Tag */}
          <div className="hidden md:block absolute top-[20%] -left-14 bg-black/80 border border-[var(--solo-blue)] px-3 py-1.5 rounded-lg text-[9px] font-black text-[var(--solo-blue)] uppercase tracking-[3px] shadow-[0_0_15px_rgba(0,184,230,0.3)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--solo-blue)] animate-pulse" />
              TACTICAL_AI // ECHO
            </div>
            {playerName && <div className="text-[7px] text-white/50 mt-1 truncate max-w-[100px]">ID: PLAYER_{playerName.toUpperCase()}</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let columns: number, drops: number[];
    const resize = () => {
      canvas.height = window.innerHeight;
      canvas.width = window.innerWidth;
      columns = canvas.width / 14;
      drops = Array(Math.floor(columns)).fill(1);
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 17, 24, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 184, 230, 0.7)'; // Match --solo-blue
      ctx.font = '14px Courier';
      drops.forEach((y, i) => {
        if (Math.random() > 0.4) { // Slightly denser
          const text = String.fromCharCode(0x30A0 + Math.random() * 33);
          ctx.fillText(text, i * 20, y * 14);
        }
        if (y * 14 > canvas.height && Math.random() > 0.97) drops[i] = 0;
        drops[i]++;
      });
    };

    const interval = setInterval(draw, 40); // Faster updates for better motion
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-[-1] opacity-35" />;
};

export default function App() {
  // --- State ---
  const [phase, setPhase] = useState<Phase>('cover');
  const [player, setPlayer] = useState<Player>(() => {
    const saved = localStorage.getItem('player_data');
    return saved ? JSON.parse(saved) : {
      name: '',
      code: '',
      rank: 'E-Rank',
      stars: 0,
      progress: 0,
      keys: 0
    };
  });
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>(() => {
    const saved = localStorage.getItem('unlocked_levels');
    return saved ? JSON.parse(saved) : [1];
  });
  const [roomDifficulty, setRoomDifficulty] = useState<Record<number, 'easy' | 'average' | 'difficult'>>({});
  const [playersList, setPlayersList] = useState<StudentRecord[]>(() => {
    const saved = localStorage.getItem('players_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [roomPerformance, setRoomPerformance] = useState<Record<string, PerformanceRecord>>({});
  
  // --- Persistent Storage ---
  useEffect(() => {
    localStorage.setItem('player_data', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    localStorage.setItem('unlocked_levels', JSON.stringify(unlockedLevels));
  }, [unlockedLevels]);

  useEffect(() => {
    localStorage.setItem('players_list', JSON.stringify(playersList));
  }, [playersList]);
  const [showNotification, setShowNotification] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showQuickNotif, setShowQuickNotif] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [learningTab, setLearningTab] = useState('home');

  // --- New Navigation & Assessment States ---
  const [selectedLevelNav, setSelectedLevelNav] = useState<number>(1);
  const [resumeQuizStep, setResumeQuizStep] = useState<number>(0);
  const [resumeFeedback, setResumeFeedback] = useState<string>('');
  const [showResumeExpl, setShowResumeExpl] = useState<boolean>(false);
  const [reviewLevel, setReviewLevel] = useState<number>(1);
  const [reviewRoom, setReviewRoom] = useState<number>(1);
  const [showResumeHint, setShowResumeHint] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<number | null>(null);
  const [showHint, setShowHint] = useState<number | null>(null);
  const [jinwooMessage, setJinwooMessage] = useState("System initialization complete. Arise, Player.");
  const [isJinwooSpeaking, setIsJinwooSpeaking] = useState(true);

  const jinwooLore = [
    "The System is absolute. Your logic must be as well.",
    "Arise... your mission data is synchronized.",
    "Shadow Soldiers don't settle for anything less than S-Rank.",
    "Strategic analysis is the true power of a Monarch.",
    "Don't let the complexity of the dungeon cloud your vision.",
    "Every code broken is a step closer to the ultimate truth.",
    "I am here to ensure your synchronization remains at 100%."
  ];

  const triggerJinwooLore = () => {
    const randomLore = jinwooLore[Math.floor(Math.random() * jinwooLore.length)];
    setJinwooMessage(randomLore);
    setIsJinwooSpeaking(true);
    playSfx('notif');
    setTimeout(() => setIsJinwooSpeaking(false), 6000);
  };

  // Jinwoo Dialogue logic
  useEffect(() => {
    const dialogues: Record<string, string> = {
      'cover': "System initialization complete. Arise, Player.",
      'introduction': "Knowledge is power in this dungeon. Stay sharp.",
      'loading': "Syncing memory with the Monarch's core...",
      'briefing': "Study the rules. Survival depends on logic.",
      'level-selection': "Mission Control ready. Select your next level.",
      'level-nav': "The Hub is stable. Analyze your progress.",
      'level-1-rooms': "Room 1 detected. Permutations are the key here.",
      'level-2-rooms': "Room 2 detected. Combinations require precision.",
      'level-1-summary': "Level 1 cleared. Your analytical skills are growing.",
      'level-2-summary': "Level 2 cleared. A true Monarch's focus.",
      'dashboard': "Analyzing system metrics. You are making history."
    };
    
    if (dialogues[phase]) {
      setJinwooMessage(dialogues[phase]);
      setIsJinwooSpeaking(true);
      const timer = setTimeout(() => setIsJinwooSpeaking(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [phase]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [welcomeText, setWelcomeText] = useState('');
  
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [showSituation, setShowSituation] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(1);
  const [roomAttempts, setRoomAttempts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [roomPassed, setRoomPassed] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [roomFeedback, setRoomFeedback] = useState<string>('');
  const [roomInput, setRoomInput] = useState('');

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Audio Refs
  const sfxCorrect = useRef<HTMLAudioElement>(null);
  const sfxError = useRef<HTMLAudioElement>(null);
  const sfxNotif = useRef<HTMLAudioElement>(null);
  const sfxType = useRef<HTMLAudioElement>(null);
  const sfxDramatic = useRef<HTMLAudioElement>(null);
  const bgMusic = useRef<HTMLAudioElement>(null);
  const puzzleMusic = useRef<HTMLAudioElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Start tutorial if player name is empty (first time)
    if (phase === 'cover' && !showTutorial && player.name === '') {
      setShowTutorial(true);
    }
  }, [phase, player.name]);

  const tutorialSteps: Record<string, string> = {
    'cover': "WELCOME TO C'CODESCAPE! CLICK 'START MISSION' TO BEGIN YOUR JOURNEY INTO THE SYSTEM.",
    'introduction': "READ YOUR MISSION OBJECTIVE. CLICK 'START' TO INITIALIZE THE LOADING SEQUENCE.",
    'briefing': "THESE ARE THE SYSTEM MECHANICS. UNDERSTAND THEM CAREFULLY TO OPTIMIZE YOUR RANKING. CLICK 'UNDERSTOOD' TO TRIGGER QUALIFICATION.",
    'level-selection': "THIS IS MISSION CONTROL. CLICK ON AN UNLOCKED LEVEL (BLUE CARDS) TO ENTER THE ROOMS. FINISH EACH LEVEL TO UNLOCK THE NEXT!",
    'level-1-rooms': "SOLVE THE PROBLEM BY ENTERING THE CODE. IF YOU'RE STUCK, USE THE 'HINT' BUTTON ON THE TOP RIGHT! CORRECT ANSWERS GAIN STARS AND KEYS.",
    'level-2-rooms': "CHOOSE THE CORRECT CONCEPT (A-E). USE HINTS IF NEEDED. REMEMBER: EFFICIENCY (FEWER ATTEMPTS) BOOSTS YOUR RANK TO S-RANK!",
  };

  const renderTutorial = () => {
    if (!showTutorial || !tutorialSteps[phase]) return null;

    return (
      <div className="fixed inset-x-0 bottom-24 z-[20000] pointer-events-none flex items-center justify-center p-4">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto w-full max-w-sm bg-[rgba(10,17,24,0.95)] text-[var(--solo-blue)] border-2 border-[var(--solo-blue)] p-5 shadow-[0_0_40px_rgba(0,212,255,0.4)] rounded-xl font-black italic tracking-tight relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--solo-blue)] to-transparent" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] bg-[var(--solo-blue)] text-black px-2 py-0.5 rounded-sm uppercase font-mono tracking-widest font-black">SYSTEM_GUIDE_PROMPT</span>
            <button onClick={() => setShowTutorial(false)} className="text-[var(--solo-blue)] font-black hover:scale-125 transition-transform text-xl">&times;</button>
          </div>
          <p className="text-sm md:text-base leading-snug drop-shadow-[0_0_5px_var(--solo-blue)] mb-4">{tutorialSteps[phase]}</p>
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
               <div className="w-2 h-2 rounded-full bg-[var(--solo-blue)] animate-pulse" />
               <div className="w-2 h-2 rounded-full bg-[var(--solo-blue)]/50" />
               <div className="w-2 h-2 rounded-full bg-[var(--solo-blue)]/30" />
            </div>
            <button 
              onClick={() => setShowTutorial(false)}
              className="bg-[var(--solo-blue)] text-black px-4 py-1.5 text-[10px] font-black hover:bg-white transition-all skew-x-[-12deg]"
            >
              [CLOSE_GUIDE]
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  useEffect(() => {
    if (phase === 'loading') {
      setWelcomeText(""); // Clear first
      let i = 0;
      const fullText = "Loading";
      const typing = setInterval(() => {
        setWelcomeText(prev => prev + fullText.charAt(i));
        i++;
        if (i === fullText.length) {
          clearInterval(typing);
          setTimeout(() => {
            let progress = 0;
            const loading = setInterval(() => {
              progress++;
              setLoadingProgress(progress);
              if (progress >= 100) {
                clearInterval(loading);
                setTimeout(() => setPhase('briefing'), 500);
              }
            }, 30);
          }, 1000);
        }
      }, 70);
    }
  }, [phase, player.name]);

  useEffect(() => {
    if (bgMusic.current) {
      bgMusic.current.volume = isMuted ? 0 : 0.2 * volume;
      if (!isMuted) bgMusic.current.play().catch(() => {});
    }
  }, [isMuted, volume]);

  // --- Handlers ---
  const playSfx = (type: 'correct' | 'error' | 'notif' | 'type' | 'dramatic') => {
    if (isMuted) return;
    let audio: HTMLAudioElement | null = null;
    switch (type) {
      case 'correct': audio = sfxCorrect.current; break;
      case 'error': audio = sfxError.current; break;
      case 'notif': audio = sfxNotif.current; break;
      case 'type': audio = sfxType.current; break;
      case 'dramatic': audio = sfxDramatic.current; break;
    }
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {});
    }
  };

  const handleRegister = () => {
    if (player.name.trim() === "" || player.code.length !== 4) {
      playSfx('error');
      return;
    }
    playSfx('correct');
    
    // Initialize or update player in list
    const newRecord: StudentRecord = {
      player: { ...player },
      performance: {}
    };
    setPlayersList(prev => [...prev, newRecord]);
    
    setShowRegistration(false);
    setUnlockedLevels([1]);
    setPhase('level-selection');
    setShowQuickNotif(true);
  };

  const handleDownloadData = (record: StudentRecord) => {
    const doc = new jsPDF();
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();

    // Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(50);
    const watermarkText = "C'CODESCAPE DATA";
    doc.text(watermarkText, 35, 160, { angle: 45, opacity: 0.1 } as any);

    // Header Content
    doc.setTextColor(0, 184, 230); // var(--solo-blue)
    doc.setFontSize(24);
    doc.text("C'CODESCAPE: GLOBAL PROGRESS REPORT", 105, 20, { align: 'center' });
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Player Profile: ${record.player.name}`, 20, 45);
    doc.text(`Access Code: ${record.player.code}`, 20, 52);
    doc.text(`Current Rank: ${record.player.rank}`, 20, 59);
    doc.text(`Download Date: ${dateTimeStr}`, 20, 66);
    doc.text(`Overall Progress: ${Math.floor(record.player.progress)}%`, 20, 73);
    doc.text(`Total Stars: ${record.player.stars}/110`, 20, 80);
    doc.text(`Total Keys: ${record.player.keys}`, 20, 87);

    // Filter Level 1
    const l1Data = [];
    for (let i = 1; i <= 5; i++) {
      const p = record.performance[`1-${i}`];
      if (p) {
        l1Data.push([`Room ${i}`, p.difficulty, p.attempts.toString(), p.input, p.result]);
      }
    }

    let lastEndY = 95;
    if (l1Data.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 150, 200);
      doc.text("LEVEL 1: PERMUTATION MISSION", 20, 100);
      (doc as any).autoTable({
        startY: 105,
        head: [['Room', 'Difficulty', 'Attempts', 'Input', 'Result']],
        body: l1Data,
        theme: 'striped',
        headStyles: { fillColor: [0, 184, 230], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });
      lastEndY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Filter Level 2
    const l2Data = [];
    for (let i = 1; i <= 5; i++) {
      const p = record.performance[`2-${i}`];
      if (p) {
        l2Data.push([`Room ${i}`, p.difficulty, p.attempts.toString(), p.input, p.result]);
      }
    }

    if (l2Data.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 150, 200);
      doc.text("LEVEL 2: COMBINATION MISSION", 20, lastEndY);
      (doc as any).autoTable({
        startY: lastEndY + 5,
        head: [['Room', 'Difficulty', 'Attempts', 'Input', 'Result']],
        body: l2Data,
        theme: 'striped',
        headStyles: { fillColor: [0, 184, 230], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This document was generated by C'CODESCAPE Gamified Learning System.", 105, 285, { align: 'center' });

    doc.save(`Global_Progress_${record.player.name.replace(/\s+/g, '_')}.pdf`);
  };

  const getRank = (stars: number, perf: Record<string, PerformanceRecord>) => {
    const totalAttempts = Object.values(perf).reduce((sum, p) => sum + p.attempts, 0);
    if (stars >= 110) return totalAttempts <= 20 ? 'S-Rank' : 'A-Rank';
    if (stars >= 70) return 'B-Rank';
    if (stars >= 40) return 'C-Rank';
    if (stars >= 20) return 'D-Rank';
    if (stars >= 10) return 'E-Rank';
    return 'E-Rank';
  };

  const updateCurrentPlayerRecord = (perf: Record<string, PerformanceRecord>, updatedPlayer?: Player) => {
    setPlayersList(prev => {
      const newList = [...prev];
      if (newList.length > 0) {
        newList[newList.length - 1] = {
          ...newList[newList.length - 1],
          player: updatedPlayer || { ...player },
          performance: { ...perf }
        };
      }
      return newList;
    });
  };

  const handleLevel1Code = () => {
    const room = LEVEL_1_ROOMS[currentRoom];
    const currentDiff = roomDifficulty[currentRoom] || room.difficulty;
    const input = roomInput.trim().toUpperCase();
    const attempts = (roomAttempts[currentRoom] || 0) + 1;
    setRoomAttempts(prev => ({ ...prev, [currentRoom]: attempts }));

    const isLevel1Equivalent = (userStr: string, validStr: string) => {
      const userParts = userStr.split(',').map(s => s.trim()).filter(Boolean).sort();
      const validParts = validStr.split(',').map(s => s.trim()).filter(Boolean).sort();
      return userParts.join(',') === validParts.join(',');
    };

    if (room.valid.some(v => isLevel1Equivalent(input, v))) {
      playSfx('correct');
      setRoomPassed(prev => ({ ...prev, [currentRoom]: true }));
      const newStars = player.stars + 2;
      const newProgress = Math.min(player.progress + (100 / 55), 100);
      
      const newPerf = { 
        ...roomPerformance, 
        [`1-${currentRoom}`]: { result: "Correct", input, difficulty: currentDiff, attempts } 
      };
      const newRank = getRank(newStars, newPerf);
      const updatedPlayer = { ...player, stars: newStars, progress: newProgress, rank: newRank };
      setPlayer(updatedPlayer);
      setRoomPerformance(newPerf);
      updateCurrentPlayerRecord(newPerf, updatedPlayer);
      
      setRoomFeedback("✓ CORRECT! Explanation Unlocked. +2 ⭐");
      setShowExplanation(currentRoom);
      
      // Check if level 1 is completed
      const allPassed = { ...roomPassed, [currentRoom]: true };
      if (Object.values(allPassed).filter(Boolean).length === 5) {
        const finalPlayer = { ...updatedPlayer, keys: updatedPlayer.keys + 5 };
        setPlayer(finalPlayer);
        updateCurrentPlayerRecord(newPerf, finalPlayer);
        setUnlockedLevels(prev => Array.from(new Set([...prev, 2])));
      }
    } else {
      playSfx('error');
      
      if (attempts >= 3) {
        // Automatically record as Incorrect and allow progression
        const newPerf = { 
          ...roomPerformance, 
          [`1-${currentRoom}`]: { result: "Incorrect (Limit Exceeded)", input: input || "Empty", difficulty: currentDiff, attempts } 
        };
        const newRank = getRank(player.stars, newPerf);
        const updatedPlayer = { ...player, rank: newRank };
        setPlayer(updatedPlayer);
        setRoomPerformance(newPerf);
        updateCurrentPlayerRecord(newPerf, updatedPlayer);
        
        setRoomPassed(prev => ({ ...prev, [currentRoom]: true }));
        setRoomFeedback("❌ ATTEMPT LIMIT EXCEEDED. RECORDED AS INCORRECT.");
        setShowExplanation(currentRoom);

        // Check completion anyway
        const allPassed = { ...roomPassed, [currentRoom]: true };
        if (Object.values(allPassed).filter(Boolean).length === 5) {
          const finalPlayer = { ...updatedPlayer, keys: updatedPlayer.keys + 5 };
          setPlayer(finalPlayer);
          updateCurrentPlayerRecord(newPerf, finalPlayer);
          setUnlockedLevels(prev => Array.from(new Set([...prev, 2])));
        }
      } else {
        const newPerf = { 
          ...roomPerformance, 
          [`1-${currentRoom}`]: { result: "Wrong", input: input || "Empty", difficulty: currentDiff, attempts } 
        };
        const newRank = getRank(player.stars, newPerf);
        const updatedPlayer = { ...player, rank: newRank };
        setPlayer(updatedPlayer);
        setRoomPerformance(newPerf);
        updateCurrentPlayerRecord(newPerf, updatedPlayer);
        
        // Adaptive Logic
        if (currentDiff === 'difficult') {
          setRoomDifficulty(prev => ({ ...prev, [currentRoom]: 'average' }));
          setRoomFeedback("❌ INCORRECT. Difficulty downgraded to AVERAGE.");
        } else if (currentDiff === 'average' && attempts >= 4) {
          // This case only hit if someone changes logic, but keeping for safety
          setRoomDifficulty(prev => ({ ...prev, [currentRoom]: 'easy' }));
          setRoomFeedback("❌ INCORRECT. Difficulty downgraded to EASY.");
        } else {
          setRoomFeedback(`❌ INVALID CODE. (${3 - attempts} attempts left)`);
        }
      }
    }
  };

  const handleLevel2Answer = (choice: string) => {
    const room = LEVEL_2_ROOMS[currentRoom];
    const currentDiff = roomDifficulty[currentRoom] || room.difficulty;
    const attempts = (roomAttempts[currentRoom] || 0) + 1;
    setRoomAttempts(prev => ({ ...prev, [currentRoom]: attempts }));

    if (choice === room.answer) {
      playSfx('correct');
      const newStars = player.stars + 2;
      const newProgress = Math.min(player.progress + (100 / 55), 100);
      
      const newPerf = { 
        ...roomPerformance, 
        [`2-${currentRoom}`]: { result: "Correct", input: choice, difficulty: currentDiff, attempts } 
      };
      const newRank = getRank(newStars, newPerf);
      const updatedPlayer = { ...player, stars: newStars, progress: newProgress, rank: newRank };
      setPlayer(updatedPlayer);
      setRoomPerformance(newPerf);
      updateCurrentPlayerRecord(newPerf, updatedPlayer);
      
      setRoomFeedback("✓ CORRECT! Explanation Unlocked. +2 ⭐");
      setTimeout(() => setShowExplanation(currentRoom), 800);

      if (currentRoom === 5) {
        const finalPlayer = { ...updatedPlayer, keys: updatedPlayer.keys + 5 };
        setPlayer(finalPlayer);
        updateCurrentPlayerRecord(newPerf, finalPlayer);
        setUnlockedLevels(prev => Array.from(new Set([...prev, 3])));
      }
    } else {
      playSfx('error');
      
      if (attempts >= 3) {
        // Automatically record as Incorrect and allow progression
        const newPerf = { 
          ...roomPerformance, 
          [`2-${currentRoom}`]: { result: "Incorrect (Limit Exceeded)", input: choice || "Empty", difficulty: currentDiff, attempts } 
        };
        const newRank = getRank(player.stars, newPerf);
        const updatedPlayer = { ...player, rank: newRank };
        setPlayer(updatedPlayer);
        setRoomPerformance(newPerf);
        updateCurrentPlayerRecord(newPerf, updatedPlayer);
        
        setRoomFeedback("❌ ATTEMPT LIMIT EXCEEDED. RECORDED AS INCORRECT.");
        setTimeout(() => setShowExplanation(currentRoom), 800);

        if (currentRoom === 5) {
          const finalPlayer = { ...updatedPlayer, keys: updatedPlayer.keys + 5 };
          setPlayer(finalPlayer);
          updateCurrentPlayerRecord(newPerf, finalPlayer);
          setUnlockedLevels(prev => Array.from(new Set([...prev, 3])));
        }
      } else {
        const newPerf = { 
          ...roomPerformance, 
          [`2-${currentRoom}`]: { result: "Wrong", input: choice, difficulty: currentDiff, attempts } 
        };
        const newRank = getRank(player.stars, newPerf);
        const updatedPlayer = { ...player, rank: newRank };
        setPlayer(updatedPlayer);
        setRoomPerformance(newPerf);
        updateCurrentPlayerRecord(newPerf, updatedPlayer);
        
        // Adaptive Logic
        if (currentDiff === 'difficult') {
          setRoomDifficulty(prev => ({ ...prev, [currentRoom]: 'average' }));
          setRoomFeedback("❌ INCORRECT. Difficulty downgraded to AVERAGE.");
        } else if (currentDiff === 'average' && attempts >= 4) {
          setRoomDifficulty(prev => ({ ...prev, [currentRoom]: 'easy' }));
          setRoomFeedback("❌ INCORRECT. Difficulty downgraded to EASY.");
        } else {
          setRoomFeedback(`❌ INVALID SYMBOL SELECTION. (${3 - attempts} attempts left)`);
        }
      }
    }
  };

  const handleResumeAnswer = (choice: string) => {
    const q = RESUME_QUIZ_DATA[resumeQuizStep];
    if (choice === q.answer) {
      playSfx('correct');
      setResumeFeedback("✓ CORRECT!");
      setShowResumeExpl(true);
    } else {
      playSfx('error');
      setResumeFeedback("❌ INCORRECT. Try again.");
    }
  };

  const downloadLevel1Report = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
    const totalAttempts = Object.values(roomAttempts).reduce((a: number, b: number) => a + b, 0);

    // Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(50);
    const watermarkText = "C'CODESCAPE GAME";
    doc.text(watermarkText, 35, 160, { angle: 45, opacity: 0.1 } as any);

    // Header Content
    doc.setTextColor(0, 184, 230); // var(--solo-blue)
    doc.setFontSize(24);
    doc.text("C'CODESCAPE: MISSION REPORT", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text("LEVEL 1 SUMMARY", 105, 28, { align: 'center' });
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Player Name: ${player.name}`, 20, 45);
    doc.text(`Current Rank: ${player.rank}`, 20, 52);
    doc.text(`Mission Date: ${dateTimeStr}`, 20, 59);
    doc.text(`Operational Attempts: ${totalAttempts}`, 20, 66);
    doc.text(`Total Stars: ${player.stars}/110`, 20, 73);

    const tableData = [];
    for (let i = 1; i <= 5; i++) {
      const perf = roomPerformance[`1-${i}`] || { result: 'Incomplete', input: 'N/A' };
      const attempts = (roomAttempts[i] || 0);
      tableData.push([
        `Room ${i}`,
        LEVEL_1_ROOMS[i].question.substring(0, 45) + "...",
        perf.input,
        perf.result,
        attempts.toString()
      ]);
    }

    (doc as any).autoTable({
      startY: 85,
      head: [['Room', 'Investigation Detail', 'Code Input', 'Result', 'Attempts']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 184, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Motivational Quote in Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const quote = '"Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill';
    doc.text(quote, 105, 275, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Official Learning Intelligence Record | C'CODESCAPE Gamified Learning System", 105, 285, { align: 'center' });

    doc.save(`${player.name.replace(/\s+/g, '_')}_C-Codescape_Report.pdf`);
  };

  const downloadLevel2Report = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
    const totalAttempts = Object.values(roomAttempts).reduce((a: number, b: number) => a + b, 0);

    // Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(50);
    const watermarkText = "C'CODESCAPE GAME";
    doc.text(watermarkText, 35, 160, { angle: 45, opacity: 0.1 } as any);

    // Header Content
    doc.setTextColor(0, 184, 230); // var(--solo-blue)
    doc.setFontSize(24);
    doc.text("C'CODESCAPE: MISSION REPORT", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text("LEVEL 2 SUMMARY", 105, 28, { align: 'center' });
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Player Name: ${player.name}`, 20, 45);
    doc.text(`Current Rank: ${player.rank}`, 20, 52);
    doc.text(`Mission Date: ${dateTimeStr}`, 20, 59);
    doc.text(`Operational Attempts: ${totalAttempts}`, 20, 66);
    doc.text(`Total Stars: ${player.stars}/110`, 20, 73);

    const tableData = [];
    for (let i = 1; i <= 5; i++) {
      const perf = roomPerformance[`2-${i}`] || { result: 'Incomplete', input: 'N/A' };
      const attempts = (roomAttempts[i] || 0);
      tableData.push([
        `Room ${i}`,
        LEVEL_2_ROOMS[i].question.substring(0, 45) + "...",
        perf.input,
        perf.result,
        attempts.toString()
      ]);
    }

    (doc as any).autoTable({
      startY: 85,
      head: [['Room', 'Investigation Detail', 'Choice Input', 'Result', 'Attempts']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 184, 230], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Motivational Quote in Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const quote = '"Intelligence is the ability to adapt to change." - Stephen Hawking';
    doc.text(quote, 105, 275, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Official Learning Intelligence Record | C'CODESCAPE Gamified Learning System", 105, 285, { align: 'center' });

    doc.save(`${player.name.replace(/\s+/g, '_')}_C-Codescape_L2_Report.pdf`);
  };

  // --- Render Helpers ---

  const renderHeader = () => (
    <header className="mb-4 shrink-0">
      <div className="flex justify-between items-center mb-2 gap-2">
        <button className="icon-btn flex items-center gap-1 shrink-0" onClick={() => { playSfx('type'); setPhase('cover'); }}>
          <Home size={14} /> <span className="hidden xs:inline">HOME</span>
        </button>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          <button className="icon-btn flex items-center gap-1 whitespace-nowrap text-[10px] md:text-sm" onClick={() => { playSfx('notif'); setPhase('dashboard'); }}>
            📊 <span className="hidden sm:inline">DASHBOARD</span>
          </button>
          <button className="icon-btn flex items-center gap-1 whitespace-nowrap text-[10px] md:text-sm" onClick={() => { playSfx('notif'); setShowProfile(true); }}>
            <User size={14} /> <span className="hidden sm:inline">PROFILE</span>
          </button>
          <button className="icon-btn flex items-center gap-1 whitespace-nowrap text-[10px] md:text-sm" onClick={() => { playSfx('notif'); setShowSettings(true); }}>
            <SettingsIcon size={14} /> <span className="hidden sm:inline">SETTINGS</span>
          </button>
          <button 
            onClick={() => { playSfx('notif'); setShowGameInfo(true); }}
            className="icon-btn bg-[var(--solo-blue)] text-black flex items-center justify-center p-1 px-2"
          >
            <Info size={14} />
          </button>
        </div>
      </div>
      <h1 className="text-center text-xl md:text-3xl font-black tracking-widest mb-1">
        🚀 <span className="title-animate">C'CODESCAPE</span> 🚀
      </h1>
      <div className="stats-bar flex justify-between items-center bg-[rgba(0,59,0,0.3)] p-2 rounded-md font-orbitron text-[10px] md:text-sm">
        <div className="flex flex-col">
          <span>🛰️ Status: Active</span>
          <span>Progress: {Math.floor(player.progress)}%</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm md:text-lg font-bold">⭐: {player.stars}/110</span>
          <span className="text-[10px] md:text-sm text-[var(--example-hl)] font-bold">🔑 KEYS: {player.keys}</span>
        </div>
      </div>
    </header>
  );

  return (
    <div className="relative w-full h-[100dvh] md:w-[98vw] md:h-[98vh] max-w-[1280px] border-x-0 md:border-2 border-[var(--solo-blue)] p-3 md:p-6 shadow-[0_0_20px_var(--solo-blue)] bg-[rgba(10,17,24,0.92)] backdrop-blur-md md:rounded-xl flex flex-col overflow-hidden mx-auto">
      <MatrixBackground />
      
      {/* Audio Elements */}
      {/* OFFLINE: ALL AUDIO ASSETS EMBEDDED VIA BASE64 */}
      <audio ref={sfxCorrect} src={SILENT_AUDIO} />
      <audio ref={sfxError} src={SILENT_AUDIO} />
      <audio ref={sfxNotif} src={SILENT_AUDIO} />
      <audio ref={sfxType} src={SILENT_AUDIO} />
      <audio ref={sfxDramatic} src={SILENT_AUDIO} />
      <audio ref={bgMusic} src={SILENT_AUDIO} loop />
      <audio ref={puzzleMusic} src={SILENT_AUDIO} loop />

      {/* Jinwoo Assistant - Integrated with Motion & Tactical Features */}
      <motion.div 
        drag
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[10000] cursor-grab active:cursor-grabbing flex items-end gap-3"
      >
        <AnimatePresence>
          {isJinwooSpeaking && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 20 }}
              className="bg-[rgba(10,17,24,0.95)] border-2 border-[var(--solo-blue)] p-3 rounded-2xl rounded-br-none shadow-[0_0_15px_rgba(0,212,255,0.3)] max-w-[150px] md:max-w-[200px] mb-8"
            >
              <div className="absolute -bottom-2 right-0 w-4 h-4 bg-[rgba(10,17,24,0.95)] border-r-2 border-b-2 border-[var(--solo-blue)] rotate-45" />
              <p className="text-[10px] md:text-xs font-black text-white italic leading-tight uppercase">
                {jinwooMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative group" onClick={triggerJinwooLore}>
          {/* Animated Aura */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-[var(--solo-blue)] rounded-full blur-xl -z-10"
          />
          
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[rgba(10,17,24,0.9)] border border-[var(--solo-blue)] p-2 rounded text-[10px] font-black uppercase text-[var(--solo-blue)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            Tactical Guide: ECHO
          </div>

          <div className="w-16 h-16 md:w-32 md:h-32 border-2 md:border-4 border-[var(--solo-blue)] overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.8)] bg-black/50 backdrop-blur-sm relative border-glow skew-x-[-10deg] rotate-[-5deg] group-hover:rotate-0 transition-transform duration-500">
            {/* Animated Scanlines & Glitch Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10" />
            <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-black via-[rgba(0,184,230,0.05)] to-black pointer-events-none" />
            
            {/* Offline-Safe Avatar Representation */}
            <div className="w-full h-full bg-gradient-to-t from-[var(--solo-blue)]/40 to-transparent flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,184,230,0.2)_0%,transparent_70%)]" />
              <motion.div 
                animate={{ 
                  y: [0, -5, 0],
                  scale: isJinwooSpeaking ? [1, 1.1, 1] : [1, 1.02, 1],
                  rotateZ: [-2, 2, -2]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 text-[var(--solo-blue)] drop-shadow-[0_0_15px_rgba(0,184,230,0.8)]"
              >
                <div className="w-40 h-40 md:w-56 md:h-56 relative">
                  {/* Central Hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-[var(--solo-blue)]/20 border-4 border-[var(--solo-blue)] rounded-full shadow-[0_0_30px_var(--solo-blue)] flex items-center justify-center">
                    <div className="w-16 h-16 border-2 border-[var(--solo-blue)] rounded-full animate-ping opacity-30" />
                    <div className="text-5xl">🤖</div>
                  </div>
                  
                  {/* Rotating Orbitals */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-[var(--solo-blue)]/30 rounded-full"
                  />
                  
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 border border-[var(--solo-blue)]/20 rounded-full"
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--solo-blue)] rounded-full shadow-[0_0_10px_var(--solo-blue)]" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
            
            {/* Monarch Eye Flare - Cinematic Version */}
            <motion.div 
              animate={{ 
                opacity: [0.2, 1, 0.2],
                scale: isJinwooSpeaking ? [1, 2, 1] : [1, 1.4, 1],
                x: [-1, 1, -1]
              }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="absolute top-[38%] left-[30%] w-2.5 h-2.5 bg-cyan-200 rounded-full blur-[4px] shadow-[0_0_20px_#22d3ee] z-20"
            />
            <motion.div 
              animate={{ 
                opacity: [0.2, 1, 0.2],
                scale: isJinwooSpeaking ? [1, 2, 1] : [1, 1.4, 1],
                x: [1, -1, 1]
              }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
              className="absolute top-[38%] right-[30%] w-2.5 h-2.5 bg-cyan-200 rounded-full blur-[4px] shadow-[0_0_20px_#22d3ee] z-20"
            />

            {/* Tactical Data Overlays */}
            <div className="absolute top-1 left-1 z-30 text-[6px] font-mono text-[var(--solo-blue)] opacity-50">SYNC: 100%</div>
            <div className="absolute bottom-1 right-1 z-30 text-[6px] font-mono text-[var(--solo-blue)] opacity-50">MNRCH_MODE</div>
          </div>

          {/* Blue Mana Particles */}
          {isJinwooSpeaking && Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{ opacity: [0, 1, 0], y: -40, x: (i - 2) * 10 }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="absolute bottom-4 left-1/2 w-1 h-1 bg-cyan-400 rounded-full blur-[1px] shadow-[0_0_5px_cyan]"
            />
          ))}

          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-[var(--solo-blue)] text-black text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_var(--solo-blue)]"
          >
            S-RANK
          </motion.div>
        </div>
      </motion.div>

      {renderTutorial()}
      <AnimatePresence mode="wait">
        {phase === 'cover' && (
          <motion.div 
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center text-center p-5 relative z-10 overflow-y-auto custom-scrollbar"
          >
            <h1 className="title-glitch text-5xl md:text-7xl font-black mb-4">C'CODESCAPE</h1>
            <h2 className="text-xl md:text-2xl text-[var(--ui-white)] mb-6 font-bold text-[var(--example-hl)]">// BEHIND THE CODES 🌀</h2>
            <p className="description-animate text-lg md:text-xl text-[var(--ui-white)] border-x-4 border-[var(--solo-blue)] p-6 leading-relaxed max-w-2xl bg-[rgba(10,17,24,0.8)] backdrop-blur-sm rounded-lg">
              <span className="font-bold text-xl">Combinatorics Coding Escape:</span><br />
              A Gamified Interactive Learning Tool for<br />
              <span className="text-[var(--solo-blue)]">Permutation</span> and <span className="text-[var(--formula-hl)]">Combination</span>.
            </p>
            <button 
              onClick={() => { playSfx('type'); setPhase('introduction'); }}
              className="mt-12 px-10 py-4 blinking-blue text-black font-black text-xl rounded-md hover:bg-white transition-all shadow-[0_0_20px_var(--solo-blue)]"
            >
              INTRODUCTION
            </button>
          </motion.div>
        )}

        {phase === 'introduction' && (
          <motion.div 
            key="introduction"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-grow flex flex-col items-center text-center p-4 md:p-8 relative z-10 overflow-y-auto custom-scrollbar"
          >
            <div className="max-w-3xl bg-[rgba(10,17,24,0.9)] border-2 border-[var(--solo-blue)] p-6 md:p-10 rounded-xl shadow-[0_0_30px_var(--solo-blue)] my-auto">
              <h2 className="text-3xl font-black text-[var(--solo-blue)] mb-6 tracking-widest">INTRODUCTION</h2>
              <div className="text-base md:text-lg text-[var(--ui-white)] leading-relaxed space-y-4 text-left font-rajdhani">
                <p>
                  Welcome to <span className="text-[var(--solo-blue)] font-bold">C’CODESCAPE: Combinatorics Coding Escape</span>—a world where mathematics becomes a digital challenge, and every problem is a locked code waiting to be broken.
                </p>
                <p>
                  Inside this immersive gamified learning system, you won’t just solve for answers—you will decode patterns, analyze choices, and conquer levels built around permutations and combinations. Each stage is a mission where logic is your key, accuracy is your weapon, and every correct solution brings you closer to escaping the system.
                </p>
                <p>
                  But the path is not simple. Misinterpret a problem, and the code will not open. Think critically, act strategically, and progress through increasingly difficult levels designed to sharpen your combinatorics skills.
                </p>
                <p className="italic text-[var(--example-hl)] border-l-4 border-[var(--example-hl)] pl-4 py-1">
                  Developed by Joanna, Jose, and Justin, created to transform learning into an interactive coding adventure.
                </p>
                <p className="font-bold text-[var(--keyword-hl)] text-center text-xl mt-6">
                  C’CODESCAPE is not just a game—it is a challenge of thinking. Your challenge begins now—decode, solve, and escape.
                </p>
              </div>
              <button 
                onClick={() => { playSfx('type'); setPhase('loading'); }} 
                className="btn-glitch mt-10 px-16 py-4 text-2xl font-black blinking-blue text-black rounded-md hover:bg-white transition-all shadow-[0_0_20px_var(--solo-blue)]"
              >
                START
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 relative z-10"
          >
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
              <div className="game-avatar text-7xl md:text-8xl">🤖</div>
              <h2 className="text-3xl md:text-5xl text-white font-orbitron drop-shadow-[0_0_30px_var(--solo-blue)] typewriter-cursor text-center">
                {welcomeText}
              </h2>
            </div>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
                <circle className="fill-none stroke-[rgba(0,184,230,0.05)] stroke-[12px]" cx="96" cy="96" r="85" />
                <circle 
                  className="fill-none stroke-[var(--solo-blue)] stroke-[12px] transition-all duration-75 shadow-[0_0_15px_var(--solo-blue)]" 
                  cx="96" cy="96" r="85" 
                  strokeDasharray="534" 
                  strokeDashoffset={534 - (loadingProgress / 100) * 534}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-3xl font-orbitron text-white drop-shadow-[0_0_15px_var(--solo-blue)] font-black">
                {loadingProgress}%
              </div>
            </div>
            <p className="mt-8 text-[var(--keyword-hl)] font-bold animate-pulse uppercase tracking-[4px] text-[10px]">Synchronizing Logic Cores...</p>
          </motion.div>
        )}

        {phase === 'briefing' && (
          <motion.div 
            key="briefing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
              <div className="bg-[rgba(0,184,230,0.03)] border-2 border-[var(--solo-blue)] rounded-lg flex flex-col flex-grow overflow-hidden shadow-inner">
                <div className="bg-[var(--solo-blue)]/10 p-4 border-b border-[var(--solo-blue)] flex-none">
                  <h3 className="font-orbitron text-[var(--keyword-hl)] border-l-8 border-[var(--solo-blue)] pl-4 text-xl font-bold">📂 GAME MECHANICS 📝</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 text-sm md:text-base leading-relaxed custom-scrollbar">
                  <p><span className="text-[var(--example-hl)] font-bold">1. Level Progression:</span> Players advance through levels by solving permutation and combination problems. Each level increases in difficulty from easy, to average, to difficult.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">2. Answer System:</span> A correct answer allows the player to proceed, while an incorrect answer requires another attempt until solved.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">3. Adaptive Questioning:</span> If an average question is not answered correctly within 4 attempts, it automatically changes to an easy question. If a difficult question is not answered correctly, it is downgraded to average. If still incorrect, it is further reduced to easy.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">4. Immediate Feedback:</span> The system provides instant feedback after every response, indicating whether the answer is correct or incorrect.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">5. Performance Tracking:</span> All scores, attempts, and results across different difficulty levels are recorded for progress monitoring.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">6. Keys System:</span> Players earn keys per level: Level 1 (5), Level 2 (5), Level 3 (10), Level 4 (15), and Level 5 (20). Keys are cumulative and used to unlock the next stage.</p>
                  <p><span className="text-[var(--example-hl)] font-bold">7. Final Boss Level (Level 5):</span> In the final dungeon, players must have collected all required keys while facing 20 mixed difficulty challenges to successfully escape the system.</p>
                  <div className="text-[#ADFF2F] border-t border-[var(--solo-blue)]/30 pt-4 bg-[rgba(0,184,230,0.03)] text-sm md:text-base text-center font-bold italic">
                    ⚡ Note: Survive all provided challenges to escape every room.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4 mt-4 py-2 flex-none">
              <button 
                className="flex-1 py-3 bg-[rgba(255,255,255,0.05)] border border-gray-600 text-gray-400 font-bold rounded hover:bg-white/10 transition-all uppercase tracking-[2px] text-xs" 
                onClick={() => { playSfx('type'); setPhase('loading'); }}
              >
                BACK
              </button>
              <button 
                className="flex-[2] py-3 bg-[var(--solo-blue)] text-black font-black rounded hover:bg-white transition-all shadow-[0_0_15px_var(--solo-blue)] uppercase tracking-[2px] text-sm" 
                onClick={() => { playSfx('notif'); setShowNotification(true); }}
              >
                UNDERSTOOD
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'level-selection' && (
          <motion.div 
            key="level-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden relative"
          >
            {renderHeader()}
            <div className="absolute inset-0 bg-black blur-sm brightness-[0.3] -z-10" />
            <div className="flex-grow flex flex-col p-4 md:p-8 z-10 overflow-hidden">
              <div className="shrink-0 mb-6">
                <h1 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_20px_var(--solo-blue)] mb-2 uppercase tracking-tight">Your Mission: Solve, Escape</h1>
                <p className="text-[var(--keyword-hl)] text-lg md:text-2xl italic">“Clues, and Secrets For You, Solve each Challenge, See it Through!"</p>
              </div>
              
              <div className="flex-grow overflow-y-auto custom-scrollbar px-2 space-y-4 pb-12">
                {[1, 2, 3, 4, 5].map(lvl => {
                  const isUnlocked = unlockedLevels.includes(lvl);
                  return (
                    <button 
                      key={lvl}
                      disabled={!isUnlocked}
                      onClick={() => { 
                        playSfx('notif'); 
                        if (lvl === 1) {
                          setPhase('level-1-directions'); 
                        } else {
                          setSelectedLevelNav(lvl);
                          setPhase('level-nav');
                        }
                      }}
                      className={`chamber-card group relative w-full max-w-xs mx-auto p-4 md:p-6 border-2 rounded-xl text-center transition-all shadow-[0_0_15px_var(--solo-blue)] flex items-center justify-center min-h-[100px] md:min-h-[120px] ${
                        isUnlocked 
                          ? 'bg-[rgba(0,119,190,0.6)] border-[var(--solo-blue)] hover:bg-[rgba(0,184,230,0.3)] hover:scale-[1.02]' 
                          : 'bg-gray-800/40 border-gray-700 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-orbitron text-xl md:text-3xl font-black flex items-center justify-center gap-4 text-white drop-shadow-lg">
                        {isUnlocked ? '🔓' : '🔒'} LEVEL {lvl}
                      </div>
                    </button>
                  );
                })}
                <div className="mt-12 flex flex-col md:flex-row gap-4 w-full max-w-2xl mx-auto pb-10">
                  <button 
                    onClick={() => { playSfx('type'); setShowTutorial(true); }}
                    className="flex-1 py-4 bg-[rgba(10,17,24,0.8)] text-[var(--solo-blue)] border-2 border-[var(--solo-blue)] font-black hover:bg-[var(--solo-blue)] hover:text-black transition-all rounded shadow-lg uppercase tracking-widest text-sm"
                  >
                    [REPLAY TUTORIAL]
                  </button>
                  <button 
                    onClick={() => { playSfx('type'); setShowLearning(true); }}
                    className="flex-1 py-4 blinking-yellow border-2 border-[#ffd700] hover:scale-[1.05] transition-all rounded shadow-lg uppercase tracking-widest text-sm"
                  >
                    🚀 [LEARN THIS]
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-nav' && (
          <motion.div 
            key="l-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 overflow-hidden"
          >
            {/* Visual Background Layer - Atmospheric Animated Design */}
            <div className="absolute inset-0 bg-[#02060a] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,184,230,0.1),transparent_70%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80" />
              <MatrixBackground />
              
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1],
                  x: [0, 50, 0],
                  y: [0, -30, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-[10%] left-[20%] w-64 h-64 bg-[var(--solo-blue)] rounded-full blur-[100px]" 
              />
              <motion.div 
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.05, 0.15, 0.05],
                  x: [0, -40, 0],
                  y: [0, 40, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-600 rounded-full blur-[120px]" 
              />
            </div>

            {/* Centered Content Card Container */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[420px] max-h-[85vh] bg-[rgba(10,17,24,0.85)] backdrop-blur-2xl border-2 border-[var(--solo-blue)]/50 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,184,230,0.3)] flex flex-col overflow-hidden mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
              
              <div className="flex-grow flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar relative">
                <div className="text-center mb-8 pt-2">
                  <div className="inline-block px-3 py-1 bg-[var(--solo-blue)]/10 border border-[var(--solo-blue)]/20 rounded-full mb-4">
                    <span className="text-[10px] font-black tracking-[0.2em] text-[var(--solo-blue)] uppercase">Tactical Neural Hub</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_0_15px_var(--solo-blue)] uppercase tracking-tighter leading-none">Intelligence Hub</h1>
                  <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase mt-3 tracking-widest opacity-70">Monarch System Configuration Level {selectedLevelNav}</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => { 
                      playSfx('notif'); 
                      setReviewLevel(selectedLevelNav - 1);
                      setReviewRoom(1);
                      setPhase('level-previous-review'); 
                    }}
                    className="group flex items-center justify-between p-5 bg-white/5 border border-white/10 hover:border-[var(--solo-blue)] transition-all rounded-2xl active:scale-[0.97] shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-400 group-hover:text-[var(--solo-blue)] transition-colors">
                        <RotateCcw className="w-6 h-6 group-hover:animate-spin-slow" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-black uppercase text-gray-300 group-hover:text-white leading-none">Previous</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Review Archives</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-600 group-hover:text-[var(--solo-blue)] transition-colors" />
                  </button>

                  <button 
                    onClick={() => { 
                      playSfx('notif'); 
                      setResumeQuizStep(0);
                      setResumeFeedback('');
                      setShowResumeExpl(false);
                      setShowResumeHint(false);
                      setPhase('level-resume-assessment'); 
                    }}
                    className="group flex items-center justify-between p-5 bg-white/5 border border-[var(--example-hl)]/20 hover:border-[var(--example-hl)] transition-all rounded-2xl active:scale-[0.97] shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--example-hl)]/5 flex items-center justify-center text-[var(--example-hl)]/60 group-hover:text-[var(--example-hl)] transition-colors">
                        <Lightbulb className="w-6 h-6 group-hover:animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-black uppercase text-[var(--example-hl)]/80 group-hover:text-[var(--example-hl)] leading-none">Resume</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Topic Assessment</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-700 group-hover:text-[var(--example-hl)] transition-colors" />
                  </button>

                  <button 
                    onClick={() => { 
                      playSfx('type'); 
                      if (selectedLevelNav > 2) {
                        setPhase('level-coming-soon');
                        return;
                      }
                      setCurrentRoom(1);
                      setRoomAttempts({});
                      setRoomFeedback('');
                      setRoomInput('');
                      setPhase(`level-${selectedLevelNav}-directions` as Phase); 
                    }}
                    className="group flex items-center justify-between p-5 bg-[var(--solo-blue)] text-black border-2 border-[var(--solo-blue)] hover:bg-white hover:border-white transition-all rounded-2xl active:scale-[0.97] shadow-[0_0_30px_rgba(0,184,230,0.5)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center">
                        <Play className="w-6 h-6 fill-current" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-black uppercase leading-none">Play</div>
                        <div className="text-[10px] font-black uppercase opacity-70 mt-1">Start Mission</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                <div className="mt-auto pt-10 pb-2 text-center">
                  <button 
                    onClick={() => { playSfx('notif'); setPhase('level-selection'); }}
                    className="px-8 py-2 text-[10px] font-black text-gray-600 hover:text-[var(--solo-blue)] transition-colors uppercase tracking-[0.4em] border border-transparent hover:border-[var(--solo-blue)]/20 rounded-full"
                  >
                    [ Back to selection ]
                  </button>
                </div>

                <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[var(--solo-blue)]/30 rounded-tr-3xl pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[var(--solo-blue)]/30 rounded-bl-3xl pointer-events-none" />
              </div>

              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] mix-blend-overlay z-50 bg-[length:100%_2px,3px_100%]" />
            </motion.div>
          </motion.div>
        )}

        {phase === 'level-previous-review' && (
          <motion.div 
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[#0a0a0a] z-[300] flex flex-col items-center overflow-y-auto p-4 md:p-10 custom-scrollbar"
          >
            <div className="w-full max-w-2xl my-auto">
              <div className="mb-8 flex justify-between items-center bg-[var(--solo-blue)]/10 p-4 border-l-4 border-[var(--solo-blue)]">
                <div>
                  <h2 className="text-2xl font-black text-[var(--solo-blue)] uppercase">Review: Level {reviewLevel}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Question {reviewRoom} of 5</p>
                </div>
                <button onClick={() => setPhase('level-nav')} className="text-gray-500 hover:text-white"><X /></button>
              </div>

              <div className="bg-[#111] p-8 border-2 border-white/5 rounded-xl shadow-2xl relative">
                <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-gray-700 uppercase">ARCHIVED_RECORD_L{reviewLevel}_R{reviewRoom}</div>
                
                <div className="min-h-[200px] mb-8">
                  <h3 className="text-xl font-bold text-gray-300 mb-6 leading-relaxed">
                    {reviewLevel === 1 ? LEVEL_1_ROOMS[reviewRoom].question : LEVEL_2_ROOMS[reviewRoom].question}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--matrix-green)]/10 border border-[var(--matrix-green)]/30 rounded">
                      <div className="text-[10px] text-[var(--matrix-green)] font-black uppercase mb-1">Correct Answer:</div>
                      <div className="text-white font-mono break-all">
                        {reviewLevel === 1 ? LEVEL_1_ROOMS[reviewRoom].valid[0] : LEVEL_2_ROOMS[reviewRoom].answer}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white/5 border border-white/10 rounded">
                      <div className="text-[10px] text-gray-500 font-black uppercase mb-2">Explanation:</div>
                      <div className="text-sm text-gray-300 leading-relaxed italic" dangerouslySetInnerHTML={{ __html: (reviewLevel === 1 ? LEVEL_1_ROOMS[reviewRoom].expl : LEVEL_2_ROOMS[reviewRoom].expl) }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={reviewRoom === 1}
                    onClick={() => { playSfx('type'); setReviewRoom(prev => prev - 1); }}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-black uppercase disabled:opacity-20"
                  >
                    PREVIOUS
                  </button>
                  {reviewRoom < 5 ? (
                    <button 
                      onClick={() => { playSfx('type'); setReviewRoom(prev => prev + 1); }}
                      className="flex-1 py-4 bg-[var(--solo-blue)] text-black font-black uppercase"
                    >
                      NEXT
                    </button>
                  ) : (
                    <button 
                      onClick={() => setPhase('level-nav')}
                      className="flex-1 py-4 bg-[var(--matrix-green)] text-black font-black uppercase"
                    >
                      FINISH REVIEW
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-resume-assessment' && (
          <motion.div 
            key="assessment"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed inset-0 bg-[#070b0f] z-[300] flex flex-col items-center overflow-y-auto p-4 md:p-10 custom-scrollbar"
          >
            <div className="w-full max-w-xl my-auto">
              <div className="mb-12 flex justify-between items-end border-b-2 border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-black text-[var(--example-hl)] uppercase tracking-[4px] mb-2">Assessment Active</div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight">Logic Validation Quiz</h1>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-black">Question Index</div>
                  <div className="text-2xl font-bold font-mono text-[var(--solo-blue)]">{resumeQuizStep + 1}<span className="text-sm text-gray-700">/10</span></div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-xl font-medium leading-relaxed shadow-inner">
                  {RESUME_QUIZ_DATA[resumeQuizStep].question}
                </div>

                {resumeFeedback && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-4 rounded text-center font-black uppercase tracking-widest border-2 ${
                      resumeFeedback.includes('✓') ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'
                    }`}
                  >
                    {resumeFeedback}
                  </motion.div>
                )}

                {!showResumeExpl ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleResumeAnswer('Permutation')}
                      className="py-6 bg-black border-2 border-[var(--solo-blue)]/30 hover:bg-[var(--solo-blue)] hover:text-black transition-all text-xl font-black uppercase shadow-lg"
                    >
                      Permutation
                    </button>
                    <button 
                      onClick={() => handleResumeAnswer('Combination')}
                      className="py-6 bg-black border-2 border-[var(--example-hl)]/30 hover:bg-[var(--example-hl)] hover:text-black transition-all text-xl font-black uppercase shadow-lg"
                    >
                      Combination
                    </button>
                    <button 
                      onClick={() => { playSfx('type'); setShowResumeHint(true); }}
                      className="md:col-span-2 py-4 bg-white/5 text-gray-400 font-black flex items-center justify-center gap-2 hover:text-white transition-colors uppercase text-xs"
                    >
                      <Lightbulb size={16} /> [Hint Request]
                    </button>
                    {showResumeHint && (
                      <div className="md:col-span-2 p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-sm italic text-center rounded">
                        HINT: {RESUME_QUIZ_DATA[resumeQuizStep].hint}
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    className="p-6 bg-[var(--solo-blue)]/5 border border-[var(--solo-blue)] rounded-lg"
                  >
                    <div className="text-xs font-black text-[var(--solo-blue)] uppercase mb-2">Technical Explanation</div>
                    <p className="text-lg text-gray-200 leading-relaxed mb-8">{RESUME_QUIZ_DATA[resumeQuizStep].explanation}</p>
                    <button 
                      onClick={() => {
                        playSfx('correct');
                        if (resumeQuizStep < 9) {
                          setResumeQuizStep(prev => prev + 1);
                          setResumeFeedback('');
                          setShowResumeExpl(false);
                          setShowResumeHint(false);
                        } else {
                          setPhase('level-nav');
                        }
                      }}
                      className="w-full py-4 bg-[var(--solo-blue)] text-black font-black uppercase text-xl hover:bg-white transition-colors"
                    >
                      {resumeQuizStep < 9 ? 'NEXT QUESTION' : 'COMPLETE ASSESSMENT'}
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="mt-12 text-center">
                <button 
                  onClick={() => setPhase('level-nav')}
                  className="text-[10px] text-gray-700 font-bold uppercase hover:text-gray-400 transition-colors"
                >
                  Terminate Internal Assessment Module
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {phase === 'level-1-directions' && (
          <motion.div 
            key="l1-dir"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <div className="max-w-2xl w-full h-full max-h-[80vh] bg-[rgba(10,17,24,0.92)] border-2 border-[var(--solo-blue)] rounded-2xl shadow-[0_0_40px_rgba(0,184,230,0.2)] flex flex-col overflow-hidden">
                <div className="shrink-0 p-6 md:p-8 border-b border-[var(--solo-blue)]/30 bg-black/60">
                  <h1 className="text-3xl md:text-5xl font-black text-[var(--solo-blue)] drop-shadow-[0_0_20px_var(--solo-blue)] uppercase text-center">Mission Directions</h1>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-10 text-left text-sm md:text-lg space-y-4 text-gray-200">
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 01.</span> Each room presents a situation involving arranging or selecting items.</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 02.</span> Determine if order matters (Permutation) or does not matter (Combination).</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 03.</span> List all possible correct codes, arrangements or choices requested.</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 04.</span> Use the hint or explanation buttons for guidance when available.</p>
                  <div className="p-4 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded my-6 shadow-md">
                    <p className="font-black text-[var(--error-red)] uppercase text-xs mb-1 tracking-widest">⚠️ MISSION LIMITATION ⚠️</p>
                    <p className="text-sm italic leading-relaxed">You have only <span className="font-black underline scale-110 px-1 text-white">3 attempts</span> to decode each room. Exceeding this limit results in failure, recorded as <span className="font-black text-white">"Incorrect"</span>.</p>
                  </div>
                  <p className="border-t border-[var(--solo-blue)]/20 pt-3 text-[var(--example-hl)] italic text-[10px] md:text-xs">
                    <strong>Note:</strong> Your answers will be <span className="underline decoration-dotted underline-offset-4 font-bold uppercase">separated by commas</span> within the code box (e.g., 2, 4, 6).
                  </p>
                  <div className="mt-8 text-[var(--matrix-green)] font-black border-t border-[var(--solo-blue)]/30 pt-4 text-center text-xs md:text-sm tracking-[2px]">OBJECTIVE: EARN 5 KEYS TO UNLOCK THE NEXT LEVEL</div>
                </div>
                <div className="shrink-0 p-4 md:p-6 bg-black/60 border-t border-[var(--solo-blue)]/30">
                  <div className="flex flex-col md:flex-row-reverse gap-3">
                    <button 
                      className="flex-1 py-4 bg-[var(--solo-blue)] text-black text-lg font-black rounded hover:bg-white transition-all shadow-[0_0_15px_var(--solo-blue)] uppercase tracking-widest"
                      onClick={() => { playSfx('type'); setPhase('level-1-rooms'); setCurrentRoom(1); setRoomAttempts({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }); setRoomInput(''); setRoomFeedback(''); setShowSituation(true); }}
                    >
                      START MISSION
                    </button>
                    <button 
                      className="flex-1 py-4 px-6 bg-transparent border border-gray-600 text-gray-400 font-bold hover:bg-white/5 transition-all text-[10px] uppercase"
                      onClick={() => setPhase('level-selection')}
                    >
                      BACK TO SELECTION
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-1-rooms' && (
          <motion.div 
            key="l1-rooms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <div 
                className="w-full max-w-2xl h-full max-h-[85vh] rounded-2xl border-2 border-[var(--solo-blue)] shadow-[0_0_30px_var(--solo-blue)] flex flex-col overflow-hidden bg-[rgba(10,17,24,0.92)]"
                style={{ backgroundColor: LEVEL_1_ROOMS[currentRoom].background }}
              >
                <div className="shrink-0 p-6 border-b border-[var(--solo-blue)]/20 bg-black/40">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-[var(--solo-blue)]">ROOM {currentRoom}</h2>
                      <p className="text-[10px] text-[var(--solo-blue)] opacity-70 font-bold uppercase tracking-widest">{currentRoom === 1 ? 'Seat Arrangement' : currentRoom === 2 ? 'Door Password' : currentRoom === 3 ? 'Project Pair' : currentRoom === 4 ? 'Snack Choice' : 'Medal Winners'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</p>
                      <div className="px-2 py-0.5 bg-[var(--solo-blue)]/20 text-[var(--solo-blue)] text-[10px] font-black rounded border border-[var(--solo-blue)]/50">ACTIVE_CHALLENGE</div>
                    </div>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-10 flex flex-col">
                  
                  {/* Embedded Level 1 Mission Narrative */}
                  <div className="bg-[var(--solo-blue)]/5 border border-[var(--solo-blue)]/20 p-4 md:p-6 rounded-xl mb-8">
                    <p className="text-[10px] text-sky-400 font-black uppercase mb-3 tracking-[0.3em] italic">Current Mission Narrative</p>
                    <p className="text-gray-300 text-sm md:text-base leading-relaxed italic">
                      {LEVEL_1_SITUATIONS[currentRoom]}
                    </p>
                  </div>

                  <p className="text-lg md:text-xl mb-8 leading-relaxed text-gray-100 font-medium">{LEVEL_1_ROOMS[currentRoom].question}</p>
                  
                  <div className="bg-black/60 border-2 border-[var(--solo-blue)] rounded p-4 mb-8 shadow-inner overflow-hidden flex items-center justify-center">
                    <input 
                      type="text" 
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      placeholder="ENTER CODE SEQUENCE"
                      className="w-full bg-transparent border-none text-[var(--solo-blue)] text-xl md:text-3xl font-orbitron text-center outline-none tracking-normal md:tracking-[5px] placeholder:text-lg md:placeholder:text-2xl placeholder:opacity-30"
                    />
                  </div>

                  <div className="flex justify-center gap-2 md:gap-4 flex-nowrap mb-6">
                    <button 
                      className="flex-1 py-3 bg-[var(--solo-blue)] text-black font-black text-xs md:text-lg hover:bg-white transition-all rounded shadow-md"
                      onClick={handleLevel1Code}
                      disabled={roomPassed[currentRoom]}
                    >
                      ENTER
                    </button>
                    <button 
                      className="flex-1 py-3 bg-[var(--example-hl)] text-black font-black text-xs md:text-lg transition-all hover:bg-white rounded shadow-md"
                      onClick={() => { playSfx('notif'); setRoomFeedback(`HINT: ${LEVEL_1_ROOMS[currentRoom].hint}`); }}
                    >
                      HINT
                    </button>
                    <button 
                      className={`flex-1 py-3 bg-[var(--matrix-green)] text-black font-black text-xs md:text-lg transition-all rounded shadow-md ${!roomPassed[currentRoom] ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                      onClick={() => { playSfx('notif'); setShowExplanation(currentRoom); }}
                      disabled={!roomPassed[currentRoom]}
                    >
                      EXPLAIN
                    </button>
                  </div>

                  {roomFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-center text-sm font-black p-3 rounded border ${roomFeedback.includes('✓') ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-400'}`}
                    >
                      {roomFeedback}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-1-summary' && (
          <motion.div 
            key="l1-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <div className="w-full max-w-2xl h-full max-h-[85vh] flex flex-col bg-[rgba(10,17,24,0.95)] border-2 border-[var(--matrix-green)] rounded-3xl shadow-[0_0_50px_rgba(0,255,100,0.15)] overflow-hidden">
                <div className="shrink-0 p-6 md:p-8 border-b border-[var(--matrix-green)]/30 bg-black/60 sticky top-0 z-10">
                  <h1 className="text-3xl md:text-5xl font-black text-[var(--matrix-green)] text-center uppercase tracking-tighter drop-shadow-[0_0_15px_var(--matrix-green)]">LEVEL 1 COMPLETED</h1>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-6">
                  <div className="space-y-4 text-sm md:text-xl text-gray-200">
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--matrix-green)] text-xs md:text-base">Player Name:</span>
                      <span className="font-black text-white text-xs md:text-base uppercase">{player.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--matrix-green)] text-xs md:text-base">Total Attempts:</span>
                      <span className="font-black text-white text-xs md:text-base">{Object.values(roomAttempts).reduce((a: number, b: number) => a + b, 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--matrix-green)] text-xs md:text-base">Date & Time Played:</span>
                      <span className="font-black text-white text-xs md:text-base italic">{new Date().toLocaleString()}</span>
                    </div>
                    <div className="bg-gradient-to-r from-[var(--solo-blue)]/20 via-[var(--solo-blue)]/40 to-[var(--solo-blue)]/20 border border-[var(--solo-blue)] p-6 rounded-xl mt-8 mb-6 text-center shadow-[0_0_20px_var(--solo-blue)]">
                      <p className="text-yellow-400 animate-pulse font-black text-lg md:text-xl tracking-wide leading-relaxed">
                        Your challenge results are ready. Download your score and track your progress.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button className="w-full py-5 bg-[var(--solo-blue)] text-black font-black text-xl md:text-2xl hover:bg-white transition-all rounded-xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-3" onClick={downloadLevel1Report}>
                      <Download size={24} /> DOWNLOAD SCORE
                    </button>
                    <div className="flex gap-4">
                      <button className="flex-1 py-4 bg-[var(--formula-hl)] text-white font-black hover:bg-white hover:text-black transition-all rounded-xl uppercase text-xs shadow-md" onClick={() => { playSfx('type'); setPhase('level-1-directions'); }}>
                        PLAY AGAIN
                      </button>
                      <button className="flex-1 py-4 bg-gray-800 text-white font-black hover:bg-gray-700 transition-colors rounded-xl uppercase text-xs shadow-md" onClick={() => { playSfx('type'); setPhase('level-selection'); }}>
                        BACK TO MISSION
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-2-directions' && (
          <motion.div 
            key="l2-dir"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <div className="max-w-2xl w-full h-full max-h-[85vh] bg-[rgba(10,17,24,0.92)] border-2 border-[var(--solo-blue)] rounded-2xl shadow-[0_0_40px_rgba(0,184,230,0.2)] flex flex-col overflow-hidden">
                <div className="shrink-0 p-6 md:p-8 border-b border-[var(--solo-blue)]/30 bg-black/60">
                  <h1 className="text-3xl md:text-5xl font-black text-[var(--solo-blue)] drop-shadow-[0_0_20px_var(--solo-blue)] uppercase text-center">Mission Directions</h1>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-10 text-left text-sm md:text-lg space-y-4 text-gray-200">
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 01.</span> You will enter five rooms, each with a unique situation.</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 02.</span> Select the correct response from the provided options (A-E).</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 03.</span> Hints are available if your logic processor needs assistance.</p>
                  <p><span className="text-[var(--keyword-hl)] font-black uppercase tracking-widest text-[10px]">Rule 04.</span> Use adaptive logic to navigate increasing difficulty buffers.</p>
                  <div className="p-4 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded my-6 shadow-md">
                    <p className="font-black text-[var(--error-red)] uppercase text-xs mb-1 tracking-widest">⚠️ MISSION LIMITATION ⚠️</p>
                    <p className="text-sm italic leading-relaxed">You have only <span className="font-black underline scale-110 px-1 text-white">3 attempts</span> to decode each room. Exceeding this limit results in failure, recorded as <span className="font-black text-white">"Incorrect"</span>.</p>
                  </div>
                  <div className="mt-8 text-[var(--matrix-green)] font-black border-t border-[var(--solo-blue)]/30 pt-4 text-center text-xs md:text-sm tracking-[2px]">OBJECTIVE: EARN 5 KEYS TO UNLOCK THE NEXT LEVEL</div>
                </div>
                <div className="shrink-0 p-4 md:p-6 bg-black/60 border-t border-[var(--solo-blue)]/30">
                  <div className="flex flex-col md:flex-row-reverse gap-3">
                    <button 
                      className="flex-1 py-4 bg-[var(--solo-blue)] text-black text-lg font-black rounded hover:bg-white transition-all shadow-[0_0_15px_var(--solo-blue)] uppercase tracking-widest"
                      onClick={() => { playSfx('type'); setPhase('level-2-rooms'); setCurrentRoom(1); setRoomAttempts({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }); setRoomInput(''); setRoomFeedback(''); setShowSituation(true); }}
                    >
                      START MISSION
                    </button>
                    <button 
                      className="flex-1 py-4 px-6 bg-transparent border border-gray-600 text-gray-400 font-bold hover:bg-white/5 transition-all text-[10px] uppercase"
                      onClick={() => setPhase('level-selection')}
                    >
                      BACK TO SELECTION
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-2-rooms' && (
          <motion.div 
            key="l2-rooms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-2 md:p-8 overflow-hidden">
              <div 
                className="w-full max-w-2xl h-full max-h-[90vh] md:max-h-[85vh] bg-[rgba(10,17,24,0.92)] border-2 border-[var(--solo-blue)] rounded-2xl shadow-[0_0_30px_var(--solo-blue)] flex flex-col overflow-hidden"
                style={{ backgroundColor: LEVEL_2_ROOMS[currentRoom].background }}
              >
                <div className="shrink-0 p-4 md:p-6 border-b border-[var(--solo-blue)]/20 bg-black/40">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl md:text-3xl font-black text-[var(--solo-blue)] tracking-tight">ROOM {currentRoom}</h2>
                      <p className="text-[8px] md:text-[10px] text-[var(--solo-blue)] opacity-70 font-bold uppercase tracking-widest leading-none">{currentRoom === 1 ? 'The Symbol Chamber' : currentRoom === 2 ? 'The Key Vault' : currentRoom === 3 ? 'The Alchemist’s Lab' : currentRoom === 4 ? 'The Gem Gallery' : 'The Final Rune Gate'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase mb-0.5">Status</p>
                      <div className="px-1.5 py-0.5 bg-[var(--example-hl)]/20 text-[var(--example-hl)] text-[8px] md:text-[10px] font-black rounded border border-[var(--example-hl)]/50 uppercase leading-none">Analysis</div>
                    </div>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-5 md:p-10 flex flex-col">
                  <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                    <p className="text-base md:text-xl font-bold text-gray-100 leading-snug">{LEVEL_2_ROOMS[currentRoom].question}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 mb-6 md:mb-8">
                    {LEVEL_2_ROOMS[currentRoom].options.map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => handleLevel2Answer(opt.id)}
                        className="w-full text-left p-2.5 md:p-4 bg-white/5 border border-[var(--solo-blue)]/30 rounded-lg hover:bg-[var(--solo-blue)] hover:text-black transition-all text-[11px] md:text-lg group flex items-start"
                      >
                        <span className="shrink-0 w-6 md:w-8 font-black text-[var(--solo-blue)] group-hover:text-black">{opt.id}</span>
                        <span className="flex-grow">{opt.text.split('. ')[1]}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 mt-auto">
                    <button 
                      className="flex-1 items-center justify-center gap-2 py-2.5 bg-transparent border-2 border-[var(--solo-blue)] text-[var(--solo-blue)] font-black rounded hover:bg-[var(--solo-blue)] hover:text-black transition-all text-[10px] md:text-xs uppercase tracking-widest flex"
                      onClick={() => { playSfx('notif'); setShowHint(currentRoom); }}
                    >
                      <Lightbulb size={16} /> [Hint]
                    </button>
                    <div className="flex-1 text-[var(--error-red)] font-black text-xs md:text-base text-center break-words">{roomFeedback}</div>
                  </div>
                  
                  {showHint === currentRoom && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-yellow-500/10 border-2 border-dashed border-[var(--example-hl)] text-[var(--example-hl)] rounded-lg text-sm italic shadow-md text-center"
                    >
                      “{LEVEL_2_ROOMS[currentRoom].hint}”
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'level-2-summary' && (
          <motion.div 
            key="l2-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col overflow-hidden"
          >
            {renderHeader()}
            <div className="flex-grow flex items-center justify-center p-4 md:p-8 overflow-hidden">
              <div className="w-full max-w-2xl h-full max-h-[85vh] flex flex-col bg-[rgba(10,17,24,0.95)] border-2 border-[var(--solo-blue)] rounded-3xl shadow-[0_0_50px_rgba(0,184,230,0.15)] overflow-hidden">
                <div className="shrink-0 p-6 md:p-8 border-b border-[var(--solo-blue)]/30 bg-black/60 sticky top-0 z-10">
                  <h1 className="text-3xl md:text-5xl font-black text-[var(--solo-blue)] text-center uppercase tracking-tighter drop-shadow-[0_0_15px_var(--solo-blue)]">LEVEL 2 COMPLETED</h1>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-6">
                  <div className="space-y-4 text-sm md:text-xl text-gray-200">
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--solo-blue)] text-xs md:text-base">Player Name:</span>
                      <span className="font-black text-white text-xs md:text-base uppercase">{player.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--solo-blue)] text-xs md:text-base">Total Attempts:</span>
                      <span className="font-black text-white text-xs md:text-base">{Object.values(roomAttempts).reduce((a: number, b: number) => a + b, 0)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-[var(--solo-blue)] text-xs md:text-base">Date & Time Played:</span>
                      <span className="font-black text-white text-xs md:text-base italic">{new Date().toLocaleString()}</span>
                    </div>
                    <p className="text-center text-[var(--example-hl)] font-bold mt-8 italic bg-white/5 p-4 rounded-xl text-xs md:text-base leading-relaxed">
                      “Intelligence report synthesized. Level 2 operational metrics recorded for system clearance.”
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button className="w-full py-5 bg-[var(--matrix-green)] text-black font-black text-xl md:text-2xl hover:bg-white transition-all rounded-xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-3" onClick={downloadLevel2Report}>
                      <Download size={24} /> DOWNLOAD SCORE
                    </button>
                    <div className="flex gap-4">
                      <button className="flex-1 py-4 bg-[var(--formula-hl)] text-white font-black hover:bg-white hover:text-black transition-all rounded-xl uppercase text-xs shadow-md" onClick={() => { playSfx('type'); setPhase('level-2-directions'); }}>
                        PLAY AGAIN
                      </button>
                      <button className="flex-1 py-4 bg-gray-800 text-white font-black hover:bg-gray-700 transition-colors rounded-xl uppercase text-xs shadow-md" onClick={() => { playSfx('type'); setPhase('level-selection'); }}>
                        BACK TO MISSION
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {phase === 'level-coming-soon' && (
          <motion.div 
            key="coming-soon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center p-6 text-center"
          >
            <MatrixBackground />
            <h1 className="text-4xl font-black text-[var(--solo-blue)] mb-4">MISSION REDACTED</h1>
            <p className="text-gray-400 mb-12 max-w-md">The intelligence for Level {selectedLevelNav} is currently being decrypted by high-command. Please return for future directives.</p>
            <button 
              onClick={() => setPhase('level-nav')}
              className="px-12 py-4 border-2 border-[var(--solo-blue)] text-[var(--solo-blue)] font-black hover:bg-[var(--solo-blue)] hover:text-black transition-all"
            >
              [RETURN TO HUB]
            </button>
          </motion.div>
        )}
        {phase === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-grow flex flex-col h-full"
          >
            {renderHeader()}
            <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
              <div className="flex justify-between items-center border-b-2 border-[var(--solo-blue)] pb-2">
                <h2 className="text-2xl font-black text-[var(--solo-blue)] tracking-tighter">STUDENT PROGRESS DASHBOARD</h2>
                <div className="text-xs font-mono text-gray-400">TOTAL LEARNERS: {playersList.length}</div>
              </div>

              {playersList.length === 0 ? (
                <div className="text-center py-20 text-gray-500 italic">No student records found. Register to start tracking.</div>
              ) : (
                <div className="space-y-6">
                  {playersList.map((record, idx) => (
                    <div key={idx} className="bg-[rgba(10,17,24,0.9)] border-2 border-[var(--solo-blue)] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                      {/* Player Identity Header */}
                      <div className="bg-gradient-to-r from-[rgba(0,212,255,0.2)] to-transparent p-4 flex justify-between items-center border-b-2 border-[var(--solo-blue)]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[var(--solo-blue)] text-black flex items-center justify-center font-black rounded-lg transform rotate-3 shadow-[0_0_10px_var(--solo-blue)]">
                            {record.player.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-[var(--solo-blue)] uppercase tracking-[3px] mb-1">PLAYER CODE NAME</div>
                            <div className="font-black text-2xl text-[var(--ui-white)] leading-none tracking-tight">{record.player.name}</div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">ACCESS CODE NUMBER</div>
                            <div className="font-orbitron text-xl text-[var(--example-hl)] font-bold tracking-[4px]">{record.player.code}</div>
                          </div>
                          <button 
                            onClick={() => handleDownloadData(record)}
                            className="flex items-center gap-1 px-3 py-1 bg-[var(--matrix-green)] text-black text-[10px] font-black rounded hover:bg-white transition-all shadow-[0_0_10px_rgba(0,255,65,0.3)]"
                          >
                            <Download size={12} /> DOWNLOAD DATA
                          </button>
                        </div>
                      </div>

                      {/* Summary Stats Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--solo-blue)]/20 border-b border-[var(--solo-blue)]/30">
                        <div className="bg-black/40 p-3 text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Current Rank</div>
                          <div className="text-xs font-black text-[var(--matrix-green)]">{record.player.rank}</div>
                        </div>
                        <div className="bg-black/40 p-3 text-center border-l border-[var(--solo-blue)]/20">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Total Score</div>
                          <div className="text-xs font-black text-yellow-400">{record.player.stars}/110 ⭐</div>
                        </div>
                        <div className="bg-black/40 p-3 text-center border-l md:border-l border-[var(--solo-blue)]/20">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Keys Earned</div>
                          <div className="text-xs font-black text-[var(--example-hl)]">{record.player.keys} 🔑</div>
                        </div>
                        <div className="bg-black/40 p-3 text-center border-l border-[var(--solo-blue)]/20">
                          <div className="text-[9px] text-gray-500 uppercase font-bold">Total Progress</div>
                          <div className="text-xs font-black text-blue-400">{Math.floor(record.player.progress)}%</div>
                        </div>
                      </div>

                      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Level 1 Detailed Progress */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-4 bg-[var(--solo-blue)]"></div>
                            <h3 className="text-sm font-black text-[var(--solo-blue)] uppercase tracking-wider">LEVEL 1 PROGRESS</h3>
                          </div>
                          <div className="space-y-1.5">
                            {[1, 2, 3, 4, 5].map(roomNum => {
                              const p = record.performance[`1-${roomNum}`];
                              return (
                                <div key={roomNum} className="flex flex-col gap-1 p-2 bg-white/5 rounded border border-white/10">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Room {roomNum}</span>
                                    {p ? (
                                      <span className={p.result === 'Correct' ? 'text-[var(--matrix-green)] font-bold text-xs' : 'text-[var(--error-red)] text-xs'}>
                                        {p.result === 'Correct' ? 'COMPLETED ✓' : 'FAILED ✗'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-gray-600 italic">NOT STARTED</span>
                                    )}
                                  </div>
                                  {p && (
                                    <div className="flex justify-between items-center mt-1">
                                      <div className="flex gap-2">
                                        <span className="text-[9px] text-gray-500 uppercase">Difficulty:</span>
                                        <span className={`text-[9px] font-black uppercase ${
                                          p.difficulty === 'difficult' ? 'text-red-400' : 
                                          p.difficulty === 'average' ? 'text-yellow-400' : 
                                          'text-green-400'
                                        }`}>{p.difficulty}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <span className="text-[9px] text-gray-500 uppercase">Attempts:</span>
                                        <span className="text-[9px] font-black text-white">{p.attempts}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Level 2 Detailed Progress */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-4 bg-[var(--solo-blue)]"></div>
                            <h3 className="text-sm font-black text-[var(--solo-blue)] uppercase tracking-wider">LEVEL 2 PROGRESS</h3>
                          </div>
                          <div className="space-y-1.5">
                            {[1, 2, 3, 4, 5].map(roomNum => {
                              const p = record.performance[`2-${roomNum}`];
                              return (
                                <div key={roomNum} className="flex flex-col gap-1 p-2 bg-white/5 rounded border border-white/10">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Room {roomNum}</span>
                                    {p ? (
                                      <span className={p.result === 'Correct' ? 'text-[var(--matrix-green)] font-bold text-xs' : 'text-[var(--error-red)] text-xs'}>
                                        {p.result === 'Correct' ? 'COMPLETED ✓' : 'FAILED ✗'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-gray-600 italic">NOT STARTED</span>
                                    )}
                                  </div>
                                  {p && (
                                    <div className="flex justify-between items-center mt-1">
                                      <div className="flex gap-2">
                                        <span className="text-[9px] text-gray-500 uppercase">Difficulty:</span>
                                        <span className={`text-[9px] font-black uppercase ${
                                          p.difficulty === 'difficult' ? 'text-red-400' : 
                                          p.difficulty === 'average' ? 'text-yellow-400' : 
                                          'text-green-400'
                                        }`}>{p.difficulty}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <span className="text-[9px] text-gray-500 uppercase">Attempts:</span>
                                        <span className="text-[9px] font-black text-white">{p.attempts}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/60 p-2 text-center border-t border-[var(--solo-blue)]/20">
                        <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">SYSTEM DATA LOG // ID-{idx.toString().padStart(4, '0')} // ENCRYPTED_RECORD</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--solo-blue)] bg-[rgba(10,17,24,0.5)]">
              <button 
                className="icon-btn w-full py-3 bg-[var(--solo-blue)] text-black font-black tracking-widest hover:bg-white transition-all"
                onClick={() => { playSfx('type'); setPhase('level-selection'); }}
              >
                RETURN TO MISSION CONTROL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays & Modals */}
      
      {/* Notification Modal */}
      {showNotification && (
        <div className="fixed inset-0 bg-black/85 z-[8000] flex flex-col items-center overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="quest-info-box blinking-box w-full max-w-lg bg-[#0a1118] border-2 border-[var(--solo-blue)] shadow-[0_0_30px_rgba(0,212,255,0.4)] overflow-hidden my-auto">
            <div className="bg-[var(--solo-blue)] text-black p-3 text-center text-xl font-black tracking-widest uppercase">Notification</div>
            <div className="p-6 text-center">
              <p className="text-xl mb-6 font-black tracking-tight text-[var(--ui-white)]">
                YOU ACQUIRED THE QUALIFICATIONS TO BE A PLAYER. <br /> WILL YOU ACCEPT IT?
              </p>
              <div className="flex border-t border-[var(--solo-blue)]">
                <button 
                  className="flex-1 p-4 text-[var(--error-red)] font-black hover:bg-red-500/10 transition-all border-r border-[var(--solo-blue)] uppercase tracking-widest" 
                  onClick={() => setShowNotification(false)}
                >
                  [Refuse]
                </button>
                <button 
                  className="flex-1 p-4 text-[var(--matrix-green)] font-black hover:bg-green-500/10 transition-all uppercase tracking-widest shadow-[inset_0_0_10px_rgba(0,255,65,0.1)]" 
                  onClick={() => { playSfx('correct'); setShowNotification(false); setShowRegistration(true); }}
                >
                  [Accept]
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black/85 z-[8000] flex flex-col items-center overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="quest-info-box blinking-box w-full max-w-[400px] bg-[#0a1118] border-2 border-[var(--solo-blue)] shadow-[0_0_30px_rgba(0,212,255,0.4)] overflow-hidden my-auto">
            <div className="bg-[var(--solo-blue)] text-black p-3 text-center text-xl font-black tracking-widest uppercase">Player Registration</div>
            <div className="p-6">
              <p className="text-[var(--example-hl)] mb-6 text-center font-bold uppercase text-sm tracking-tighter">
                ENTER YOUR PLAYER NAME AND CREATE 4 DIGIT TO PROCEED
              </p>
              <div className="mb-4">
                <label className="block text-[var(--solo-blue)] text-xs font-orbitron mb-1">Player's Code Name</label>
                <input 
                  type="text" 
                  className="w-full bg-blue-500/10 border border-[var(--solo-blue)] text-white p-3 outline-none"
                  placeholder="<Enter Code Name>"
                  value={player.name}
                  onChange={(e) => setPlayer(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="mb-8">
                <label className="block text-[var(--solo-blue)] text-xs font-orbitron mb-1">Access Code Number (4-Digits)</label>
                <input 
                  type="password" 
                  maxLength={4}
                  className="w-full bg-blue-500/10 border border-[var(--solo-blue)] text-white p-3 outline-none"
                  placeholder="<Enter 4-Digit Code>"
                  value={player.code}
                  onChange={(e) => setPlayer(prev => ({ ...prev, code: e.target.value.replace(/[^0-9]/g, '') }))}
                />
                {(player.name.trim() === "" || player.code.length !== 4) && (
                  <p className="text-[var(--error-red)] text-[10px] mt-2 font-bold animate-pulse">
                    * NAME AND 4-DIGIT CODE REQUIRED
                  </p>
                )}
              </div>
              <button 
                className={`w-full border-2 p-4 font-orbitron transition-all active:scale-95 ${
                  (player.name.trim() === "" || player.code.length !== 4) 
                  ? 'border-gray-600 text-gray-600 cursor-not-allowed bg-transparent' 
                  : 'blinking-blue border-transparent'
                }`}
                onClick={handleRegister}
                disabled={player.name.trim() === "" || player.code.length !== 4}
              >
                [Enter Game]
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Profile Panel */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-[7000] flex flex-col items-center overflow-y-auto p-4 md:p-10">
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[500px] bg-[var(--solo-dark)] border-2 border-[var(--solo-blue)] shadow-[0_0_20px_var(--solo-blue)] p-6 my-auto">
            <div className="bg-[var(--solo-blue)] text-black p-2 text-center font-bold relative mb-6">
              PLAYER STATUS
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowProfile(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Player Name:</span> <span>{player.name || '-'}</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Access Code:</span> <span>{player.code ? '****' : '-'}</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Player Status:</span> <span className="text-[var(--matrix-green)]">Active</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Levels Unlocked:</span> <span>{unlockedLevels.length}</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Rank:</span> <span>{player.rank}</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Total Score:</span> <span className="text-yellow-400 font-bold">{player.stars}/110 ⭐</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Keys Collected:</span> <span className="text-[var(--example-hl)] font-bold">{player.keys}</span></div>
              <div className="flex justify-between border-b border-blue-500/20 pb-2"><span>Game Progress:</span> <span>{player.progress}%</span></div>
            </div>
            <button className="w-full mt-8 py-3 bg-[var(--solo-blue)] text-black font-bold" onClick={() => setShowProfile(false)}>CLOSE</button>
          </motion.div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-[7000] flex flex-col items-center overflow-y-auto p-4 md:p-10">
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[500px] bg-[var(--solo-dark)] border-2 border-[var(--solo-blue)] shadow-[0_0_20px_var(--solo-blue)] p-6 my-auto">
            <div className="bg-[var(--solo-blue)] text-black p-2 text-center font-bold relative mb-6">
              SETTINGS
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              <h3 className="text-[var(--solo-blue)] border-b border-blue-500/50 font-orbitron pb-1">Audio Settings</h3>
              <div>
                <label className="block text-[var(--solo-blue)] text-[10px] font-orbitron mb-2 uppercase">Master Volume</label>
                <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-[var(--solo-blue)]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Toggle Sound</span>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`px-4 py-2 rounded font-bold transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-[var(--solo-blue)] text-black'}`}
                >
                  {isMuted ? <VolumeX /> : <Volume2 />} {isMuted ? 'OFF' : 'ON'}
                </button>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-[var(--solo-blue)] text-black font-bold" onClick={() => setShowSettings(false)}>CLOSE</button>
          </motion.div>
        </div>
      )}

      {/* Game Info Modal */}
      {showGameInfo && (
        <div className="fixed inset-0 bg-black/85 z-[8000] flex flex-col items-center overflow-y-auto p-4 md:p-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="quest-info-box w-full max-w-lg bg-[#0a1118] border-2 border-[var(--solo-blue)] shadow-[0_0_30px_rgba(0,212,255,0.4)] overflow-hidden my-auto">
            <div className="bg-[var(--solo-blue)] text-black p-3 text-center text-xl font-black tracking-widest uppercase">INFORMATION</div>
            <div className="p-8 text-sm md:text-base">
              <p className="text-[var(--ui-white)] font-black text-center leading-relaxed">
                "YOU NEED TO FINISH EACH LEVEL TO UNLOCK THE NEXT LEVEL AND GAIN MORE KEYS AND STARS TO INCREASE YOUR RANKING. FINISH THE GAME TO GET YOUR REWARDS. <br /><br />
                ONCE YOU ENTERED THE GAME YOU CANNOT MAKE IT OUT UNLESS YOU'VE FINISHED ALL THE CODINGS NEEDED"
              </p>
            </div>
            <div className="border-t border-[var(--solo-blue)]">
              <button className="w-full p-4 text-[var(--solo-blue)] font-bold hover:bg-white hover:text-black transition-colors uppercase" onClick={() => setShowGameInfo(false)}>[Understood]</button>
            </div>
          </motion.div>
        </div>
      )}

      {showLearning && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white z-[11000] flex flex-row overflow-hidden font-sans text-slate-900"
        >
          {/* Subtle Professional Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          
          {/* Sidebar - Solid Dark Aesthetic */}
          <aside className="hidden md:flex w-80 bg-slate-950 flex-col shadow-[20px_0_50px_rgba(0,0,0,0.1)] z-20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[1px] h-full bg-white/5" />
            
            {/* Swapped: Branding now at the Top */}
            <div className="p-8 border-b border-white/5 relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center text-sky-400">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white leading-none tracking-tighter italic">C'CODE<span className="text-sky-400">SCAPE</span></h1>
                  <p className="text-[10px] text-sky-500/40 font-bold uppercase tracking-[0.3em] font-mono mt-1 tracking-tighter">Verified Protocol</p>
                </div>
              </div>
            </div>

            <nav className="flex-grow p-6 space-y-3">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4 mb-4">Modules</p>
              {[
                { id: 'home', label: 'Home', icon: <Home size={18} /> },
                { id: 'definitions', label: 'Definitions', icon: <BookOpen size={18} /> },
                { id: 'formulas', label: 'Formulas', icon: <Hash size={18} /> },
                { id: 'examples', label: 'Examples', icon: <FileText size={18} /> },
                { id: 'practice', label: 'Practice Exercises', icon: <HelpCircle size={18} /> }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { playSfx('type'); setLearningTab(item.id); }}
                  className={`group flex items-center gap-4 w-full p-4 font-bold rounded-2xl transition-all text-left outline-none relative overflow-hidden ${
                    learningTab === item.id 
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 shadow-[0_10px_25px_rgba(14,165,233,0.3)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`transition-transform duration-300 group-hover:scale-110 ${learningTab === item.id ? 'text-white' : 'text-slate-600'}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-6">
              <button 
                onClick={() => { playSfx('error'); setShowLearning(false); }}
                className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 group shadow-lg shadow-red-600/20"
              >
                <X size={14} className="group-hover:rotate-90 transition-transform" /> EXIT PORTAL
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className={`flex-grow flex flex-col relative h-full overflow-hidden transition-colors duration-700 ${
            learningTab === 'home' ? 'bg-slate-50' : 
            learningTab === 'definitions' ? 'bg-blue-50/50' : 
            learningTab === 'formulas' ? 'bg-amber-50/50' : 
            learningTab === 'examples' ? 'bg-sky-50/50' : 
            'bg-indigo-50/50'
          }`}>
            {/* Progress/Path Indicator */}
            <div className="hidden md:flex items-center px-12 py-6 gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 z-10">
               <span className="text-slate-500">LEARNING_MODULE</span>
               <ChevronRight size={12} className="text-slate-300" />
               <span className="text-sky-600">{learningTab}</span>
            </div>

            {/* Mobile Header - Swapped Position (Menu Button on Left, Branding on Right) */}
            <header className="md:hidden flex items-center justify-between p-4 bg-slate-950 z-30 shadow-lg">
              <button 
                onClick={() => { playSfx('type'); setShowNavMenu(!showNavMenu); }}
                className="text-sky-400 p-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 rounded-lg transition-colors"
                aria-label="Menu"
              >
                {showNavMenu ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end">
                  <span className="font-black text-white text-sm tracking-tighter italic leading-none">C'CODE<span className="text-sky-400">SCAPE</span></span>
                  <p className="text-[7px] text-sky-500/50 uppercase font-bold tracking-widest mt-1">Uplink Active</p>
                </div>
                <div className="w-10 h-10 bg-sky-500/10 border border-sky-400/20 rounded-xl flex items-center justify-center text-sky-400">
                  <GraduationCap size={20} />
                </div>
              </div>
            </header>

            {/* Mobile Nav Overlay */}
            <AnimatePresence>
              {showNavMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNavMenu(false)}
                    className="fixed inset-0 bg-black/80 z-[12000] backdrop-blur-md md:hidden"
                  />
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'tween', duration: 0.3 }}
                    className="fixed top-0 left-0 h-full w-80 bg-white z-[12500] shadow-[20px_0_50px_rgba(0,0,0,0.1)] border-r border-slate-200 p-8 flex flex-col md:hidden"
                  >
                    <div className="flex items-center gap-4 mb-12 pb-6 border-b border-slate-100">
                      <div className="w-12 h-12 bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center text-sky-600">
                        <GraduationCap size={28} />
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-slate-900 italic">C'CODE<span className="text-sky-600">SCAPE</span></h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Mobile Link</p>
                      </div>
                    </div>
                    
                    <nav className="flex-grow space-y-2">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Navigation</p>
                      {[
                        { id: 'home', label: 'Home', icon: <Home size={18} /> },
                        { id: 'definitions', label: 'Definitions', icon: <BookOpen size={18} /> },
                        { id: 'formulas', label: 'Formulas', icon: <Hash size={18} /> },
                        { id: 'examples', label: 'Examples', icon: <FileText size={18} /> },
                        { id: 'practice', label: 'Practice Exercises', icon: <HelpCircle size={18} /> }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            playSfx('type');
                            setLearningTab(item.id);
                            setShowNavMenu(false);
                          }}
                          className={`flex items-center gap-4 w-full p-4 font-bold rounded-2xl transition-all text-left border ${
                            learningTab === item.id 
                            ? 'bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-600/20' 
                            : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-sky-600'
                          }`}
                        >
                          {item.icon}
                          <span className="text-xs uppercase tracking-[0.2em]">{item.label}</span>
                        </button>
                      ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-slate-100">
                      <button 
                        onClick={() => { playSfx('error'); setShowLearning(false); setShowNavMenu(false); }}
                        className="w-full py-5 bg-red-600 text-white font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-lg shadow-red-600/20"
                      >
                        EXIT PORTAL
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <main className="flex-grow flex items-center justify-center overflow-hidden p-6 md:p-16 relative">
              <div className="w-full max-w-6xl h-full flex flex-col relative z-20">
                <AnimatePresence mode="wait">
                {learningTab === 'home' && (
                  <motion.div 
                    key="home"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar p-6 text-center"
                  >
                    <div className="w-24 h-24 bg-sky-100 rounded-[2rem] flex items-center justify-center text-sky-600 shadow-xl mb-4">
                       <GraduationCap size={44} />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col items-center">
                         <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                            LEARNING<span className="text-sky-600"> MODULE</span>
                         </h1>
                         <h3 className="text-xl md:text-2xl font-black text-slate-400 tracking-[0.4em] uppercase mt-2">
                            Foundation of Combinatorics
                         </h3>
                      </div>
                    </div>

                    <div className="w-32 h-1 bg-slate-100 my-4 rounded-full" />
                    
                    <div className="max-w-3xl space-y-6">
                       <p className="text-2xl md:text-3xl text-slate-700 leading-tight font-medium tracking-tight">
                          Welcome to the <span className="text-sky-600 font-black italic">C'Codescape Learning Module</span>.
                       </p>
                       <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                          Master the mechanics of permutations and combinations through this structured curriculum. Navigate using the sidebar to explore core logic, formulas, and real-world applications.
                       </p>
                    </div>

                    <div className="mt-8">
                      <button 
                        onClick={() => { playSfx('type'); setLearningTab('definitions'); }}
                        className="px-12 py-5 bg-sky-600 text-white text-lg font-black rounded-2xl shadow-xl shadow-sky-600/20 hover:bg-sky-700 hover:-translate-y-1 active:translate-y-0 transition-all uppercase tracking-[0.2em] flex items-center gap-4"
                      >
                        Start Learning <ChevronRight size={24} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {learningTab === 'definitions' && (
                  <motion.div 
                    key="definitions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full h-full flex flex-col md:flex-row gap-8 items-center justify-center overflow-y-auto custom-scrollbar p-6"
                  >
                    {[
                      { 
                         title: "Permutation", 
                         symbol: "P",
                         def: "A mathematical arrangement where the ORDER or SEQUENCE of items is strictly significant. Changing positions means a different outcome.",
                         tags: ['Arrangement', 'Sequence', 'Ranking', 'Position'],
                         color_class: "sky"
                      },
                      { 
                         title: "Combination", 
                         symbol: "C",
                         def: "A selection of items where the ORDER DOES NOT MATTER. The set of items is the focus, not their internal sequence.",
                         tags: ['Selection', 'Group', 'Choice', 'Set'],
                         color_class: "amber"
                      }
                    ].map((card) => (
                       <div key={card.title} className="w-full max-w-md p-10 bg-white border border-slate-200 rounded-[3rem] shadow-2xl text-left relative overflow-hidden group">
                          <div className={`absolute top-0 left-0 w-2 h-full ${card.color_class === 'sky' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                          
                          <div className="relative z-10">
                             <h3 className="text-4xl font-black text-slate-900 italic mb-6 tracking-tighter">
                                {card.title}
                             </h3>
                             <p className="text-xl md:text-2xl mb-8 leading-snug font-medium text-slate-600">
                                {card.def.split(/ORDER|SEQUENCE|ORDER DOES NOT MATTER/).map((part, idx) => (
                                   <React.Fragment key={idx}>
                                      {part}
                                      {idx === 0 && <span className={`text-${card.color_class === 'sky' ? 'sky-600' : 'amber-600'} font-black italic`}>{card.def.includes('DOES NOT MATTER') ? 'ORDER DOES NOT MATTER' : 'ORDER or SEQUENCE'}</span>}
                                   </React.Fragment>
                                ))}
                             </p>
                             <div className="flex flex-wrap gap-2">
                                {card.tags.map(tag => (
                                   <span key={tag} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50 text-slate-500">
                                      {tag}
                                   </span>
                                ))}
                             </div>
                          </div>
                       </div>
                    ))}
                  </motion.div>
                )}

                {learningTab === 'formulas' && (
                  <motion.div 
                    key="formulas"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-full h-full flex flex-col items-center py-12 md:py-20 overflow-y-auto custom-scrollbar px-6"
                  >
                     <div className="text-center mb-16 md:mb-24">
                        <h2 className="text-4xl md:text-7xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 underline decoration-sky-500/30 decoration-8 underline-offset-8">Operations <span className="text-sky-600">Syntax</span></h2>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Standard Mathematical Notations</p>
                     </div>
                    <div className="w-full max-w-6xl flex flex-col gap-12 md:gap-20 items-center">
                      <div className="w-full p-12 md:p-16 bg-white border border-slate-200 rounded-[4rem] shadow-xl relative group overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 p-8 text-sky-100 italic font-black text-6xl opacity-20 pointer-events-none select-none">P</div>
                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-sky-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-sky-600/20">nPr</div>
                        <h3 className="text-xs font-black text-sky-600 mb-12 uppercase tracking-[0.5em] bg-sky-50 px-6 py-2 rounded-full border border-sky-100">Permutation Formula</h3>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-12">
                           <span className="font-mono text-5xl md:text-7xl text-slate-900 font-black flex items-center">nPr =</span>
                           <div className="flex flex-col items-center font-mono text-5xl md:text-8xl text-slate-900 font-black tracking-tighter">
                              <div className="leading-none pb-4 px-8">n!</div>
                              <div className="w-full h-2 bg-slate-900 rounded-full"></div>
                              <div className="leading-none pt-4 px-8">(n-r)!</div>
                           </div>
                        </div>
                        
                        <div className="max-w-md">
                          <p className="text-sm md:text-base text-slate-500 font-bold uppercase tracking-widest bg-slate-50 py-4 px-8 rounded-2xl border border-slate-100">
                            Calculates total unique ordered sequences where position matters.
                          </p>
                        </div>
                      </div>

                      <div className="w-full p-12 md:p-16 bg-white border border-slate-200 rounded-[4rem] shadow-xl relative group overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 p-8 text-amber-100 italic font-black text-6xl opacity-20 pointer-events-none select-none">C</div>
                        <div className="absolute -top-6 -left-6 w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-amber-500/20">nCr</div>
                        <h3 className="text-xs font-black text-amber-600 mb-12 uppercase tracking-[0.5em] bg-amber-50 px-6 py-2 rounded-full border border-amber-100">Combination Formula</h3>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 mb-12">
                           <span className="font-mono text-5xl md:text-7xl text-slate-900 font-black flex items-center">nCr =</span>
                           <div className="flex flex-col items-center font-mono text-5xl md:text-8xl text-slate-900 font-black tracking-tighter">
                              <div className="leading-none pb-4 px-8">n!</div>
                              <div className="w-full h-2 bg-slate-900 rounded-full"></div>
                              <div className="leading-none pt-4 px-8">r!(n-r)!</div>
                           </div>
                        </div>
                        
                        <div className="max-w-md">
                          <p className="text-sm md:text-base text-slate-500 font-bold uppercase tracking-widest bg-slate-50 py-4 px-8 rounded-2xl border border-slate-100">
                            Dividing by r! removes redundant arrangements where order is irrelevant.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {learningTab === 'examples' && (
                  <motion.div 
                    key="examples"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full h-full flex flex-col items-center justify-center overflow-y-auto custom-scrollbar p-6"
                  >
                    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
                       {[
                          {
                             title: "Race Standings",
                             scenario: "How many ways can 3 runners finish in a race for Gold, Silver, and Bronze?",
                             note: "The rank (1st vs 2nd) differentiates outcomes → Permutation.",
                             logic: "Permutation",
                             color: "sky"
                          },
                          {
                             title: "Team Selection",
                             scenario: "How many ways can you choose a committee of 3 students from a class of 10?",
                             note: "Selecting the same three students in any order results in the same team → Combination.",
                             logic: "Combination",
                             color: "amber"
                          }
                       ].map((item) => (
                          <div key={item.title} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-xl text-left flex flex-col justify-between relative overflow-hidden group">
                             <div className="relative">
                                <div className={`w-16 h-16 ${item.color === 'sky' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'} rounded-[1.5rem] flex items-center justify-center mb-8 shadow-sm`}><FileText size={32} /></div>
                                <h4 className="text-3xl font-black mb-4 text-slate-900 italic tracking-tighter">{item.title}</h4>
                                <p className="text-xl text-slate-600 leading-relaxed font-medium mb-8">"{item.scenario}"</p>
                             </div>
                             <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-sm font-bold tracking-wide text-slate-500">
                                <span className={`uppercase text-[10px] block mb-1 font-black ${item.color === 'sky' ? 'text-sky-600' : 'text-amber-600'}`}>Logic Path: {item.logic}</span>
                                {item.note}
                             </div>
                          </div>
                       ))}
                    </div>
                  </motion.div>
                )}

                {learningTab === 'practice' && (
                  <motion.div 
                    key="practice"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    className="w-full h-full flex flex-col items-center justify-center overflow-y-auto custom-scrollbar p-6"
                  >
                    <div className="bg-white border border-slate-200 p-12 rounded-[4rem] shadow-2xl w-full max-w-4xl relative overflow-hidden text-center">
                      <div className="flex flex-col items-center justify-center gap-4 mb-10">
                        <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-[2rem] flex items-center justify-center border border-sky-100 shadow-sm">
                           <HelpCircle size={40} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Logic Verification</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Analyze scenarios & categorize logic</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        {[
                          { q: "Podium Finishers", a: "Permutation", color_class: "sky" },
                          { q: "Team Selection", a: "Combination", color_class: "amber" },
                          { q: "PIN Code Entry", a: "Permutation", color_class: "sky" },
                          { q: "Juice Flavor Mix", a: "Combination", color_class: "amber" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-sky-300 transition-all group">
                            <span className="font-black text-slate-700 uppercase tracking-widest text-xs italic">{item.q}</span>
                            <span className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${item.color_class === 'sky' ? 'bg-sky-600 text-white' : 'bg-amber-500 text-white shadow-sm'}`}>{item.a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
          </div>
        </motion.div>
      )}

      {/* Quick Notification Bar */}
      {showQuickNotif && (
        <motion.div 
          initial={{ y: -50, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          className="fixed top-4 left-1/2 w-[90%] max-w-[400px] bg-white border-2 border-sky-600 rounded-2xl p-4 flex items-center justify-between shadow-[0_15px_30px_rgba(0,0,0,0.1)] z-[1000] border-t-8 border-t-sky-600"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
               <GraduationCap size={20} />
            </div>
            <div>
               <span className="font-black uppercase tracking-tight text-slate-900 block leading-tight">LEARN THIS!</span>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Educational Intel</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setShowLearning(true); setShowQuickNotif(false); playSfx('notif'); }}
              className="bg-sky-600 text-white px-4 py-2 rounded-xl font-black text-[10px] tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 active:scale-95"
            >
              LAUNCH
            </button>
            <button className="text-slate-300 hover:text-red-500 transition-colors p-1" onClick={() => setShowQuickNotif(false)}><X size={18} /></button>
          </div>
        </motion.div>
      )}

      {/* Situational Notification Letter Modal */}
      {showSituation && (
        <div className="fixed inset-0 bg-black/90 z-[30000] flex items-center justify-center p-4 overflow-hidden perspective-1000">
          <motion.div 
            initial={{ x: '100vw', rotateY: -45, opacity: 0, transformOrigin: 'left' }}
            animate={{ x: 0, rotateY: 0, opacity: 1 }}
            exit={{ x: '-100vw', rotateY: 45, opacity: 0, transformOrigin: 'right' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.8 }}
            className="w-full max-w-lg bg-[#fdfaf1] border-[10px] border-[#e8dfc4] rounded-sm p-8 md:p-12 shadow-[0_25px_50px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col items-center text-center ring-4 ring-[#4a3728]/10"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-black/5" />
            <div className="absolute top-4 right-4 text-[#8b7355] opacity-25 select-none font-serif text-3xl">🙣</div>
            <div className="absolute bottom-4 left-4 text-[#8b7355] opacity-25 select-none font-serif text-3xl">🙡</div>
            
            <h3 className="font-serif text-2xl md:text-3xl mb-8 text-[#4a3728] border-b border-[#4a3728]/30 pb-3 uppercase tracking-[4px] font-black italic">
              Room {currentRoom} Analysis
            </h3>
            
            <div className="font-serif text-lg md:text-xl leading-relaxed text-[#5d4037] mb-10 italic">
              {phase === 'level-1-rooms' ? LEVEL_1_SITUATIONS[currentRoom] : (LEVEL_2_ROOMS[currentRoom]?.situation || "Observe the mission parameters carefully. Logical synthesis required.") }
            </div>

            <button 
              className="mt-auto px-10 py-3 bg-[#4a3728] text-[#fdfaf1] font-black uppercase tracking-[3px] hover:bg-[#5d4037] transition-all rounded-sm shadow-xl active:scale-95 text-xs md:text-sm"
              onClick={() => { playSfx('type'); setShowSituation(false); }}
            >
              [CONTINUE OPERATION]
            </button>

            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]" 
                 style={{ backgroundImage: 'repeating-conic-gradient(#000 0 0.0001%, #fff 0 0.0002%)' }} />
          </motion.div>
        </div>
      )}

      {/* Explanation Modal */}
      {showExplanation !== null && (
        <div className="fixed inset-0 bg-black/90 z-[15000] flex flex-col items-center overflow-y-auto p-4 md:p-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg bg-[rgba(10,17,24,0.95)] border-4 border-[var(--solo-blue)] rounded-xl p-6 md:p-8 shadow-[0_0_40px_var(--solo-blue)] my-auto">
            <h2 className="text-3xl font-black text-[var(--solo-blue)] mb-6">EXPLANATION</h2>
            <div className="text-lg leading-relaxed mb-8 text-gray-200" dangerouslySetInnerHTML={{ __html: (phase === 'level-1-rooms' ? LEVEL_1_ROOMS[showExplanation].expl : LEVEL_2_ROOMS[showExplanation].expl) }} />
            <button 
              className="w-full py-4 bg-[var(--solo-blue)] text-black font-black text-xl rounded-md hover:bg-white transition-colors"
              onClick={() => {
                const isL1 = phase === 'level-1-rooms';
                setShowExplanation(null);
                setRoomFeedback('');
                setRoomInput('');
                setShowHint(null);
                if (currentRoom < 5) {
                  setCurrentRoom(prev => prev + 1);
                  setShowSituation(true);
                } else {
                  setPhase(isL1 ? 'level-1-summary' : 'level-2-summary');
                }
              }}
            >
              CONTINUE
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
