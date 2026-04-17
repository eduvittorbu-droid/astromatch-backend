import swisseph from 'swisseph';
import { geocode } from './geocode.js';

swisseph.swe_set_ephe_path('./ephe');

function toJulianDay(date, time) {
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  const jsDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return swisseph.swe_julday(
    jsDate.getUTCFullYear(),
    jsDate.getUTCMonth() + 1,
    jsDate.getUTCDate(),
    jsDate.getUTCHours() + jsDate.getUTCMinutes() / 60,
    swisseph.SE_GREG_CAL
  );
}

export async function generateChart({ birthDate, birthTime, birthCity, birthState, birthCountry }) {
  const { lat, lng } = await geocode(birthCity, birthState, birthCountry);
  const jd = toJulianDay(birthDate, birthTime);
  const houses = swisseph.swe_houses(jd, lat, lng, 'P');
  const planets = {};
  const planetIds = {
    sun: swisseph.SE_SUN,
    moon: swisseph.SE_MOON,
    mercury: swisseph.SE_MERCURY,
    venus: swisseph.SE_VENUS,
    mars: swisseph.SE_MARS,
    jupiter: swisseph.SE_JUPITER,
    saturn: swisseph.SE_SATURN,
    uranus: swisseph.SE_URANUS,
    neptune: swisseph.SE_NEPTUNE,
    pluto: swisseph.SE_PLUTO
  };
  for (const [name, id] of Object.entries(planetIds)) {
    const result = swisseph.swe_calc_ut(jd, id, swisseph.SEFLG_SWIEPH);
    planets[name] = {
      longitude: result.longitude,
      latitude: result.latitude,
      distance: result.distance
    };
  }
  return { planets, houses, jd, lat, lng };
}

export function calculateSynastry(chartA, chartB) {
  let totalScore = 0;
  const aspects = [];
  const planetPairs = ['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn'];
  for (const p1 of planetPairs) {
    for (const p2 of planetPairs) {
      let diff = Math.abs(chartA.planets[p1].longitude - chartB.planets[p2].longitude);
      diff = Math.min(diff, 360 - diff);
      if (diff < 8) {
        totalScore += 20;
        aspects.push(`${p1} em conjunção com ${p2}`);
      } else if (Math.abs(diff - 180) < 8) {
        totalScore += 10;
        aspects.push(`${p1} em oposição com ${p2}`);
      } else if (Math.abs(diff - 120) < 8) {
        totalScore += 15;
        aspects.push(`${p1} em trígono com ${p2}`);
      } else if (Math.abs(diff - 60) < 8) {
        totalScore += 12;
        aspects.push(`${p1} em sextil com ${p2}`);
      } else if (Math.abs(diff - 90) < 8) {
        totalScore -= 5;
        aspects.push(`${p1} em quadratura com ${p2}`);
      }
    }
  }
  totalScore = Math.min(100, Math.max(0, totalScore));
  return { totalScore, aspects };
}
