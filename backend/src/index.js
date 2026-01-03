import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import districtRoutes from "./routes/district.routes.js";

dotenv.config();

const app = express();

/* =======================
   CORS
======================= */
const allowedOrigins = [
    "http://localhost:5181",
    "https://family-housing-finder.vercel.app"
];

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.includes(origin)) {
            return callback(new Error(`CORS: Origin ${origin} не дозволений`), false);
        }
        callback(null, true);
    }
}));

app.use(express.json());

/* =======================
   CACHE
======================= */
const CACHE_TTL = Number(process.env.CACHE_TTL) || 3600; // секунди
const cache = new Map();

/**
 * Middleware кешу
 */
app.use((req, res, next) => {
    if (req.method !== "GET") return next();

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.time < CACHE_TTL * 1000) {
        return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
        cache.set(key, {
            time: Date.now(),
            data
        });
        originalJson(data);
    };

    next();
});

/* =======================
   ROUTES
======================= */
app.use("/api/districts", districtRoutes);

/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
});
