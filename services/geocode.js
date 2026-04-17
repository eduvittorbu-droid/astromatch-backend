import axios from 'axios';

export async function geocode(city, state, country) {
  const query = `${city}, ${state}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'AstroMatch/1.0' } });
  if (res.data.length === 0) throw new Error('Localidade não encontrada');
  return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
}
