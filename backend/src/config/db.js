// server/config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // у 2025-2026 ці опції вже не потрібні, але можна залишити для сумісності
            // useNewUrlParser: true,
            // useUnifiedTopology: true
        });
        console.log('MongoDB підключено успішно');
    } catch (err) {
        console.error('Помилка підключення до MongoDB:', err.message);
        process.exit(1); // завершуємо процес, якщо БД недоступна
    }
};

export default connectDB;