// server/services/scrapers/olxScraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import Listing from '../../models/Listing.js';

const CITY_URLS = {
    'ivano-frankivsk': 'https://www.olx.ua/uk/nedvizhimost/kvartiry/prodazha-kvartir/ivano-frankivsk/',
    'ivano-frankivsk-rent': 'https://www.olx.ua/uk/nedvizhimost/kvartiry/arenda-kvartir/dolgosrochnaya-arenda-kvartir/ivano-frankivsk/'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Парсинг однієї сторінки OLX
 */
async function scrapePage(url, type, city) {
    try {
        console.log(`🔍 Парсинг: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const listings = [];

        // OLX використовує data-cy="l-card" для карток оголошень
        $('[data-cy="l-card"]').each((i, element) => {
            try {
                const $card = $(element);

                // Отримуємо ID оголошення
                const link = $card.find('a').attr('href') || '';
                const externalId = link.match(/ID([A-Za-z0-9]+)/)?.[1];

                if (!externalId) return;

                // Заголовок
                const title = $card.find('h6').text().trim();

                // Ціна
                const priceText = $card.find('[data-testid="ad-price"]').text().trim();
                const price = parsePrice(priceText);

                if (!price || price === 0) return;

                // Локація (може містити район)
                const location = $card.find('[data-testid="location-date"]').text().trim();
                const district = extractDistrict(location);

                // Параметри (кімнати, площа)
                const params = $card.find('[data-testid="adCard-parameters"]').text().trim();
                const rooms = extractRooms(params);
                const area = extractArea(params);

                // Зображення
                const imageUrl = $card.find('img').attr('src') || '';

                listings.push({
                    city,
                    district,
                    type,
                    externalId: `olx-${externalId}`,
                    externalUrl: link.startsWith('http') ? link : `https://www.olx.ua${link}`,
                    title,
                    price,
                    pricePerSqm: area ? Math.round(price / area) : null,
                    currency: 'USD',
                    rooms,
                    area,
                    images: imageUrl ? [imageUrl] : [],
                    source: 'olx',
                    // Координати поки що null, додамо через геокодування
                    lat: null,
                    lon: null,
                    address: location,
                    description: params,
                    isActive: true,
                    publishedAt: new Date(),
                    lastChecked: new Date()
                });

            } catch (error) {
                console.error('❌ Помилка парсингу картки:', error.message);
            }
        });

        console.log(`✅ Знайдено ${listings.length} оголошень на сторінці`);
        return listings;

    } catch (error) {
        console.error(`❌ Помилка парсингу сторінки:`, error.message);
        return [];
    }
}

/**
 * Геокодування адреси в координати
 */
async function geocodeAddress(address, city) {
    try {
        // Використовуємо Nominatim (OpenStreetMap) - безкоштовний API
        const query = `${address}, ${city}, Ukraine`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

        await delay(1000); // Nominatim вимагає 1 секунду між запитами

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'FamilyHousingFinder/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('❌ Геокодування помилка:', error.message);
        return null;
    }
}

/**
 * Парсинг всіх сторінок для міста
 */
export async function scrapeOLX(city = 'ivano-frankivsk', maxPages = 5) {
    console.log(`\n🚀 Початок парсингу OLX для ${city}\n`);

    const results = {
        total: 0,
        saved: 0,
        updated: 0,
        errors: 0
    };

    // Парсимо продаж
    console.log('📦 Парсинг продажу...');
    const saleUrl = CITY_URLS[city];
    if (saleUrl) {
        for (let page = 1; page <= maxPages; page++) {
            const pageUrl = page === 1 ? saleUrl : `${saleUrl}?page=${page}`;
            const listings = await scrapePage(pageUrl, 'sale', city);

            for (const listing of listings) {
                try {
                    // Геокодуємо адресу
                    if (listing.address && !listing.lat) {
                        const coords = await geocodeAddress(listing.address, city);
                        if (coords) {
                            listing.lat = coords.lat;
                            listing.lon = coords.lon;
                        }
                    }

                    // Якщо немає координат - пропускаємо
                    if (!listing.lat || !listing.lon) {
                        console.log(`⚠️ Пропущено (немає координат): ${listing.title}`);
                        continue;
                    }

                    // Зберігаємо або оновлюємо
                    const existing = await Listing.findOne({ externalId: listing.externalId });

                    if (existing) {
                        await Listing.findByIdAndUpdate(existing._id, {
                            ...listing,
                            lastChecked: new Date()
                        });
                        results.updated++;
                    } else {
                        await Listing.create(listing);
                        results.saved++;
                    }

                    results.total++;

                } catch (error) {
                    console.error(`❌ Помилка збереження:`, error.message);
                    results.errors++;
                }
            }

            await delay(2000); // Затримка між сторінками
        }
    }

    // Парсимо оренду
    console.log('\n🏠 Парсинг оренди...');
    const rentUrl = CITY_URLS[`${city}-rent`];
    if (rentUrl) {
        for (let page = 1; page <= maxPages; page++) {
            const pageUrl = page === 1 ? rentUrl : `${rentUrl}?page=${page}`;
            const listings = await scrapePage(pageUrl, 'rent', city);

            // Аналогічна логіка як для продажу
            for (const listing of listings) {
                try {
                    if (listing.address && !listing.lat) {
                        const coords = await geocodeAddress(listing.address, city);
                        if (coords) {
                            listing.lat = coords.lat;
                            listing.lon = coords.lon;
                        }
                    }

                    if (!listing.lat || !listing.lon) continue;

                    const existing = await Listing.findOne({ externalId: listing.externalId });

                    if (existing) {
                        await Listing.findByIdAndUpdate(existing._id, {
                            ...listing,
                            lastChecked: new Date()
                        });
                        results.updated++;
                    } else {
                        await Listing.create(listing);
                        results.saved++;
                    }

                    results.total++;

                } catch (error) {
                    results.errors++;
                }
            }

            await delay(2000);
        }
    }

    console.log('\n✅ Парсинг завершено:');
    console.log(`   Всього: ${results.total}`);
    console.log(`   Нових: ${results.saved}`);
    console.log(`   Оновлено: ${results.updated}`);
    console.log(`   Помилок: ${results.errors}\n`);

    return results;
}

/**
 * Деактивувати застарілі оголошення (>30 днів)
 */
export async function deactivateOutdatedListings() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Listing.updateMany(
        {
            lastChecked: { $lt: thirtyDaysAgo },
            isActive: true
        },
        {
            isActive: false
        }
    );

    console.log(`🗑️ Деактивовано ${result.modifiedCount} застарілих оголошень`);
    return result.modifiedCount;
}

// Допоміжні функції
function parsePrice(priceText) {
    const cleaned = priceText.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
}

function extractRooms(text) {
    const match = text.match(/(\d+)\s*кімн/i);
    return match ? parseInt(match[1], 10) : null;
}

function extractArea(text) {
    const match = text.match(/(\d+)\s*м²/i);
    return match ? parseInt(match[1], 10) : null;
}

function extractDistrict(location) {
    // Можна покращити регулярку під реальні назви районів
    const districts = [
        'Каскад', 'Центр', 'Бам', 'Пасічна', 'Софіївка',
        'Позитрон', 'Гірка', 'Будівельників', 'Брати'
    ];

    for (const district of districts) {
        if (location.includes(district)) {
            return district;
        }
    }

    return null;
}