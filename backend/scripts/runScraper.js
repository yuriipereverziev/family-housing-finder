// server/scripts/runScraper.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeOLX, deactivateOutdatedListings } from '../src/services/scrapers/olxScraper.js';

dotenv.config();

async function main() {
    try {
        console.log('🚀 Запуск парсера OLX\n');

        // Підключення до MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        // Парсинг OLX
        const results = await scrapeOLX('ivano-frankivsk', 3); // 3 сторінки

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