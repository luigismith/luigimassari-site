// Il cielo vero: dove stanno le stelle più luminose e la Luna (con la sua fase) per un posto e un istante.
// Serve alla modalità "Dal vivo". Formule a bassa precisione dell'Astronomical Almanac: l'errore è di
// qualche decimo di grado, invisibile a occhio. Niente dati scaricati: il catalogo sta qui sotto.
const RAD = Math.PI / 180;
const norm = (deg) => ((deg % 360) + 360) % 360;

// La vetrata guarda a sud-sud-ovest: l'azimut 0 della scena corrisponde a questa direzione (gradi da nord verso est).
// Con 205 gradi il canale navigabile, che nel panorama sta a destra, cade a sud-ovest: come lo si vede dal Mar Piccolo.
export const FACING = 205;
// Dalla vetrata si vede solo una fascia bassa di cielo: per farci stare la Luna e le stelle il cielo vero è
// mostrato in grandangolo, compresso di questo fattore in azimut e in altezza. Direzioni, ore e fasi sono vere;
// le distanze sullo schermo sono un quarto di quelle reali. Dalla vista d'insieme si vede la parte bassa
// del cielo; trascinando verso il basso lo sguardo si alza.
export const WIDE = 4;
// Parte di cielo che finisce nella texture della vetrata: azimut tra -az e +az, altezza tra 0 ed el (radianti, già compressi)
export const PATCH = { az: 0.7, el: 0.7 };

// Stelle più luminose: [ascensione retta in ore, declinazione in gradi, magnitudine, 1 se arancione] (J2000)
const BRIGHT = [
  [5.920, 7.41, 0.50, 1], [5.242, -8.20, 0.13], [5.418, 6.35, 1.64], [5.533, -0.30, 2.23], [5.603, -1.20, 1.69], [5.680, -1.94, 1.77], [5.796, -9.67, 2.09], // Orione
  [6.752, -16.72, -1.46], [6.977, -28.97, 1.50], [7.140, -26.39, 1.84], [6.378, -17.96, 1.98], [7.402, -29.30, 2.45], [7.655, 5.22, 0.34],                 // Cane Maggiore, Procione
  [7.577, 31.89, 1.58], [7.755, 28.03, 1.14, 1], [6.628, 16.40, 1.93],                                                                                    // Gemelli
  [4.599, 16.51, 0.86, 1], [5.438, 28.61, 1.65], [3.791, 24.11, 2.87],                                                                                    // Toro, Pleiadi
  [5.278, 46.00, 0.08], [5.992, 44.95, 1.90], [3.405, 49.86, 1.79], [3.136, 40.96, 2.10],                                                                 // Auriga, Perseo
  [0.140, 29.09, 2.06], [1.162, 35.62, 2.05], [2.065, 42.33, 2.10], [2.120, 23.46, 2.00, 1],                                                              // Andromeda, Ariete
  [0.675, 56.54, 2.24], [0.153, 59.15, 2.27], [0.945, 60.72, 2.47], [1.430, 60.24, 2.68], [1.907, 63.67, 3.37],                                           // Cassiopea
  [0.727, -17.99, 2.02], [3.038, 4.09, 2.53, 1],                                                                                                         // Balena
  [23.080, 15.21, 2.48], [23.063, 28.08, 2.42, 1], [0.220, 15.18, 2.83], [21.737, 9.88, 2.39, 1],                                                         // Pegaso
  [20.690, 45.28, 1.25], [20.370, 40.26, 2.20], [19.512, 27.96, 3.10], [20.770, 33.97, 2.46], [18.615, 38.78, 0.03],                                      // Cigno, Vega
  [19.847, 8.87, 0.76], [19.771, 10.61, 2.72],                                                                                                           // Aquila
  [16.490, -26.43, 1.06, 1], [17.560, -37.10, 1.62], [17.622, -43.00, 1.87], [16.005, -22.62, 2.30], [16.090, -19.81, 2.62],                              // Scorpione
  [18.403, -34.38, 1.85], [18.921, -26.30, 2.05],                                                                                                        // Sagittario
  [17.582, 12.56, 2.07], [17.173, -15.72, 2.43], [17.244, 14.39, 3.10, 1], [16.503, 21.49, 2.77],                                                         // Ofiuco, Ercole
  [14.261, 19.18, -0.05, 1], [14.750, 27.07, 2.37], [15.578, 26.71, 2.23],                                                                                // Boote, Corona Boreale
  [13.420, -11.16, 0.97], [13.036, 10.96, 2.83],                                                                                                         // Vergine
  [10.139, 11.97, 1.39], [11.818, 14.57, 2.13], [10.333, 19.84, 2.08], [9.460, -8.66, 2.00, 1],                                                           // Leone, Idra
  [11.062, 61.75, 1.79], [11.031, 56.38, 2.37], [11.897, 53.69, 2.44], [12.257, 57.03, 3.31], [12.900, 55.96, 1.77], [13.399, 54.93, 2.04], [13.792, 49.31, 1.86], // Orsa Maggiore
  [2.530, 89.26, 1.98], [14.845, 74.16, 2.08, 1], [17.943, 51.49, 2.23, 1],                                                                               // Polare, Orsa Minore, Drago
  [22.961, -29.62, 1.16], [14.848, -16.04, 2.75], [15.283, -9.38, 2.61], [21.784, -16.13, 2.87], [21.526, -5.57, 2.90], [22.096, -0.32, 2.96], [12.263, -17.54, 2.59],
];
// Stelle deboli di riempimento: non sono un catalogo, ma stanno ferme sulla sfera celeste e ruotano con le altre
const FAINT = (() => {
  let seed = 20261118;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const out = [];
  for (let i = 0; i < 1500; i++) out.push([rnd() * 24, Math.asin(2 * rnd() - 1) / RAD, 3.6 + 2.2 * Math.sqrt(rnd())]);
  return out;
})();
const STARS = BRIGHT.concat(FAINT);

