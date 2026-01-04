// server/services/infrastructureService.js
import axios from 'axios';
import InfrastructureCache from '../models/InfrastructureCache.js';

const OVERPASS_APIS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

const FACILITY_CONFIG = {
    schools: { key: 'amenity', value: 'school' },
    kindergartens: { key: 'amenity', value: 'kindergarten' },
    libraries: { key: 'amenity', value: 'library' },
    hospitals: { key: 'amenity', value: 'hospital' },
    pharmacies: { key: 'amenity', value: 'pharmacy' },
    clinics: { key: 'amenity', value: 'clinic' },
    busStops: { key: 'highway', value: 'bus_stop' },
    railwayStations: { key: 'railway', value: 'station' },
    supermarkets: { key: 'shop', value: 'supermarket' },
    convenience: { key: 'shop', value: 'convenience' },
    parks: { key: 'leisure', value: 'park' },
    playgrounds: { key: 'leisure', value: 'playground' },
    sportsCentres: { key: 'leisure', value: 'sports_centre' },
    cinemas: { key: 'amenity', value: 'cinema' },
    banks: { key: 'amenity', value: 'bank' },
    cafes: { key: 'amenity', value: 'cafe' },
    police: { key: 'amenity', value: 'police' }
};

// Отримати дані з кешу або Overpass API
export async function getInfrastructureData(city, districtName, facilityType, district) {
    // 1. Спробувати знайти в MongoDB
    const cached = await InfrastructureCache.findOne({
        city,
        districtName,
        facilityType,
        expiresAt: { $gt: new Date() }
    });

    if (cached) {
        console.log(`📦 MongoDB кеш: ${facilityType} для ${districtName} → ${cached.count} міток`);
        return {
            markers: cached.markers,
            count: cached.count,
            source: 'cache'
        };
    }

    // 2. Якщо немає в кеші - завантажити з Overpass API
    console.log(`⏳ Завантаження з Overpass API: ${facilityType} для ${districtName}`);

    try {
        const markers = await fetchFromOverpass(facilityType, district);

        // 3. Зберегти в MongoDB
        await InfrastructureCache.findOneAndUpdate(
            { city, districtName, facilityType },
            {
                city,
                districtName,
                facilityType,
                markers,
                count: markers.length,
                lastUpdated: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            { upsert: true, new: true }
        );

        console.log(`💾 Збережено в MongoDB: ${facilityType} → ${markers.length} міток`);

        return {
            markers,
            count: markers.length,
            source: 'overpass'
        };
    } catch (error) {
        console.error(`❌ Помилка завантаження ${facilityType}:`, error.message);

        // 4. Якщо API недоступний - повернути пустий масив
        return {
            markers: [],
            count: 0,
            source: 'error',
            error: error.message
        };
    }
}

// Завантажити дані з Overpass API
async function fetchFromOverpass(facilityType, district) {
    const config = FACILITY_CONFIG[facilityType];
    if (!config) {
        throw new Error(`Невідомий тип: ${facilityType}`);
    }

    const query = `
        [out:json][timeout:40];
        (
            node["${config.key}"="${config.value}"](around:4000,${district.lat},${district.lon});
            way["${config.key}"="${config.value}"](around:4000,${district.lat},${district.lon});
            relation["${config.key}"="${config.value}"](around:4000,${district.lat},${district.lon});
        );
        out center;
    `;

    // Спробувати всі API по черзі
    for (const apiUrl of OVERPASS_APIS) {
        try {
            const response = await axios.post(apiUrl, query, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 45000 // 45 секунд
            });

            const markers = response.data.elements
                .filter(el => el.lat || el.center?.lat)
                .map(el => ({
                    lat: el.lat || el.center.lat,
                    lon: el.lon || el.center.lon
                }));

            console.log(`✅ Отримано з ${apiUrl}: ${markers.length} міток`);
            return markers;
        } catch (error) {
            console.warn(`⚠️ ${apiUrl} недоступний:`, error.message);
            continue;
        }
    }

    throw new Error('Всі Overpass API сервери недоступні');
}

// Отримати всю інфраструктуру для району
export async function getAllInfrastructureForDistrict(city, district) {
    const results = {};
    const facilityTypes = Object.keys(FACILITY_CONFIG);

    // Завантажити всі типи паралельно
    await Promise.all(
        facilityTypes.map(async (type) => {
            try {
                const data = await getInfrastructureData(city, district.name, type, district);
                results[type] = data.count;
            } catch (error) {
                console.error(`❌ Помилка для ${type}:`, error);
                results[type] = 0;
            }
        })
    );

    return results;
}


const districtsData = {
    'ivano-frankivsk': {
        'каскад': { name: 'Каскад', lat: 48.9371393222222, lon: 24.7506547888889 },
        'софіївка': { name: 'Софіївка', lat: 48.9347284375, lon: 24.736649075 },
        'позитрон': { name: 'Позитрон', lat: 48.9414592222222, lon: 24.7414708 },
        'гірка': { name: 'Гірка', lat: 48.9314630714286, lon: 24.7267439 },
        'будівельників': { name: 'Будівельників', lat: 48.9289731, lon: 24.7361619166667 },
        'пасічна': { name: 'Пасічна', lat: 48.9451003285714, lon: 24.694258 },
        'брати': { name: 'Брати', lat: 48.9220754954545, lon: 24.7338539272727 },
        'набережна': { name: 'Набережна', lat: 48.9249895148148, lon: 24.6896547925926 },
        'княгинин': { name: 'Княгинин', lat: 48.9323437904762, lon: 24.7070030190476 },
        'кішлак': { name: 'Кішлак', lat: 48.9421338466667, lon: 24.7487070266667 },
        'центр': { name: 'Центр', lat: 48.9211146809524, lon: 24.7135759904762 },
        'арсенал': { name: 'Арсенал', lat: 48.9087938058824, lon: 24.7040316764706 },
        'майзлі': { name: 'Майзлі', lat: 48.9178599333333, lon: 24.7365356619048 },
        'залізничний': { name: 'Залізничний', lat: 48.9242206235294, lon: 24.7235583470588 },
        'німецька колонія': { name: 'Німецька колонія', lat: 48.9121463428572, lon: 24.7214620642857 },
        'парковий': { name: 'Парковий', lat: 48.912778184, lon: 24.693054388 },
        'бельведер': { name: 'Бельведер', lat: 48.9251660176471, lon: 24.6992495647059 },
        'північний бульвар': { name: 'Північний бульвар', lat: 48.9275457363636, lon: 24.7052225090909 },
        'південний бульвар': { name: 'Південний бульвар', lat: 48.9216249, lon: 24.6982379888889 },
        'опришівці': { name: 'Опришівці', lat: 48.8941770190476, lon: 24.7139284952381 },
        'новий світ': { name: 'Новий світ', lat: 48.93541274, lon: 24.7229563 },
        'бам': { name: 'Бам', lat: 48.9053867454546, lon: 24.6905841 },
        'городок': { name: 'Городок', lat: 48.9011089, lon: 24.6951186833333 },
        'рінь': { name: 'Рінь', lat: 48.9129447214286, lon: 24.75064295 },
        'кант': { name: 'Кант', lat: 48.9257373882353, lon: 24.6934819058824 }
    }
};


export async function getDistrictByName(city, districtName) {
    const cityKey = city.toLowerCase().trim();
    const districtKey = districtName.toLowerCase().trim();

    return districtsData[cityKey]?.[districtKey] || null;
}