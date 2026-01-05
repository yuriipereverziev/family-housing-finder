// server/controllers/ria.controller.js
import {
    getRealEstateStats,
    getDistrictRealEstateStats,
    getAllDistrictsRealEstate
} from '../services/ria.service.js';

/**
 * GET /api/realestate/:city
 * Отримати загальну статистику по місту
 */
export const getCityRealEstate = async (req, res) => {
    try {
        const { city } = req.params;

        const cityIds = {
            'ivano-frankivsk': 15,
            'lviv': 5,
            'kyiv': 1,
            'odesa': 9
        };

        const cityId = cityIds[city.toLowerCase()] || 15;

        const stats = await getRealEstateStats(cityId);

        res.json({
            city,
            cityId,
            ...stats
        });
    } catch (error) {
        console.error('❌ Помилка в getCityRealEstate:', error);
        res.status(500).json({
            error: 'Помилка отримання даних',
            message: error.message
        });
    }
};

/**
 * GET /api/realestate/:city/:district
 * Отримати статистику по конкретному району
 */
export const getDistrictRealEstate = async (req, res) => {
    try {
        const { city, district } = req.params;
        const districtName = decodeURIComponent(district);

        console.log(`📊 Запит RIA: ${city} → ${districtName}`);

        const stats = await getDistrictRealEstateStats(city, districtName);

        res.json(stats);
    } catch (error) {
        console.error('❌ Помилка в getDistrictRealEstate:', error);
        res.status(500).json({
            error: 'Помилка отримання даних',
            message: error.message
        });
    }
};

/**
 * POST /api/realestate/:city/bulk
 * Отримати статистику для кількох районів
 * Body: { districts: ["Центр", "Каскад", ...] }
 */
export const getBulkDistrictsRealEstate = async (req, res) => {
    try {
        const { city } = req.params;
        const { districts } = req.body;

        if (!districts || !Array.isArray(districts)) {
            return res.status(400).json({
                error: 'Потрібен масив районів у body'
            });
        }

        console.log(`📊 Bulk запит RIA: ${city} → ${districts.length} районів`);

        const stats = await getAllDistrictsRealEstate(city, districts);

        res.json({
            city,
            districts: stats,
            total: districts.length
        });
    } catch (error) {
        console.error('❌ Помилка в getBulkDistrictsRealEstate:', error);
        res.status(500).json({
            error: 'Помилка отримання даних',
            message: error.message
        });
    }
};