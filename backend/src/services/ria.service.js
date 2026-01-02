import axios from "axios";
import NodeCache from "node-cache";

// Кеш на 24 години (86400 секунд)
const cache = new NodeCache({ stdTTL: 86400 });

export const getRealEstateStats = async (cityId = 15) => {
    // Перевіряємо кеш спочатку
    const cached = cache.get("ria_city_" + cityId);
    if (cached) return cached;

    try {
        const response = await axios.get("https://developers.ria.com/dom/search", {
            params: {
                api_key: process.env.RIA_API_KEY,
                city_id: cityId,
                operation_type: 1,
                realty_type: 2
            }
        });

        const data = {
            totalOffers: response.data?.items?.length || 0
        };

        // Записуємо результат у кеш
        cache.set("ria_city_" + cityId, data);

        return data;
    } catch (error) {
        console.error("RIA API Error:", error.message);
        return { totalOffers: 0 };
    }
};
