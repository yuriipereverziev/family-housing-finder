import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const InfrastructureCacheSchema = new Schema({
    // Назва міста (наприклад, "ivano-frankivsk")
    city: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    // Назва району (наприклад, "Пасічна", "Центральний район")
    districtName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    // Тип об'єкта: 'police', 'schools', 'kindergartens' тощо (англійські ключі з фронтенду)
    facilityType: {
        type: String,
        required: true,
        enum: [
            'schools', 'kindergartens', 'libraries', 'hospitals', 'pharmacies',
            'clinics', 'busStops', 'railwayStations', 'supermarkets', 'convenience',
            'parks', 'playgrounds', 'sportsCentres', 'cinemas', 'banks', 'cafes', 'police'
        ],
        index: true
    },

    // Маркери (координати об'єктів)
    markers: [
        {
            lat: {
                type: Number,
                required: true
            },
            lon: {
                type: Number,
                required: true
            },
            // Опціонально: можеш додати name, address тощо, якщо Overpass їх дає
            // name: String,
            // address: String
        }
    ],

    // Кількість знайдених об'єктів
    count: {
        type: Number,
        required: true,
        min: 0
    },

    // Коли востаннє оновлювалось
    lastUpdated: {
        type: Date,
        default: Date.now
    },

    // Автоматичне видалення через 30 днів
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
        index: { expireAfterSeconds: 0 } // TTL індекс
    }
});

// Унікальний індекс — один запис на (city + district + facilityType)
InfrastructureCacheSchema.index({ city: 1, districtName: 1, facilityType: 1 }, { unique: true });

// Додатковий індекс для швидких запитів по району та типу
InfrastructureCacheSchema.index({ city: 1, districtName: 1 });

const InfrastructureCache = mongoose.models.InfrastructureCache ||
    model('InfrastructureCache', InfrastructureCacheSchema);

export default InfrastructureCache;