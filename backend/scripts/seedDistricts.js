// server/scripts/seedDistricts.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import District from '../src/models/District.js';
import { getAllInfrastructureForDistrict } from '../src/services/infrastructureService.js';
import { calculateScore } from '../src/services/score.service.js';

dotenv.config();

// Дані районів з вашого infrastructureService.js
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

async function seedDistricts() {
    try {
        console.log('🚀 Початок заповнення бази даних районами...\n');

        // Підключення до MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        const city = 'ivano-frankivsk';
        const districts = districtsData[city];

        let processed = 0;
        const total = Object.keys(districts).length;

        for (const [key, districtInfo] of Object.entries(districts)) {
            processed++;
            console.log(`\n[${processed}/${total}] 📍 Обробка району: ${districtInfo.name}`);

            try {
                // Отримуємо інфраструктуру з Overpass API або кешу
                console.log('   ⏳ Завантаження інфраструктури...');
                const infrastructure = await getAllInfrastructureForDistrict(city, districtInfo);

                // Обчислюємо оцінку
                const score = calculateScore(infrastructure);

                // Створюємо або оновлюємо район
                await District.findOneAndUpdate(
                    { city, name: districtInfo.name },
                    {
                        city,
                        name: districtInfo.name,
                        lat: districtInfo.lat,
                        lon: districtInfo.lon,
                        score,
                        infrastructure,
                        polygon: [], // Поки що порожній, додамо пізніше
                        updatedAt: new Date()
                    },
                    { upsert: true, new: true }
                );

                console.log(`   ✅ ${districtInfo.name}: score=${score.toFixed(1)}, schools=${infrastructure.schools}, kindergartens=${infrastructure.kindergartens}`);

                // Невелика пауза між запитами (щоб не перевантажити Overpass API)
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`   ❌ Помилка для ${districtInfo.name}:`, error.message);
            }
        }

        console.log('\n🎉 Всі райони успішно додані до бази даних!');
        console.log(`📊 Оброблено: ${processed} з ${total} районів\n`);

        // Показуємо статистику
        const count = await District.countDocuments({ city });
        console.log(`✅ В базі даних зараз ${count} районів для міста ${city}`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Критична помилка:', error);
        process.exit(1);
    }
}

// Запускаємо скрипт
seedDistricts();