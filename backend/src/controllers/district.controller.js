// // // server/controllers/district.controller.js
// // import NodeCache from "node-cache";
// // import District from "../models/District.js";
// // import { calculateScore } from "../services/score.service.js";
// //
// // const cache = new NodeCache({ stdTTL: 3600 });
// //
// // export const getDistrictSummary = async (req, res) => {
// //     try {
// //         const city = (req.params.city || "ivano-frankivsk").toLowerCase();
// //         console.log(`📍 Запит районів для міста: ${city}`);
// //
// //         const cacheKey = `district_summary_${city}`;
// //
// //         const cached = cache.get(cacheKey);
// //         if (cached) {
// //             console.log(`📦 Повернуто з кешу: ${cached.districts.length} районів`);
// //             return res.json(cached);
// //         }
// //
// //         if (city !== "ivano-frankivsk") {
// //             return res.status(404).json({ error: "Місто не підтримується" });
// //         }
// //
// //         const districtsFromDB = await District.find({ city })
// //             .select('name lat lon score infrastructure polygon')
// //             .lean();
// //
// //         console.log(`✅ Знайдено в БД: ${districtsFromDB.length} районів`);
// //
// //         if (districtsFromDB.length === 0) {
// //             return res.status(404).json({
// //                 error: "Райони не знайдені",
// //                 hint: "Запустіть: node scripts/seedDistricts.js"
// //             });
// //         }
// //
// //         const districtData = districtsFromDB.map(district => ({
// //             name: district.name,
// //             lat: district.lat,
// //             lon: district.lon,
// //             score: district.score || calculateScore(district.infrastructure),
// //             infrastructure: district.infrastructure || {},
// //             polygon: district.polygon || []
// //         }));
// //
// //         const result = {
// //             city: "Ivano-Frankivsk",
// //             realEstate: { totalOffers: 456 },
// //             districts: districtData
// //         };
// //
// //         cache.set(cacheKey, result);
// //         console.log(`✅ Відправлено ${districtData.length} районів`);
// //
// //         res.json(result);
// //
// //     } catch (error) {
// //         console.error("❌ Помилка в getDistrictSummary:", error);
// //         res.status(500).json({
// //             error: "Внутрішня помилка сервера",
// //             message: error.message
// //         });
// //     }
// // };
//
// // server/controllers/district.controller.js
// import NodeCache from "node-cache";
// import District from "../models/District.js";
// import InfrastructureCache from "../models/InfrastructureCache.js";
// import { calculateScore } from "../services/score.service.js";
//
// const cache = new NodeCache({ stdTTL: 3600 });
//
// export const getDistrictSummary = async (req, res) => {
//     try {
//         const city = (req.params.city || "ivano-frankivsk").toLowerCase();
//         const cacheKey = `district_summary_${city}`;
//
//         const cached = cache.get(cacheKey);
//         if (cached) {
//             console.log(`📦 Повернуто з кешу: ${cached.districts.length} районів`);
//             return res.json(cached);
//         }
//
//         if (city !== "ivano-frankivsk") {
//             return res.status(404).json({ error: "Місто не підтримується" });
//         }
//
//         const districtsFromDB = await District.find({ city })
//             .select('name lat lon score infrastructure polygon')
//             .lean();
//
//         if (districtsFromDB.length === 0) {
//             return res.status(404).json({
//                 error: "Райони не знайдені"
//             });
//         }
//
//         // ✅ Оновлюємо лічильники інфраструктури з кешу
//         const districtData = await Promise.all(
//             districtsFromDB.map(async (district) => {
//                 // Отримуємо актуальні дані з InfrastructureCache
//                 const cacheEntries = await InfrastructureCache.find({
//                     city,
//                     districtName: district.name
//                 }).select('facilityType count').lean();
//
//                 // Оновлюємо infrastructure об'єкт
//                 const infrastructure = { ...district.infrastructure };
//                 cacheEntries.forEach(entry => {
//                     infrastructure[entry.facilityType] = entry.count;
//                 });
//
//                 return {
//                     name: district.name,
//                     lat: district.lat,
//                     lon: district.lon,
//                     score: district.score || calculateScore(infrastructure),
//                     infrastructure,
//                     polygon: district.polygon || []
//                 };
//             })
//         );
//
//         const result = {
//             city: "Ivano-Frankivsk",
//             realEstate: { totalOffers: 456 },
//             districts: districtData
//         };
//
//         cache.set(cacheKey, result);
//         console.log(`✅ Відправлено ${districtData.length} районів`);
//
//         res.json(result);
//
//     } catch (error) {
//         console.error("❌ Помилка:", error);
//         res.status(500).json({ error: error.message });
//     }
// };

// server/controllers/district.controller.js
import NodeCache from "node-cache";
import District from "../models/District.js";
import InfrastructureCache from "../models/InfrastructureCache.js";
import { calculateScore } from "../services/score.service.js";

const cache = new NodeCache({ stdTTL: 600 }); // ✅ Зменшено до 10 хвилин

export const getDistrictSummary = async (req, res) => {
    try {
        const city = (req.params.city || "ivano-frankivsk").toLowerCase();
        const cacheKey = `district_summary_${city}`;

        // ❌ ВИДАЛІТЬ кешування або зменшіть час
        // const cached = cache.get(cacheKey);
        // if (cached) {
        //     return res.json(cached);
        // }

        if (city !== "ivano-frankivsk") {
            return res.status(404).json({ error: "Місто не підтримується" });
        }

        const districtsFromDB = await District.find({ city })
            .select('name lat lon score infrastructure polygon')
            .lean();

        if (districtsFromDB.length === 0) {
            return res.status(404).json({ error: "Райони не знайдені" });
        }

        // ✅ ЗАВЖДИ отримуємо свіжі дані з InfrastructureCache
        const districtData = await Promise.all(
            districtsFromDB.map(async (district) => {
                // Отримуємо актуальні лічильники з кешу
                const cacheEntries = await InfrastructureCache.find({
                    city,
                    districtName: district.name
                }).select('facilityType count').lean();

                // Створюємо новий об'єкт infrastructure з актуальними даними
                const infrastructure = {
                    schools: 0,
                    kindergartens: 0,
                    libraries: 0,
                    hospitals: 0,
                    pharmacies: 0,
                    clinics: 0,
                    busStops: 0,
                    railwayStations: 0,
                    supermarkets: 0,
                    convenience: 0,
                    parks: 0,
                    playgrounds: 0,
                    sportsCentres: 0,
                    cinemas: 0,
                    banks: 0,
                    cafes: 0,
                    police: 0
                };

                // Оновлюємо з кешу
                cacheEntries.forEach(entry => {
                    if (infrastructure.hasOwnProperty(entry.facilityType)) {
                        infrastructure[entry.facilityType] = entry.count;
                    }
                });

                return {
                    name: district.name,
                    lat: district.lat,
                    lon: district.lon,
                    score: district.score || calculateScore(infrastructure),
                    infrastructure, // ✅ Актуальні дані
                    polygon: district.polygon || []
                };
            })
        );

        const result = {
            city: "Ivano-Frankivsk",
            realEstate: { totalOffers: 456 },
            districts: districtData
        };

        // Кешуємо на короткий час
        cache.set(cacheKey, result);

        console.log(`✅ Відправлено ${districtData.length} районів з актуальними даними`);
        res.json(result);

    } catch (error) {
        console.error("❌ Помилка:", error);
        res.status(500).json({ error: error.message });
    }
};