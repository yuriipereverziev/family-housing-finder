// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import connectDB from "./config/db.js";
//
// import districtRoutes from "./routes/district.routes.js";
// import infrastructureRoutes from "./routes/infrastructure.js";
//
// dotenv.config();
// connectDB();
//
// const app = express();
//
// app.use(cors({ origin: true }));
// app.use(express.json());
//
// app.use("/api/districts", districtRoutes);
// app.use("/api/infrastructure", infrastructureRoutes);
//
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`🚀 API running on port ${PORT}`);
// });

// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import districtRoutes from "./routes/district.routes.js";
import infrastructureRoutes from "./routes/infrastructure.js";
import riaRoutes from "./routes/ria.routes.js"; // ⬅️ НОВИЙ ІМПОРТ

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use("/api/districts", districtRoutes);
app.use("/api/infrastructure", infrastructureRoutes);
app.use("/api/realestate", riaRoutes); // ⬅️ НОВИЙ ROUTE

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        services: {
            mongodb: "connected",
            ria: process.env.RIA_API_KEY ? "configured" : "not configured"
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
    console.log(`📍 Endpoints:`);
    console.log(`   GET  /api/districts/:city`);
    console.log(`   GET  /api/infrastructure/:city/:district/:type`);
    console.log(`   GET  /api/realestate/:city`);
    console.log(`   GET  /api/realestate/:city/:district`);
    console.log(`   POST /api/realestate/:city/bulk`);
});

export default app;
