// server/scripts/addPolygons.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import District from '../src/models/District.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Мапінг назв районів (з GeoJSON в базу даних)
const districtNameMapping = {
    'Каскад': 'Каскад',
    'Софіївка': 'Софіївка',
    'Позитрон': 'Позитрон',
    'Гірка': 'Гірка',
    'Будівельників': 'Будівельників',
    'Пасічна': 'Пасічна',
    'Брати': 'Брати',
    'Набережна': 'Набережна',
    'Княгинин': 'Княгинин',
    'Кішлак': 'Кішлак',
    'Центр': 'Центр',
    'Арсенал': 'Арсенал',
    'Майзлі': 'Майзлі',
    'Залізничний': 'Залізничний',
    'Німецька колонія': 'Німецька колонія',
    'Парковий': 'Парковий',
    'Бельведер': 'Бельведер',
    'Північний бульвар': 'Північний бульвар',
    'Південний бульвар': 'Південний бульвар',
    'Опришівці': 'Опришівці',
    'Новий світ': 'Новий світ',
    'Бам': 'Бам',
    'Городок': 'Городок',
    'Рінь': 'Рінь',
    'Кант': 'Кант'
};

async function addPolygons() {
    try {
        console.log('🚀 Початок додавання полігонів до районів...\n');

        // Підключення до MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        // Читаємо GeoJSON файл
        const geoJsonPath = path.join(__dirname, '../GeoJSON.json');
        const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'));

        console.log(`📄 Завантажено ${geoJsonData.features.length} полігонів з GeoJSON\n`);

        let updated = 0;
        let notFound = 0;

        for (const feature of geoJsonData.features) {
            const geoJsonName = feature.properties.Name;
            const dbName = districtNameMapping[geoJsonName];

            if (!dbName) {
                console.warn(`⚠️  Не знайдено мапінг для: ${geoJsonName}`);
                notFound++;
                continue;
            }

            // Отримуємо координати полігону
            // GeoJSON використовує формат [lon, lat], а Leaflet очікує [lat, lon]
            const coordinates = feature.geometry.coordinates[0];

            // Конвертуємо [lon, lat] -> [lat, lon] для Leaflet
            const polygon = coordinates.map(([lon, lat]) => [lat, lon]);

            try {
                // Оновлюємо район в базі даних
                const result = await District.findOneAndUpdate(
                    {
                        city: 'ivano-frankivsk',
                        name: dbName
                    },
                    {
                        polygon: [polygon], // ✅ Масив масивів координат
                        updatedAt: new Date()
                    },
                    {
                        new: true,
                        runValidators: false // ⬅️ Додайте це, щоб не валідувати тип
                    }
                );

                if (result) {
                    console.log(`✅ ${dbName}: додано полігон (${polygon.length} точок)`);
                    updated++;
                } else {
                    console.warn(`⚠️  Район не знайдено в БД: ${dbName}`);
                    notFound++;
                }

            } catch (error) {
                console.error(`❌ Помилка для ${dbName}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`🎉 Завершено!`);
        console.log(`✅ Оновлено районів: ${updated}`);
        console.log(`⚠️  Не знайдено: ${notFound}`);
        console.log('='.repeat(50) + '\n');

        // Перевіряємо результат
        const districtsWithPolygons = await District.countDocuments({
            city: 'ivano-frankivsk',
            'polygon.0': { $exists: true, $ne: [] }
        });

        console.log(`📊 Районів з полігонами в БД: ${districtsWithPolygons}`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Критична помилка:', error);
        process.exit(1);
    }
}

addPolygons();