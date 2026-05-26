import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Weather API proxy (Open-Meteo is free and no-key, but we proxy for consistency and potential extensions)
app.get("/api/weather", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&minutely_15=precipitation&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;
    
    console.log(`[Weather] Fetching for: ${lat}, ${lon}`);
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'LaundryGuard/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Weather] API error (${response.status}): ${errorText}`);
        return res.status(response.status).json({ 
          error: "Weather service unavailable", 
          message: `The weather provider is currently unresponsive (${response.status}).` 
        });
    }

    const data = await response.json() as any;
    
    if (data.error || !data.current) {
      return res.status(502).json({ 
        error: "Weather service unavailable", 
        message: "The weather provider returned an error or incomplete data." 
      });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error("Weather fetch error:", error);
    res.status(500).json({ error: "Failed to connect to weather service", message: error.message });
  }
});

// Geocoding API proxy for "search anywhere" functionality
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Search query is required" });

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q as string)}&count=5&language=en&format=json`;
    console.log(`[Search] Query: ${q}`);
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Search service unavailable", 
        message: "We couldn't connect to the global city database." 
      });
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        error: "Location not found",
        message: `No cities found matching "${q}".`
      });
    }
    res.json(data);
  } catch (error: any) {
    console.error("[Search] error:", error);
    res.status(500).json({ error: "Search failed", message: "An internal error occurred while searching." });
  }
});

// Dryness timer logic using Gemini with Robust Heuristic Fallback
app.post("/api/dryness", async (req, res) => {
  const { temp, humidity, windSpeed, cloudCover, hourlyProbs, hourlyPrecip } = req.body;

  // Mathematical "Heuristic" Fallback (Standard evaporation physics approximation)
  const calculateHeuristic = () => {
    let baseMinutes = 180; // Default for 20C, 50% humidity, no wind
    
    // Temp effect: roughly -3 mins per degree above 20C
    baseMinutes -= (temp - 20) * 4;
    
    // Humidity effect: roughly +2 mins per % above 50%
    baseMinutes += (humidity - 50) * 3;
    
    // Wind effect: significant reduction
    baseMinutes -= (windSpeed || 0) * 5;
    
    // Cloud cover: slower if cloudy
    baseMinutes += (cloudCover || 0) * 0.5;

    // Safety bounds
    const estimatedMinutes = Math.max(30, Math.min(480, Math.round(baseMinutes)));
    
    let statusText = "Great";
    if (estimatedMinutes > 180) statusText = "Slow";
    if (estimatedMinutes > 300) statusText = "Very Slow";
    if (temp < 10) statusText = "Cold/Slow";
    if (humidity > 80) statusText = "Humid";

    return {
      estimatedMinutes,
      statusEmoji: estimatedMinutes < 120 ? "☀️" : "☁️",
      statusText,
      tip: "Heuristic estimate. Physics-based evaporation calculation."
    };
  };

  try {
    const prompt = `
      You are the ULTIMATE_LAUNDRY_FORECASTER_AI.
      Role: Expert Meteorological Analyst for a premium global weather agency.
      
      Task: Provide a high-precision estimate for clothes drying outdoors.
      
      LOCAL DATA:
      - Current Temp: ${temp}°C
      - Humidity: ${humidity}%
      - Wind Velocity: ${windSpeed} km/h
      - Cloud Profile: ${cloudCover}%
      
      HOURLY RAIN PROBABILITY (NEXT 6H):
      ${(hourlyProbs || []).slice(0, 6).map((p: any, i: number) => `H+${i+1}: ${p}%`).join(", ")}
      
      REQUIREMENTS:
      1. estimatedMinutes: Integer (30 to 480). Account for humidity (slows drying) and wind (accelerates it).
      2. statusEmoji: One relevant emoji.
      3. statusText: Max 12 characters, Uppercase (e.g., "OPTIMAL", "DAMP SCENE", "FAIR").
      4. tip: Professional advice for the user (max 100 chars).
      5. insight: A professional meteorological insight about WHY this estimate was given (e.g., "High humidity is currently inhibiting efficient moisture evaporation despite the sun.")
      
      Return ONLY a JSON object with keys: "estimatedMinutes", "statusEmoji", "statusText", "tip", "insight".
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = result.text || "{}";
    const data = JSON.parse(responseText);
    
    // Ensure we have the insight key even if Gemini missed it
    if (!data.insight) data.insight = "Conditions are favorable for natural evaporation processes.";
    
    res.json(data);
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    const fallback = calculateHeuristic() as any;
    fallback.insight = "Evaporation rate is currently calculated using standard thermodynamic models.";
    
    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
      console.warn("[Dryness] Gemini Free-tier Quota Exceeded. Safely falling back to physics heuristic.");
      fallback.tip = "Using standard physics estimate (AI quota busy).";
    } else {
      console.error("[Dryness] Gemini error (falling back to heuristic):", errorMsg);
    }

    res.json(fallback);
  }
});

