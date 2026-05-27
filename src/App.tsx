/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Thermometer, 
  Timer, 
  Bell, 
  Settings, 
  Cloud, 
  AlertTriangle,
  Play,
  Square,
  CheckCircle2,
  Navigation,
  Info,
  Search,
  MapPin,
  X,
  Loader2,
  Globe,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  Shirt
} from 'lucide-react';
import { 
  getWeather, 
  getDrynessEstimate, 
  searchLocation, 
  getLaundrySchedule,
  sendVoiceCommand,
  VoiceCommandResult,
  WeatherData, 
  DrynessInfo, 
  LocationResult,
  ScheduleInfo,
  sendEmailNotification,
  fetchEmailLogs,
  clearEmailLogs
} from './services/api';
import SettingsModal, { AppSettings } from './components/SettingsModal';
import SearchModal from './components/SearchModal';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage is not accessible in this context:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage is not writable in this context:", e);
    }
  }
};

const getTheme = (weather: WeatherData | null) => {
  if (!weather) return {
    bg: "bg-slate-50",
    header: "text-slate-900",
    accent: "bg-blue-600",
    card: "bg-white",
    dot: "bg-blue-500"
  };

  const code = weather.current.weather_code;
  const isDay = weather.current.is_day === 1;

  if (!isDay) return {
    bg: "bg-slate-900",
    header: "text-white",
    accent: "bg-indigo-500",
    card: "bg-slate-800/80 backdrop-blur-md border-slate-700",
    dot: "bg-indigo-400",
    isDark: true
  };

  // Clear / Mainly clear
  if (code <= 1) return {
    bg: "bg-amber-50",
    header: "text-amber-900",
    accent: "bg-orange-500",
    card: "bg-white/90 shadow-orange-100/50",
    dot: "bg-orange-500"
  };

  // Cloudy
  if (code <= 3) return {
    bg: "bg-slate-100",
    header: "text-slate-800",
    accent: "bg-blue-500",
    card: "bg-white/90 shadow-slate-200/50",
    dot: "bg-blue-500"
  };

  // Fog / Drizzle / Rain
  if (code <= 69 || (code >= 80 && code <= 82)) return {
    bg: "bg-blue-50",
    header: "text-blue-900",
    accent: "bg-blue-600",
    card: "bg-white/90 shadow-blue-100/50",
    dot: "bg-blue-500"
  };

  // Thunderstorm / Snow
  return {
    bg: "bg-slate-200",
    header: "text-slate-900",
    accent: "bg-slate-700",
    card: "bg-white/90 shadow-slate-300/50",
    dot: "bg-slate-500"
  };
};

const getWeatherStatus = (code: number) => {
  const map: Record<number, string> = {
    0: "Clear Skies",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Showers",
    81: "Moderate Showers",
    82: "Violent Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Heavy Hail Storm",
  };
  return map[code] || "Weather Activity";
};

// --- PREMIUM WEATHER BACKGROUND PARTICLE ENGINES & GRAPHICS ---

