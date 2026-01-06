// server/scripts/runScraper.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeOLX, deactivateOutdatedListings } from '../src/services/scrapers/olxScraper.js';
import { scrapeLunKyivRent, fetchLunHouseAccessibility } from '../src/services/scrapers/lunScraper.js';

dotenv.config();

async function main() {
    try {
        console.log('🚀 Запуск парсеров OLX и LUN\n');

        // Підключення до MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        // Парсинг OLX
        const olxResults = await scrapeOLX('ivano-frankivsk', 3); // 3 сторінки

        // Парсинг LUN (аренда, Киев) — пока только логируем, без сохранения в БД
        const lunResults = await scrapeLunKyivRent(3);
        console.log('📊 Результат LUN:', {
            total: lunResults.total
        });

        // Тестовый вызов LUN API по конкретному дому
        const houseData = await fetchLunHouseAccessibility('10283801');
        console.log('🏠 Пример ответа LUN house-accessibility (обрезан):');
        if (houseData) {
            // Чтобы не заливать в лог весь JSON, показываем только ключи верхнего уровня
            console.log(Object.keys(houseData));
        } else {
            console.log('Нет данных от LUN API');
        }

        // Деактивація застарілих
        await deactivateOutdatedListings();

        console.log('\n🎉 Готово!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Критична помилка:', error);
        process.exit(1);
    }
}

main();