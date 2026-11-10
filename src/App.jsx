import { useEffect, useRef, useState } from 'react';
import './css/style.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/all';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

// Refresh par hamesha top se start ho:
// ScrollTrigger apni scroll memory se purani position restore karta hai, usay band karo
ScrollTrigger.clearScrollMemory('manual');
if (typeof window !== 'undefined') window.scrollTo(0, 0);

/* =====================================================================
   IMAGES  (public/images/ folder mein rakho, ya yahan naam badal do)
   ===================================================================== */
const GATE_IMG = '/images/door.png'; // gate wali image
const GROUND_IMG = '/images/ground.png'; // ground / garden wali background image

/* =====================================================================
   GATE GEOMETRY  (gate image 2048 x 768 ke hisaab se naapa gaya hai)
   Gate ke dono darwaze (leaves) ka outline. Image ki size badle to sirf
   GATE_W / GATE_H badal do (aspect ratio same ho to kuch nahi badalna).
   ===================================================================== */
const GATE_W = 2048;
const GATE_H = 768;
const SEAM_X = 1023.5; // dono darwazon ke beech ki line
const LEAF_LEFT_X = 789; // left darwaze ka bahar wala kinara
const LEAF_BOTTOM = 619; // darwaze ka neeche wala kinara
const LOCK_Y = 460; // darwaze ka lock (stamp yahan lagta hai)
// Left darwaze ka upar wala outline (bahar se seam tak)
const LEAF_TOP = [
  [789, 276],
  [812, 266],
  [854, 261],
  [905, 249],
  [955, 229],
  [1000, 225],
  [1007, 200],
  [1014, 190],
  [SEAM_X, 197],
];

const mirror = ([x, y]) => [2 * SEAM_X - x, y];
const grow = (pts, sx, sy) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
};
const toPath = (pts) =>
  'M' + pts.map(([x, y]) => `${(x / GATE_W).toFixed(5)},${(y / GATE_H).toFixed(5)}`).join('L') + 'Z';

const LEFT_POLY = [[LEAF_LEFT_X, LEAF_BOTTOM], ...LEAF_TOP, [SEAM_X, LEAF_BOTTOM]];
const RIGHT_POLY = LEFT_POLY.map(mirror);
// Hole: dono darwaze milakar (yahan se peeche ground image dikhti hai)
const HOLE_POLY = [
  [LEAF_LEFT_X, LEAF_BOTTOM],
  ...LEAF_TOP,
  ...LEAF_TOP.slice(0, -1).reverse().map(mirror),
  mirror([LEAF_LEFT_X, LEAF_BOTTOM]),
];
// Darwaze thora sa bara taake band hone par hairline na dikhe
const HOLE_CLIP_D = `M0,0H1V1H0Z ${toPath(HOLE_POLY)}`;
const LEFT_CLIP_D = toPath(grow(LEFT_POLY, 1.01, 1.006));
const RIGHT_CLIP_D = toPath(grow(RIGHT_POLY, 1.01, 1.006));

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
const LEFT_HINGE = pct(LEAF_LEFT_X, GATE_W);
const RIGHT_HINGE = pct(2 * SEAM_X - LEAF_LEFT_X, GATE_W);
const HOLE_CX = SEAM_X / GATE_W;
const HOLE_CY = (190 + LEAF_BOTTOM) / 2 / GATE_H;
const HOLE_WF = (2 * (SEAM_X - LEAF_LEFT_X)) / GATE_W;
const HOLE_HF = (LEAF_BOTTOM - 190) / GATE_H;

const gateBg = {
  backgroundImage: `url(${GATE_IMG})`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
};

/* =====================================================================
   DATA
   ===================================================================== */
// Countdown ka target: Barat, 29 Nov 2026, 7:00 PM (Pakistan time, UTC+5)
const WEDDING_START = new Date('2026-11-29T19:00:00+05:00').getTime();

