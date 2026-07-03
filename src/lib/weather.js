// Free, no-key weather via Open-Meteo: geocode the event's location text,
// then pull a daily forecast for the event's date. Best-effort only - if
// geocoding finds nothing or the date is outside the forecast window
// (Open-Meteo only forecasts ~16 days ahead), callers should just hide the
// widget rather than show an error.

const WEATHER_CODES = {
  0: { icon: '☀️', label: { de: 'Klar', en: 'Clear' } },
  1: { icon: '🌤️', label: { de: 'Überwiegend klar', en: 'Mostly clear' } },
  2: { icon: '⛅', label: { de: 'Teilweise bewölkt', en: 'Partly cloudy' } },
  3: { icon: '☁️', label: { de: 'Bedeckt', en: 'Overcast' } },
  45: { icon: '🌫️', label: { de: 'Nebel', en: 'Fog' } },
  48: { icon: '🌫️', label: { de: 'Nebel', en: 'Fog' } },
  51: { icon: '🌦️', label: { de: 'Leichter Nieselregen', en: 'Light drizzle' } },
  53: { icon: '🌦️', label: { de: 'Nieselregen', en: 'Drizzle' } },
  55: { icon: '🌦️', label: { de: 'Starker Nieselregen', en: 'Heavy drizzle' } },
  61: { icon: '🌧️', label: { de: 'Leichter Regen', en: 'Light rain' } },
  63: { icon: '🌧️', label: { de: 'Regen', en: 'Rain' } },
  65: { icon: '🌧️', label: { de: 'Starker Regen', en: 'Heavy rain' } },
  71: { icon: '🌨️', label: { de: 'Leichter Schneefall', en: 'Light snow' } },
  73: { icon: '🌨️', label: { de: 'Schneefall', en: 'Snow' } },
  75: { icon: '🌨️', label: { de: 'Starker Schneefall', en: 'Heavy snow' } },
  80: { icon: '🌦️', label: { de: 'Regenschauer', en: 'Rain showers' } },
  81: { icon: '🌦️', label: { de: 'Regenschauer', en: 'Rain showers' } },
  82: { icon: '⛈️', label: { de: 'Heftige Regenschauer', en: 'Violent rain showers' } },
  95: { icon: '⛈️', label: { de: 'Gewitter', en: 'Thunderstorm' } },
  96: { icon: '⛈️', label: { de: 'Gewitter mit Hagel', en: 'Thunderstorm with hail' } },
  99: { icon: '⛈️', label: { de: 'Gewitter mit Hagel', en: 'Thunderstorm with hail' } },
};

export function describeWeatherCode(code, lang) {
  const entry = WEATHER_CODES[code];
  if (!entry) return { icon: '🌡️', label: '' };
  return { icon: entry.icon, label: entry.label[lang] || entry.label.en };
}

async function geocode(location) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  const first = data.results?.[0];
  if (!first) return null;
  return { latitude: first.latitude, longitude: first.longitude, name: first.name };
}

export async function fetchEventWeather(location, dateISO) {
  if (!location?.trim()) return null;
  const place = await geocode(location);
  if (!place) return null;

  const date = dateISO.slice(0, 10);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${date}&end_date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  const data = await res.json();
  if (!data.daily || !data.daily.time?.length) return null;

  return {
    place: place.name,
    date: data.daily.time[0],
    weatherCode: data.daily.weathercode[0],
    tempMax: data.daily.temperature_2m_max[0],
    tempMin: data.daily.temperature_2m_min[0],
    precipitationProbability: data.daily.precipitation_probability_max?.[0] ?? null,
  };
}
