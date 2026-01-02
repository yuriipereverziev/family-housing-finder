import axios from "axios";
import NodeCache from "node-cache";

// Кеш на 24 години (86400 секунд)
const cache = new NodeCache({ stdTTL: 86400 });

export const getFamilyInfrastructure = async ({ lat, lon, radius, name }) => {
    // name — унікальний ключ району для кешу
    const cached = cache.get(name);
    if (cached) return cached;

    const query = `
    [out:json][timeout:25];
    (
      node["amenity"="school"](around:${radius},${lat},${lon});
      way["amenity"="school"](around:${radius},${lat},${lon});

      node["amenity"="kindergarten"](around:${radius},${lat},${lon});
      way["amenity"="kindergarten"](around:${radius},${lat},${lon});

      node["leisure"="park"](around:${radius},${lat},${lon});
      way["leisure"="park"](around:${radius},${lat},${lon});
      relation["leisure"="park"](around:${radius},${lat},${lon});

      node["leisure"="playground"](around:${radius},${lat},${lon});
      way["leisure"="playground"](around:${radius},${lat},${lon});
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
