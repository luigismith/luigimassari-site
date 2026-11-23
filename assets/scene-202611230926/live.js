// Modalità "Dal vivo" della scena: la luce segue il sole vero e il tempo segue il meteo del posto.
// - La luce si calcola qui, da data, ora e coordinate: nessun servizio esterno.
// - Il meteo viene da MET Norway (api.met.no, Locationforecast 2.0), chiesto dal browser del visitatore
//   solo quando sceglie questa modalità. Regole del servizio: coordinate con pochi decimali, nessuna
//   intestazione personalizzata, la stessa richiesta non si ripete prima della scadenza indicata dalla
//   risposta (e comunque non prima di mezz'ora), citazione «MET Norway» visibile accanto ai dati.
// - La posizione si chiede solo su scelta del visitatore, si arrotonda a un decimale di grado (circa 10 km)
//   e non si salva da nessuna parte: resta in memoria finché la pagina è aperta. Se manca si usa Taranto.

export const TARANTO = { lat: 40.5, lon: 17.2 };
const MET = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const HOUR = 60 * 60 * 1000, HALF_HOUR = HOUR / 2;
const RAD = Math.PI / 180;
const norm = (deg) => ((deg % 360) + 360) % 360;

// Vento: dai metri al secondo a un valore 0..1 per il mare. 0 fino a circa 1 m/s (specchio d'acqua),
// 1 da 12 m/s in su (mare mosso, creste); la curva sale presto e si ammorbidisce ai due capi.
// 0.5 e' il mare di sempre (a circa 5 m/s): e' anche il valore dei temi fissi e quello usato senza dati.
export const WIND_DEFAULT = 0.5;
export function windLevel(ms) {
  const x = Math.min(1, Math.max(0, (ms - 1) / 11)), y = Math.pow(x, 0.7);
  return y * y * (3 - 2 * y);
}

// Altezza del sole sull'orizzonte in gradi (formule a bassa precisione dell'Astronomical Almanac:
// l'errore resta ben sotto il mezzo grado, più che sufficiente per decidere quanta luce c'è).
export function sunAltitude(date, lat, lon) {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;       // giorni dal mezzogiorno del 1/1/2000
  const g = norm(357.528 + 0.9856003 * d) * RAD;                     // anomalia media
  const lambda = norm(280.46 + 0.9856474 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // longitudine eclittica
  const eps = (23.439 - 0.0000004 * d) * RAD;                        // inclinazione dell'asse terrestre
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)); // ascensione retta
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));           // declinazione
  const gmst = norm((18.697374558 + 24.06570982441908 * d) * 15);    // tempo siderale di Greenwich, in gradi
  const hour = (gmst + lon) * RAD - ra;                              // angolo orario
  const phi = lat * RAD;
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hour)) / RAD;
}

// 0 = notte, 1 = giorno; in mezzo il crepuscolo, con il sole tra 6 gradi sotto e 6 sopra l'orizzonte
export function daylight(alt) {
  const x = Math.min(1, Math.max(0, (alt + 6) / 12));
  return x * x * (3 - 2 * x);
}