// startUtc/endUtc calendar file ke liye hain: 7 PM PKT = 14:00 UTC
const celebrations = [
  {
    key: 'barat',
    title: 'BARAT',
    day: 'Sunday',
    date: '29',
    month: 'Nov 2026',
    time: '7:00 PM Onwards',
    venue: 'Jiyo Banquet Hall',
    address: 'Taragarh Road in Shahdara Town, Shahdara, Lahore',
    link: 'https://www.google.com/maps/search/?api=1&query=Jiyo+Banquet+Hall+Taragarh+Road+Shahdara+Town+Lahore',
    startUtc: '20261129T140000Z',
    endUtc: '20261129T170000Z',
  },
  {
    key: 'walima',
    title: 'WALIMA',
    day: 'Monday',
    date: '30',
    month: 'Nov 2026',
    time: '8:00 PM Onwards',
    venue: 'Sardar Banquet Hall',
    address: 'Outfall Rd, St Nagar, Lahore',
    link: 'https://www.google.com/maps/search/?api=1&query=Sardar+Banquet+Hall+Outfall+Rd+St+Nagar+Lahore',
    startUtc: '20261130T150000Z',
    endUtc: '20261130T180000Z',
  },
];

// Jin images ko pehle load karna hai (cache mein aa jayen)
const imagesToPreload = [GATE_IMG, GROUND_IMG, '/images/stamp-1.png', '/images/left.png'];

// Har section par background image ka kaun sa hissa dikhe (0% = left tree, 100% = right pavilion)
// hero/footer: beech (swans + mountains), date: left cherry tree, families: right pavilion
const BG_POS = { hero: 50, date: 14, families: 86, celebrations: 34, footer: 64 };

// ---------- INVITATION KA TEXT (sab kuch yahan se edit karo) ----------
const INVITE = {
  bismillah: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  dua: 'بَارَكَ ٱللَّهُ لَكِ وَبَارَكَ عَلَيْكِ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
  husband: 'Husband Name',
  wife: 'Wife Name',
  boyFamily: { family: 'Boy Family Name', father: 'Father Name', mother: 'Mother Name' },
  girlFamily: { family: 'Girl Family Name', father: 'Father Name', mother: 'Mother Name' },
};
// Arabic ke liye font (harakat/tashkeel saaf dikhte hain)
const ARABIC_FONT = "'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', 'Traditional Arabic', serif";

// Transparent (glass) card ka style
const GLASS =
  'rounded-3xl border border-white/50 bg-white/30 backdrop-blur-md shadow-[0_10px_40px_rgba(90,62,43,0.16)]';

/* =====================================================================
   SMALL ICONS
   ===================================================================== */
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

/* =====================================================================
   LENIS (smooth scrolling) + GSAP ScrollTrigger
   npm i lenis
   ===================================================================== */
function useLenis(lenisRef) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    lenis.stop(); // gate open hone tak scroll band

    // Lenis ke scroll par ScrollTrigger ko update karo
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [lenisRef]);
}

/* =====================================================================
   SCRATCH TO REVEAL
   ===================================================================== */
