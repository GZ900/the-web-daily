const CACHE_DURATION_MS =
  15 * 60 * 1000;

const PROVIDER_TIMEOUT_MS = 5000;

const LOCATION = {
  name: "Tel Aviv",
  latitude: 32.0853,
  longitude: 34.7818
};

let cachedWeather = null;
let cacheExpiresAt = 0;
let pendingRequest = null;

function getWeatherDescription(code) {
  if (code === 0) {
    return "Clear sky";
  }

  if ([1, 2].includes(code)) {
    return "Partly cloudy";
  }

  if (code === 3) {
    return "Overcast";
  }

  if ([45, 48].includes(code)) {
    return "Fog";
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return "Drizzle";
  }

  if ([61, 63, 65, 66, 67].includes(code)) {
    return "Rain";
  }

  if ([71, 73, 75, 77].includes(code)) {
    return "Snow";
  }

  if ([80, 81, 82].includes(code)) {
    return "Rain showers";
  }

  if ([85, 86].includes(code)) {
    return "Snow showers";
  }

  if ([95, 96, 99].includes(code)) {
    return "Thunderstorm";
  }

  return "Unknown conditions";
}

async function fetchWeatherFromService() {
  const params =
    new URLSearchParams({
      latitude:
        String(LOCATION.latitude),

      longitude:
        String(LOCATION.longitude),

      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "weather_code",
        "wind_speed_10m"
      ].join(","),

      timezone: "Asia/Jerusalem",
      timeformat: "unixtime"
    });

  const url =
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response =
    await fetch(url, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(
      `Weather service returned status ${response.status}`
    );
  }

  const data =
    await response.json();

  if (!data.current) {
    throw new Error(
      "Weather service returned no current weather data"
    );
  }

  const observedAt = Number(data.current.time) * 1000;
  const fetchedAt = Date.now();
  if (!Number.isFinite(observedAt) || observedAt > fetchedAt ||
      fetchedAt - observedAt > CACHE_DURATION_MS) {
    throw new Error("Weather observation is outside the fifteen-minute freshness limit");
  }

  const weather = {
    location: LOCATION.name,

    temperature:
      data.current.temperature_2m,

    apparentTemperature:
      data.current.apparent_temperature,

    humidity:
      data.current.relative_humidity_2m,

    precipitation:
      data.current.precipitation,

    windSpeed:
      data.current.wind_speed_10m,

    weatherCode:
      data.current.weather_code,

    description:
      getWeatherDescription(
        data.current.weather_code
      ),

    weatherTime:
      new Date(observedAt).toISOString(),

    fetchedAt:
      new Date(),

    stale: false
  };

  cachedWeather = weather;

  cacheExpiresAt =
    Math.min(fetchedAt, observedAt) + CACHE_DURATION_MS;

  console.log(
    "Weather cache refreshed from Open-Meteo"
  );

  return weather;
}

async function getWeather() {
  if (
    cachedWeather &&
    Date.now() < cacheExpiresAt
  ) {
    return cachedWeather;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  // Store the handled promise so all concurrent callers receive the same
  // unavailable result on failure, rather than an unhandled rejection.
  pendingRequest = fetchWeatherFromService()
    .catch(error => {
      console.error("Weather service error:", error.message);
      return null;
    })
    .finally(() => { pendingRequest = null; });
  return pendingRequest;
}

module.exports = {
  getWeather
};