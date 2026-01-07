// frontend/src/services/geocodeService.js

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Кеш для геокодування (щоб не робити повторні запити)
const geocodeCache = new Map();

/**
 * Геокодування через Nominatim (OpenStreetMap)
 */
export async function geocodeAddress(title, location = 'Івано-Франківськ') {
    const cacheKey = `${title}-${location}`;

    // Перевіряємо кеш
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey);
    }

    try {
        // Витягуємо інформацію з title
        const searchQuery = extractLocationFromTitle(title, location);

        console.log(`🔍 Геокодування: "${searchQuery}"`);

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'FamilyHousingFinder/1.0'
            }
        });

        if (!response.ok) {
            throw new Error('Помилка запиту до Nominatim');
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };

            // Зберігаємо в кеш
            geocodeCache.set(cacheKey, result);

            console.log(`✅ Знайдено: [${result.lat.toFixed(5)}, ${result.lon.toFixed(5)}]`);

            return result;
        }

        console.log(`❌ Не знайдено координат для: ${searchQuery}`);
        geocodeCache.set(cacheKey, null);
        return null;

    } catch (error) {
        console.error('❌ Помилка геокодування:', error);
        return null;
    }
}

/**
 * Витягти локацію з title
 */
function extractLocationFromTitle(title, baseLocation) {
    // Шукаємо назви районів
    const districts = [
        'Каскад', 'Центр', 'Бам', 'Пасічна', 'Софіївка',
        'Позитрон', 'Гірка', 'Будівельників', 'Брати',
        'Княгинин', 'Кішлак', 'Арсенал', 'Майзлі',
        'Залізничний', 'Німецька колонія', 'Парковий',
        'Бельведер', 'Північний бульвар', 'Південний бульвар',
        'Опришівці', 'Новий світ', 'Городок', 'Рінь', 'Кант'
    ];

    for (const district of districts) {
        if (title.includes(district)) {
            return `${district}, ${baseLocation}, Ukraine`;
        }
    }

    // Шукаємо назви вулиць
    const streetMatch = title.match(/вул\.?\s+([А-Яа-яІіЇїЄєҐґ\s]+?)(?:\s+\d+|,|$)/i);
    if (streetMatch && streetMatch[1]) {
        const street = streetMatch[1].trim();
        return `вул. ${street}, ${baseLocation}, Ukraine`;
    }

    // Шукаємо ЖК
    const zhkMatch = title.match(/ЖК\s+([А-Яа-яІіЇїЄєҐґ\s]+?)(?:\s|,|$)/i);
    if (zhkMatch && zhkMatch[1]) {
        const zhk = zhkMatch[1].trim();
        return `ЖК ${zhk}, ${baseLocation}, Ukraine`;
    }

    // Якщо нічого не знайшли - просто місто
    return `${baseLocation}, Ukraine`;
}

/**
 * Парсинг деталей з title
 */
export function parseListingDetails(title) {
    const details = {
        rooms: null,
        type: null,
        area: null,
        district: null
    };

    // Тип операції
    if (/продаж|продам|продається/i.test(title)) {
        details.type = 'sale';
    } else if (/оренд|здам|здається|rent/i.test(title)) {
        details.type = 'rent';
    } else {
        // За замовчуванням оренда
        details.type = 'rent';
    }

    // Кількість кімнат
    const roomsMatch = title.match(/(\d+)\s*[кк]ім/i);
    if (roomsMatch) {
        details.rooms = parseInt(roomsMatch[1], 10);
    }

    // Площа
    const areaMatch = title.match(/(\d+)\s*м²/i);
    if (areaMatch) {
        details.area = parseInt(areaMatch[1], 10);
    }

    // Район
    const districts = [
        'Каскад', 'Центр', 'Бам', 'Пасічна', 'Софіївка',
        'Позитрон', 'Гірка', 'Будівельників', 'Брати'
    ];

    for (const district of districts) {
        if (title.includes(district)) {
            details.district = district;
            break;
        }
    }

    return details;
}

/**
 * Обробити масив оголошень з JSON
 */
export async function processListingsFromJson(jsonData) {
    const results = {
        listings: [],
        geocoded: 0,
        success: 0,
        failed: 0,
        skipped: 0
    };

    console.log(`📊 Обробка ${jsonData.length} оголошень...`);

    for (let i = 0; i < jsonData.length; i++) {
        const item = jsonData[i];

        try {
            console.log(`\n[${i + 1}/${jsonData.length}] ${item.title?.substring(0, 60)}...`);

            // Парсимо деталі
            const details = parseListingDetails(item.title || '');

            let lat = item.lat;
            let lon = item.lon;

            // Якщо немає координат - геокодуємо
            if (!lat || !lon) {
                const coords = await geocodeAddress(item.title, item.location || 'Івано-Франківськ');

                if (coords) {
                    lat = coords.lat;
                    lon = coords.lon;
                    results.geocoded++;

                    // ВАЖЛИВО: затримка 1+ секунда між запитами до Nominatim
                    await delay(1100);
                } else {
                    console.log(`   ⚠️ Пропущено (не вдалося геокодувати)`);
                    results.skipped++;
                    continue;
                }
            }

            // Створюємо об'єкт оголошення
            const listing = {
                id: `json-${i}-${Date.now()}`,
                lat,
                lon,
                type: details.type,
                price: item.price || 0,
                rooms: details.rooms,
                area: details.area,
                title: item.title || 'Квартира',
                externalUrl: item.url,
                district: details.district,
                source: 'json',
                scrapedAt: item.scrapedAt
            };

            results.listings.push(listing);
            results.success++;

            console.log(`   ✅ Успішно: ${listing.type}, ${listing.rooms || '?'} кімн, $${listing.price}`);

        } catch (err) {
            console.error(`   ❌ Помилка:`, err.message);
            results.failed++;
        }
    }

    console.log('\n📊 Результати обробки:');
    console.log(`   Всього: ${jsonData.length}`);
    console.log(`   Успішно: ${results.success}`);
    console.log(`   Геокодовано: ${results.geocoded}`);
    console.log(`   Пропущено: ${results.skipped}`);
    console.log(`   Помилок: ${results.failed}`);

    return results;
}