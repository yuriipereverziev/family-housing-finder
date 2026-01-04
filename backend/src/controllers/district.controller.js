// server/controllers/district.controller.js
import NodeCache from "node-cache";
import District from "../models/District.js";
import { calculateScore } from "../services/score.service.js";

const cache = new NodeCache({ stdTTL: 3600 });

export const getDistrictSummary = async (req, res) => {
    try {
        const city = (req.params.city || "ivano-frankivsk").toLowerCase();
        console.log(`📍 Запит районів для міста: ${city}`);

        const cacheKey = `district_summary_${city}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`📦 Повернуто з кешу: ${cached.districts.length} районів`);
            return res.json(cached);
        }

        if (city !== "ivano-frankivsk") {
            return res.status(404).json({ error: "Місто не підтримується" });
        }

        const districtsFromDB = await District.find({ city })
            .select('name lat lon score infrastructure polygon')
            .lean();

        console.log(`✅ Знайдено в БД: ${districtsFromDB.length} районів`);

        if (districtsFromDB.length === 0) {
            return res.status(404).json({
                error: "Райони не знайдені",
                hint: "Запустіть: node scripts/seedDistricts.js"
            });
        }

        const districtData = districtsFromDB.map(district => ({
            name: district.name,
            lat: district.lat,
            lon: district.lon,
            score: district.score || calculateScore(district.infrastructure),
            infrastructure: district.infrastructure || {},
            polygon: district.polygon || []
        }));

        const result = {
            city: "Ivano-Frankivsk",
            realEstate: { totalOffers: 456 },
            districts: districtData
        };

        cache.set(cacheKey, result);
        console.log(`✅ Відправлено ${districtData.length} районів`);

        res.json(result);

    } catch (error) {
        console.error("❌ Помилка в getDistrictSummary:", error);
        res.status(500).json({
            error: "Внутрішня помилка сервера",
            message: error.message
        });
    }
};