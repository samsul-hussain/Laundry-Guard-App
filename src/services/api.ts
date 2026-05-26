export interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    cloud_cover: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
  minutely_15?: {
    precipitation: number[];
  };
  hourly: {
    precipitation_probability: number[];
    precipitation: number[];
    temperature_2m: number[];
    weather_code: number[];
    time: string[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

export interface DrynessInfo {
  estimatedMinutes: number;
  statusEmoji: string;
  statusText: string;
  tip: string;
  insight?: string;
}

export interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
}

export interface ScheduleInfo {
  bestStartHour: number;
  confidence: number;
  reasoning: string;
  summary: string;
}

// Simple local in-memory caches to prevent redundant Gemini API calls and respect rate limits
const drynessCache = new Map<string, DrynessInfo>();
const scheduleCache = new Map<string, ScheduleInfo>();

export async function getLaundrySchedule(
  params: {
    hourlyProbs: number[];
    hourlyTemps: number[];
    currentTemp: number;
  },
  forceHeuristic?: boolean
): Promise<ScheduleInfo> {
  const probs = Array.isArray(params.hourlyProbs) ? params.hourlyProbs : [];
  const temps = Array.isArray(params.hourlyTemps) ? params.hourlyTemps : [];
  
  // Calculate a reliable cache key based on inputs
  const cacheKey = `${params.currentTemp.toFixed(1)}_${probs.slice(0, 12).join(",")}_${temps.slice(0, 12).join(",")}`;
  
  if (!forceHeuristic && scheduleCache.has(cacheKey)) {
    console.log("[Schedule] Cache hit! Returning cached schedule.");
    return scheduleCache.get(cacheKey)!;
  }

  const runHeuristic = (): ScheduleInfo => {
    let bestStartHour = 0;
    let bestScore = -999999;
    
    const limit = Math.min(24, probs.length - 2);
    for (let i = 0; i < limit; i++) {
      const windowProbs = probs.slice(i, i + 3);
      const windowTemps = temps.slice(i, i + 3);
      
      const avgProb = windowProbs.reduce((a, b) => a + b, 0) / (windowProbs.length || 1);
      const avgTemp = windowTemps.reduce((a, b) => a + b, 0) / (windowTemps.length || 1);
      
      const rainPenalty = avgProb * 4;
      const score = avgTemp * 2 - rainPenalty;
      
      if (score > bestScore) {
        bestScore = score;
        bestStartHour = i;
      }
    }
    
    const confidence = Math.max(10, Math.min(100, Math.round(100 - (probs[bestStartHour] || 0) - (probs[bestStartHour+1] || 0)/2)));
    
    let reasoning = "Optimized drying cycle with high average temperature and minimal precipitation risk.";
    let summary = `Our atmospheric model suggests hanging laundry at H+${bestStartHour} for optimal evaporation rate.`;
    
    if (probs[bestStartHour] > 30) {
      reasoning = "Unstable weather period. This window offers the lowest overall risk of precipitation, though some humidity remains.";
      summary = "Precipitation risk is elevated; proceed with caution and keep an eye on the sky.";
    } else if (temps[bestStartHour] < 12) {
      reasoning = "Low precipitation risk, but temperatures are cold, which limits drying dynamics.";
      summary = "Dry conditions are expected, but lower temperatures will prolong drying times.";
    }
    
    return {
      bestStartHour,
      confidence,
      reasoning,
      summary
    };
  };

  if (forceHeuristic) {
    return runHeuristic();
  }

  try {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && typeof data.bestStartHour === "number") {
          scheduleCache.set(cacheKey, data);
          return data;
        }
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend schedule failed, using client heuristic fallback:", err);
  }

  return runHeuristic();
}

export async function searchLocation(query: string): Promise<LocationResult[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data.results) return data.results;
        if (Array.isArray(data)) return data;
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend search failed, using client geocoding fallback:", err);
  }
  
  // Client geocoding fallback
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Could not complete location search on both backend and fallback.");
  }
  const data = await res.json();
  return data.results || [];
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && data.current) {
          return data;
        }
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend weather check failed, using client Open-Meteo fallback:", err);
  }

  // Client Open-Meteo fallback
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&minutely_15=precipitation&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Weather check failed on both backend and client fallback. Please verify internet connection.");
  }
  return res.json();
}

