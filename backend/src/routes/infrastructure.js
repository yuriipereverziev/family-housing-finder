// server/routes/infrastructure.js
import express from 'express';
import {
    getInfrastructureData,
    getAllInfrastructureForDistrict,
    getDistrictByName
} from '../services/infrastructureService.js';

// Мапінг українських назв типів на англійські ключі (як у фронтенді)
const typeMap = {
    'школи': 'schools',
    'дитсадки': 'kindergartens',
    'бібліотеки': 'libraries',
    'лікарні': 'hospitals',
    'аптеки': 'pharmacies',
    'поліклініки': 'clinics',
    'зупинки': 'busStops',
    'вокзали': 'railwayStations',
    'супермаркети': 'supermarkets',
    'магазини': 'convenience',
    'парки': 'parks',
    'майданчики': 'playgrounds',
    'спорткомплекси': 'sportsCentres',
    'кінотеатри': 'cinemas',
    'банки': 'banks',
    'кафе': 'cafes',
    'поліція': 'police'
};

const router = express.Router();

// GET /api/infrastructure/:city/:district/:type
router.get('/:city/:district/:type', async (req, res) => {
    try {
        const { city, district: encodedDistrict, type: rawType } = req.params;

        // Критично важливо: декодуємо назву району (бо в URL пробіли → %20, укр. символи → %D0 і т.д.)
        const districtName = decodeURIComponent(encodedDistrict);

        // Перетворюємо українську назву типу на англійську, якщо потрібно
        const facilityType = typeMap[rawType] || rawType;

        console.log(`Infrastructure request: city=${city}, district="${districtName}", type=${facilityType}`);

        // Шукаємо район за декодованою назвою
        const district = await getDistrictByName(city, districtName);
        if (!district) {
            console.warn(`District not found: ${districtName} in city ${city}`);
            return res.status(404).json({ error: 'District not found' });
        }

        const data = await getInfrastructureData(city, districtName, facilityType, district);

        res.json(data);
    } catch (error) {
        console.error('Error in infrastructure route (/city/district/type):', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /api/infrastructure/:city/:district — всі типи інфраструктури для району
router.get('/:city/:district', async (req, res) => {
    try {
        const { city, district: encodedDistrict } = req.params;

        // Декодуємо назву району
        const districtName = decodeURIComponent(encodedDistrict);

        console.log(`All infrastructure request: city=${city}, district="${districtName}"`);

        const district = await getDistrictByName(city, districtName);
        if (!district) {
            console.warn(`District not found: ${districtName} in city ${city}`);
            return res.status(404).json({ error: 'District not found' });
        }

        const data = await getAllInfrastructureForDistrict(city, district);

        res.json(data);
    } catch (error) {
        console.error('Error in infrastructure route (/city/district):', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

export default router;