// server/controllers/listings.controller.js
import Listing from '../models/Listing.js';

/**
 * GET /api/listings/:city
 * Отримати всі активні оголошення для міста
 */
export const getCityListings = async (req, res) => {
    try {
        const { city } = req.params;
        const { type, minPrice, maxPrice, rooms, district } = req.query;

        const query = {
            city: city.toLowerCase(),
            isActive: true
        };

        // Фільтри
        if (type) query.type = type;
        if (district) query.district = district;
        if (rooms) query.rooms = parseInt(rooms);
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }

        const listings = await Listing.find(query)
            .select('lat lon type price rooms area district title externalUrl images')
            .sort({ publishedAt: -1 })
            .limit(500)
            .lean();

        res.json({
            city,
            total: listings.length,
            listings
        });

    } catch (error) {
        console.error('❌ Помилка getCityListings:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/listings/:city/:district
 * Отримати оголошення для району
 */
export const getDistrictListings = async (req, res) => {
    try {
        const { city, district: encodedDistrict } = req.params;
        const district = decodeURIComponent(encodedDistrict);
        const { type } = req.query;

        const query = {
            city: city.toLowerCase(),
            district,
            isActive: true
        };

        if (type) query.type = type;

        const listings = await Listing.find(query)
            .select('lat lon type price rooms area title externalUrl images publishedAt')
            .sort({ publishedAt: -1 })
            .lean();

        // Статистика
        const stats = {
            total: listings.length,
            sale: listings.filter(l => l.type === 'sale').length,
            rent: listings.filter(l => l.type === 'rent').length,
            avgPriceSale: 0,
            avgPriceRent: 0
        };

        const saleListings = listings.filter(l => l.type === 'sale');
        const rentListings = listings.filter(l => l.type === 'rent');

        if (saleListings.length > 0) {
            stats.avgPriceSale = Math.round(
                saleListings.reduce((sum, l) => sum + l.price, 0) / saleListings.length
            );
        }

        if (rentListings.length > 0) {
            stats.avgPriceRent = Math.round(
                rentListings.reduce((sum, l) => sum + l.price, 0) / rentListings.length
            );
        }

        res.json({
            city,
            district,
            stats,
            listings
        });

    } catch (error) {
        console.error('❌ Помилка getDistrictListings:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/listings/:city/nearby
 * Отримати оголошення поруч з точкою
 */
export const getNearbyListings = async (req, res) => {
    try {
        const { city } = req.params;
        const { lat, lon, radius = 1000, type } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Потрібні параметри lat та lon' });
        }

        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const radiusKm = parseInt(radius) / 1000;

        // Приблизний розрахунок діапазону координат
        const latDelta = radiusKm / 111; // 1 градус ≈ 111 км
        const lonDelta = radiusKm / (111 * Math.cos(latNum * Math.PI / 180));

        const query = {
            city: city.toLowerCase(),
            isActive: true,
            lat: { $gte: latNum - latDelta, $lte: latNum + latDelta },
            lon: { $gte: lonNum - lonDelta, $lte: lonNum + lonDelta }
        };

        if (type) query.type = type;

        const listings = await Listing.find(query)
            .select('lat lon type price rooms area district title externalUrl images')
            .limit(100)
            .lean();

        // Фільтруємо по точному радіусу
        const filtered = listings.filter(listing => {
            const distance = calculateDistance(latNum, lonNum, listing.lat, listing.lon);
            return distance <= radius;
        });

        res.json({
            center: { lat: latNum, lon: lonNum },
            radius,
            total: filtered.length,
            listings: filtered
        });

    } catch (error) {
        console.error('❌ Помилка getNearbyListings:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/listings/id/:id
 * Отримати деталі оголошення
 */
export const getListingDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await Listing.findById(id).lean();

        if (!listing) {
            return res.status(404).json({ error: 'Оголошення не знайдено' });
        }

        res.json(listing);

    } catch (error) {
        console.error('❌ Помилка getListingDetails:', error);
        res.status(500).json({ error: error.message });
    }
};

// Допоміжна функція для розрахунку відстані (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Радіус Землі в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Відстань в метрах
}