export async function getDrynessEstimate(
  params: {
    temp: number;
    humidity: number;
    windSpeed: number;
    cloudCover: number;
    hourlyProbs?: number[];
    hourlyPrecip?: number[];
  },
  forceHeuristic?: boolean
): Promise<DrynessInfo> {
  const { temp, humidity, windSpeed = 0, cloudCover = 0 } = params;
  
  // Calculate solid parameter-based Cache Key
  const cacheKey = `${temp.toFixed(1)}_${humidity.toFixed(0)}_${windSpeed.toFixed(1)}_${cloudCover.toFixed(0)}`;
  
  if (!forceHeuristic && drynessCache.has(cacheKey)) {
    console.log("[Dryness] Cache hit! Returning cached dryness estimate.");
    return drynessCache.get(cacheKey)!;
  }

  const runHeuristic = (): DrynessInfo => {
    let baseMinutes = 180; // Default for 20C, 50% humidity, no wind
    baseMinutes -= (temp - 20) * 4;
    baseMinutes += (humidity - 50) * 3;
    baseMinutes -= windSpeed * 5;
    baseMinutes += cloudCover * 0.5;

    const estimatedMinutes = Math.max(30, Math.min(480, Math.round(baseMinutes)));
    let statusText = "GREAT";
    if (estimatedMinutes > 180) statusText = "SLOW";
    if (estimatedMinutes > 300) statusText = "VERY SLOW";
    if (temp < 10) statusText = "COLD/SLOW";
    if (humidity > 80) statusText = "HUMID";

    return {
      estimatedMinutes,
      statusEmoji: estimatedMinutes < 120 ? "☀️" : "☁️",
      statusText,
      tip: "Estimate computed via client-side thermodynamics model.",
      insight: "Weather conditions are optimized for evaporation based on temperature and local humidity levels."
    };
  };

  if (forceHeuristic) {
    return runHeuristic();
  }

  try {
    const res = await fetch("/api/dryness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && typeof data.estimatedMinutes === "number") {
          drynessCache.set(cacheKey, data);
          return data;
        }
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend dryness estimate failed, using client thermodynamic fallback:", err);
  }

  return runHeuristic();
}

export interface VoiceCommandResult {
  action: "START_DRYING" | "STOP_DRYING" | "MUTE_ALARM" | "ADJUST_TIMER" | "ANSWER_ONLY" | "PROMPT_CONFIRMATION" | "CANCEL_CONFIRMATION";
  adjustMinutes: number;
  customDuration?: number | null;
  responseSpeech: string;
  responseHtml: string;
}

