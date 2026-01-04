import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import districtRoutes from "./routes/district.routes.js";
import infrastructureRoutes from "./routes/infrastructure.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/districts", districtRoutes);
app.use("/api/infrastructure", infrastructureRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 API running on port ${PORT}`);
});
