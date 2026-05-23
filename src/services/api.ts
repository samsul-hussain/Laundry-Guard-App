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

export async function getLaundrySchedule(params: {
  hourlyProbs: number[];
  hourlyTemps: number[];
  currentTemp: number;
}): Promise<ScheduleInfo> {
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
          return data;
        }
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend schedule failed, using client heuristic fallback:", err);
  }

  // Client fallback heuristic
  const probs = Array.isArray(params.hourlyProbs) ? params.hourlyProbs : [];
  const temps = Array.isArray(params.hourlyTemps) ? params.hourlyTemps : [];
  
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

export async function getDrynessEstimate(params: {
  temp: number;
  humidity: number;
  windSpeed: number;
  cloudCover: number;
  hourlyProbs?: number[];
  hourlyPrecip?: number[];
}): Promise<DrynessInfo> {
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
          return data;
        }
      } catch {
        // Not JSON, fall back
      }
    }
  } catch (err) {
    console.warn("Backend dryness estimate failed, using client thermodynamic fallback:", err);
  }

  // Frontend thermodynamic fallback
  const { temp, humidity, windSpeed = 0, cloudCover = 0 } = params;
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
}
