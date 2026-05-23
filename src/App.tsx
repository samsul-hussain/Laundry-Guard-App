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
  RefreshCw
} from 'lucide-react';
import { 
  getWeather, 
  getDrynessEstimate, 
  searchLocation, 
  getLaundrySchedule,
  WeatherData, 
  DrynessInfo, 
  LocationResult,
  ScheduleInfo
} from './services/api';
import SettingsModal, { AppSettings } from './components/SettingsModal';
import SearchModal from './components/SearchModal';

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
    enhancedLocation: true
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
    const savedState = localStorage.getItem('laundry_guard_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setIsDrying(parsed.drying || false);
        setStartTime(parsed.start || null);
        if (parsed.lastLat && parsed.lastLon) {
          setCoords({ lat: parsed.lastLat, lon: parsed.lastLon });
          setLocationName(parsed.lastName || "Saved Location");
          setIsLocating(false);
        }
        if (parsed.settings) {
          setAppSettings(parsed.settings);
        }
      } catch (e) {
        console.error("Failed to parse saved state");
      }
    }
  }, []);

  // Save state
  useEffect(() => {
    if (coords) {
      localStorage.setItem('laundry_guard_state', JSON.stringify({
        drying: isDrying,
        start: startTime,
        lastLat: coords.lat,
        lastLon: coords.lon,
        lastName: locationName,
        settings: appSettings
      }));
    }
  }, [isDrying, startTime, coords, locationName, appSettings]);

  const getLocation = useCallback(() => {
    // Clear previous watch if exists
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setIsLocating(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError("Geolocation not supported. Please search manually.");
      setIsLocating(false);
      return;
    }

    const options = {
      timeout: 10000,
      enableHighAccuracy: appSettings.enhancedLocation,
      maximumAge: 0
    };

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setLocationName("Live Location");
      setIsLiveLocation(true);
      setIsLocating(false);
      setError(null);
    };

    const onError = (err: GeolocationPositionError) => {
      console.warn(`Geolocation error (${err.code}): ${err.message}`);
      setIsLiveLocation(false);
      
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err2) => {
            console.error("Critical location failure:", err2);
            setError("GPS unavailable. Try searching manually.");
            setIsLocating(false);
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else {
        setError("Location access denied. Please search manually.");
        setIsLocating(false);
      }
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
      });
      setDryness(dryData);

      try {
        const scheduleData = await getLaundrySchedule({
          hourlyProbs: data.hourly.precipitation_probability,
          hourlyTemps: data.hourly.temperature_2m,
          currentTemp: data.current.temperature_2m
        });
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
  }, [coords]); // weather REMOVED from dependency array to break loop

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
    } else {
      setIsDrying(false);
      setStartTime(null);
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
      <section className={`${theme.card} p-5 rounded-3xl border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'} shadow-sm`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 opacity-50 uppercase tracking-widest text-[10px] font-bold text-slate-500">
             <CloudRain className={`w-3 h-3 ${theme.isDark ? 'text-indigo-400' : 'text-blue-500'}`} /> High-Res Rain Monitor
          </div>
          <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">LIVE DATA</div>
        </div>
        
        <div className="flex items-end justify-between h-20 gap-1 px-1">
          {data.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
              <div 
                className={`w-full rounded-t-lg transition-all duration-500 ${val > 2.5 ? 'bg-blue-600' : val > 0.5 ? 'bg-blue-400' : val > 0 ? 'bg-blue-200' : (theme.isDark ? 'bg-slate-700' : 'bg-slate-100')}`}
                style={{ height: `${(val / maxVal) * 100}%`, minHeight: val > 0 ? '4px' : '2px' }}
              />
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded pointer-events-none z-10">
                {val === 0 ? 'Dry' : `${val}mm/h`}
              </div>
              <span className={`text-[8px] font-bold ${theme.isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                +{i * 15}m
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-2xl ${theme.isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-400 mb-1">Peak Intensity</div>
            <div className={`text-xs font-bold ${intensityText === 'Heavy' ? 'text-rose-500' : 'text-blue-500'}`}>{intensityText}</div>
          </div>
          <div className={`p-3 rounded-2xl ${theme.isDark ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status</div>
            <div className={`text-xs font-bold ${theme.header}`}>{rainInfo.split('.')[0]}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500 italic max-w-[100%] leading-tight">
            {rainInfo}
          </span>
        </div>
      </section>
    );
  };

  const alert = getRainAlert();
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
      {unhandledError && (
        <div className="bg-rose-600 text-white p-4 text-xs font-mono break-all z-[100] relative">
          <p className="font-bold mb-1 uppercase tracking-wider">System Error Detected:</p>
          {unhandledError}
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 block bg-white/20 px-2 py-1 rounded"
          >
            Reload App
          </button>
        </div>
      )}
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
            alert?.level === 'danger' ? 'bg-rose-500 text-white shadow-rose-200' : 
            alert?.level === 'warning' ? 'bg-amber-400 text-slate-900 shadow-amber-200' : 
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
                <h2 className={`text-4xl font-display font-bold ${alert ? '' : (theme.isDark ? 'text-indigo-400' : 'text-white')}`}>
                  {alert?.level === 'danger' ? 'Rain Alert!' : alert?.level === 'warning' ? 'Warning' : dryness?.statusText || 'Perfect Sky'}
                </h2>
                <p className={`text-lg opacity-90 leading-tight font-medium max-w-[85%] ${alert ? '' : (theme.isDark ? 'text-slate-400' : 'text-white')}`}>
                  {alert?.message || "Skies look great. It's safe to hang your laundry outside."}
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
              {alert?.level === 'danger' ? <CloudRain className="w-64 h-64" /> : <Sun className="w-64 h-64" />}
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

        {/* Laundry Action Card */}
        <section className={`${theme.card} p-6 rounded-3xl shadow-sm border transition-all ${isDrying ? (theme.isDark ? 'border-indigo-500/50 ring-4 ring-indigo-500/10' : 'border-blue-100 ring-4 ring-blue-50/50') : (theme.isDark ? 'border-slate-700' : 'border-slate-50')}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`text-lg font-bold tracking-tight ${theme.header}`}>AI Drying Assist</h3>
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

          <div className="flex items-center gap-6">
            <button 
              onClick={toggleDrying}
              className={`flex-1 group relative h-36 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
                isDrying 
                ? 'bg-rose-50 text-rose-600 border-2 border-rose-100 shadow-sm' 
                : (theme.isDark ? 'bg-indigo-500/10 text-indigo-400 border-2 border-indigo-500/20 shadow-sm' : 'bg-blue-50 text-blue-600 border-2 border-blue-100 shadow-sm')
              }`}
            >
              <AnimatePresence mode="wait">
                {isDrying ? (
                  <motion.div key="stop" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <Square className="w-12 h-12 fill-current mb-2" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Finish</span>
                  </motion.div>
                ) : (
                  <motion.div key="start" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                    <Play className="w-12 h-12 fill-current mb-2 ml-1" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Hang Laundry</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {isDrying && (
              <div className="flex-1 space-y-2">
                <div className={`flex items-center gap-2 ${theme.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Timer className={`w-4 h-4 ${theme.isDark ? 'text-indigo-400' : ''}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Estimated</span>
                </div>
                <div className={`text-4xl font-display font-bold ${theme.header} flex items-baseline gap-1`}>
                  {dryness?.estimatedMinutes ? dryness.estimatedMinutes : '--'}<span className="text-sm font-sans font-bold text-slate-400">min</span>
                </div>
                <p className={`text-[11px] ${theme.isDark ? 'text-slate-500' : 'text-slate-400'} leading-tight font-medium italic`}>
                   "Better conditions reduce drying time significantly."
                </p>
              </div>
            )}
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
