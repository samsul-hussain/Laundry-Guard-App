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
  const { 
    command, 
    temp, 
    humidity, 
    windSpeed, 
    isDrying, 
    timeLeftMinutes, 
    hasRainAlert,
    hourlyPrecip,
    hourlyProbs,
    rainThreshold,
    pendingTimerDuration 
  } = req.body;

  // 1. Live Rain API & Weather Logic Pre-Processor
  // Define safety thresholds: Unsafe if raining now (hasRainAlert) or if rain is forecasted in next 3 hours
  const thresh = typeof rainThreshold === 'number' ? rainThreshold : 30;
  const probs = Array.isArray(hourlyProbs) ? hourlyProbs : [];
  const precips = Array.isArray(hourlyPrecip) ? hourlyPrecip : [];
  
  let rainSoon = false;
  let rainSoonMinutesOffset = -1; // in minutes
  let maxNextProb = 0;
  
  // Inspect the next 3 hours (indices 0 to 3)
  for (let i = 0; i < Math.min(4, probs.length, precips.length); i++) {
    const prob = probs[i] ?? 0;
    const precip = precips[i] ?? 0;
    
    if (precip > 0.1 || prob >= thresh) {
      rainSoon = true;
      if (rainSoonMinutesOffset === -1) {
        rainSoonMinutesOffset = i * 60; // 0, 60, 120, 180 mins
      }
    }
    if (prob > maxNextProb) {
      maxNextProb = prob;
    }
  }

  const isRainingNow = hasRainAlert || (precips.length > 0 && precips[0] > 0.1);
  const isWeatherUnsafe = isRainingNow || rainSoon;
  const weatherStatus = isWeatherUnsafe ? "UNSAFE" : "SAFE";

  const rainEtaText = isRainingNow 
    ? "Raining right now" 
    : rainSoonMinutesOffset === 0 
      ? "Raining within the next hour" 
      : rainSoonMinutesOffset > 0 
        ? `Rain expected in about ${rainSoonMinutesOffset} minutes` 
        : "No rain expected in the next 3 hours";

  try {
    const prompt = `
      You are standard LAUNDRY_COGNITIVE_ASSISTANT_AI.
      You process spoken human voice transcriptions captured by a microphone and execute dry-safety actions.

      INPUTS:
      - Raw Voice Command: "${command || ""}"
      - Ambient Outdoor Temp: ${temp ?? 20}°C, Relative Humidity: ${humidity ?? 50}%, Wind Velocity: ${windSpeed ?? 5} km/h
      - Is Laundry Currently Hanging Outside: ${isDrying ? "YES" : "NO"}
      - Imminent Rain Threat/Alert Active: ${isRainingNow ? "YES" : "NO"}
      - Calculated Weather Safety for next 3 hours: ${weatherStatus} (Expected Rain: ${isWeatherUnsafe ? "YES" : "NO"})
      - Rain Estimated Time of Arrival (ETA): ${rainEtaText}
      - Current Remaining Minutes on Tracker: ${timeLeftMinutes ?? 0}m
      - Pending Confirmation Timer Duration: ${pendingTimerDuration ?? "NONE"}

      DETERMINE ACTION & FORMULATE NATURAL CONVERSATIONAL SPEECH RESPONSE:
      
      Determine the action and return ONE of these action strings:
      1. 'START_DRYING': 
         - User wants to start, begin, hang, dry, put clothes out.
         - OR user asks a generic Weather Check question ("May I hang clothes?", "Is it gonna rain?") AND the weather is SAFE. In this case, start a default 120-minute (2 hours) timer.
         - OR user says "yes"/"confirm"/"start anyway" when there was a pending timer confirmation active.
      2. 'PROMPT_CONFIRMATION':
         - User wants to start a timer (with or without specified minutes) BUT the weather is UNSAFE (expected rain). Prompt them for explicit confirmation: "Do you still want me to start the timer anyway?". Keep "customDuration" as the requested duration (or 120 minutes if not specified).
      3. 'CANCEL_CONFIRMATION':
         - User says "no"/"cancel"/"don't" when there was a pending timer confirmation active.
      4. 'STOP_DRYING': 
         - User says finish, stop, bring in, collect laundry, done.
      5. 'MUTE_ALARM': 
         - User says stop alarm, silence, mute, silence alarm.
      6. 'ADJUST_TIMER': 
         - User specifically says "add X minutes" or "subtract X minutes". Adjust minutes goes into 'adjustMinutes' (positive or negative number).
      7. 'ANSWER_ONLY': 
         - User asks about weather or rain and weather is UNSAFE. Direct them NOT to hang laundry, with NO active timer.
         - OR user asks general weather questions without intent to hang or dry clothes.

      FOR TEMPORAL REQUESTS (Combined weather & timer logic):
      - If the user specifies or implies a duration (e.g., "90 minutes", "set a 2 hour timer", "for 1 hour", "for an hour"):
        - Parse the duration value in MINUTES and set 'customDuration' to that positive integer.
        - Treat "an hour" or "1 hour" as 60, "1.5 hours" or "90 minutes" as 90, "2 hours" as 120, etc.
        - If no duration is requested, use null (or 120 default ONLY if starting drying due to a weather check).

      RESPONSE SPEECH AND HTML RULES:
      - If user asks if they can hang clothes and it is UNSAFE: "I wouldn't recommend it. Rain is expected in your area around [ETA]. Better to dry them indoors today!"
      - If user asks if they can hang clothes and it is SAFE: "The weather looks clear for the next few hours! You're good to hang your laundry." (Action: START_DRYING, customDuration: 120)
      - If user does combined request ("Hang clothes for X minutes") and it is UNSAFE: Warn them first: "It looks like it might rain soon. Do you still want me to start the [X] minutes timer anyway?" (Action: PROMPT_CONFIRMATION)
      - If user does combined request ("Hang clothes for X minutes") and it is SAFE: "The weather looks perfectly safe! Starting your drying timer for [X] minutes now." (Action: START_DRYING)

      Return ONLY a JSON block with these keys: "action", "adjustMinutes", "customDuration", "responseSpeech", "responseHtml".
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
    let customDuration: number | null = null;
    let responseSpeech = "Processed voice command offline.";
    let responseHtml = "Processed command locally.";

    // Parse minutes in cmd
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

    if (pendingTimerDuration) {
      // Handle pending confirmation yes/no
      if (cmd.includes("yes") || cmd.includes("sure") || cmd.includes("okay") || cmd.includes("confirm") || cmd.includes("do it")) {
        action = "START_DRYING";
        customDuration = pendingTimerDuration;
        responseSpeech = "Understood. Starting the timer anyway. Keep an eye out for alerts!";
        responseHtml = "<b>Action Executed:</b> Started timer anyway upon user confirmation.";
      } else {
        action = "CANCEL_CONFIRMATION";
        responseSpeech = "Alright, cancelled. Keeping the laundry timer inactive. Better to stay safe!";
        responseHtml = "<b>Action:</b> Cancelled timer start.";
      }
    } else if (commandWantsTimer && isWeatherUnsafe) {
      // Combined timer request, unsafe weather -> Prompt confirmation
      action = "PROMPT_CONFIRMATION";
      customDuration = parsedMinutes;
      responseSpeech = `It looks like it might rain soon (${rainEtaText}). Do you still want me to start the ${parsedMinutes} minutes timer anyway?`;
      responseHtml = `<div class='text-amber-500 font-bold'>⚠️ Warning: Rain expected.</div> Do you still want to start the ${parsedMinutes}m timer anyway? (Say 'Yes' or 'No')`;
    } else if (commandWantsWeatherCheck && isWeatherUnsafe) {
      // Simple weather check, unsafe weather -> Answer Only Warn
      action = "ANSWER_ONLY";
      responseSpeech = `I wouldn't recommend it. Rain is expected in your area (${rainEtaText}). Better to dry them indoors today!`;
      responseHtml = `<span class='text-rose-500 font-bold'>⚠️ Rain Expected soon!</span> Better to dry clothes indoors.`;
    } else if (commandWantsWeatherCheck && !isWeatherUnsafe) {
      // Simple weather check, safe weather -> Auto Hang default timer (120 mins)
      action = "START_DRYING";
      customDuration = 120;
      responseSpeech = "The weather looks clear for the next few hours! You're good to hang your laundry.";
      responseHtml = "<b>Action:</b> Automatically started default 2-hour timer.";
    } else if (commandWantsTimer && !isWeatherUnsafe) {
      // Combined or separate start request, safe weather -> Start Drying!
      action = "START_DRYING";
      customDuration = parsedMinutes;
      responseSpeech = `The weather looks perfectly safe! Starting your drying timer for ${parsedMinutes} minutes now.`;
      responseHtml = `<b>Action Executed:</b> Started ${parsedMinutes} minutes timer.`;
    } else if (cmd.includes("finish") || cmd.includes("stop") || cmd.includes("collect") || cmd.includes("remove") || cmd.includes("bring") || cmd.includes("take down") || cmd.includes("done")) {
      action = "STOP_DRYING";
      responseSpeech = "Stopping laundry. Clothes are safe!";
      responseHtml = "<b>Action:</b> Stopped laundry drying.";
    } else if (cmd.includes("mute") || cmd.includes("silence") || cmd.includes("stop alarm") || cmd.includes("turn off alarm") || cmd.includes("stop sound")) {
      action = "MUTE_ALARM";
      responseSpeech = "Alarm silenced.";
      responseHtml = "<b>Action:</b> Muted Active Alarm.";
    }

    res.json({ action, adjustMinutes, customDuration, responseSpeech, responseHtml });
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
