// server/scripts/clearCache.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InfrastructureCache from '../src/models/InfrastructureCache.js';

dotenv.config();

async function clearCache() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        const result = await InfrastructureCache.deleteMany({});
        console.log(`🗑️  Видалено ${result.deletedCount} записів з кешу`);

        console.log('\n✅ Кеш очищено! Тепер дані будуть перезавантажені з Overpass API.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Помилка:', error);
        process.exit(1);
    }
}

clearCache();