export async function sendVoiceCommand(params: {
  command: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  isDrying: boolean;
  timeLeftMinutes: number;
  hasRainAlert: boolean;
  hourlyPrecip?: number[];
  hourlyProbs?: number[];
  rainThreshold?: number;
  pendingTimerDuration?: number | null;
}): Promise<VoiceCommandResult> {
  const runLocalFallback = (): VoiceCommandResult => {
    const cmd = params.command.toLowerCase();
    
    // Parse possible duration
    let parsedMinutes = 120;
    const matchesMin = cmd.match(/(\d+)\s*(?:minute|min)/);
    if (matchesMin) {
      parsedMinutes = parseInt(matchesMin[1], 10);
    } else if (cmd.includes("1 hour") || cmd.includes("one hour") || cmd.includes("60 minute")) {
      parsedMinutes = 60;
    } else if (cmd.includes("1.5 hour") || cmd.includes("90 minute")) {
      parsedMinutes = 90;
    } else if (cmd.includes("2 hour") || cmd.includes("two hour") || cmd.includes("120 minute")) {
      parsedMinutes = 120;
    }

    const commandWantsTimer = cmd.includes("hang") || cmd.includes("start") || cmd.includes("dry") || cmd.includes("begin") || cmd.includes("timer");
    const commandWantsWeatherCheck = cmd.includes("rain") || cmd.includes("weather") || cmd.includes("sky") || cmd.includes("forecast") || cmd.includes("outside");

    // Live Rain Pre-processing in local fallback
    const thresh = params.rainThreshold ?? 30;
    const probs = params.hourlyProbs ?? [];
    const precips = params.hourlyPrecip ?? [];
    
    let rainSoon = false;
    let rainSoonMinutesOffset = -1;
    for (let i = 0; i < Math.min(4, probs.length, precips.length); i++) {
      if ((precips[i] ?? 0) > 0.1 || (probs[i] ?? 0) >= thresh) {
        rainSoon = true;
        if (rainSoonMinutesOffset === -1) rainSoonMinutesOffset = i * 60;
      }
    }
    const isRainingNow = params.hasRainAlert || (precips.length > 0 && (precips[0] ?? 0) > 0.1);
    const isWeatherUnsafe = isRainingNow || rainSoon;
    const rainEtaText = isRainingNow ? "Raining right now" : rainSoonMinutesOffset >= 0 ? `Rain in ${rainSoonMinutesOffset}m` : "No rain predicted in 3h";

    if (params.pendingTimerDuration) {
      if (cmd.includes("yes") || cmd.includes("sure") || cmd.includes("confirm") || cmd.includes("do it") || cmd.includes("anyway")) {
        return {
          action: "START_DRYING",
          adjustMinutes: 0,
          customDuration: params.pendingTimerDuration,
          responseSpeech: "Understood. Starting the timer anyway. Keep an eye out for alerts!",
          responseHtml: "<b>Action Executed:</b> Started timer anyway upon user confirmation."
        };
      } else {
        return {
          action: "CANCEL_CONFIRMATION",
          adjustMinutes: 0,
          customDuration: null,
          responseSpeech: "Alright, cancelled. Keeping the laundry timer inactive. Better to stay safe!",
          responseHtml: "<b>Action:</b> Cancelled timer start."
        };
      }
    }

    if (commandWantsTimer && isWeatherUnsafe) {
      return {
        action: "PROMPT_CONFIRMATION",
        adjustMinutes: 0,
        customDuration: parsedMinutes,
        responseSpeech: `It looks like it might rain soon (${rainEtaText}). Do you still want me to start the ${parsedMinutes} minutes timer anyway?`,
        responseHtml: `<div class='text-amber-500 font-bold'>⚠️ Warning: Rain expected.</div> Do you still want to start the ${parsedMinutes}m timer anyway?`
      };
    }

    if (commandWantsWeatherCheck && isWeatherUnsafe) {
      return {
        action: "ANSWER_ONLY",
        adjustMinutes: 0,
        customDuration: null,
        responseSpeech: `I wouldn't recommend it. Rain is expected in your area soon (${rainEtaText}). Better to dry them indoors today!`,
        responseHtml: "<span class='text-rose-500 font-bold'>⚠️ Rain expected soon!</span> Better to dry clothes indoors."
      };
    }

    if (commandWantsWeatherCheck && !isWeatherUnsafe) {
      return {
        action: "START_DRYING",
        adjustMinutes: 0,
        customDuration: 120,
        responseSpeech: "The weather looks clear for the next few hours! You're good to hang your laundry.",
        responseHtml: "<b>Action Executed:</b> Automatically started default 2-hour timer."
      };
    }

    if (commandWantsTimer && !isWeatherUnsafe) {
      return {
        action: "START_DRYING",
        adjustMinutes: 0,
        customDuration: parsedMinutes,
        responseSpeech: `The weather looks perfectly safe! Starting your drying timer for ${parsedMinutes} minutes now.`,
        responseHtml: `<b>Action Executed:</b> Started ${parsedMinutes} minutes timer.`
      };
    }

    if (cmd.includes("finish") || cmd.includes("stop") || cmd.includes("collect") || cmd.includes("remove") || cmd.includes("bring") || cmd.includes("take down") || cmd.includes("done")) {
      return {
        action: "STOP_DRYING",
        adjustMinutes: 0,
        responseSpeech: "Stopping laundry drying. I hope your clothes are fully fresh and dry!",
        responseHtml: "<b>Action Executed:</b> Stopped drying timer."
      };
    }

    if (cmd.includes("mute") || cmd.includes("silence") || cmd.includes("stop alarm") || cmd.includes("turn off alarm") || cmd.includes("stop sound")) {
      return {
        action: "MUTE_ALARM",
        adjustMinutes: 0,
        responseSpeech: "Alarm silenced.",
        responseHtml: "<b>Action Executed:</b> Silenced active rain alarm."
      };
    }
    
    // Check for add time
    const matchesAdd = cmd.match(/(?:add|increase|more)\s+(\d+)\s*(?:minute|min)/);
    if (matchesAdd) {
      const mins = parseInt(matchesAdd[1], 10);
      return {
        action: "ADJUST_TIMER",
        adjustMinutes: mins,
        responseSpeech: `Added ${mins} minutes to the drying tracker.`,
        responseHtml: `<b>Action Executed:</b> Added ${mins} minutes.`
      };
    }
    // Check for subtract time
    const matchesSub = cmd.match(/(?:subtract|decrease|less|reduce)\s+(\d+)\s*(?:minute|min)/);
    if (matchesSub) {
      const mins = parseInt(matchesSub[1], 10);
      return {
        action: "ADJUST_TIMER",
        adjustMinutes: -mins,
        responseSpeech: `Reduced the drying tracker by ${mins} minutes.`,
        responseHtml: `<b>Action Executed:</b> Subtracted ${mins} minutes.`
      };
    }

    // Default conversational answer
    let text = "I am ready. Tell me to 'hang laundry', 'finish laundry', 'add 10 minutes', or ask about weather.";
    
    return {
      action: "ANSWER_ONLY",
      adjustMinutes: 0,
      customDuration: null,
      responseSpeech: text,
      responseHtml: `<div>${text}</div>`
    };
  };

  try {
    const res = await fetch("/api/voice-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.action) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend voice command failed, using local parsing fallback:", err);
  }
  return runLocalFallback();
}
