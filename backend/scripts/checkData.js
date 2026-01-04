// server/scripts/checkData.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import District from '../src/models/District.js';

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Підключено до MongoDB\n');

        const districts = await District.find({ city: 'ivano-frankivsk' }).lean();

        console.log(`📊 Знайдено районів: ${districts.length}\n`);

        // Перевіряємо перший район детально
        const first = districts[0];
        console.log('🔍 Перший район:', first.name);
        console.log('   Координати:', first.lat, first.lon);
        console.log('   Оцінка:', first.score);
        console.log('   Має полігон:', !!first.polygon);
        console.log('   Полігон тип:', Array.isArray(first.polygon) ? 'Array' : typeof first.polygon);

        if (first.polygon && first.polygon.length > 0) {
            console.log('   Полігон кілець:', first.polygon.length);
            console.log('   Точок у першому кільці:', first.polygon[0]?.length || 0);
            console.log('   Перша точка:', first.polygon[0]?.[0]);
        } else {
            console.log('   ⚠️ Полігон порожній або відсутній!');
        }

        console.log('\n📋 Список районів з полігонами:');
        districts.forEach(d => {
            const hasPolygon = d.polygon && Array.isArray(d.polygon) && d.polygon.length > 0;
            const points = hasPolygon ? d.polygon[0]?.length : 0;
            console.log(`   ${hasPolygon ? '✅' : '❌'} ${d.name} - ${points} точок`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Помилка:', error);
        process.exit(1);
    }
}

checkData();