// Dalla risposta di MET Norway alle cose che servono alla scena:
// rain 0 asciutto, 0.5 pioggia debole, 1 pioggia forte; cloud 0 sereno, 1 coperto; kind = chiave del testo; temp in gradi;
// wind 0..1 (vedi windLevel) e windMs in m/s, con un quarto della raffica sopra il vento medio; senza il dato restano null.
export function readWeather(json, date = new Date()) {
  const series = json && json.properties && json.properties.timeseries;
  if (!Array.isArray(series) || !series.length) return null;
  let best = series[0], gap = Infinity;                               // la voce più vicina all'ora attuale
  for (const s of series.slice(0, 8)) {
    const g = Math.abs(new Date(s.time).getTime() - date.getTime());
    if (g < gap) { best = s; gap = g; }
  }
  const data = best.data || {};
  const now = (data.instant && data.instant.details) || {};
  const next = data.next_1_hours || data.next_6_hours || {};          // l'ultima ora della serie non ha next_1_hours
  const code = String((next.summary && next.summary.symbol_code) || "").replace(/_(day|night|polartwilight)$/, "");
  const mm = next.details && typeof next.details.precipitation_amount === "number" ? next.details.precipitation_amount : 0;
  const pct = typeof now.cloud_area_fraction === "number" ? now.cloud_area_fraction : null;
  const light = code.startsWith("light"), heavy = code.startsWith("heavy");
  let kind, rain = 0;
  if (/thunder/.test(code)) { kind = "thunder"; rain = light ? 0.6 : 1; }
  else if (/snow/.test(code)) { kind = "snow"; rain = light ? 0.4 : 0.7; }
  else if (/sleet/.test(code)) { kind = "sleet"; rain = light ? 0.4 : 0.7; }
  else if (/rain/.test(code)) { kind = light ? "lightrain" : heavy ? "heavyrain" : "rain"; rain = light ? 0.5 : heavy ? 1 : 0.8; }
  else if (mm >= 0.2) { kind = mm >= 2.5 ? "rain" : "lightrain"; rain = mm >= 2.5 ? 0.8 : 0.5; } // il simbolo tace ma piove
  else if (code === "fog") kind = "fog";
  else if (code === "cloudy") kind = "cloudy";
  else if (code === "partlycloudy") kind = "partly";
  else if (code === "fair") kind = "fair";
  else if (code === "clearsky") kind = "clear";
  else kind = pct === null ? "partly" : pct < 15 ? "clear" : pct < 45 ? "fair" : pct < 80 ? "partly" : "cloudy";
  let cloud = pct !== null ? pct / 100 : { clear: 0.05, fair: 0.25, partly: 0.55 }[kind] ?? 1;
  if (kind === "fog") cloud = 1;
  if (rain >= 0.8) cloud = Math.max(cloud, 0.7);
  const temp = typeof now.air_temperature === "number" ? Math.round(now.air_temperature) : null;
  let wind = null, windMs = null;
  if (typeof now.wind_speed === "number" && now.wind_speed >= 0) {
    const gust = typeof now.wind_speed_of_gust === "number" ? Math.max(now.wind_speed_of_gust, now.wind_speed) : now.wind_speed;
    wind = windLevel(now.wind_speed + 0.25 * (gust - now.wind_speed));
    windMs = Math.round(now.wind_speed * 10) / 10;
  }
  // le prossime ore, una per una: temperatura e pioggia, per la curva proiettata sul vetro.
  // Ci si ferma al primo buco: piu' avanti la serie passa a passi di sei ore.
  const hours = [];
  let prev = 0;
  for (const s of series) {
    const t = new Date(s.time).getTime(), d = s.data || {};
    if (t < date.getTime() - HOUR / 2) continue;
    const it = d.instant && d.instant.details, n1 = d.next_1_hours;
    if (!it || typeof it.air_temperature !== "number" || !n1 || (prev && t - prev > HOUR * 1.5)) break;
    hours.push({ time: t, temp: it.air_temperature, mm: (n1.details && n1.details.precipitation_amount) || 0 });
    prev = t;
    if (hours.length === 13) break;
  }
  return { rain, cloud: Math.min(1, Math.max(0, cloud)), kind, temp, wind, windMs, hours };
}

const forecasts = new Map(); // ultima risposta per ogni posto, con la sua scadenza: in memoria, mai su disco

export class LiveMode {
  // onChange riceve lo stato a ogni aggiornamento:
  // { day, alt, warm, rain, cloud, kind, temp, wind, windMs, hours: [{ time, temp, mm }], weather: "wait" | "ok" | "none", where: "you" | "taranto", date }
  // (wind 0..1 per il mare, WIND_DEFAULT se manca il dato; windMs in m/s o null)
  constructor({ onChange, clock = () => new Date() }) {
    this.onChange = onChange;
    this.clock = clock;
    this.active = false;
    this.paused = false;
    this.run = 0;
    this.place = TARANTO;
    this.where = "taranto";
    this.forecast = null;
    this.weather = "wait";
    this.state = null;
  }

