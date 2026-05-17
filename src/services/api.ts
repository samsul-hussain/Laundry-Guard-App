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
  const res = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error("Could not generate schedule.");
  }
  return res.json();
}

export async function searchLocation(query: string): Promise<LocationResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Could not complete location search.");
  }
  const data = await res.json();
  return data.results || [];
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Weather check failed. Try searching for a specific city.");
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
  const res = await fetch("/api/dryness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Could not calculate drying time.");
  }
  return res.json();
}