const RainFallAnimation = () => {
  const drops = Array.from({ length: 14 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {drops.map((_, idx) => {
        const left = (idx * 7.5) + (Math.random() * 4);
        const delay = Math.random() * 1.6;
        const duration = 0.5 + Math.random() * 0.4;
        const height = 12 + Math.random() * 16;
        return (
          <motion.div
            key={idx}
            initial={{ y: -45, opacity: 0 }}
            animate={{ y: 320, opacity: [0, 0.7, 0.5, 0] }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "linear"
            }}
            className="absolute bg-white/45 w-[1.5px] rounded-full"
            style={{
              left: `${left}%`,
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
};

const SunnySparkleAnimation = () => {
  const sparkles = Array.from({ length: 7 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute -top-12 -right-12 w-72 h-72 rounded-full border border-amber-300/10 bg-gradient-to-br from-amber-300/20 to-transparent opacity-40 blur-lg"
      />
      {sparkles.map((_, idx) => {
        const left = 20 + (idx * 11) + (Math.random() * 5);
        const top = 15 + Math.random() * 60;
        const delay = Math.random() * 1.8;
        const duration = 1.3 + Math.random() * 1.2;
        return (
          <motion.div
            key={idx}
            animate={{
              scale: [0, 1.15, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              delay: delay,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}%`,
            }}
          >
            <Sun className="w-2.5 h-2.5 text-amber-300 fill-amber-300/50" />
          </motion.div>
        );
      })}
    </div>
  );
};

const CloudOvercastAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
      <motion.div
        initial={{ x: -140 }}
        animate={{ x: 550 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        className="absolute top-4 w-28 h-12 bg-white dark:bg-slate-300 rounded-full blur-sm"
      />
      <motion.div
        initial={{ x: -220 }}
        animate={{ x: 600 }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear", delay: 6 }}
        className="absolute top-10 w-40 h-16 bg-white dark:bg-slate-400 rounded-full blur-md"
      />
    </div>
  );
};

const ClotheslineSway = ({ windSpeed, isDancing }: { windSpeed: number; isDancing: boolean }) => {
  // Translate windSpeed range (km/h) to active swing rotational angle
  const angleOfSwing = Math.max(1.8, Math.min(18, windSpeed * 0.75));
  const rateSpeed = windSpeed > 18 ? 0.45 : windSpeed > 10 ? 0.8 : 2.0;

  return (
    <div className="relative w-full h-28 flex flex-col items-center justify-center overflow-hidden mb-2 z-10">
      {/* Cable string line overlay */}
      <div className="absolute top-10 left-0 right-0 h-[1.5px] bg-white/40 dark:bg-slate-600/40" />
      
      {/* Dynamic Sway Anchor Body */}
      <motion.div
        animate={{
          rotate: [-angleOfSwing, angleOfSwing, -angleOfSwing],
          y: [0, -angleOfSwing * 0.25, 0],
          skewX: [-angleOfSwing * 0.35, angleOfSwing * 0.35, -angleOfSwing * 0.35]
        }}
        transition={{
          repeat: Infinity,
          duration: rateSpeed,
          ease: "easeInOut"
        }}
        className="relative flex flex-col items-center"
        style={{ transformOrigin: "top" }}
      >
        {/* Support Clothespins Wooden pegs */}
        <div className="flex gap-14 -mt-2.5 relative z-20">
          <div className="w-1.5 h-3.5 bg-amber-700/80 rounded shadow-sm" />
          <div className="w-1.5 h-3.5 bg-amber-700/80 rounded shadow-sm" />
        </div>

        {/* Laundry Item Core Custom SVG */}
        <svg viewBox="0 0 120 100" className="w-[74px] h-[74px] drop-shadow-md cursor-pointer select-none" fill="currentColor">
          <path d="M 30,15 
                   C 40,25 50,25 60,15 
                   C 70,25 80,25 90,15 
                   L 115,26 
                   C 118,29 115,34 110,31
                   L 100,25
                   L 100,80
                   C 100,85 95,90 90,90
                   L 30,90
                   C 25,90 20,85 20,80
                   L 20,25
                   L 10,31
                   C 5,34 2,29 5,26
                   Z" 
                className={`${isDancing ? 'fill-sky-100 dark:fill-indigo-900 border-2' : 'fill-white/80 dark:fill-indigo-300/85'} stroke-slate-200/50 dark:stroke-slate-900`}
          />
          <circle cx="60" cy="50" r="11" className="fill-blue-500/10 stroke-blue-400/40 stroke-[1.5px]" />
          <path d="M 54,50 Q 60,42 66,50" fill="none" className="stroke-blue-400 stroke-2" />
          <path d="M 52,50 Q 60,58 68,50" fill="none" className="stroke-amber-400 stroke-[1.5px]" />
        </svg>

        {/* Tiny Wind Status string */}
        <div className="absolute -bottom-2.5 text-[7px] tracking-wider font-bold uppercase text-white bg-black/30 dark:bg-black/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm scale-90 border border-white/5">
          {windSpeed > 18 ? "⚠️ GALE VENT" : windSpeed > 10 ? "🍃 ACTIVE DRY" : "☀️ CALM"}
        </div>
      </motion.div>
    </div>
  );
};

// --- END OF PREMIUM BACKDROP ENGINES ---

export default function App() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("Detecting...");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dryness, setDryness] = useState<DrynessInfo | null>(null);
  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const [isDrying, setIsDrying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Timer and Alarm state
  const [customMinutesOffset, setCustomMinutesOffset] = useState(0);
  const [nowTicker, setNowTicker] = useState(Date.now());
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [isDryingComplete, setIsDryingComplete] = useState(false);
  const [completeAlarmActive, setCompleteAlarmActive] = useState(false);
  const [alarmRingtone, setAlarmRingtone] = useState<string>(() => {
    return localStorage.getItem("laundry_alarm_ringtone") || "standard";
  });
  const [customFileAudioUrl, setCustomFileAudioUrl] = useState<string | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const [emailLogsList, setEmailLogsList] = useState<any[]>([]);

  // Premium Custom Fabric Type
  const [fabricType, setFabricType] = useState<'cotton' | 'delicate' | 'heavy'>(() => {
    return (localStorage.getItem("laundry_fabric_type") as any) || "cotton";
  });

  // Premium Voice over Speech settings
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem("laundry_voice_enabled") !== "false";
  });
  const [voiceGender, setVoiceGender] = useState<'female' | 'male' | 'natural'>(() => {
    return (localStorage.getItem("laundry_voice_gender") as any) || "female";
  });
  const [voiceRate, setVoiceRate] = useState<number>(() => {
    const r = parseFloat(localStorage.getItem("laundry_voice_rate") || "1.0");
    return isNaN(r) ? 1.0 : r;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom Premium AI Voice Player
  const playWithCustomVoice = useCallback((textStr: string) => {
    if (!voiceEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        // Remove HTML tags for perfect speech synthesis vocalizing
        const cleanText = textStr.replace(/<\/?[^>]+(>|$)/g, "")
                                 .replace(/&nbsp;/g, " ")
                                 .replace(/🎉|⚠️|🧺|☀️|🌧️|🌱|🌡️|🌪️/g, ""); // strip emojis for crystal clear sound
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const availableVoices = window.speechSynthesis.getVoices();
        
        // Look up top professional voice options
        let selectedVoice = null;
        if (voiceGender === 'female') {
          selectedVoice = availableVoices.find(v => 
            v.name.includes("Google US English") || 
            v.name.includes("Samantha") || 
            v.name.includes("Zira") || 
            v.name.toLowerCase().includes("female")
          );
        } else if (voiceGender === 'male') {
          selectedVoice = availableVoices.find(v => 
            v.name.includes("Google UK English Male") || 
            v.name.includes("David") || 
            v.name.includes("Mark") || 
            v.name.toLowerCase().includes("male")
          );
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.rate = voiceRate;
        utterance.pitch = voiceGender === 'female' ? 1.05 : voiceGender === 'male' ? 0.95 : 1.0;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech Synthesis failed to vocalize:", e);
    }
  }, [voiceEnabled, voiceGender, voiceRate]);
  
  // Synthesizer Audio alarm refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  
  // AI Voice Assistant State
  const [aiListening, setAiListening] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiFeed, setAiFeed] = useState<Array<{ speaker: 'user' | 'ai'; text: string; time: string }>>([]);
  const [textCommand, setTextCommand] = useState("");
  const [customTimerDuration, setCustomTimerDuration] = useState<number | null>(null);
  const [pendingTimerDuration, setPendingTimerDuration] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    pushNotifications: false,
    rainThreshold: 30,
    emailNotifications: false,
    emailAddress: "",
    enhancedLocation: true,
    enableAI: true
  });
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  // Unified Postal Code Tracker State
  const [postalCodeQuery, setPostalCodeQuery] = useState("");
  const [isPostalSearching, setIsPostalSearching] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [trackedPostal, setTrackedPostal] = useState<string>(() => {
    return localStorage.getItem("laundry_tracked_postal_code") || "";
  });

  const handlePostalCodeSubmit = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setIsPostalSearching(true);
    setPostalError(null);
    try {
      const results = await searchLocation(queryStr.trim());
      if (results && results.length > 0) {
        const topLoc = results[0];
        setCoords({ lat: topLoc.latitude, lon: topLoc.longitude });
        setLocationName(`${topLoc.name}, ${topLoc.country}`);
        setIsLiveLocation(false);
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
        setTrackedPostal(queryStr.trim().toUpperCase());
        localStorage.setItem("laundry_tracked_postal_code", queryStr.trim().toUpperCase());
        setPostalCodeQuery("");
        setPostalError(null);
      } else {
        setPostalError("No areas or postal codes found for this entry.");
      }
    } catch (e: any) {
      setPostalError(e.message || "Failed to search postal area");
    } finally {
      setIsPostalSearching(false);
    }
  };

  const [now, setNow] = useState(Date.now());
  const [unhandledError, setUnhandledError] = useState<string | null>(null);

  // Demo audio variables
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const demoAudioCtxRef = useRef<AudioContext | null>(null);
  const demoIntervalRef = useRef<any>(null);
  const demoCustomAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopDemoPlayback = useCallback(() => {
    setIsPlayingDemo(false);
    if (demoCustomAudioRef.current) {
      demoCustomAudioRef.current.pause();
      demoCustomAudioRef.current.currentTime = 0;
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  }, []);

  const startDemoPlayback = () => {
    if (alarmRingtone === "custom" && customFileAudioUrl) {
      demoCustomAudioRef.current = new Audio(customFileAudioUrl);
      demoCustomAudioRef.current.play().catch(e => console.warn("Demo blocked by sandbox:", e));
      setTimeout(stopDemoPlayback, 4000);
      return;
    }

    if (!demoAudioCtxRef.current) {
      demoAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = demoAudioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const playSnippet = () => {
      const now = ctx.currentTime;
      if (alarmRingtone === "siren") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.7);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.75);
      } else if (alarmRingtone === "beeps") {
        const playShortPip = (timeOffset: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(1750, now + timeOffset);
          gain.gain.setValueAtTime(0.15, now + timeOffset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.1);
          osc.start(now + timeOffset);
          osc.stop(now + timeOffset + 0.12);
        };
        playShortPip(0);
        playShortPip(0.15);
        playShortPip(0.3);
      } else if (alarmRingtone === "bell") {
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(f, now);
          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 1.3);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1250, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    };

    playSnippet();
    const intervalMs = alarmRingtone === "bell" ? 1500 : alarmRingtone === "siren" ? 900 : 800;
    demoIntervalRef.current = setInterval(playSnippet, intervalMs);

    setTimeout(stopDemoPlayback, 4000);
  };

  const handleToggleDemoPlay = () => {
    if (isPlayingDemo) {
      stopDemoPlayback();
    } else {
      setIsPlayingDemo(true);
      startDemoPlayback();
    }
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomFileAudioUrl(url);
      setAlarmRingtone("custom");
      localStorage.setItem("laundry_alarm_ringtone", "custom");
      
      setAiFeed(prev => [...prev, {
        speaker: 'ai',
        text: `🎵 Device alarm tone <b>${file.name}</b> loaded successfully! Standard ringtone is updated.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  useEffect(() => {
    const isBenignError = (errStr: string) => {
      const lower = errStr.toLowerCase();
      return (
        !lower ||
        lower.includes("property fetch") ||
        lower.includes("only a getter") ||
        lower.includes("resizeobserver") ||
        lower.includes("extension") ||
        lower.includes("chrome-extension") ||
        lower.includes("safari-extension") ||
        lower.includes("cross-origin")
      );
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const errorMsg = event.error?.message || "";
      const errorStr = String(event.error || "");
      
      if (isBenignError(msg) || isBenignError(errorMsg) || isBenignError(errorStr)) {
        console.warn("Ignored benign environment error:", msg, errorMsg, errorStr);
        return;
      }
      setUnhandledError(msg || errorMsg || "Unknown Error");
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonObj = event.reason;
      const reasonStr = String(reasonObj || "");
      const reasonMsg = reasonObj?.message || "";
      
      if (isBenignError(reasonStr) || isBenignError(reasonMsg)) {
        console.warn("Ignored benign environment rejection:", reasonStr, reasonMsg);
        return;
      }
      setUnhandledError(reasonStr || reasonMsg || "Unhandled Promise Rejection");
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Update 'now' every minute for relative time labels
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const theme = getTheme(weather);

  // Synchronize document.documentElement and body styles for bulletproof dark-theme utility resolution
  useEffect(() => {
    if (theme.isDark) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0b1329'; // High-contrast deep slate navy background
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // Elegant clean slate slate-50 background
    }
  }, [theme.isDark]);

  // Initialize from localStorage
  useEffect(() => {
    const savedState = safeLocalStorage.getItem('laundry_guard_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setIsDrying(parsed.drying || false);
        setStartTime(parsed.start || null);
        setCustomMinutesOffset(parsed.customMinutesOffset || 0);
        setCustomTimerDuration(parsed.customTimerDuration !== undefined ? parsed.customTimerDuration : null);
        setPendingTimerDuration(parsed.pendingTimerDuration !== undefined ? parsed.pendingTimerDuration : null);
        if (parsed.lastLat && parsed.lastLon) {
          setCoords({ lat: parsed.lastLat, lon: parsed.lastLon });
          setLocationName(parsed.lastName || "Saved Location");
          setIsLocating(false);
        }
        if (parsed.settings) {
          setAppSettings({ enableAI: true, ...parsed.settings });
          if (parsed.settings.voiceEnabled !== undefined) setVoiceEnabled(parsed.settings.voiceEnabled);
          if (parsed.settings.voiceGender) setVoiceGender(parsed.settings.voiceGender);
          if (parsed.settings.voiceRate !== undefined) setVoiceRate(parsed.settings.voiceRate);
        }
      } catch (e) {
        console.error("Failed to parse saved state");
      }
    }
  }, []);

  // Save state
  useEffect(() => {
    if (coords) {
      safeLocalStorage.setItem('laundry_guard_state', JSON.stringify({
        drying: isDrying,
        start: startTime,
        customMinutesOffset,
        customTimerDuration,
        pendingTimerDuration,
        lastLat: coords.lat,
        lastLon: coords.lon,
        lastName: locationName,
        settings: appSettings
      }));
    }
  }, [isDrying, startTime, customMinutesOffset, customTimerDuration, pendingTimerDuration, coords, locationName, appSettings]);

  const getLocation = useCallback(() => {
    // Clear custom tracked postal code when switching back to physical GPS location
    setTrackedPostal("");
    localStorage.removeItem("laundry_tracked_postal_code");

    // Clear previous watch if exists
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setIsLocating(true);
    setError(null);

    // Dynamic 4-second fallback watch in case browser prompt is ignored or iframe permission blocks it
    const fallbackTimeout = setTimeout(() => {
      setCoords(curr => {
        if (!curr) {
          console.warn("Geolocation watch took too long; cascading gracefully to default location (London).");
          setLocationName("London");
          setIsLocating(false);
          setIsLiveLocation(false);
          setError(null);
          return { lat: 51.5074, lon: -0.1278 };
        }
        return curr;
      });
    }, 4000);
    
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported. Falling back to London.");
      clearTimeout(fallbackTimeout);
      setCoords({ lat: 51.5074, lon: -0.1278 });
      setLocationName("London");
      setIsLocating(false);
      return;
    }

    const options = {
      timeout: 8000,
      enableHighAccuracy: appSettings.enhancedLocation,
      maximumAge: 0
    };

    const onSuccess = (pos: GeolocationPosition) => {
      clearTimeout(fallbackTimeout);
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setLocationName("Live Location");
      setIsLiveLocation(true);
      setIsLocating(false);
      setError(null);
    };

    const onError = (err: GeolocationPositionError) => {
      clearTimeout(fallbackTimeout);
      console.warn(`Geolocation error (${err.code}): ${err.message}. Gracefully cascading to London fallback.`);
      setIsLiveLocation(false);
      
      // Automatic fallback to keep dashboard loaded and beautiful
      setCoords({ lat: 51.5074, lon: -0.1278 });
      setLocationName("London");
      setIsLocating(false);
      setError(null);
    };

    watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, options);
  }, [appSettings.enhancedLocation]);

  const handleRefresh = async () => {
    if (!coords) {
      getLocation();
      return;
    }
    await updateWeatherAndDryness(true);
  };

  // Cleanup watcher on unmount or when settings change
  useEffect(() => {
    if (coords && isLiveLocation) {
      getLocation();
    }
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [appSettings.enhancedLocation, isLiveLocation]); // coords not needed if isLiveLocation covers intent

  useEffect(() => {
    if (!coords) {
      getLocation();
    }
  }, [getLocation, coords]);

  const lastUpdateRef = useRef<{ lat: number; lon: number; time: number } | null>(null);

  const updateWeatherAndDryness = useCallback(async (force = false) => {
    if (!coords) return;
    
    const now = Date.now();
    if (!force && lastUpdateRef.current) {
      const dLat = Math.abs(lastUpdateRef.current.lat - coords.lat);
      const dLon = Math.abs(lastUpdateRef.current.lon - coords.lon);
      const timeDiff = now - lastUpdateRef.current.time;
      if (dLat < 0.005 && dLon < 0.005 && timeDiff < 5 * 60 * 1000) {
        return;
      }
    }

    setIsFetchingWeather(true);
    try {
      const data = await getWeather(coords.lat, coords.lon);
      setWeather(data);
      
      const dryData = await getDrynessEstimate({
        temp: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        cloudCover: data.current.cloud_cover,
        hourlyProbs: data.hourly.precipitation_probability,
        hourlyPrecip: data.hourly.precipitation
      }, !appSettings.enableAI);
      setDryness(dryData);

      try {
        const scheduleData = await getLaundrySchedule({
          hourlyProbs: data.hourly.precipitation_probability,
          hourlyTemps: data.hourly.temperature_2m,
          currentTemp: data.current.temperature_2m
        }, !appSettings.enableAI);
        setSchedule(scheduleData);
      } catch (err) {
        console.warn("Schedule failing");
      }

      lastUpdateRef.current = { lat: coords.lat, lon: coords.lon, time: now };
      setLastUpdated(now);
      setError(null);
    } catch (err: any) {
      console.error("Weather fetch failed:", err);
      // We use a functional state update to access previous error state 
      // but we need to know if we have weather data. We'll check the ref.
      setError(lastUpdateRef.current ? null : (err?.message || "Service issue."));
    } finally {
      setIsFetchingWeather(false);
    }
  }, [coords, appSettings.enableAI]); // weather REMOVED from dependency array to break loop

  useEffect(() => {
    if (coords) {
      updateWeatherAndDryness();
      const interval = setInterval(() => updateWeatherAndDryness(true), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [coords, updateWeatherAndDryness]);

  // Handle Search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchLocation(searchQuery);
        setSearchResults(results);
      } catch (e: any) {
        console.error(e);
        setSearchError(e.message || "Search failed");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleSelectLocation = (loc: LocationResult) => {
    setCoords({ lat: loc.latitude, lon: loc.longitude });
    setLocationName(`${loc.name}, ${loc.country}`);
    setIsLiveLocation(false);
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    // Check if the location looks like a tracked zip or postal code
    const isPostalString = loc.name.includes('[') || loc.name.match(/\d+/) || searchQuery.match(/\d+/);
    if (isPostalString) {
      const pCode = loc.name.split('[')[0].trim();
      setTrackedPostal(pCode);
      localStorage.setItem("laundry_tracked_postal_code", pCode);
    } else {
      setTrackedPostal("");
      localStorage.removeItem("laundry_tracked_postal_code");
    }

    setShowSearch(false);
    setSearchQuery("");
    setSearchError(null);
    setError(null);
  };

  const toggleDrying = () => {
    if (!isDrying) {
      setIsDrying(true);
      setStartTime(Date.now());
      setCustomMinutesOffset(0);
      setCustomTimerDuration(null);
      setPendingTimerDuration(null);
      setAlarmMuted(false);
      setIsDryingComplete(false);
      setCompleteAlarmActive(false);
    } else {
      setIsDrying(false);
      setStartTime(null);
      setCustomMinutesOffset(0);
      setCustomTimerDuration(null);
      setPendingTimerDuration(null);
      setAlarmMuted(false);
      setIsDryingComplete(false);
      setCompleteAlarmActive(false);
    }
  };

  // 1-second reactive ticker for the countdown UI
  useEffect(() => {
    let tickerInterval: any = null;
    if (isDrying) {
      tickerInterval = setInterval(() => {
        setNowTicker(Date.now());
      }, 1000);
    } else {
      setNowTicker(Date.now());
    }
    return () => {
      if (tickerInterval) clearInterval(tickerInterval);
    };
  }, [isDrying]);

  // Sync email logs utility
  const syncEmailLogs = useCallback(async () => {
    const logs = await fetchEmailLogs();
    setEmailLogsList(logs);
  }, []);

  // Fetch email logs on mount and when settings open
  useEffect(() => {
    syncEmailLogs();
  }, [showSettings, syncEmailLogs]);

  const hasSentRainAlertEmail = useRef(false);

  // Reset sent flag when user starts drying laundry
  useEffect(() => {
    if (isDrying) {
      hasSentRainAlertEmail.current = false;
    }
  }, [isDrying]);

  // Rain danger email dispatcher & Vocalizer Warning
  useEffect(() => {
    const isDangerousRain = getRainAlert()?.level === 'danger';
    if (isDrying && isDangerousRain && !hasSentRainAlertEmail.current) {
      hasSentRainAlertEmail.current = true;

      // Vocal Warning Announcement
      playWithCustomVoice("⚠️ Urgent Warning! Rain detected in your drying zone. Please collect your laundry immediately!");

      // Trigger email alert
      if (appSettings.emailNotifications && appSettings.emailAddress) {
        const alertMsg = getRainAlert()?.message || "Rain detected!";
        sendEmailNotification({
          to: appSettings.emailAddress,
          subject: "⚠️ [Laundry Guard] URGENT Rain Alert!",
          htmlBody: `
            <div style="font-family: sans-serif; padding: 24px; border: 2px solid #ef4444; border-radius: 16px; max-width: 500px; background-color: #fef2f2; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);">
              <h2 style="color: #ef4444; margin-top: 0; font-size: 20px; display: flex; align-items: center; gap: 8px;">🌧️ URGENT: Collect Clothes Immediately!</h2>
              <p style="font-size: 14px; color: #1e293b; line-height: 1.5;">Our atmospheric sensor has detected immediate weather hazards in your drying location.</p>
              <div style="background-color: #ffffff; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #fee2e2;">
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                  <li style="margin-bottom: 6px;"><strong>Warning Status:</strong> ${alertMsg}</li>
                  <li style="margin-bottom: 6px;"><strong>Region Name:</strong> ${locationName || 'Your Geo-Location'}</li>
                  <li style="margin-bottom: 6px;"><strong>Real-time intensity:</strong> ${weather?.current?.precipitation || 0} mm/h</li>
                  <li><strong>Guidance:</strong> Bring clothes indoors to avoid getting wet.</li>
                </ul>
              </div>
              <p style="color: #64748b; font-size: 11px; margin-top: 20px; border-top: 1px solid #fee2e2; padding-top: 12px;">You are receiving this safe automation dispatch because you enabled live rainfall notifications on Laundry Guard.</p>
            </div>
          `,
          textBody: `⚠️ URGENT Laundry Guard Rain Alert! Rain has started at ${locationName || 'your location'} (${alertMsg}). Collect your clothes immediately!`
        }).then((res) => {
          console.log("Rain threat email notification dispatched:", res);
          syncEmailLogs();
        });
      }
    }
  }, [isDrying, weather, appSettings, locationName, syncEmailLogs, playWithCustomVoice]);

  // Automated timer finish checker (Drying Complete Alarm and Email Dispatcher)
  useEffect(() => {
    if (!isDrying || !startTime) return;
    
    const checkFinish = () => {
      let baseMinutes = customTimerDuration !== null ? customTimerDuration : (dryness?.estimatedMinutes || 180);
      
      // Dynamic fabric coefficients multiplier
      if (fabricType === 'delicate') {
        baseMinutes = Math.round(baseMinutes * 0.7);
      } else if (fabricType === 'heavy') {
        baseMinutes = Math.round(baseMinutes * 1.4);
      }

      const totalMinutes = baseMinutes + customMinutesOffset;
      const totalSecondsRequired = totalMinutes * 60;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const secondsRemaining = Math.max(0, totalSecondsRequired - elapsedSeconds);
      
      if (secondsRemaining <= 0) {
        // Timer has ended!
        setIsDrying(false);
        setStartTime(null);
        setCustomTimerDuration(null);
        setPendingTimerDuration(null);
        setIsDryingComplete(true);
        setCompleteAlarmActive(true);
        setAlarmMuted(false); // Make sure alarm rings

        // Vocal alert trigger on finish
        playWithCustomVoice("🧺 Attention! Drying cycle completed. Your clothes are fully dry and fresh. Please collect them!");
        
        // Notify voice assistant feed
        setAiFeed(prev => [...prev, {
          speaker: 'ai',
          text: "🎉 <b>Drying Complete!</b> Your laundry is perfectly dried. Alarm is ringing!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // Trigger email notification if enabled
        if (appSettings.emailNotifications && appSettings.emailAddress) {
          sendEmailNotification({
            to: appSettings.emailAddress,
            subject: "🧺 [Laundry Guard] Drying Complete Alert!",
            htmlBody: `
              <div style="font-family: sans-serif; padding: 24px; border: 2px solid #10b981; border-radius: 16px; max-width: 500px; background-color: #f0fdf4; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);">
                <h2 style="color: #10b981; margin-top: 0; font-size: 20px;">🧺 Custom Timer Finished!</h2>
                <p style="font-size: 14px; color: #1e293b; line-height: 1.5;">Your outdoor clothes drying monitor has successfully ended its calculated evaporation cycle.</p>
                <div style="background-color: #ffffff; padding: 14px; border-radius: 8px; margin: 16px 0; border: 1px solid #dcfce7;">
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                    <li style="margin-bottom: 6px;"><strong>Setup duration:</strong> ${totalMinutes} minutes</li>
                    <li style="margin-bottom: 6px;"><strong>Fabric Type:</strong> ${fabricType.toUpperCase()}</li>
                    <li style="margin-bottom: 6px;"><strong>Location name:</strong> ${locationName || 'Your Geo-Location'}</li>
                    <li><strong>Status code:</strong> Completed successfully</li>
                  </ul>
                </div>
                <p style="color: #64748b; font-size: 11px; margin-top: 20px; border-top: 1px solid #dcfce7; padding-top: 12px;">You are receiving this because you enabled email notifications on Laundry Guard.</p>
              </div>
            `,
            textBody: `🧺 Laundry Guard Alert: Your outdoor laundry timer of ${totalMinutes}m (${fabricType}) has finished drying successfully at ${locationName || 'your location'}!`
          }).then((res) => {
            console.log("Drying complete email sent:", res);
            syncEmailLogs();
          });
        }
      }
    };

    const timerId = setInterval(checkFinish, 1000);
    return () => clearInterval(timerId);
  }, [isDrying, startTime, customTimerDuration, customMinutesOffset, dryness, appSettings, locationName, fabricType, syncEmailLogs, playWithCustomVoice]);

  // Web Audio chime model with selected Alarm Ringtone and device file player
  useEffect(() => {
    const isDangerousRain = getRainAlert()?.level === 'danger';
    const isRainAlertTriggered = isDrying && isDangerousRain;
    const isCompleteAlertTriggered = completeAlarmActive;

    const startSoundEngine = () => {
      // If custom uploaded audio
      if (alarmRingtone === "custom" && customFileAudioUrl) {
        if (!customAudioRef.current) {
          customAudioRef.current = new Audio(customFileAudioUrl);
          customAudioRef.current.loop = true;
        }
        customAudioRef.current.play().catch(e => console.warn("Audio blocked by browser sandbox:", e));
        return;
      }

      // Initialize sound context
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const playSynthBeep = () => {
        const now = ctx.currentTime;
        
        if (alarmRingtone === "siren") {
          // Cyber Siren: sweep frequencies
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);
          osc.frequency.exponentialRampToValueAtTime(450, now + 0.7);
          
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.setValueAtTime(0.15, now + 0.6);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
          
          osc.start(now);
          osc.stop(now + 0.75);
        } else if (alarmRingtone === "beeps") {
          // Echo Beeps: fast high pitch pulses
          const playShortPip = (timeOffset: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(isRainAlertTriggered ? 2300 : 1700, now + timeOffset);
            gain.gain.setValueAtTime(0.2, now + timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.1);
            
            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.12);
          };
          
          playShortPip(0);
          playShortPip(0.15);
          playShortPip(0.3);
        } else if (alarmRingtone === "bell") {
          // Traditional resonant bell chime
          const freqs = isRainAlertTriggered ? [440, 554, 659, 880] : [523.25, 659.25, 783.99, 1046.5];
          const gainNode = ctx.createGain();
          gainNode.connect(ctx.destination);
          gainNode.gain.setValueAtTime(0.25, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

          freqs.forEach(f => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, now);
            osc.connect(gainNode);
            osc.start(now);
            osc.stop(now + 1.3);
          });
        } else {
          // Standard Chime: Clean resonant beep
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(isRainAlertTriggered ? 950 : 1250, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          
          osc.start(now);
          osc.stop(now + 0.55);
        }
      };

      playSynthBeep();
      const intervalMs = alarmRingtone === "bell" ? 1500 : alarmRingtone === "siren" ? 900 : 800;
      alarmIntervalRef.current = setInterval(playSynthBeep, intervalMs);
    };

    const stopSoundEngine = () => {
      if (customAudioRef.current) {
        customAudioRef.current.pause();
        customAudioRef.current.currentTime = 0;
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };

    if ((isRainAlertTriggered || isCompleteAlertTriggered) && !alarmMuted) {
      setAlarmActive(true);
      if (!alarmIntervalRef.current) {
        try {
          startSoundEngine();
        } catch (e) {
          console.warn("Error starting sound generator:", e);
        }
      }
    } else {
      setAlarmActive(false);
      stopSoundEngine();
    }

    return () => {
      stopSoundEngine();
    };
  }, [isDrying, weather, alarmMuted, completeAlarmActive, alarmRingtone, customFileAudioUrl]);

  // Task 4: Auto-refresh weather (precip + hourly) every 5 minutes automatically
  useEffect(() => {
    let refreshInterval: any = null;
    
    refreshInterval = setInterval(() => {
      if (coords) {
        console.log("[Auto-Refresh] Automatically refreshing live weather and precipitation data...");
        updateWeatherAndDryness(true);
      }
    }, 5 * 60 * 1000); // 5 minutes (300,000 ms)

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [coords, updateWeatherAndDryness]);

  // AI voice processing caller
  const runVoiceCommandInput = (text: string) => {
    if (!text.trim()) return;
    setAiProcessing(true);
    setAiFeed(prev => [...prev, { speaker: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    
    // Adjust base calculation factor based on selected fabric type 
    let base = dryness?.estimatedMinutes || 180;
    if (fabricType === 'delicate') base = Math.round(base * 0.7);
    else if (fabricType === 'heavy') base = Math.round(base * 1.4);
    
    const baseMinutes = customTimerDuration !== null ? customTimerDuration : base;
    const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const timeLeft = Math.max(0, baseMinutes + customMinutesOffset - Math.floor(elapsedSeconds / 60));
    const hasRainAlarm = getRainAlert()?.level === 'danger';

    // Pack hourly arrays to pass forecast data for exact weather checks
    const hourlyPrecip = weather?.hourly?.precipitation || [];
    const hourlyProbs = weather?.hourly?.precipitation_probability || [];

    sendVoiceCommand({
      command: text,
      temp: weather?.current?.temperature_2m ?? 20,
      humidity: weather?.current?.relative_humidity_2m ?? 50,
      windSpeed: weather?.current?.wind_speed_10m ?? 0,
      isDrying,
      timeLeftMinutes: timeLeft,
      hasRainAlert: hasRainAlarm,
      hourlyPrecip,
      hourlyProbs,
      rainThreshold: appSettings.rainThreshold,
      pendingTimerDuration: pendingTimerDuration
    }).then((res) => {
      setAiProcessing(false);
      setAiFeed(prev => [...prev, { speaker: 'ai', text: res.responseSpeech, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      
      if (res.action === 'START_DRYING') {
        setIsDrying(true);
        setStartTime(Date.now());
        setCustomMinutesOffset(0);
        setAlarmMuted(false);
        setPendingTimerDuration(null);
        if (typeof res.customDuration === 'number') {
          setCustomTimerDuration(res.customDuration);
        } else {
          setCustomTimerDuration(null);
        }
      } else if (res.action === 'PROMPT_CONFIRMATION') {
        setPendingTimerDuration(typeof res.customDuration === 'number' ? res.customDuration : 120);
      } else if (res.action === 'CANCEL_CONFIRMATION') {
        setPendingTimerDuration(null);
        setCustomTimerDuration(null);
      } else if (res.action === 'STOP_DRYING') {
        setIsDrying(false);
        setStartTime(null);
        setCustomMinutesOffset(0);
        setCustomTimerDuration(null);
        setPendingTimerDuration(null);
      } else if (res.action === 'MUTE_ALARM') {
        setAlarmMuted(true);
        setAlarmActive(false);
      } else if (res.action === 'ADJUST_TIMER') {
        setCustomMinutesOffset(prev => prev + res.adjustMinutes);
      }
      
      playWithCustomVoice(res.responseSpeech);
    }).catch((apiErr) => {
      setAiProcessing(false);
      console.error(apiErr);
    });
  };

  const startListeningResult = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use the text command bar in the card.");
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setAiListening(true);
      };
      recognition.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setAiListening(false);
      };
      recognition.onend = () => {
        setAiListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          runVoiceCommandInput(transcript);
        }
      };
      
      recognition.start();
    } catch (e) {
      console.error(e);
      setAiListening(false);
    }
  };

  const getRainAlert = () => {
    if (!weather?.hourly || !weather?.current) return null;
    const probs = weather.hourly.precipitation_probability || [];
    const nextHourProb = probs.length > 0 ? probs[0] : 0;
    const isRainingNow = (weather.current.precipitation || 0) > 0;
    
    // Check minutely data for immediate rain (next 60 mins)
    const minutelyRain = weather.minutely_15?.precipitation || [];
    const incomingRain = minutelyRain.slice(0, 4).some(p => p > 0.1);
    
    if (isRainingNow) return { level: 'danger', message: 'It is raining now!' };
    if (incomingRain) return { level: 'danger', message: 'Immediate rain detected in 15-45 mins!' };
    if (nextHourProb >= appSettings.rainThreshold) return { level: 'warning', message: `Rain expected soon (${nextHourProb}%)` };
    return null;
  };

  const LiveRainMonitor = () => {
    if (!weather?.minutely_15) return null;
    const data = weather.minutely_15.precipitation.slice(0, 8); // Next 2 hours
    const maxVal = Math.max(...data, 0.5);
    const rainStarted = data.findIndex(v => v > 0.1);
    const rainInfo = rainStarted === -1 
      ? "Clear skies for the next 2 hours." 
      : rainStarted === 0 
        ? "Active rain detected now." 
        : `Rain expected in roughly ${rainStarted * 15} minutes.`;

    const intensity = Math.max(...data);
    const intensityText = intensity > 2.5 ? "Heavy" : intensity > 0.5 ? "Moderate" : intensity > 0 ? "Light" : "None";
    
    return (
      <section className={`${theme.card} p-5 rounded-3xl border ${theme.isDark ? 'border-slate-700/60' : 'border-slate-100'} shadow-sm`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 opacity-50 uppercase tracking-widest text-[10px] font-bold text-slate-500">
             <CloudRain className={`w-3 h-3 ${theme.isDark ? 'text-indigo-400' : 'text-blue-500'}`} /> High-Res Rain Monitor
          </div>
          <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">LIVE DATA</div>
        </div>
        
        <div className="flex items-end justify-between h-24 gap-1 px-1">
          {data.map((val, i) => {
            const fillHeight = val > 0 ? Math.max(10, (val / maxVal) * 100) : 0;
            const fillBg = val > 2.5 
              ? 'bg-blue-600 dark:bg-blue-500' 
              : val > 0.5 
                ? 'bg-sky-400' 
                : val > 0 
                  ? 'bg-sky-300 dark:bg-sky-400/60' 
                  : 'bg-transparent';
            
            return (
              <div key={i} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                <div className="w-2.5 h-16 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-full relative flex flex-col justify-end overflow-hidden">
                  <div 
                    className={`w-full rounded-full transition-all duration-500 ${fillBg}`}
                    style={{ height: `${fillHeight}%` }}
                  />
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded pointer-events-none z-10 font-bold">
                  {val === 0 ? 'Dry' : `${val}mm/h`}
                </div>
                <span className={`text-[8px] font-bold mt-2 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  +{i * 15}m
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-2xl ${theme.isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-400 mb-1">Peak Intensity</div>
            <div className={`text-xs font-bold ${intensityText === 'Heavy' ? 'text-rose-500' : 'text-blue-500'}`}>{intensityText}</div>
          </div>
          <div className={`p-3 rounded-2xl ${theme.isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status</div>
            <div className={`text-xs font-bold ${theme.header}`}>{rainInfo.split('.')[0]}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/60 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500 italic max-w-[100%] leading-tight">
            {rainInfo}
          </span>
        </div>
      </section>
    );
  };

  const weatherAlert = getRainAlert();
  const isInitialLoading = (isLocating && !coords);

  const errorContent = (
    <section className="bg-white border border-rose-100 p-8 rounded-3xl text-center shadow-sm">
       <CloudRain className="w-12 h-12 text-rose-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Service Issue</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {error || "We encountered an unexpected problem fetching updates."}
        </p>
        <button 
          onClick={() => { 
            setError(null); 
            if (!coords) {
              getLocation();
            } else {
              updateWeatherAndDryness();
            }
          }}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
        >
          <Loader2 className={`w-4 h-4 ${(isFetchingWeather || isLocating) ? 'animate-spin' : 'hidden'}`} />
          Retry Connection
        </button>
        <button 
          onClick={() => setShowSearch(true)}
          className="w-full py-3 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
        >
          Search Another City
        </button>
    </section>
  );

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Sun className="w-16 h-16 text-yellow-500 fill-yellow-500" />
        </motion.div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mt-4">LaundryGuard</h1>
        <p className="text-slate-500 font-medium">Scanning the skies...</p>
        <button onClick={() => setShowSearch(true)} className="mt-8 text-blue-600 font-bold underline flex items-center gap-2">
          <Search className="w-4 h-4" /> Search Manually
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen ${theme.bg} ${theme.isDark ? 'dark' : ''} relative pb-28 transition-colors duration-1000 overflow-x-hidden`}>
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-start">
        <div className="flex-1">
          <h1 className={`text-3xl font-display font-bold ${theme.header} leading-tight`}>
            LaundryGuard
          </h1>
          <button 
            onClick={() => setShowSearch(true)}
            className={`flex items-center gap-1.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'} font-medium hover:text-blue-600 transition-colors text-left`}
          >
            <MapPin className={`w-4 h-4 ${theme.isDark ? 'text-indigo-400' : 'text-blue-500'}`} />
            <span className="text-sm truncate max-w-[200px]">{locationName}</span>
            {isLiveLocation && <span className={`flex h-1.5 w-1.5 translate-y-[-4px] rounded-full ${theme.dot} animate-pulse ml-1`} title="Live GPS Tracking Active" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh} 
            disabled={isFetchingWeather}
            className={`p-2.5 ${theme.card} rounded-xl shadow-sm ${theme.isDark ? 'text-slate-300' : 'text-slate-600'} border border-slate-50 hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-95`}
            title="Refresh Forecast"
            id="refresh-weather-btn"
          >
            <RefreshCw className={`w-5 h-5 ${isFetchingWeather ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button 
            onClick={() => setShowSearch(true)} 
            className={`p-2.5 ${theme.card} rounded-xl shadow-sm ${theme.isDark ? 'text-slate-300' : 'text-slate-600'} border border-slate-50 hover:bg-slate-50 transition-colors active:scale-95`}
            id="search-header-btn"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)} 
            className={`p-2.5 ${theme.card} rounded-xl shadow-sm ${theme.isDark ? 'text-slate-300' : 'text-slate-600'} border border-slate-50 hover:bg-slate-50 transition-colors active:scale-95`}
            id="settings-header-btn"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* Drying Complete Interactive Alarm Alert Panel */}
        {completeAlarmActive && (
          <div className="p-4 bg-emerald-500 text-white dark:bg-emerald-950/45 border border-emerald-400 dark:border-emerald-800 rounded-3xl flex items-center justify-between gap-3 animate-bounce shadow-lg shadow-emerald-100 dark:shadow-none">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-white dark:text-emerald-400 animate-pulse" />
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-white">Drying Completed!</div>
                <p className="text-[10px] opacity-95 leading-tight">Your clothes are dry. Ringtone alarm active!</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAlarmMuted(true);
                setCompleteAlarmActive(false);
                setIsDryingComplete(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm shrink-0"
            >
              <VolumeX className="w-3.5 h-3.5" />
              Stop Alarm
            </button>
          </div>
        )}

        {/* Postal Code Area Tracker Card */}
        <div className={`p-4 rounded-3xl border shadow-sm transition-all duration-300 ${
          theme.isDark 
            ? 'bg-slate-900/60 border-slate-700/60 shadow-slate-950/20 text-slate-100' 
            : 'bg-white border-slate-100 shadow-slate-100/50 text-slate-800'
        }`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.isDark ? 'text-indigo-400' : 'text-blue-600'} flex items-center gap-1.5`}>
              <Search className="w-3.5 h-3.5" /> Specific Area & Postal Code Tracker
            </span>
            {trackedPostal ? (
              <span 
                className="text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer bg-amber-500/10 text-amber-600 dark:text-amber-400"
                onClick={getLocation} 
                title="Click to clear and track via GPS"
              >
                Tracking: {trackedPostal} <span className="text-[11px] font-normal leading-none">×</span>
              </span>
            ) : (
              <span className={`text-[9px] font-medium ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Filter by specific zip/postal code
              </span>
            )}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handlePostalCodeSubmit(postalCodeQuery);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter postal code (e.g. 90210, SW1A)..."
                value={postalCodeQuery}
                onChange={(e) => setPostalCodeQuery(e.target.value)}
                className={`w-full py-2 pl-3 pr-8 rounded-xl text-xs font-semibold outline-none border transition-all ${
                  theme.isDark 
                    ? 'bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500/80' 
                    : 'bg-slate-50 border-slate-150 text-slate-800 placeholder-slate-400 focus:border-blue-500/80 focus:bg-white'
                }`}
              />
              {postalCodeQuery && (
                <button
                  type="button"
                  onClick={() => setPostalCodeQuery("")}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold leading-none ${
                    theme.isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isPostalSearching || !postalCodeQuery.trim()}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40 select-none ${
                theme.isDark 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95' 
                  : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
              }`}
            >
              {isPostalSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set'}
            </button>
          </form>

          {postalError && (
            <div className="mt-2 text-[10px] text-rose-500 font-semibold flex items-center gap-1">
              <span>⚠️</span> {postalError}
            </div>
          )}
        </div>

        {/* Connection Failure or No Data */}
        {error && !weather && errorContent}

        {/* Animated Climate Companion Hero Screen */}
        {weather && (() => {
          const code = weather.current.weather_code;
          const isDay = weather.current.is_day === 1;
          const isRaining = code >= 51 && code <= 69 || code >= 80 && code <= 82 || code >= 95;
          const isOvercast = code === 2 || code === 3 || code === 45 || code === 48;
          const isClear = code <= 1 || (!isRaining && !isOvercast); // Default fallback to clear
          const currentWind = weather.current.wind_speed_10m ?? 0;

          // Solar UV calculations based on cloud cover percentage
          const cloudPercent = weather.current.cloud_cover ?? 0;
          let uvIndex = "Moderate (III)";
          if (cloudPercent < 20) uvIndex = "Extreme (IX+)";
          else if (cloudPercent < 50) uvIndex = "High (VI)";
          else if (cloudPercent > 80) uvIndex = "Fragile (I)";

          // Evaporation performance metric
          const hum = weather.current.relative_humidity_2m ?? 50;
          let evapPerf = "Optimum Dry Speed (26%/hr)";
          if (hum > 75) evapPerf = "Stagnant Damp (8%/hr)";
          else if (hum > 55) evapPerf = "Moderate Evap (14%/hr)";

          // Define beautiful dynamic weather parameters
          let heroBg = '';
          let skyBg = '';
          let textTitle = '';
          let textDesc = '';
          let textTempLabel = '';
          let textTempDegree = '';
          let badgeClass = '';
          let overlayAura = '';
          let borderSlate = '';
          let simulatorText = 'text-slate-400 border-slate-500/5 bg-slate-500/5';
          let meteringBg = '';
          let cardSub = '';
          let cardSubText = '';

          if (!isDay) {
            // NIGHT (Universal Cozy Midnight Theme)
            heroBg = 'bg-slate-900 border-slate-800 shadow-indigo-950/20 text-slate-100';
            skyBg = 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950';
            borderSlate = 'border-slate-800/85';
            textTitle = 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]';
            textDesc = 'text-indigo-200/90';
            textTempLabel = 'text-slate-400';
            textTempDegree = 'text-indigo-400';
            badgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 backdrop-blur-sm';
            overlayAura = 'from-violet-600/15 via-slate-955/0 to-indigo-500/15';
            simulatorText = 'text-indigo-300 border-indigo-805 bg-slate-900/60';
            meteringBg = 'bg-slate-900/60';
            cardSub = 'bg-slate-950/40 border-slate-800/80';
            cardSubText = 'text-slate-200';
          } else if (isRaining) {
            // RAINING Storm / Monsoon / Heavy Clouds
            heroBg = 'bg-slate-900 border-slate-800 shadow-blue-950/25 text-slate-100';
            skyBg = 'bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950';
            borderSlate = 'border-slate-800/85';
            textTitle = 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]';
            textDesc = 'text-slate-300';
            textTempLabel = 'text-slate-400';
            textTempDegree = 'text-sky-400 font-extrabold';
            badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/35 backdrop-blur-sm';
            overlayAura = 'from-blue-600/10 via-slate-900/0 to-cyan-500/15';
            simulatorText = 'text-sky-300 border-slate-800 bg-slate-900/40';
            meteringBg = 'bg-slate-900/60';
            cardSub = 'bg-slate-950/40 border-slate-800/80';
            cardSubText = 'text-slate-200';
          } else if (isOvercast) {
            // LIGHT CLOUDFALL / OVERCAST (Elegant clean grayish-blue theme)
            heroBg = 'bg-white border-slate-200 shadow-slate-100 text-slate-800';
            skyBg = 'bg-gradient-to-br from-slate-150 via-sky-50 to-slate-250';
            borderSlate = 'border-slate-200/60';
            textTitle = 'text-slate-800 font-bold';
            textDesc = 'text-slate-500';
            textTempLabel = 'text-slate-400';
            textTempDegree = 'text-slate-700';
            badgeClass = 'bg-slate-500/10 text-slate-600 border-slate-550/15 backdrop-blur-sm';
            overlayAura = 'from-sky-400/5 via-slate-100/0 to-slate-200/10';
            simulatorText = 'text-slate-500 border-slate-200 bg-slate-100/40';
            meteringBg = 'bg-slate-50/50';
            cardSub = 'bg-white border-slate-100/80 shadow-sm';
            cardSubText = 'text-slate-800';
          } else {
            // SUNNY / CLEAR GOLD (Vivid amber gold-orange sunburst)
            heroBg = 'bg-white border-slate-100 shadow-slate-105/50 text-slate-805';
            skyBg = 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500';
            borderSlate = 'border-amber-400/20';
            textTitle = 'text-white font-extrabold drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)]';
            textDesc = 'text-amber-50/90 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]';
            textTempLabel = 'text-amber-100/80';
            textTempDegree = 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.1)]';
            badgeClass = 'bg-white/20 text-white border-white/35 backdrop-blur-md';
            overlayAura = 'from-amber-200/25 via-amber-300/10 to-yellow-300/15';
            simulatorText = 'text-amber-100 border-white/20 bg-white/10';
            meteringBg = 'bg-slate-50/50';
            cardSub = 'bg-white border-slate-100/80 shadow-sm';
            cardSubText = 'text-slate-800';
          }

          return (
            <motion.section 
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 90, damping: 15 }}
              whileHover={{ y: -3 }}
              className={`rounded-3xl overflow-hidden relative shadow-xl border transition-all duration-500 flex flex-col ${heroBg}`}
            >
              
              {/* Dynamic Weather Sky Layer Animation */}
              <div className={`p-6 relative overflow-hidden flex flex-col justify-between min-h-[295px] border-b ${borderSlate} ${skyBg}`}>
                {/* Immersive Shifting Atmospheric Aura backdrop */}
                <motion.div
                  animate={{
                    scale: [1, 1.15, 0.9, 1],
                    x: [0, 15, -15, 0],
                    y: [0, -10, 15, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 15,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 opacity-40 blur-3xl pointer-events-none bg-gradient-to-tr"
                  style={{ backgroundImage: `linear-gradient(to top right, ${overlayAura})` }}
                />
                
                {/* Weather Particle Backdrop Overlays */}
                {isRaining && <RainFallAnimation />}
                {isClear && <SunnySparkleAnimation />}
                {isOvercast && <CloudOvercastAnimation />}

                {/* Sky header controls */}
                <div className="flex justify-between items-start relative z-10 w-full mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 ${badgeClass}`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                    </span>
                    {getWeatherStatus(code)}
                  </span>

                  <span className={`text-[9px] font-mono tracking-wider font-bold uppercase px-2 py-0.5 rounded-md border ${simulatorText}`}>
                    Live Simulator
                  </span>
                </div>

                {/* Animated Clothesline Sway Graphics Module */}
                <ClotheslineSway windSpeed={currentWind} isDancing={isDrying} />

                {/* Drying core conditions info */}
                <div className="relative z-10 space-y-1.5 mt-2">
                  <div className="flex justify-between items-end">
                    <div className="flex-1 min-w-0 pr-3">
                      <h2 className={`text-3xl font-display font-bold tracking-tight mb-0.5 ${textTitle}`}>
                        {weatherAlert?.level === 'danger' ? 'Rain Imminent!' : weatherAlert?.level === 'warning' ? 'Hazards Predicted' : dryness?.statusText || 'Perfect Drying'}
                      </h2>
                      <p className={`text-[11px] font-medium leading-normal line-clamp-2 ${textDesc}`}>
                        {weatherAlert?.message || "Atmosphere looks secure. Optimal window to clean and hang clothes."}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-3xl font-display font-extrabold ${textTempDegree}`}>{weather.current?.temperature_2m ?? '--'}°</div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider ${textTempLabel}`}>Outdoor Skies</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Atmospheric Metering Panel (Famous Care Apps Option) */}
              <div className={`p-4 ${meteringBg} grid grid-cols-3 gap-2.5 text-center`}>
                <div className={`p-2.5 rounded-2xl border ${cardSub}`}>
                  <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <Sun className="w-3 h-3 text-amber-500 animate-pulse" /> UV Rate Index
                  </div>
                  <div className="text-xs font-bold">{uvIndex}</div>
                  <div className="text-[7.5px] text-slate-400 font-medium mt-0.5">Evap core radiation</div>
                </div>

                <div className={`p-2.5 rounded-2xl border ${cardSub}`}>
                  <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <Wind className="w-3 h-3 text-sky-500 animate-spin" style={{ animationDuration: '5s' }} /> Wind Uplift
                  </div>
                  <div className="text-xs font-bold">{currentWind} km/h</div>
                  <div className="text-[7.5px] text-slate-400 font-medium mt-0.5">Mechanical fiber shake</div>
                </div>

                <div className={`p-2.5 rounded-2xl border ${cardSub}`}>
                  <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <Droplets className="w-3 h-3 text-blue-500 animate-bounce" /> Vapor Flow
                  </div>
                  <div className="text-xs font-bold">{weather.current?.relative_humidity_2m ?? '--'}%</div>
                  <div className="text-[7.5px] text-slate-400 font-medium mt-0.5">{evapPerf.split(' (')[0]}</div>
                </div>
              </div>

            </motion.section>
          );
        })()}

        {/* AI Insight Box (New Feature) */}
        {dryness?.insight && (
          <section className={`${theme.isDark ? 'bg-indigo-900/40 border border-indigo-500/20' : theme.accent} p-6 rounded-3xl shadow-lg ${theme.isDark ? '' : 'shadow-blue-100'} text-white relative overflow-hidden`}>
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3 opacity-80 uppercase tracking-widest text-[10px] font-bold">
                 <Globe className="w-3 h-3" /> AI Forecaster Insight
               </div>
               <p className="text-sm font-medium leading-relaxed">
                 {dryness.insight}
               </p>
             </div>
             <div className="absolute top-[-20%] right-[-10%] opacity-10">
               <Timer className="w-32 h-32 rotate-12" />
             </div>
          </section>
        )}

        {/* AI Strategy Schedule (New Feature) */}
        {schedule && (
          <section className={`${theme.card} p-5 rounded-3xl shadow-sm border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-4 opacity-50 uppercase tracking-widest text-[10px] font-bold text-slate-500">
               <Navigation className={`w-3 h-3 ${theme.isDark ? 'text-indigo-400' : ''}`} /> AI Optimal Window
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-display font-bold ${theme.header}`}>
                  {schedule.bestStartHour === 0 ? 'Right Now' : `In ${schedule.bestStartHour} hours`}
                </div>
                <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'} font-medium mt-1`}>{schedule.summary}</p>
              </div>
              <div className={`${theme.isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-100'} px-3 py-1.5 rounded-full text-[10px] font-bold border`}>
                {schedule.confidence}% Confidence
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${theme.isDark ? 'border-slate-700' : 'border-slate-50'}`}>
              <p className="text-[11px] text-slate-400 italic">"{schedule.reasoning}"</p>
            </div>
          </section>
        )}
        {/* 🚨 Alarm Ringtone Control Room & Device Picker */}
        <section className={`${theme.card} p-5 rounded-3xl border ${theme.isDark ? 'border-slate-700/60' : 'border-slate-100'} shadow-sm`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 opacity-55 uppercase tracking-widest text-[10px] font-bold text-slate-500">
               <Bell className={`w-3.5 h-3.5 ${theme.isDark ? 'text-indigo-400' : 'text-blue-500'}`} /> Alarm Control & Ringtones
            </div>
            {completeAlarmActive && (
              <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full animate-pulse uppercase">
                🚨 RINGING
              </span>
            )}
          </div>

          <p className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-slate-500'} mb-4 leading-relaxed`}>
            Select your preferred alert chime. This sound triggers immediately when rain hazards are detected or when your timer finishes!
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'standard', name: 'Elegant Chime', desc: 'Resonant standard bell' },
              { id: 'siren', name: 'Cyber Siren', desc: 'Sweep sci-fi hazard' },
              { id: 'beeps', name: 'Echo Beeps', desc: 'Fast digital pulses' },
              { id: 'bell', name: 'Resonant Bell', desc: 'Rich multi-harmonic' },
            ].map(tone => (
              <button
                key={tone.id}
                onClick={() => {
                  setAlarmRingtone(tone.id);
                  localStorage.setItem("laundry_alarm_ringtone", tone.id);
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  alarmRingtone === tone.id
                    ? 'bg-blue-50/50 dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-50/55 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs">{tone.name}</div>
                <div className="text-[9px] opacity-70 mt-0.5 leading-snug">{tone.desc}</div>
                {alarmRingtone === tone.id && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Device file audio picker */}
          <div className={`p-3.5 rounded-2xl ${theme.isDark ? 'bg-slate-900/60' : 'bg-slate-50'} border ${theme.isDark ? 'border-slate-800' : 'border-slate-100'} mb-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                📁 Select Chime File from Device
              </span>
              {alarmRingtone === 'custom' && (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            
            <label className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 p-2.5 rounded-xl cursor-pointer transition-all shadow-sm">
              <Volume2 className="w-4 h-4 text-blue-500" />
              <div className="flex-1 text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {customFileAudioUrl ? "Change Ringtone File" : "Choose audio file..."}
                </div>
                <div className="text-[9px] text-slate-400">Supports mp3, wav, m4a, ogg</div>
              </div>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleCustomAudioUpload}
                className="hidden" 
              />
            </label>

            {customFileAudioUrl && (
              <button
                onClick={() => {
                  setAlarmRingtone("custom");
                  localStorage.setItem("laundry_alarm_ringtone", "custom");
                }}
                className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold border ${
                  alarmRingtone === "custom"
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Use Uploaded Custom Tone
              </button>
            )}
          </div>

          {/* Demo Sound Play Button */}
          <div className="flex gap-2">
            <button
              onClick={handleToggleDemoPlay}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                isPlayingDemo
                  ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                  : 'bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isPlayingDemo ? (
                <>
                  <VolumeX className="w-4 h-4 animate-spin" />
                  Stop Demo
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  🔊 Test Sound
                </>
              )}
            </button>

            {(alarmActive || completeAlarmActive) && (
              <button
                onClick={() => {
                  setAlarmMuted(true);
                  setCompleteAlarmActive(false);
                  setIsDryingComplete(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase bg-rose-500 text-white hover:bg-rose-600 shadow-sm flex items-center justify-center gap-2 animate-pulse"
              >
                <VolumeX className="w-4 h-4" />
                Silence/Stop Alarm
              </button>
            )}
          </div>
        </section>

        {/* Laundry Action Card & AI Voice control panel */}
        <section className={`${theme.card} p-6 rounded-3xl shadow-sm border transition-all relative overflow-hidden ${
          alarmActive && !alarmMuted
          ? 'border-rose-500 ring-4 ring-rose-500/20' 
          : isDrying 
            ? (theme.isDark ? 'border-indigo-500/50 ring-4 ring-indigo-500/10' : 'border-blue-100 ring-4 ring-blue-50/50') 
            : (theme.isDark ? 'border-slate-700' : 'border-slate-50')
        }`}>
          
          {/* Active imminent rain danger indicator */}
          {alarmActive && (
            <div className={`p-4 rounded-2xl mb-5 flex items-center justify-between gap-3 animate-pulse border ${
              alarmMuted 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <AlertCircle className={`w-5 h-5 shrink-0 ${alarmMuted ? '' : 'animate-bounce'}`} />
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider">Imminent Rain Alarm</div>
                  <p className="text-[10px] opacity-80 leading-tight">Rain sensor active! Collect drying clothes immediately.</p>
                </div>
              </div>
              
              <button
                onClick={() => setAlarmMuted(!alarmMuted)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm border ${
                  alarmMuted 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-300' 
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 hover:bg-rose-200'
                }`}
              >
                {alarmMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    Unmute Alert
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Silence Alarm
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${theme.header}`}>
                <Sparkles className="w-4 h-4 text-blue-500 fill-blue-100 dark:fill-none" /> AI Drying Assist
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <button 
                  onClick={handleRefresh}
                  disabled={isFetchingWeather}
                  className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isFetchingWeather ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                  {isFetchingWeather ? 'Syncing...' : 'Refresh Now'}
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setAppSettings(s => ({ ...s, pushNotifications: !s.pushNotifications }))}
              className={`p-3 rounded-2xl transition-all ${appSettings.pushNotifications ? (theme.isDark ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'bg-blue-50 text-blue-600 shadow-inner') : (theme.isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-50 text-slate-300')}`}
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Play/Stop Large toggle button */}
            <button 
              onClick={toggleDrying}
              className={`flex-1 group relative h-36 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border-2 ${
                isDrying 
                  ? 'bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 shadow-sm hover:bg-rose-100/50' 
                  : (theme.isDark ? 'bg-indigo-500/5 text-indigo-400 border-indigo-500/20 shadow-sm hover:bg-indigo-500/10' : 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm hover:bg-blue-100/50')
              }`}
            >
              <AnimatePresence mode="wait">
                {isDrying ? (
                  <motion.div key="stop" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <Square className="w-12 h-12 fill-current mb-2" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Finish Drying</span>
                  </motion.div>
                ) : (
                  <motion.div key="start" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <Play className="w-12 h-12 fill-current mb-2 ml-1" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Hang Laundry</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Countdown timer ticker representation */}
            <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col justify-center">
              {isDrying ? (
                (() => {
                  let base = customTimerDuration !== null ? customTimerDuration : (dryness?.estimatedMinutes || 180);
                  if (fabricType === 'delicate') {
                    base = Math.round(base * 0.7);
                  } else if (fabricType === 'heavy') {
                    base = Math.round(base * 1.4);
                  }
                  const totalMinutes = base + customMinutesOffset;
                  const totalSecondsRequired = totalMinutes * 60;
                  const elapsedSeconds = startTime ? Math.floor((nowTicker - startTime) / 1000) : 0;
                  const secondsRemaining = Math.max(0, totalSecondsRequired - elapsedSeconds);
                  
                  const h = Math.floor(secondsRemaining / 3600);
                  const m = Math.floor((secondsRemaining % 3600) / 60);
                  const s = secondsRemaining % 60;
                  
                  const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                  const progressPercent = totalSecondsRequired > 0 ? (secondsRemaining / totalSecondsRequired) * 100 : 100;
                  const isFinished = secondsRemaining === 0;

                  return (
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <div className={`flex items-center gap-1.5 ${theme.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Timer className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Time Remaining</span>
                        </div>
                        {customMinutesOffset !== 0 && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-905/30 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded-full">
                            {customMinutesOffset > 0 ? `+${customMinutesOffset}` : customMinutesOffset}m Adjusted
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-display font-bold tabular-nums leading-none tracking-tight ${theme.header}`}>
                          {isFinished ? "DRY DONE" : formattedTime}
                        </span>
                      </div>

                      {/* Dynamic visual progress block */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isFinished ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Manual Time adjustment buttons */}
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => setCustomMinutesOffset(c => c - 15)}
                          className="flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-bold transition-all text-slate-600 dark:text-slate-300 shadow-sm"
                        >
                          -15 Min
                        </button>
                        <button
                          onClick={() => setCustomMinutesOffset(c => c + 15)}
                          className="flex-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-bold transition-all text-slate-600 dark:text-slate-300 shadow-sm"
                        >
                          +15 Min
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Timer Inactive</div>
                  <p className="text-[10px] text-slate-400 mt-1">Start timer when you hang your clothes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fabric Type Coefficient Selector */}
          <div className="mb-5 p-3.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-blue-500" /> Fabric Drying Preset Modifier
              </span>
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-blue-300 px-1.5 py-0.5 rounded">
                Factor Scale
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cotton', name: 'Cotton Load', factor: '1.0x', desc: 'Denim, shirts, standard laundry' },
                { id: 'delicate', name: 'Delicate Silk', factor: '0.7x', desc: 'Silk, lightweight synthetic' },
                { id: 'heavy', name: 'Heavy Blanket', factor: '1.4x', desc: 'Jeans, wool, heavy quilts' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFabricType(f.id as any);
                    localStorage.setItem("laundry_fabric_type", f.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    fabricType === f.id
                      ? 'bg-blue-50/50 dark:bg-slate-850 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-extrabold text-[10px] leading-tight">{f.name}</div>
                  <div className="text-[9.5px] font-mono mt-0.5 font-bold">{f.factor} Timer</div>
                  <div className="text-[8px] opacity-60 mt-0.5 leading-snug truncate">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Voice Command Core Panel */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-500" /> Voice Assistant Command
              </span>
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold px-1.5 py-0.5 rounded-md">
                Active AI
              </span>
            </div>

            {/* Glowing / pulsing microphone container */}
            <div className="flex gap-4 items-center">
              <button
                onClick={startListeningResult}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-all ${
                  aiListening 
                    ? 'bg-rose-500 text-white border-transparent ring-4 ring-rose-500/20' 
                    : (theme.isDark ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100')
                }`}
              >
                {aiListening ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60 pointer-events-none" />
                    <MicOff className="w-5 h-5 relative z-10" />
                  </>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                {aiListening ? (
                  <p className="text-xs text-rose-500 font-bold animate-pulse">
                    Listening to you... Speak now
                  </p>
                ) : aiProcessing ? (
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> AI analyzing command...
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 leading-tight">
                    Click microphone to say: <span className="italic font-medium text-slate-600 dark:text-slate-300">"Hang clothes"</span>, <span className="italic font-medium text-slate-600 dark:text-slate-300">"add 15 minutes"</span>, or <span className="italic font-medium text-slate-600 dark:text-slate-300">"is it gonna rain?"</span>
                  </p>
                )}
              </div>
            </div>

            {/* Conversation Log Feed Bubble */}
            {aiFeed.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 max-h-36 overflow-y-auto pr-1 no-scrollbar text-[11px]">
                {aiFeed.slice(-3).map((item, idx) => (
                  <div key={idx} className={`flex flex-col ${item.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-2.5 rounded-2xl max-w-[85%] leading-tight ${
                      item.speaker === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none font-medium' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none font-normal shadow-sm'
                    }`}>
                      <div dangerouslySetInnerHTML={{ __html: item.text }} />
                    </div>
                    <span className="text-[8px] text-slate-400 mt-0.5 px-0.5 font-bold">{item.time}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Text input alternative control bar fallback */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (textCommand.trim()) {
                  runVoiceCommandInput(textCommand);
                  setTextCommand("");
                }
              }}
              className="mt-4 flex gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/10 rounded-xl"
            >
              <input
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                placeholder="Type command manually..."
                className="flex-1 text-[11px] bg-white dark:bg-slate-800/70 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:border-blue-400 text-slate-800 dark:text-slate-200 font-medium"
              />
              <button
                type="submit"
                disabled={!textCommand.trim() || aiProcessing}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase transition-all shadow-sm shrink-0 hover:shadow disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        {/* Tip Box */}
        <section className={`${theme.card} p-5 rounded-2xl border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'} flex gap-4 items-start shadow-sm`}>
          <div className={`${theme.isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-blue-50 text-blue-500 border-blue-100'} p-2.5 rounded-xl shrink-0 border`}>
            <span className="w-5 h-5 flex items-center justify-center">?</span>
          </div>
          <p className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed font-medium`}>
            {dryness?.tip || "Tip: Hanging laundry in the sun helps naturally disinfect and brighten whites."}
          </p>
        </section>

        {/* Hourly Trend (Next 24 Hours) */}
        {weather && (
          <section className="space-y-4">
             <div className="flex justify-between items-center px-2">
                <h3 className={`text-xs font-bold ${theme.isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>24H Forecast</h3>
                {lastUpdated && (
                  <span className="text-[10px] text-slate-400 font-medium italic">
                    Updated {Math.floor((now - lastUpdated) / 60000)}m ago
                  </span>
                )}
             </div>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {(weather.hourly?.precipitation_probability || []).slice(0, 24).map((prob, i) => (
                <div key={i} className={`flex-shrink-0 ${theme.card} p-4 rounded-2xl border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'} w-20 flex flex-col items-center gap-3 shadow-sm hover:border-blue-100 transition-colors`}>
                  <div className="text-center">
                    <span className={`text-[10px] font-bold ${theme.isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest block`}>
                      {i === 0 ? 'Now' : ((new Date().getHours() + i) % 24) + ':00'}
                    </span>
                  </div>
                   <div className={`p-2 rounded-xl ${prob > 30 ? (theme.isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-50 text-blue-500') : (theme.isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-yellow-50 text-yellow-500')}`}>
                    {prob > 50 ? <CloudRain className="w-5 h-5" /> : prob > 20 ? <Cloud className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <span className={`font-bold text-xs ${theme.header} block`}>{prob}%</span>
                    <span className={`text-[9px] ${theme.isDark ? 'text-slate-500' : 'text-slate-400'} font-bold`}>{Math.round(weather.hourly.temperature_2m[i])}°</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live Rain Forecast Monitor (High Resolution) */}
        {weather && <LiveRainMonitor />}

        {/* Daily Forecast Summary (3 Days) */}
        {weather?.daily && (
          <section className="space-y-4">
             <h3 className={`text-xs font-bold ${theme.isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest px-2`}>3-Day Outlook</h3>
             <div className="space-y-3">
               {weather.daily.time.map((time, i) => (
                 <div key={i} className={`${theme.card} p-4 rounded-2xl border ${theme.isDark ? 'border-slate-700 shadow-none' : 'border-slate-100 shadow-sm'} flex items-center justify-between transition-all hover:scale-[1.01]`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${theme.isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                        {getWeatherStatus(weather.current.weather_code).includes('Rain') ? <CloudRain className="w-5 h-5 text-blue-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${theme.header}`}>
                          {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(time).toLocaleDateString(undefined, { weekday: 'long' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {getWeatherStatus(weather.daily!.weather_code[i])}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${theme.header}`}>
                          {Math.round(weather.daily!.temperature_2m_max[i])}°<span className="text-slate-400 font-normal"> / {Math.round(weather.daily!.temperature_2m_min[i])}°</span>
                        </div>
                        <div className="text-[10px] text-blue-400 font-bold">
                          {weather.daily!.precipitation_probability_max[i]}% Rain
                        </div>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}
      </main>

      {/* Modern Bottom Navigation */}
      <nav className={`fixed bottom-6 left-6 right-6 ${theme.isDark ? 'bg-slate-800/95 border-slate-700 text-white' : 'bg-white/90 border-slate-50 text-slate-600'} backdrop-blur-xl rounded-3xl shadow-2xl p-4 flex justify-around items-center border max-w-md mx-auto z-50`}>
        <button 
          onClick={() => { setShowSearch(false); setShowSettings(false); }}
          className={`flex flex-col items-center gap-1.5 ${(!showSearch && !showSettings) ? (theme.isDark ? 'text-indigo-400' : 'text-blue-600') : (theme.isDark ? 'text-slate-500' : 'text-slate-400')} transition-all active:scale-95`}
          id="nav-weather-btn"
        >
          <div className={`p-2 rounded-xl scale-110 ${(!showSearch && !showSettings) ? (theme.isDark ? 'bg-indigo-500/10' : 'bg-blue-50') : ''}`}><Thermometer className="w-6 h-6" /></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Weather</span>
        </button>
        <button 
          onClick={() => { setShowSearch(true); setShowSettings(false); }}
          className={`flex flex-col items-center gap-1.5 ${showSearch ? (theme.isDark ? 'text-indigo-400' : 'text-blue-600') : (theme.isDark ? 'text-slate-500' : 'text-slate-400')} transition-all active:scale-95`}
          id="nav-search-btn"
        >
          <div className={`p-2 rounded-xl scale-110 ${showSearch ? (theme.isDark ? 'bg-indigo-500/10' : 'bg-blue-50') : ''}`}><Search className="w-6 h-6" /></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Global</span>
        </button>
        <button 
          onClick={() => { setShowSettings(true); setShowSearch(false); }}
          className={`flex flex-col items-center gap-1.5 ${showSettings ? (theme.isDark ? 'text-indigo-400' : 'text-blue-600') : (theme.isDark ? 'text-slate-500' : 'text-slate-400')} transition-all active:scale-95`}
          id="nav-settings-btn"
        >
          <div className={`p-2 rounded-xl scale-110 ${showSettings ? (theme.isDark ? 'bg-indigo-500/10' : 'bg-blue-50') : ''}`}><Settings className="w-6 h-6" /></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
        </button>
      </nav>

      {/* Modals placed at end for better overlap behavior */}
      <SearchModal 
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleSelectLocation}
        onUseLiveLocation={getLocation}
        isSearching={isSearching}
        results={searchResults}
        query={searchQuery}
        setQuery={setSearchQuery}
        error={searchError}
      />
      
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={{ ...appSettings, voiceEnabled, voiceGender, voiceRate }}
        onSave={(newSettings) => {
          setAppSettings(newSettings);
          if (newSettings.voiceEnabled !== undefined) {
            setVoiceEnabled(newSettings.voiceEnabled);
            localStorage.setItem("laundry_voice_enabled", String(newSettings.voiceEnabled));
          }
          if (newSettings.voiceGender) {
            setVoiceGender(newSettings.voiceGender);
            localStorage.setItem("laundry_voice_gender", newSettings.voiceGender);
          }
          if (newSettings.voiceRate !== undefined) {
            setVoiceRate(newSettings.voiceRate);
            localStorage.setItem("laundry_voice_rate", String(newSettings.voiceRate));
          }
        }}
        emailLogsList={emailLogsList}
        onClearLogs={async () => {
          await clearEmailLogs();
          syncEmailLogs();
        }}
      />
    </div>
  );
}
