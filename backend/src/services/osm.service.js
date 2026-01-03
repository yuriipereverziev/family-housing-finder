import axios from "axios";
import NodeCache from "node-cache";

// Кеш на 24 години (86400 секунд)
const cache = new NodeCache({ stdTTL: 86400 });

export const getFamilyInfrastructure = async (district) => {    const { name, polygon } = district; // polygon = [[[lon,lat], [lon,lat], ...]]

    const cached = cache.get(name);
    if (cached) return cached;

    // Перетворюємо в Overpass poly формат: lat lon lat lon ...
    const polyCoords = polygon[0].flatMap(([lon, lat]) => `${lat} ${lon}`).join(' ');

    const query = `
    [out:json][timeout:25];
    (
      node["amenity"="school"](poly:"${polyCoords}");
      way["amenity"="school"](poly:"${polyCoords}");
      node["amenity"="kindergarten"](poly:"${polyCoords}");
      way["amenity"="kindergarten"](poly:"${polyCoords}");
      node["leisure"="park"](poly:"${polyCoords}");
      way["leisure"="park"](poly:"${polyCoords}");
      relation["leisure"="park"](poly:"${polyCoords}");
      node["leisure"="playground"](poly:"${polyCoords}");
      way["leisure"="playground"](poly:"${polyCoords}");
    );
    out center tags;
  `;

    try {
        // throttle: чекаємо 1.5 секунди перед запитом, щоб не отримувати 429
        await new Promise(r => setTimeout(r, 1500));

        const response = await axios.post(
            process.env.OSM_OVERPASS_URL,
            query,
            { headers: { "Content-Type": "text/plain" } }
        );

        const elements = response.data.elements || [];
        const count = (fn) => new Set(elements.filter(fn).map(e => e.id)).size;

        const infra = {
            schools: count(e => e.tags?.amenity === "school"),
            kindergartens: count(e => e.tags?.amenity === "kindergarten"),
            parks: count(e => e.tags?.leisure === "park"),
            playgrounds: count(e => e.tags?.leisure === "playground")
        };

        // записуємо результат у кеш
        cache.set(name, infra);

        return infra;
    } catch (error) {
        console.error("OSM API Error:", error.message);
        return { schools: 0, kindergartens: 0, parks: 0, playgrounds: 0 };
    }
};
