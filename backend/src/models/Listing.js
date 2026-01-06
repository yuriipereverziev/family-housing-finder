// server/models/Listing.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const ListingSchema = new Schema({
    // Основна інформація
    city: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    district: {
        type: String,
        trim: true,
        index: true
    },

    // Координати
    lat: {
        type: Number,
        required: true,
        index: true
    },

    lon: {
        type: Number,
        required: true,
        index: true
    },

    // Тип операції
    type: {
        type: String,
        enum: ['sale', 'rent'],
        required: true,
        index: true
    },

    // Ціна
    price: {
        type: Number,
        required: true,
        index: true
    },

    pricePerSqm: {
        type: Number
    },

    currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'UAH', 'EUR']
    },

    // Характеристики
    rooms: {
        type: Number,
        min: 0,
        max: 10,
        index: true
    },

    area: {
        type: Number,
        min: 0
    },

    floor: {
        type: Number
    },

    totalFloors: {
        type: Number
    },

    // Текстова інформація
    title: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    address: {
        type: String
    },

    // Медіа
    images: [{
        type: String
    }],

    // Джерело
    source: {
        type: String,
        enum: ['olx', 'ria', 'manual', 'generated'],
        default: 'olx',
        index: true
    },

    externalId: {
        type: String,
        unique: true,
        sparse: true
    },

    externalUrl: {
        type: String
    },

    // Статус
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Контакти (опціонально)
    contact: {
        phone: String,
        name: String
    },

    // Дати
    publishedAt: {
        type: Date,
        default: Date.now
    },

    lastChecked: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Геопросторовий індекс для пошуку навколо точки
ListingSchema.index({ lat: 1, lon: 1 });

// Композитні індекси для швидкого пошуку
ListingSchema.index({ city: 1, type: 1, isActive: 1 });
ListingSchema.index({ district: 1, type: 1, isActive: 1 });
ListingSchema.index({ price: 1, rooms: 1 });

// Автоматичне оновлення updatedAt
ListingSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Метод для перевірки чи оголошення застаріле (>30 днів)
ListingSchema.methods.isOutdated = function() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastChecked < thirtyDaysAgo;
};

const Listing = mongoose.models.Listing || model('Listing', ListingSchema);

export default Listing;