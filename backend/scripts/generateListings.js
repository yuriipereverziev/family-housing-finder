// server/scripts/generateListings.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Listing from '../src/models/Listing.js';
import District from '../src/models/District.js';

dotenv.config();

// Базові ціни по районах (USD)
const DISTRICT_PRICES = {
    'Центр': { sale: [55000, 75000], rent: [400, 600] },
    'Каскад': { sale: [45000, 60000], rent: [350, 500] },
    'Софіївка': { sale: [40000, 55000], rent: [300, 450] },
    'Позитрон': { sale: [42000, 57000], rent: [320, 470] },
    'Пасічна': { sale: [38000, 52000], rent: [280, 420] },
    'Бам': { sale: [32000, 45000], rent: [250, 380] },
    'Гірка': { sale: [35000, 48000], rent: [260, 400] },
    'Будівельників': { sale: [38000, 50000], rent: [280, 420] },
    'Брати': { sale: [36000, 49000], rent: [270, 410] },
    'Княгинин': { sale: [37000, 51000], rent: [280, 420] },
    'Кішлак': { sale: [43000, 58000], rent: [330, 480] },
    'Арсенал': { sale: [33000, 46000], rent: [260, 390] },
    'Майзлі': { sale: [39000, 52000], rent: [290, 430] }
};

const ROOM_TYPES = [1, 2, 3, 4];
const AREAS = {
    1: [28, 42],
    2: [45, 65],
    3: [60, 85],
    4: [75, 110]
};

/**
 * Перевірити чи точка всередині полігону
 */
function isPointInPolygon(lat, lon, polygon) {
    if (!polygon || polygon.length === 0) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > lon) !== (yj > lon)) &&
            (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * Генерувати випадкову точку всередині полігону
 */
function generatePointInPolygon(polygon) {
    if (!polygon || polygon.length === 0) return null;

    // Знаходимо межі полігону
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    polygon.forEach(([lat, lon]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
    });

    // Генеруємо випадкові точки поки не знайдемо ту, що всередині
    let attempts = 0;
    while (attempts < 100) {
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lon = minLon + Math.random() * (maxLon - minLon);

        if (isPointInPolygon(lat, lon, polygon)) {
            return { lat, lon };
        }

        attempts++;
    }

    // Якщо не вдалося - повертаємо центр
    return {
        lat: (minLat + maxLat) / 2,
        lon: (minLon + maxLon) / 2
    };
}

/**
 * Генерувати оголошення для району
 */
function generateListingsForDistrict(district, count = 10) {
    const listings = [];
    const districtName = district.name;
    const prices = DISTRICT_PRICES[districtName] || DISTRICT_PRICES['Бам'];

    for (let i = 0; i < count; i++) {
        const type = Math.random() > 0.6 ? 'sale' : 'rent'; // 60% продаж, 40% оренда
        const rooms = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
        const areaRange = AREAS[rooms];
        const area = Math.floor(areaRange[0] + Math.random() * (areaRange[1] - areaRange[0]));

        const priceRange = prices[type];
        const basePrice = priceRange[0] + Math.random() * (priceRange[1] - priceRange[0]);

        // Коригуємо ціну залежно від кімнат та площі
        const roomMultiplier = rooms === 1 ? 0.8 : rooms === 4 ? 1.2 : 1;
        const price = Math.round(basePrice * roomMultiplier);

        const floor = Math.floor(1 + Math.random() * 9);
        const totalFloors = floor + Math.floor(Math.random() * 3);

        // Генеруємо точку всередині полігону району
        const point = district.polygon?.[0]
            ? generatePointInPolygon(district.polygon[0])
            : { lat: district.lat, lon: district.lon };

        if (!point) continue;

        const listing = {
            city: 'ivano-frankivsk',
            district: districtName,
            lat: point.lat,
            lon: point.lon,
            type,
            price,
            pricePerSqm: Math.round(price / area),
            currency: 'USD',
            rooms,
            area,
            floor,
            totalFloors,
            title: `${rooms}-кімн. квартира ${area} м²${type === 'sale' ? ', продаж' : ', оренда'}`,
            description: `${rooms}-кімнатна квартира площею ${area} м² на ${floor} поверсі. Район ${districtName}.`,
            address: `${districtName}, Івано-Франківськ`,
            images: [],
            source: 'generated',
            externalId: `gen-${districtName}-${type}-${Date.now()}-${i}`,
            externalUrl: null,
            isActive: true,
            publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Останні 7 днів
            lastChecked: new Date()
        };

        listings.push(listing);
    }

    return listings;
}

/**
 * Головна функція
 */
async function generateListings() {
    try {
        console.log('🚀 Генерація оголошень для Івано-Франківська\n');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        // Отримуємо всі райони з полігонами
        const districts = await District.find({ city: 'ivano-frankivsk' })
            .select('name lat lon polygon')
            .lean();

        console.log(`📍 Знайдено ${districts.length} районів\n`);

        let totalGenerated = 0;

        for (const district of districts) {
            console.log(`🏘️ Генерація для ${district.name}...`);

            // Видаляємо старі згенеровані оголошення для цього району
            await Listing.deleteMany({
                city: 'ivano-frankivsk',
                district: district.name,
                source: 'generated'
            });

            // Генеруємо нові
            const count = 8 + Math.floor(Math.random() * 7); // 8-15 оголошень на район
            const listings = generateListingsForDistrict(district, count);

            // Зберігаємо
            if (listings.length > 0) {
                await Listing.insertMany(listings);
                totalGenerated += listings.length;

                const saleCount = listings.filter(l => l.type === 'sale').length;
                const rentCount = listings.filter(l => l.type === 'rent').length;

                console.log(`   ✅ Згенеровано ${listings.length} (продаж: ${saleCount}, оренда: ${rentCount})`);
            }
        }

        console.log(`\n🎉 Завершено! Всього згенеровано: ${totalGenerated} оголошень`);

        // Статистика
        const stats = await Listing.aggregate([
            { $match: { city: 'ivano-frankivsk', isActive: true } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' }
                }
            }
        ]);

        console.log('\n📊 Загальна статистика:');
        stats.forEach(s => {
            console.log(`   ${s._id === 'sale' ? 'Продаж' : 'Оренда'}: ${s.count} оголошень, середня ціна: $${Math.round(s.avgPrice)}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Помилка:', error);
        process.exit(1);
    }
}

generateListings();