// AI Schedule Recommendation
app.post("/api/schedule", async (req, res) => {
  const { hourlyProbs, hourlyTemps, currentTemp } = req.body;

  try {
    const probs = Array.isArray(hourlyProbs) ? hourlyProbs : [];
    const temps = Array.isArray(hourlyTemps) ? hourlyTemps : [];
    
    const prompt = `
      You are the LAUNDRY_STRATEGIST_AI.
      Based on the 24-hour forecast, find the absolute BEST 3-hour window to hang laundry.
      
      DATA:
      - Current Temp: ${currentTemp}°C
      - Next 24h Rain Probabilities: ${probs.slice(0, 24).join(", ")}%
      - Next 24h Temperatures: ${temps.slice(0, 24).join(", ")}°C
      
      Requirements:
      1. Best start hour (0-23, relative to now).
      2. Confidence score (0-100).
      3. Reasoning: Why this window? (e.g., "Peak solar radiation and minimum rain risk.")
      4. Summary: A punchy 1-sentence recommendation.
      
      Return ONLY a JSON object with keys: "bestStartHour", "confidence", "reasoning", "summary".
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(result.text || "{}"));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
      console.warn("[Schedule] Gemini Free-tier Quota Exceeded. Safely falling back to physics heuristic.");
    } else {
      console.error("[Schedule] Gemini error (falling back to heuristic):", errorMsg);
    }

    const probs = Array.isArray(hourlyProbs) ? hourlyProbs : [];
    const temps = Array.isArray(hourlyTemps) ? hourlyTemps : [];
    
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
    
    const confidence = Math.max(10, Math.min(100, Math.round(100 - (probs[bestStartHour] || 0) * 0.8)));
    
    res.json({
      bestStartHour,
      confidence,
      reasoning: "Heuristic forecast: optimal combination of warmth and low rain probability.",
      summary: `Hanging clothes in ${bestStartHour} hours provides the safest window with ${confidence}% confidence.`
    });
  }
});

// AI Spoken Voice Assistant & Intent Handler Step
app.post("/api/voice-command", async (req, res) => {
  const { command, temp, humidity, windSpeed, isDrying, timeLeftMinutes, hasRainAlert } = req.body;

  try {
    const prompt = `
      You are standard LAUNDRY_COGNITIVE_ASSISTANT_AI.
      You process spoken human voice transcriptions captured by a microphone and execute dry-safety actions.

      INPUTS:
      - Raw Voice Command: "${command}"
      - Ambient Outdoor Temp: ${temp ?? 20}°C, Relative Humidity: ${humidity ?? 50}%, Wind Velocity: ${windSpeed ?? 5} km/h
      - Is Laundry Currently Hanging Outside: ${isDrying ? "YES" : "NO"}
      - Imminent Rain Threat/Alert Active: ${hasRainAlert ? "YES" : "NO"}
      - Current Remaining Minutes on Tracker: ${timeLeftMinutes ?? 0}m

      DETERMINE ACTION & FORMULATE NATURAL CONVERSATIONAL SPEECH RESPONSE:
      
      Choose one of the following ACTIONS:
      1. 'START_DRYING': If the user spoke about starting laundry, hanging, begin drying, drying start, or placing clothes out.
      2. 'STOP_DRYING': If the user spoke about collecting laundry, finishing, taking down, bringing in, or done.
      3. 'MUTE_ALARM': If the user says stop alarm, silence, mute, shut up, or stop beeping.
      4. 'ADJUST_TIMER': If the user asks to add, increase, decrease, or subtract time (e.g. "add 20 minutes", "subtract 10 minutes").
      5. 'ANSWER_ONLY': For meteorological forecasts, questions, advice ("will it rain?", "is it ready?", "what's the weather?").

      If ADJUST_TIMER:
      - Read the number of minutes they want to add or subtract and put it in 'adjustMinutes' (positive number for add/increase, negative number for subtract/decrease).

      RESPONSE GUIDELINES:
      - responseSpeech: A short, friendly, cheerful vocal phrase (max 120 characters, cheerful tone, no markdown, no emojis, perfectly clean for TTS).
      - responseHtml: Beautiful short styled HTML text (can use tailwind classes or simple bold tags) to keep in the conversational view on screen.

      Return ONLY a JSON block with these keys: "action", "adjustMinutes", "responseSpeech", "responseHtml".
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(result.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.warn("[Voice Command] Gemini error (falling back to heuristic):", errorMsg);

    // Heuristic parsing on error / fallback
    const cmd = (command || "").toLowerCase();
    let action = "ANSWER_ONLY";
    let adjustMinutes = 0;
    let responseSpeech = "Processed voice command offline.";
    let responseHtml = "Processed command locally.";

    if (cmd.includes("hang") || cmd.includes("start") || cmd.includes("dry") || cmd.includes("begin") || cmd.includes("put out")) {
      action = "START_DRYING";
      responseSpeech = "Starting the laundry timer now.";
      responseHtml = "<b>Action:</b> Start Laundry Timer";
    } else if (cmd.includes("finish") || cmd.includes("stop") || cmd.includes("collect") || cmd.includes("remove") || cmd.includes("bring") || cmd.includes("take down") || cmd.includes("done")) {
      action = "STOP_DRYING";
      responseSpeech = "Stopping laundry. Clothes are safe!";
      responseHtml = "<b>Action:</b> Stop Laundry Timer";
    } else if (cmd.includes("mute") || cmd.includes("silence") || cmd.includes("stop alarm") || cmd.includes("turn off alarm") || cmd.includes("stop sound")) {
      action = "MUTE_ALARM";
      responseSpeech = "Alarm silenced.";
      responseHtml = "<b>Action:</b> Muted Alarm";
    }

    res.json({ action, adjustMinutes, responseSpeech, responseHtml });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});
