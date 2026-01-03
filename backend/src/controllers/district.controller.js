import { getFamilyInfrastructure } from "../services/osm.service.js";
import { calculateScore } from "../services/score.service.js";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600 });
import districtsGeoJSON from '../data/GeoJSON.json' with { type: 'json' };

// 🔹 Функція нормалізації Polygon / MultiPolygon
function normalizePolygon(geometry) {
    if (!geometry) return null;

    if (geometry.type === 'Polygon') {
        return geometry.coordinates; // [ [ [lon, lat], ... ] ]
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates[0]; // беремо перший полігон
    }

    return null;
}



// 🔹 districts з GeoJSON
const districts = districtsGeoJSON.features

    .map(feature => {
        const polygon = normalizePolygon(feature.geometry);
        if (!polygon) return null;

        const name = feature.properties.Name;

        // обчислюємо центр першого кільця
        let sumLat = 0, sumLon = 0, count = 0;
        polygon[0].forEach(([lon, lat]) => {
            sumLat += lat;
            sumLon += lon;
            count++;
        });

        return {
            name,
            polygon, // 🔑 обов'язково передаємо
            center: {
                lat: sumLat / count,
                lon: sumLon / count
            }
        };
    })
    .filter(Boolean);

console.log("✅ districts loaded:", districts.map(d => d.name));


// 🔹 Головна функція
export const getDistrictSummary = async (req, res) => {
    const city = req.params.city?.toLowerCase() || "ivano-frankivsk";
    const cacheKey = `${city}_summary`;

    // перевірка кешу
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let districtData = [];
    let realEstate = { totalOffers: 456 }; // або await getRealEstateStats()

    if (city === "ivano-frankivsk") {
        for (const d of districts) {
            let infra = { schools: 0, kindergartens: 0, parks: 0, playgrounds: 0 };
            try {
                infra = await getFamilyInfrastructure(d);
            } catch (e) {
                console.error(`❌ getFamilyInfrastructure error for ${d.name}:`, e);
            }

            const score = calculateScore(infra);

            districtData.push({
                name: d.name,
                lat: d.center.lat,
                lon: d.center.lon,
                score,
                infrastructure: infra,
                polygon: d.polygon // 🔑 Ключовий рядок для фронту
            });
        }
    }

    console.log("CITY:", city);
    console.log("DISTRICTS COUNT:", districtData.length);
    console.log("FIRST DISTRICT:", districtData[0]);

    const result = {
        city: city.charAt(0).toUpperCase() + city.slice(1),
        realEstate,
        districts: districtData
    };

    cache.set(cacheKey, result);
    res.json(result);
};
