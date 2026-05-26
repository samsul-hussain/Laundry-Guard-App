/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertCircle
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
  ScheduleInfo
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
  
  // Synthesizer Audio alarm refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  
  // AI Voice Assistant State
  const [aiListening, setAiListening] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiFeed, setAiFeed] = useState<Array<{ speaker: 'user' | 'ai'; text: string; time: string }>>([]);
  const [textCommand, setTextCommand] = useState("");
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

  const [now, setNow] = useState(Date.now());
  const [unhandledError, setUnhandledError] = useState<string | null>(null);

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

  // Initialize from localStorage
  useEffect(() => {
    const savedState = safeLocalStorage.getItem('laundry_guard_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setIsDrying(parsed.drying || false);
        setStartTime(parsed.start || null);
        setCustomMinutesOffset(parsed.customMinutesOffset || 0);
        if (parsed.lastLat && parsed.lastLon) {
          setCoords({ lat: parsed.lastLat, lon: parsed.lastLon });
          setLocationName(parsed.lastName || "Saved Location");
          setIsLocating(false);
        }
        if (parsed.settings) {
          setAppSettings({ enableAI: true, ...parsed.settings });
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
        lastLat: coords.lat,
        lastLon: coords.lon,
        lastName: locationName,
        settings: appSettings
      }));
    }
  }, [isDrying, startTime, customMinutesOffset, coords, locationName, appSettings]);

  const getLocation = useCallback(() => {
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
      setAlarmMuted(false);
    } else {
      setIsDrying(false);
      setStartTime(null);
      setCustomMinutesOffset(0);
      setAlarmMuted(false);
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

  // Dual-oscillator programmatic Web Audio alarm chime
  useEffect(() => {
    const isDangerousRain = getRainAlert()?.level === 'danger';
    
    if (isDrying && isDangerousRain && !alarmMuted) {
      setAlarmActive(true);
      
      if (!alarmIntervalRef.current) {
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") {
            ctx.resume();
          }
          
          const playBeep = () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.value = 950;
            osc.type = "sine";
            
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
          };
          
          playBeep();
          alarmIntervalRef.current = setInterval(playBeep, 1200);
        } catch (e) {
          console.warn("Could not kick off Web Audio synth:", e);
        }
      }
    } else {
      setAlarmActive(false);
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [isDrying, weather, alarmMuted]);

  // AI voice processing caller
  const runVoiceCommandInput = (text: string) => {
    if (!text.trim()) return;
    setAiProcessing(true);
    setAiFeed(prev => [...prev, { speaker: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    
    const totalMinutes = dryness?.estimatedMinutes || 180;
    const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const timeLeft = Math.max(0, totalMinutes + customMinutesOffset - Math.floor(elapsedSeconds / 60));
    const hasRainAlarm = getRainAlert()?.level === 'danger';

    sendVoiceCommand({
      command: text,
      temp: weather?.current?.temperature_2m ?? 20,
      humidity: weather?.current?.relative_humidity_2m ?? 50,
      windSpeed: weather?.current?.wind_speed_10m ?? 0,
      isDrying,
      timeLeftMinutes: timeLeft,
      hasRainAlert: hasRainAlarm
    }).then((res) => {
      setAiProcessing(false);
      setAiFeed(prev => [...prev, { speaker: 'ai', text: res.responseSpeech, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      
      if (res.action === 'START_DRYING') {
        setIsDrying(true);
        setStartTime(Date.now());
        setCustomMinutesOffset(0);
        setAlarmMuted(false);
      } else if (res.action === 'STOP_DRYING') {
        setIsDrying(false);
        setStartTime(null);
        setCustomMinutesOffset(0);
      } else if (res.action === 'MUTE_ALARM') {
        setAlarmMuted(true);
        setAlarmActive(false);
      } else if (res.action === 'ADJUST_TIMER') {
        setCustomMinutesOffset(prev => prev + res.adjustMinutes);
      }
      
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(res.responseSpeech);
          window.speechSynthesis.speak(utterance);
        }
      } catch (speechErr) {
        console.warn("Speech Synthesis failed:", speechErr);
      }
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
    <div className={`max-w-md mx-auto min-h-screen ${theme.bg} relative pb-28 transition-colors duration-1000 overflow-x-hidden`}>
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
        {/* Connection Failure or No Data */}
        {error && !weather && errorContent}

        {/* Forecast Card */}
        {weather && (
          <section className={`p-6 rounded-3xl overflow-hidden relative shadow-lg transition-all duration-500 ${
            weatherAlert?.level === 'danger' ? 'bg-rose-500 text-white shadow-rose-200' : 
            weatherAlert?.level === 'warning' ? 'bg-amber-400 text-slate-900 shadow-amber-200' : 
            theme.isDark ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-indigo-900/20' : theme.accent + ' text-white shadow-blue-200'
          }`}>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-xs font-bold uppercase tracking-widest opacity-80 ${theme.isDark ? 'bg-white/5 text-slate-400' : 'bg-black/10 text-white'} px-2.5 py-1 rounded-full flex items-center gap-1.5`}>
                   {isFetchingWeather ? 'Syncing...' : (weather ? getWeatherStatus(weather.current.weather_code) : 'Local Skies')}
                </span>
                {isFetchingWeather ? <Loader2 className="w-5 h-5 animate-spin opacity-50" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              
              <div className="space-y-1">
                <h2 className={`text-4xl font-display font-bold ${weatherAlert ? '' : (theme.isDark ? 'text-indigo-400' : 'text-white')}`}>
                  {weatherAlert?.level === 'danger' ? 'Rain Alert!' : weatherAlert?.level === 'warning' ? 'Warning' : dryness?.statusText || 'Perfect Sky'}
                </h2>
                <p className={`text-lg opacity-90 leading-tight font-medium max-w-[85%] ${weatherAlert ? '' : (theme.isDark ? 'text-slate-400' : 'text-white')}`}>
                  {weatherAlert?.message || "Skies look great. It's safe to hang your laundry outside."}
                </p>
              </div>

              <div className="mt-8 flex gap-3">
                <div className={`flex items-center gap-2 ${theme.isDark ? 'bg-slate-900/50 text-indigo-400 border-slate-700' : 'bg-white/20 text-white border-white/10'} px-3 py-2 rounded-xl backdrop-blur-md border`}>
                  <Thermometer className="w-4 h-4" />
                  <span className="font-bold">{weather.current?.temperature_2m ?? '--'}°</span>
                </div>
                <div className={`flex items-center gap-2 ${theme.isDark ? 'bg-slate-900/50 text-indigo-400 border-slate-700' : 'bg-white/20 text-white border-white/10'} px-3 py-2 rounded-xl backdrop-blur-md border`}>
                  <Droplets className="w-4 h-4" />
                  <span className="font-bold">{weather.current?.relative_humidity_2m ?? '--'}%</span>
                </div>
              </div>
            </div>
            
            <div className={`absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none transform rotate-12 scale-110 ${theme.isDark ? 'text-indigo-500' : 'text-white'}`}>
              {weatherAlert?.level === 'danger' ? <CloudRain className="w-64 h-64" /> : <Sun className="w-64 h-64" />}
            </div>
          </section>
        )}

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
                  const totalMinutes = (dryness?.estimatedMinutes || 180) + customMinutesOffset;
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
        settings={appSettings}
        onSave={setAppSettings}
      />
    </div>
  );
}