function ScratchCard({ children }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const moves = useRef(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;

    // Gold foil
    const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    g.addColorStop(0, '#B8860B');
    g.addColorStop(0.5, '#F3E2A9');
    g.addColorStop(1, '#C9A227');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Foil par thori sparkle dots
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * rect.width, Math.random() * rect.height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(90,62,43,0.8)';
    ctx.font = '600 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  Scratch to reveal  ✦', rect.width / 2, rect.height / 2 + 5);
  }, []);

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const scratchAt = (x, y) => {
    const ctx = ctxRef.current;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkRevealed = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    let total = 0;
    // har 16th pixel sample karo (fast)
    for (let i = 3; i < data.length; i += 64) {
      total += 1;
      if (data[i] === 0) cleared += 1;
    }
    if (cleared / total > 0.45) setRevealed(true);
  };

  const onDown = (e) => {
    drawing.current = true;
    canvasRef.current.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    scratchAt(x, y);
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const { x, y } = getPos(e);
    scratchAt(x, y);
    moves.current += 1;
    if (moves.current % 8 === 0) checkRevealed();
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    checkRevealed();
  };

  return (
    <div className="relative w-full h-[170px] rounded-2xl overflow-hidden border border-[#D4AF37]/50 shadow-lg bg-white/25 backdrop-blur-sm">
      {/* Neeche wali cheez jo scratch karne par dikhegi */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-700 ${
          revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}

/* =====================================================================
   COUNTDOWN
   Alag component hai taake har second poora App re-render na ho
   ===================================================================== */
function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const mins = Math.floor(diff / 60000) % 60;
  const secs = Math.floor(diff / 1000) % 60;
  const pad = (n) => String(n).padStart(2, '0');

  const tiles = [
    { label: 'Days', value: pad(days) },
    { label: 'Hours', value: pad(hours) },
    { label: 'Mins', value: pad(mins) },
    { label: 'Secs', value: pad(secs) },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex flex-col items-center bg-white/30 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm py-3"
        >
          <span className="font-serif text-2xl font-bold text-[#2C1D12] tabular-nums">{t.value}</span>
          <span className="text-[9px] uppercase tracking-widest text-[#5A3E2B] font-semibold">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   ADD TO CALENDAR (.ics file)
   ===================================================================== */
const icsText = (s) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const downloadIcs = () => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  celebrations.forEach((c) => {
    const name = c.title.charAt(0) + c.title.slice(1).toLowerCase();
    lines.push(
      'BEGIN:VEVENT',
      `UID:${c.key}-2026@wedding-invitation`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${c.startUtc}`,
      `DTEND:${c.endUtc}`,
      `SUMMARY:${icsText(`${name} - ${INVITE.husband} & ${INVITE.wife}`)}`,
      `LOCATION:${icsText(`${c.venue}, ${c.address}`)}`,
      `DESCRIPTION:${icsText(`${name} of ${INVITE.husband} & ${INVITE.wife}. ${c.time}. Directions: ${c.link}`)}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Wedding-Invitation.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* =====================================================================
   APP
   ===================================================================== */
function App() {
  const [flap, setflap] = useState(false); // gate khulna shuru hua (gana start)
  const [unlocked, setUnlocked] = useState(false); // animation khatam, scroll chalu
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  // Phone (lambi screen) par gate image chhoti hoti hai, upar neeche khali hissa bharna padta hai
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.85
  );
  const container = useRef(null);
  const lenisRef = useRef(null);
  const openedRef = useRef(false);

  // Refs
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const leftLeafRef = useRef(null);
  const rightLeafRef = useRef(null);
  const stampBtnRef = useRef(null);
  const labelRef = useRef(null);
  const radarPulsesRef = useRef([]);
  const bgZoomRef = useRef(null);
  const topFlowerRef = useRef(null);
  const bottomFlowerRef = useRef(null);
  const familyContentRef = useRef(null);

  useLenis(lenisRef);

  // Arabic font (Amiri) load karo
  useEffect(() => {
    if (document.getElementById('arabic-font')) return;
    const link = document.createElement('link');
    link.id = 'arabic-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth / window.innerHeight < 0.85);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Saari images preload karo; sab aa jayen to loader hata do
  useEffect(() => {
    let count = 0;
    const done = () => {
      count += 1;
      setProgress(Math.round((count / imagesToPreload.length) * 100));
      if (count === imagesToPreload.length) setLoaded(true);
    };

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = done;
      img.onerror = done; // image fail ho jaye tab bhi loader atke nahi
      img.src = src;
    });
  }, []);

  // Images aane ke baad layout final hota hai
  useEffect(() => {
    if (loaded) {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    }
  }, [loaded]);

  // Jab tak gate pura khul nahi jata, page scroll lock rahega
  useEffect(() => {
    if (!unlocked) {
      window.scrollTo(0, 0);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      lenisRef.current?.stop();
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      lenisRef.current?.start();
      ScrollTrigger.refresh();
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [unlocked]);

  useEffect(() => {
    // scrollRestoration window par nahi, window.history par hota hai
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // Page band/refresh hone se pehle top par le jao, taake browser top hi restore kare
    const goTop = () => window.scrollTo(0, 0);
    window.addEventListener('beforeunload', goTop);
    window.addEventListener('pageshow', goTop);
    return () => {
      window.removeEventListener('beforeunload', goTop);
      window.removeEventListener('pageshow', goTop);
    };
  }, []);

  useGSAP(() => {
    // 1. Radar pulse infinite animation (stamp ke ird gird)
    const pulses = radarPulsesRef.current;
    const pulseTween = gsap.to(pulses, {
      scale: 2.2,
      opacity: 0,
      duration: 2,
      repeat: -1,
      stagger: 0.6,
      ease: 'power1.out',
    });

    // 2. Stamp glow animation
    const glowTween = gsap.to('.stamp-seal', {
      boxShadow: '0 0 25px rgba(212, 175, 55, 0.6)',
      repeat: -1,
      yoyo: true,
      duration: 1.5,
      ease: 'sine.inOut',
    });

    // 3. Background image ka section ke hisaab se pan (camera ek section se doosre par jata hai)
    const panTo = (x) =>
      gsap.to(bgZoomRef.current, {
        backgroundPosition: `${x}% 60%`,
        duration: 2,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
    gsap.utils.toArray('[data-bgx]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 60%',
        end: 'bottom 60%',
        onToggle: (self) => {
          if (self.isActive) panTo(Number(sec.dataset.bgx));
        },
      });
    });

    // 4. Save the date section
    gsap.from('.save-item', {
      opacity: 0,
      y: 30,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#date-section',
        start: 'top 65%',
        toggleActions: 'play none none reverse',
      },
    });

    // 5. Families section
    gsap.fromTo(
      [topFlowerRef.current, bottomFlowerRef.current],
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#families-section',
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    gsap.fromTo(
      familyContentRef.current,
      { opacity: 0, y: 40, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#families-section',
          start: 'top 65%',
          toggleActions: 'play none none reverse',
        },
      }
    );
    gsap.from('.family-item', {
      opacity: 0,
      y: 18,
      duration: 0.7,
      stagger: 0.18,
      delay: 0.25,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#families-section',
        start: 'top 65%',
        toggleActions: 'play none none reverse',
      },
    });

    // 6. Celebration Cards
    // 3D tilt-up entrance -> content stagger -> date count-up -> looping gold shine
    gsap.from('.celeb-head', {
      opacity: 0,
      y: 24,
      duration: 0.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#celebrations-section',
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
    });

    gsap.utils.toArray('.celeb-card').forEach((card) => {
      const items = card.querySelectorAll('.reveal-item');
      const num = card.querySelector('.date-num');
      const target = Number(num.dataset.value);
      const counter = { v: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });

      tl.fromTo(
        card,
        { opacity: 0, y: 90, rotationX: -28, scale: 0.88, transformPerspective: 900, transformOrigin: '50% 100%' },
        { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 1.2, ease: 'back.out(1.4)' }
      )
        .from(items, { opacity: 0, y: 20, duration: 0.6, stagger: 0.12, ease: 'power2.out' }, '-=0.6')
        .to(
          counter,
          {
            v: target,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate: () => {
              num.textContent = Math.round(counter.v);
            },
          },
          '<'
        );
    });

    // Gold shine sweep (loop) - har card par thora delay ke saath
    gsap.utils.toArray('.card-shine').forEach((shine, i) => {
      gsap.fromTo(
        shine,
        { xPercent: 0 },
        {
          xPercent: 600,
          duration: 1.6,
          ease: 'power2.inOut',
          repeat: -1,
          repeatDelay: 3.5,
          delay: 1.5 + i * 1.2,
        }
      );
    });

    // Chhota floating star on top of each arch
    gsap.to('.card-star', {
      y: -4,
      scale: 1.15,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: 0.4,
    });

    // 7. Footer
    gsap.from('.foot-item', {
      opacity: 0,
      y: 30,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '#footer-section',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });
    gsap.from('.foot-flower', {
      opacity: 0,
      scale: 0.8,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#footer-section',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });

    return () => {
      pulseTween.kill();
      glowTween.kill();
    };
  }, { scope: container });

  // GATE KHOLNE KI ANIMATION
  // stamp gayab -> dono darwaze andar ki taraf khulte hain (peeche se ground image dikhti hai)
  // -> pura scene darwaze ke andar zoom hota hai, ground halka sa zoom -> transparent card
  const handleOpen = () => {
    if (openedRef.current) return;
    openedRef.current = true;
    setflap(true);

    const scene = sceneRef.current;
    const stage = stageRef.current;
    const r = stage.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Zoom ka center = darwaze ke khulne wali jagah ka beech
    const cx = r.left + r.width * HOLE_CX;
    const cy = r.top + r.height * HOLE_CY;
    // 1.7: taake darwaze ke arch ke kinare bhi screen se bahar chale jayen
    const k = Math.max(vw / (r.width * HOLE_WF), vh / (r.height * HOLE_HF)) * 1.7;
    gsap.set(scene, { transformOrigin: `${cx}px ${cy}px` });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(scene, { display: 'none' });
        setUnlocked(true);
      },
    });

    tl.to([stampBtnRef.current, labelRef.current], { opacity: 0, scale: 0.7, duration: 0.5, ease: 'power2.in' }, 0)
      // dono darwaze andar ki taraf khulte hain
      .to(leftLeafRef.current, { rotationY: 82, duration: 1.8, ease: 'power2.inOut' }, 0.3)
      .to(rightLeafRef.current, { rotationY: -82, duration: 1.8, ease: 'power2.inOut' }, 0.3)
      .to([leftLeafRef.current, rightLeafRef.current], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 1.5)
      // ground image halki si zoom
      .fromTo(
        bgZoomRef.current,
        { scale: 1 },
        { scale: 1.14, duration: 4, ease: 'power2.out' },
        0.9
      )
      // pura scene darwaze ke andar zoom hokar fade
      .to(scene, { scale: k, duration: 2, ease: 'power2.in' }, 1.1)
      .to(scene, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 2.4)
      // transparent card nazar aata hai
      .fromTo(
        '.intro-card',
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 1.3, ease: 'power3.out' },
        2.6
      )
      .from('.intro-item', { opacity: 0, y: 16, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, 3.0);
  };

  return (
    <div ref={container} className="min-h-screen w-full overflow-x-hidden">
      {/* SVG clip shapes (gate ke darwaze aur hole) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="gate-hole" clipPathUnits="objectBoundingBox">
            <path clipRule="evenodd" d={HOLE_CLIP_D} />
          </clipPath>
          <clipPath id="gate-left" clipPathUnits="objectBoundingBox">
            <path d={LEFT_CLIP_D} />
          </clipPath>
          <clipPath id="gate-right" clipPathUnits="objectBoundingBox">
            <path d={RIGHT_CLIP_D} />
          </clipPath>
        </defs>
      </svg>

      {/* Loading screen: images load hone tak */}
      <div
        className={`fixed inset-0 z-[100] bg-[#F4EFEB] flex flex-col items-center justify-center gap-4 transition-opacity duration-700 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span className="text-[#D4AF37] text-3xl animate-pulse">✦</span>
        <p className="font-serif italic text-amber-900 text-lg tracking-wide">Loading Invitation...</p>
        <div className="w-40 h-[3px] bg-[#D4AF37]/25 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4AF37] transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-[10px] tracking-[0.3em] text-[#7E5C38] font-semibold">{progress}%</span>
      </div>

      {/* Background song: gate par click (user interaction) ke baad start hota hai */}
      {flap && (
        <iframe
          src="https://www.youtube.com/embed/RpE-hVumiDI?autoplay=1&loop=1&playlist=RpE-hVumiDI"
          allow="autoplay"
          title="Background Audio"
          id="bg-audio"
          style={{ position: 'fixed', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', border: 0 }}
        ></iframe>
      )}

      {/* GROUND BACKGROUND: har section ke peeche (fixed) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#E9DCC7]">
        <div
          ref={bgZoomRef}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${GROUND_IMG})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `${BG_POS.hero}% 60%`,
            transformOrigin: '50% 60%',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#5A3E2B]/10"></div>
      </div>

      {/* GATE SCENE (sab se upar, tap karne par khulta hai) */}
      <div
        ref={sceneRef}
        onClick={handleOpen}
        className="fixed inset-0 z-50 overflow-hidden cursor-pointer"
        style={{
          // --sw: gate image ki width (landscape par screen bhar, phone par gate+pillars screen mein fit)
          '--sw': 'max(100vw, min(266.67svh, 312.5vw))',
          '--sh': 'calc(var(--sw) * 0.375)',
          '--fh': 'calc((100svh - var(--sh)) / 2)', // upar/neeche ka khali hissa
          '--fe': 'calc(var(--fh) + var(--sh) * 0.09 + 20px)',
        }}
      >
        {/* Phone par upar/neeche ka khali hissa: image ki kinare wali patti stretch + blur */}
        {narrow && (
          <>
            <div
              className="absolute pointer-events-none"
              style={{
                top: '-20px',
                left: '-20px',
                right: '-20px',
                height: 'var(--fe)',
                backgroundImage: `url(${GATE_IMG})`,
                backgroundSize: 'var(--sw) calc(var(--fe) * 12)',
                backgroundPosition: 'center top',
                backgroundRepeat: 'no-repeat',
                transform: 'scaleY(-1)',
                filter: 'blur(10px)',
              }}
            ></div>
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '-20px',
                left: '-20px',
                right: '-20px',
                height: 'var(--fe)',
                backgroundImage: `url(${GATE_IMG})`,
                backgroundSize: 'var(--sw) calc(var(--fe) * 12)',
                backgroundPosition: 'center bottom',
                backgroundRepeat: 'no-repeat',
                transform: 'scaleY(-1)',
                filter: 'blur(10px)',
              }}
            ></div>
          </>
        )}

        {/* Stage: gate image apni asal ratio mein */}
        <div
          ref={stageRef}
          className="absolute"
          style={{
            left: 'calc(50% - var(--sw) / 2)',
            top: 'calc(50% - var(--sh) / 2)',
            width: 'var(--sw)',
            height: 'var(--sh)',
            perspective: '1500px',
            perspectiveOrigin: '50% 52%',
          }}
        >
          {/* Fixed hissa: gate ke darwaze nikal kar (hole), baqi image */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-hole)',
              // Phone par upar/neeche ke kinare filler mein ghul jayen
              ...(narrow
                ? {
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)',
                  }
                : null),
            }}
          ></div>

          {/* Left darwaza */}
          <div
            ref={leftLeafRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-left)',
              transformOrigin: `${LEFT_HINGE} 50%`,
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
          ></div>

          {/* Right darwaza */}
          <div
            ref={rightLeafRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              ...gateBg,
              clipPath: 'url(#gate-right)',
              transformOrigin: `${RIGHT_HINGE} 50%`,
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
          ></div>

          {/* Stamp (lock ki jagah) */}
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pct(SEAM_X, GATE_W), top: pct(LOCK_Y, GATE_H) }}
          >
            <button
              ref={stampBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen();
              }}
              aria-label="Tap to open"
              className="relative flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
              style={{ width: 'clamp(52px, calc(var(--sw) * 0.036), 92px)', aspectRatio: '1' }}
            >
              <span ref={(el) => { radarPulsesRef.current[0] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-600/70 opacity-80 pointer-events-none"></span>
              <span ref={(el) => { radarPulsesRef.current[1] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-500/70 opacity-80 pointer-events-none"></span>
              <span ref={(el) => { radarPulsesRef.current[2] = el; }} className="radar-pulse absolute inset-0 rounded-full border-2 border-amber-400/60 opacity-80 pointer-events-none"></span>

              <img
                src="/images/stamp-1.png"
                className="stamp-seal w-full h-full rounded-full object-cover relative z-10 shadow-lg"
                alt="Stamp Seal"
              />
            </button>
          </div>
        </div>

        {/* Tap to open */}
        <div
          ref={labelRef}
          className="absolute inset-x-0 flex flex-col items-center pointer-events-none z-20"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5svh)' }}
        >
          <span className="px-5 py-2 rounded-full bg-white/70 backdrop-blur-md text-[11px] uppercase tracking-[0.35em] text-[#5A3E2B] font-semibold shadow-lg">
            Tap to Open
          </span>
          <span className="text-[11px] italic font-serif text-[#5A3E2B] mt-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
            An Invitation Awaits
          </span>
        </div>
      </div>

      {/* ============ SECTION 1: TRANSPARENT INVITATION CARD ============ */}
      <section
        data-bgx={BG_POS.hero}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 pb-[14svh]"
        style={{ minHeight: '100svh' }}
      >
        <div className={`intro-card ${GLASS} opacity-0 w-full max-w-sm px-8 py-10 text-center flex flex-col items-center gap-4`}>
          {/* Bismillah (sab se upar) */}
          <p
            dir="rtl"
            lang="ar"
            className="intro-item text-[28px] leading-[2] text-[#4A2E12]"
            style={{ fontFamily: ARABIC_FONT }}
          >
            {INVITE.bismillah}
          </p>

          <span className="intro-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">
            The Wedding Celebration
          </span>
          <p className="intro-item text-xs text-[#4A3B2C] italic font-serif">
            You are cordially invited to celebrate the union of
          </p>
          <div className="intro-item text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] tracking-wide flex flex-col items-center gap-1">
            <span>{INVITE.husband}</span>
            <span className="text-[#8A6232] font-light italic text-xl">&amp;</span>
            <span>{INVITE.wife}</span>
          </div>
          <div className="intro-item w-16 h-[1px] bg-[#7E5C38]/50"></div>
          <p className="intro-item text-[11px] text-[#5A3E2B] italic font-serif">
            Your presence will make our day complete.
          </p>

          {/* Dua (sab se neeche) */}
          <div className="intro-item w-10 h-[1px] bg-[#7E5C38]/40"></div>
          <p
            dir="rtl"
            lang="ar"
            className="intro-item text-xl leading-[2.1] text-[#4A2E12]"
            style={{ fontFamily: ARABIC_FONT }}
          >
            {INVITE.dua}
          </p>
        </div>

        <div className="intro-item mt-6 flex flex-col items-center animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#3A2B1C] font-sans font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            Scroll Down
          </span>
          <span className="text-lg text-[#3A2B1C] mt-1">↓</span>
        </div>
      </section>

      {/* ============ SECTION 2: SAVE THE DATE ============ */}
      <section
        id="date-section"
        data-bgx={BG_POS.date}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20"
      >
        <div className={`${GLASS} w-full max-w-sm p-6 flex flex-col items-center text-center gap-6`}>
          <div className="save-item">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">SAVE THE DATE</span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] mt-1">Mark Your Calendar</h2>
            <div className="w-12 h-[1px] bg-[#7E5C38]/50 mx-auto mt-2"></div>
          </div>

          <div className="save-item w-full">
            <ScratchCard>
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#4A3B2C] font-medium">Sunday &amp; Monday</span>
              <span className="font-serif text-5xl font-bold leading-tight my-1 bg-gradient-to-b from-[#B8860B] to-[#6E4E2B] bg-clip-text text-transparent">
                1 . 2
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-[#4A3B2C] font-medium">November 2026</span>
            </ScratchCard>
            <p className="text-[10px] text-[#5A3E2B] italic font-serif mt-2">Scratch the gold to reveal the date ✦</p>
          </div>

          <div className="save-item w-full">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold mb-2">Counting down to the Barat</p>
            <Countdown target={WEDDING_START} />
          </div>

          <button
            onClick={downloadIcs}
            className="save-item flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-[#5A3E2B] to-[#7E5C38] text-white text-xs uppercase tracking-widest rounded-full shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-sans font-medium"
          >
            <CalendarIcon />
            Add to Calendar
          </button>
        </div>
      </section>

      {/* ============ SECTION 3: THE FAMILIES ============ */}
      <section
        id="families-section"
        data-bgx={BG_POS.families}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20 overflow-hidden"
      >
        <div ref={topFlowerRef} className="absolute top-0 right-0 w-[160px] sm:w-[220px] md:w-[280px] opacity-0 pointer-events-none z-10">
          <img src="/images/left.png" className="w-full h-full object-contain rotate-180" alt="Corner Flower Top" />
        </div>

        <div ref={bottomFlowerRef} className="absolute bottom-0 left-0 w-[160px] sm:w-[220px] md:w-[280px] opacity-0 pointer-events-none z-10">
          <img src="/images/left.png" className="w-full h-full object-contain" alt="Corner Flower Bottom" />
        </div>

        <div
          ref={familyContentRef}
          className={`${GLASS} w-full max-w-sm px-8 py-10 flex flex-col items-center text-center gap-5 z-20 opacity-0`}
        >
          <span className="family-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">THE FAMILIES</span>

          <div className="space-y-6 w-full">
            <div className="family-item space-y-1">
              <h3 className="font-serif text-2xl text-[#2C1D12] font-medium tracking-wide">{INVITE.boyFamily.family}</h3>
              <p className="text-xs text-[#2F2318] font-serif">{INVITE.boyFamily.father}</p>
              <p className="text-xs text-[#2F2318] font-serif">{INVITE.boyFamily.mother}</p>
            </div>

            <div className="family-item text-[#7E5C38] font-serif italic text-lg">&amp;</div>

            <div className="family-item space-y-1">
              <h3 className="font-serif text-2xl text-[#2C1D12] font-medium tracking-wide">{INVITE.girlFamily.family}</h3>
              <p className="text-xs text-[#2F2318] font-serif">{INVITE.girlFamily.father}</p>
              <p className="text-xs text-[#2F2318] font-serif">{INVITE.girlFamily.mother}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SECTION 4: THE CELEBRATIONS (BARAT & WALIMA) ============ */}
      <section
        id="celebrations-section"
        data-bgx={BG_POS.celebrations}
        className="relative z-10 min-h-screen w-full flex flex-col justify-center items-center px-4 py-20 gap-10"
      >
        {/* Section Header */}
        <div className={`celeb-head ${GLASS} px-8 py-4 text-center z-20`}>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">SCHEDULE &amp; VENUES</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1D12] mt-1">The Celebrations</h2>
          <div className="w-12 h-[1px] bg-[#7E5C38]/50 mx-auto mt-2"></div>
        </div>

        {/* Cards Container */}
        <div className="w-full max-w-md flex flex-col gap-10 z-20 items-center">
          {celebrations.map((c) => (
            <div key={c.key} className="celeb-card w-[95%] max-w-[360px] relative opacity-0">
              {/* Gold gradient frame */}
              <div className="rounded-t-[140px] rounded-b-3xl p-[3px] bg-gradient-to-b from-[#D4AF37] via-[#F3E2A9] to-[#B8860B] shadow-[0_20px_50px_rgba(90,62,43,0.28)]">
                {/* Card body (transparent glass) */}
                <div className="relative overflow-hidden rounded-t-[137px] rounded-b-[21px] bg-gradient-to-b from-white/45 to-white/20 backdrop-blur-md px-6 pt-12 pb-7 text-center flex flex-col items-center min-h-[440px]">

                  {/* Thin inner border */}
                  <div className="absolute inset-2 rounded-t-[130px] rounded-b-2xl border border-[#D4AF37]/50 pointer-events-none"></div>

                  {/* Moving shine */}
                  <div className="card-shine pointer-events-none absolute top-0 -left-1/2 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent z-10"></div>

                  {/* Top: star + title */}
                  <div className="reveal-item flex flex-col items-center gap-2">
                    <span className="card-star text-[#B8860B] text-base leading-none">✦</span>
                    <span className="text-[10px] uppercase tracking-[0.35em] text-[#5A3E2B] font-semibold">{c.title}</span>
                  </div>

                  {/* Date */}
                  <div className="reveal-item mt-4 flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-[0.3em] text-[#4A3B2C] font-medium">{c.day}</span>
                    <span
                      data-value={c.date}
                      className="date-num text-7xl font-serif font-bold leading-none my-1 bg-gradient-to-b from-[#B8860B] to-[#6E4E2B] bg-clip-text text-transparent"
                    >
                      {c.date}
                    </span>
                    <span className="text-xs uppercase tracking-[0.25em] text-[#4A3B2C] font-medium">{c.month}</span>
                  </div>

                  {/* Ornament divider */}
                  <div className="reveal-item flex items-center gap-2 my-5 w-full px-6">
                    <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#B8860B]/70"></span>
                    <span className="text-[#B8860B] text-[10px]">◆</span>
                    <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#B8860B]/70"></span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 w-full">
                    <p className="reveal-item flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4A2E12]">
                      <ClockIcon />
                      {c.time}
                    </p>
                    <h3 className="reveal-item font-serif font-bold text-xl text-[#2C1D12]">{c.venue}</h3>
                    <p className="reveal-item flex items-start justify-center gap-1.5 text-[11px] text-[#2F2318] px-4 leading-relaxed">
                      <span className="mt-[2px] text-[#8A6232] shrink-0"><PinIcon /></span>
                      <span>{c.address}</span>
                    </p>
                  </div>

                  {/* Button */}
                  <div className="reveal-item w-full mt-auto pt-6 relative z-20">
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full py-2.5 px-4 bg-gradient-to-r from-[#5A3E2B] to-[#7E5C38] text-white text-xs uppercase tracking-widest rounded-full shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-sans font-medium text-center"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FOOTER (transparent) ============ */}
      <footer
        id="footer-section"
        data-bgx={BG_POS.footer}
        className="relative z-10 w-full overflow-hidden px-4 py-20 flex flex-col items-center text-center"
      >
        <div className="foot-flower absolute top-0 right-0 w-[130px] sm:w-[180px] md:w-[220px] pointer-events-none">
          <img src="/images/left.png" className="w-full h-full object-contain rotate-180" alt="Corner Flower Top" />
        </div>

        <div className="foot-flower absolute bottom-0 left-0 w-[130px] sm:w-[180px] md:w-[220px] pointer-events-none">
          <img src="/images/left.png" className="w-full h-full object-contain" alt="Corner Flower Bottom" />
        </div>

        <div className={`${GLASS} relative z-20 px-10 py-8 flex flex-col items-center gap-3`}>
          <span className="foot-item text-[#B8860B] text-base leading-none">✦</span>

          <p className="foot-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold">
            Designed by
          </p>
          <p className="foot-item font-serif text-lg text-[#2C1D12] font-medium tracking-wide -mt-2">Muhammad Bilal</p>

          <p className="foot-item text-[10px] uppercase tracking-[0.3em] text-[#5A3E2B] font-semibold mt-2">
            Developed by
          </p>
          <p className="foot-item font-serif text-lg text-[#2C1D12] font-medium tracking-wide -mt-2">Muhammad Bilal</p>

          <div className="foot-item w-12 h-[1px] bg-[#7E5C38]/50 my-2"></div>

          <a
            href="https://www.instagram.com/bilal.env0/"
            target="_blank"
            rel="noopener noreferrer"
            className="foot-item flex items-center gap-2 text-xs text-[#4A2E12] hover:text-[#2C1D12] transition-colors font-sans font-medium tracking-wide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
            </svg>
            @bilal.env0
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;