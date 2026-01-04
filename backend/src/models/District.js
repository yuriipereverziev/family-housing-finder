import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const DistrictSchema = new Schema({
    city: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    lat: {
        type: Number,
        required: true
    },

    lon: {
        type: Number,
        required: true
    },

    score: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    infrastructure: {
        schools: { type: Number, default: 0 },
        kindergartens: { type: Number, default: 0 },
        libraries: { type: Number, default: 0 },
        hospitals: { type: Number, default: 0 },
        pharmacies: { type: Number, default: 0 },
        clinics: { type: Number, default: 0 },
        busStops: { type: Number, default: 0 },
        railwayStations: { type: Number, default: 0 },
        supermarkets: { type: Number, default: 0 },
        convenience: { type: Number, default: 0 },
        parks: { type: Number, default: 0 },
        playgrounds: { type: Number, default: 0 },
        sportsCentres: { type: Number, default: 0 },
        cinemas: { type: Number, default: 0 },
        banks: { type: Number, default: 0 },
        cafes: { type: Number, default: 0 },
        police: { type: Number, default: 0 }
    },

    // ✅ ВИПРАВЛЕНО: правильний тип для полігону
    polygon: {
        type: Schema.Types.Mixed, // Найбільш гнучкий варіант
        default: []
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

DistrictSchema.index({ city: 1, name: 1 }, { unique: true });

DistrictSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const District = mongoose.models.District || model('District', DistrictSchema);

export default District;