  // ask: true solo quando è il visitatore a scegliere la modalità (allora il browser può chiedere la posizione)
  start({ ask = false } = {}) {
    this.stop();
    this.active = true;
    this.paused = false;
    const run = ++this.run;
    this.forecast = null;
    this.weather = "wait";
    this.tick();                                  // subito la luce, con il posto che si conosce già
    this.timer = setInterval(() => this.tick(), 60000);
    this.locate(ask).then((pos) => {
      if (run !== this.run) return;
      if (pos) { this.place = pos; this.where = "you"; }
      this.tick();
      this.loadWeather(run);
    });
  }

  stop() {
    this.active = false;
    this.run++;
    clearInterval(this.timer);
    clearTimeout(this.weatherTimer);
    if (this.request) this.request.abort();
  }

  // scena nascosta o scheda non visibile: niente orologio e niente richieste finché non si torna
  pause() {
    if (!this.active || this.paused) return;
    this.paused = true;
    clearInterval(this.timer);
    clearTimeout(this.weatherTimer);
  }
  resume() {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.tick();
    this.timer = setInterval(() => this.tick(), 60000);
    this.loadWeather(this.run);
  }

  async locate(ask) {
    const geo = navigator.geolocation;
    if (!geo) return null;
    if (!ask) {
      // senza una scelta del visitatore la richiesta non deve comparire: la posizione si usa solo se il permesso c'è già
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state !== "granted") return null;
      } catch (e) { return null; }
    }
    return new Promise((resolve) => {
      geo.getCurrentPosition(
        (p) => resolve({ lat: Math.round(p.coords.latitude * 10) / 10, lon: Math.round(p.coords.longitude * 10) / 10 }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: HALF_HOUR },
      );
    });
  }

  async loadWeather(run) {
    const lat = this.place.lat.toFixed(1), lon = this.place.lon.toFixed(1), key = lat + "," + lon;
    let entry = forecasts.get(key);
    if (!entry || entry.expires <= Date.now()) {
      try {
        this.request = new AbortController();
        const res = await fetch(`${MET}?lat=${lat}&lon=${lon}`, { signal: this.request.signal });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const expires = Date.parse(res.headers.get("Expires") || "");
        entry = { json, expires: Math.max(Date.now() + HALF_HOUR, Number.isNaN(expires) ? 0 : expires) };
        forecasts.set(key, entry);
      } catch (e) {
        if (run !== this.run || this.paused) return;
        this.weather = "none";                   // resta la luce calcolata; si riprova tra mezz'ora
        this.tick();
        clearTimeout(this.weatherTimer);
        this.weatherTimer = setTimeout(() => this.loadWeather(run), HALF_HOUR);
        return;
      }
    }
    if (run !== this.run) return;
    this.forecast = entry.json;
    this.weather = "ok";
    this.tick();
    clearTimeout(this.weatherTimer);              // un solo promemoria alla volta, anche dopo una pausa
    if (!this.paused) this.weatherTimer = setTimeout(() => this.loadWeather(run), Math.max(60000, entry.expires - Date.now() + 5000));
  }

  tick() {
    if (!this.active) return;
    const date = this.clock();
    const alt = sunAltitude(date, this.place.lat, this.place.lon), day = daylight(alt);
    const w = this.weather === "ok" ? readWeather(this.forecast, date) : null;
    this.state = {
      day, alt, warm: 4 * day * (1 - day),
      rain: w ? w.rain : 0, cloud: w ? w.cloud : 0.35, kind: w ? w.kind : null, temp: w ? w.temp : null,
      wind: w && w.wind !== null ? w.wind : WIND_DEFAULT, windMs: w ? w.windMs : null, hours: w ? w.hours : null,
      weather: w ? "ok" : this.weather === "ok" ? "none" : this.weather,
      where: this.where, date,
    };
    this.onChange(this.state);
  }
}
