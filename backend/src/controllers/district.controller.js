// import { getRealEstateStats } from "../services/ria.service.js";
// import { getFamilyInfrastructure } from "../services/osm.service.js";
// import { calculateScore } from "../services/score.service.js"; // правильний шлях
// import NodeCache from "node-cache";
//
// const cache = new NodeCache({ stdTTL: 3600 }); // 1 година
//
// const districts = [
//     { name: "Центр",    lat: 48.9226, lon: 24.7111, radius: 2500 },
//     { name: "Пасічна",  lat: 48.9360, lon: 24.7150, radius: 2500 },
//     { name: "БАМ",      lat: 48.9150, lon: 24.7350, radius: 2500 },
//     { name: "Каскад",   lat: 48.9050, lon: 24.7200, radius: 2500 },
// ];
//
// export const getDistrictSummary = async (req, res) => {
//     const cacheKey = "ivano-frankivsk_summary";
//     const cached = cache.get(cacheKey);
//     if (cached) return res.json(cached);
//
//     try {
//         const realEstate = await getRealEstateStats();
//
//         const districtData = [];
//         for (const district of districts) {
//             let infra = { schools: 0, kindergartens: 0, parks: 0, playgrounds: 0 };
//             try {
//                 infra = await getFamilyInfrastructure(district);
//             } catch (err) {
//                 console.error(`Infra failed: ${district.name}`, err.message);
//             }
//
//             const score = calculateScore(infra);
//
//             districtData.push({
//                 name: district.name,
//                 score,
//                 infrastructure: infra
//             });
//         }
//
//         const result = {
//             city: "Ivano-Frankivsk",
//             realEstate,
//             districts: districtData
//         };
//
//         cache.set(cacheKey, result);
//         res.json(result);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             city: "Ivano-Frankivsk",
//             realEstate: { totalOffers: 0 },
//             districts: districts.map(d => ({
//                 name: d.name,
//                 score: 0,
//                 infrastructure: { schools: 0, kindergartens: 0, parks: 0, playgrounds: 0 }
//             }))
//         });
//     }
// };
// import { getRealEstateStats } from "../services/ria.service.js";
import { getFamilyInfrastructure } from "../services/osm.service.js";
import { calculateScore } from "../services/score.service.js"; // правильний шлях
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 3600 });

const districts = [
    { name: "Центр",    lat: 48.9226, lon: 24.7111, radius: 1800 },
    { name: "Пасічна", lat: 48.9360, lon: 24.7150, radius: 1800 },
    { name: "БАМ",      lat: 48.9150, lon: 24.7350, radius: 1800 },
    { name: "Каскад",   lat: 48.9050, lon: 24.7200, radius: 1800 },
];

export const getDistrictSummary = async (req, res) => {
    const city = req.params.city?.toLowerCase() || "ivano-frankivsk";
    const cacheKey = `${city}_summary`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let districtData = [];
    let realEstate = { totalOffers: 456 }; // або await getRealEstateStats()

    if (city === "ivano-frankivsk") {
        for (const d of districts) {
            let infra = { schools: 0, kindergartens: 0, parks: 0, playgrounds: 0 };
            try {
                infra = await getFamilyInfrastructure(d);
            } catch (e) {
                console.error(e);
            }
            const score = calculateScore(infra);

            districtData.push({
                name: d.name,
                lat: d.lat,
                lon: d.lon,
                score,
                infrastructure: infra
            });
        }
    }

    const result = {
        city: city.charAt(0).toUpperCase() + city.slice(1),
        realEstate,
        districts: districtData
    };

    cache.set(cacheKey, result);
    res.json(result);
};