// // ria.service.js
// import axios from "axios";
// import NodeCache from "node-cache";
//
// // Кеш на 24 години (86400 секунд)
// const cache = new NodeCache({ stdTTL: 86400 });
//
// export const getRealEstateStats = async (cityId = 15) => {
//     // Перевіряємо кеш спочатку
//     const cached = cache.get("ria_city_" + cityId);
//     if (cached) return cached;
//
//     try {
//         const response = await axios.get("https://developers.ria.com/dom/search", {
//             params: {
//                 api_key: process.env.RIA_API_KEY,
//                 city_id: cityId,
//                 operation_type: 1,
//                 realty_type: 2
//             }
//         });
//
//         const data = {
//             totalOffers: response.data?.items?.length || 0
//         };
//
//         // Записуємо результат у кеш
//         cache.set("ria_city_" + cityId, data);
//
//         return data;
//     } catch (error) {
//         console.error("RIA API Error:", error.message);
//         return { totalOffers: 0 };
//     }
// };

// server/services/ria.service.js
import axios from "axios";
import NodeCache from "node-cache";

// Кеш на 24 години (86400 секунд)
const cache = new NodeCache({ stdTTL: 86400 });

// ID міст у RIA API
const CITY_IDS = {
    'ivano-frankivsk': 15,
    'lviv': 5,
    'kyiv': 1,
    'odesa': 9
};

// Типи операцій
const OPERATION_TYPES = {
    SALE: 1,      // Продаж
    RENT: 3       // Оренда
};

// Типи нерухомості
const REALTY_TYPES = {
    FLAT: 2,      // Квартира
    HOUSE: 1,     // Будинок
    COMMERCIAL: 4 // Комерційна
};

/**
 * Отримати загальну статистику по місту
 */
export const getRealEstateStats = async (cityId = 15) => {
    const cacheKey = `ria_city_${cityId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log(`📦 RIA кеш: місто ${cityId}`);
        return cached;
    }

    try {
        const response = await axios.get("https://developers.ria.com/dom/search", {
            params: {
                api_key: process.env.RIA_API_KEY,
                city_id: cityId,
                operation_type: OPERATION_TYPES.SALE,
                realty_type: REALTY_TYPES.FLAT
            },
            timeout: 10000
        });

        const data = {
            totalOffers: response.data?.items?.length || 0
        };

        cache.set(cacheKey, data);
        console.log(`✅ RIA: місто ${cityId} → ${data.totalOffers} оголошень`);

        return data;
    } catch (error) {
        console.error("❌ RIA API Error:", error.message);
        return { totalOffers: 0 };
    }
};

/**
 * Отримати статистику по району
 */
export const getDistrictRealEstateStats = async (cityName, districtName) => {
    const cityId = CITY_IDS[cityName.toLowerCase()] || 15;
    const cacheKey = `ria_district_${cityId}_${districtName}`;

    const cached = cache.get(cacheKey);
    if (cached) {
        console.log(`📦 RIA кеш: ${districtName}`);
        return cached;
    }

    try {
        // Запити на продаж та оренду паралельно
        const [saleResponse, rentResponse] = await Promise.all([
            // Продаж квартир
            axios.get("https://developers.ria.com/dom/search", {
                params: {
                    api_key: process.env.RIA_API_KEY,
                    city_id: cityId,
                    operation_type: OPERATION_TYPES.SALE,
                    realty_type: REALTY_TYPES.FLAT,
                    // RIA API може не підтримувати фільтр по району напряму
                    // тому фільтруємо після отримання результатів
                },
                timeout: 10000
            }),
            // Оренда квартир
            axios.get("https://developers.ria.com/dom/search", {
                params: {
                    api_key: process.env.RIA_API_KEY,
                    city_id: cityId,
                    operation_type: OPERATION_TYPES.RENT,
                    realty_type: REALTY_TYPES.FLAT,
                },
                timeout: 10000
            })
        ]);

        // Фільтруємо по району (якщо RIA повертає інформацію про район)
        const saleItems = saleResponse.data?.items || [];
        const rentItems = rentResponse.data?.items || [];

        // Фільтруємо по назві району (якщо є в описі або адресі)
        const filterByDistrict = (items) => {
            return items.filter(item => {
                const description = (item.description || '').toLowerCase();
                const address = (item.beautiful_url || '').toLowerCase();
                const districtLower = districtName.toLowerCase();

                return description.includes(districtLower) || address.includes(districtLower);
            });
        };

        const saleInDistrict = filterByDistrict(saleItems);
        const rentInDistrict = filterByDistrict(rentItems);

        // Обчислюємо середні ціни
        const calculateAvgPrice = (items) => {
            if (items.length === 0) return 0;

            const prices = items
                .map(item => parseFloat(item.price_usd || item.price || 0))
                .filter(price => price > 0);

            if (prices.length === 0) return 0;

            const sum = prices.reduce((acc, price) => acc + price, 0);
            return Math.round(sum / prices.length);
        };

        const data = {
            district: districtName,
            city: cityName,
            sale: {
                total: saleInDistrict.length,
                avgPrice: calculateAvgPrice(saleInDistrict),
                currency: 'USD'
            },
            rent: {
                total: rentInDistrict.length,
                avgPrice: calculateAvgPrice(rentInDistrict),
                currency: 'USD'
            },
            totalOffers: saleInDistrict.length + rentInDistrict.length,
            updatedAt: new Date().toISOString()
        };

        cache.set(cacheKey, data);

        console.log(`✅ RIA район ${districtName}: продаж=${data.sale.total}, оренда=${data.rent.total}`);

        return data;
    } catch (error) {
        console.error(`❌ RIA API Error для ${districtName}:`, error.message);
        return {
            district: districtName,
            city: cityName,
            sale: { total: 0, avgPrice: 0, currency: 'USD' },
            rent: { total: 0, avgPrice: 0, currency: 'USD' },
            totalOffers: 0,
            error: error.message
        };
    }
};

/**
 * Отримати детальну статистику для всіх районів міста
 */
export const getAllDistrictsRealEstate = async (cityName, districtNames) => {
    const results = {};

    // Завантажуємо паралельно для всіх районів
    await Promise.all(
        districtNames.map(async (districtName) => {
            try {
                const stats = await getDistrictRealEstateStats(cityName, districtName);
                results[districtName] = stats;
            } catch (error) {
                console.error(`❌ Помилка для району ${districtName}:`, error);
                results[districtName] = {
                    district: districtName,
                    city: cityName,
                    sale: { total: 0, avgPrice: 0, currency: 'USD' },
                    rent: { total: 0, avgPrice: 0, currency: 'USD' },
                    totalOffers: 0,
                    error: error.message
                };
            }
        })
    );

    return results;
};

/**
 * Очистити кеш RIA (корисно для розробки)
 */
export const clearRiaCache = () => {
    cache.flushAll();
    console.log('🗑️ RIA кеш очищено');
};