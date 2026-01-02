import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import districtRoutes from "./routes/district.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/districts", districtRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 API running on http://localhost:${PORT}`)
);