const days = (date) => date.getTime() / 86400000 + 2440587.5 - 2451545.0;          // giorni dal mezzogiorno del 1/1/2000
const sidereal = (d, lon) => norm(280.46061837 + 360.98564736629 * d + lon);       // tempo siderale locale, in gradi

// coordinate equatoriali (gradi) -> altezza (radianti) e azimut (gradi da nord verso est)
function horizontal(ra, dec, lst, lat) {
  const H = (lst - ra) * RAD, d = dec * RAD, p = lat * RAD;
  const alt = Math.asin(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H));
  const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(H));
  return { alt, az: norm(az / RAD) };
}
// azimut geografico -> azimut nella scena (radianti, 0 al centro della vetrata, positivo a destra)
const sceneAz = (az) => { const a = norm(az - FACING); return ((a > 180 ? a - 360 : a) * RAD) / WIDE; };
// eclittiche (gradi) -> equatoriali (gradi)
function equatorial(lambda, beta, d) {
  const eps = (23.439 - 0.0000004 * d) * RAD, l = lambda * RAD, b = beta * RAD;
  const x = Math.cos(b) * Math.cos(l), y = Math.cos(eps) * Math.cos(b) * Math.sin(l) - Math.sin(eps) * Math.sin(b);
  const z = Math.sin(eps) * Math.cos(b) * Math.sin(l) + Math.cos(eps) * Math.sin(b);
  return { ra: norm(Math.atan2(y, x) / RAD), dec: Math.asin(z) / RAD };
}
function sun(d) {
  const g = norm(357.528 + 0.9856003 * d) * RAD;
  return equatorial(norm(280.46 + 0.9856474 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)), 0, d);
}
function moon(d) {
  const T = d / 36525, s = (a, b) => Math.sin((a + b * T) * RAD);
  const lambda = 218.32 + 481267.881 * T + 6.29 * s(135.0, 477198.87) - 1.27 * s(259.3, -413335.36) + 0.66 * s(235.7, 890534.22)
    + 0.21 * s(269.9, 954397.74) - 0.19 * s(357.5, 35999.05) - 0.11 * s(186.5, 966404.03);
  const beta = 5.13 * s(93.3, 483202.02) + 0.28 * s(228.2, 960400.89) - 0.28 * s(318.3, 6003.15) - 0.17 * s(217.6, -407332.21);
  return equatorial(norm(lambda), beta, d);
}

// Tutto quello che serve alla vetrata: le stelle sopra l'orizzonte nella parte di cielo inquadrata e la Luna.
// stars: [azimut nella scena, altezza nella scena, magnitudine, arancione]; moon: az ed el nella scena (radianti,
// compressi), altezza vera, frazione illuminata (0 nuova, 1 piena), direzione del lembo illuminato (verso il
// Sole) e se è crescente.
export function heavens(date, lat, lon) {
  const d = days(date), lst = sidereal(d, lon);
  const stars = [];
  for (const [ra, dec, mag, warm] of STARS) {
    const h = horizontal(ra * 15, dec, lst, lat);
    if (h.alt <= 0.005) continue;
    const az = sceneAz(h.az), el = h.alt / WIDE;
    if (Math.abs(az) < PATCH.az && el < PATCH.el) stars.push([az, el, mag, warm ? 1 : 0]);
  }
  const S = sun(d), M = moon(d), hs = horizontal(S.ra, S.dec, lst, lat), hm = horizontal(M.ra, M.dec, lst, lat);
  const altM = hm.alt - 0.0166 * Math.cos(hm.alt);                     // parallasse: vista da terra la Luna sta un po' più in basso
  const cosE = Math.sin(S.dec * RAD) * Math.sin(M.dec * RAD) + Math.cos(S.dec * RAD) * Math.cos(M.dec * RAD) * Math.cos((S.ra - M.ra) * RAD);
  let dx = norm(hs.az - hm.az); if (dx > 180) dx -= 360;
  dx *= RAD * Math.cos(altM);
  const dy = hs.alt - altM, len = Math.hypot(dx, dy) || 1;
  return {
    stars,
    moon: { az: sceneAz(hm.az), el: altM / WIDE, alt: altM, lit: (1 - cosE) / 2, dir: [dx / len, dy / len], waxing: norm(M.ra - S.ra) < 180, bearing: hm.az },
    sun: { alt: hs.alt, bearing: hs.az },
  };
}
