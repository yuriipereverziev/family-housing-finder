import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import districtRoutes from "./routes/district.routes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
    'http://localhost:3000', // локальна розробка
    'https://family-housing-finder-server.vercel.app/' // заміни на свій URL фронтенду
];

app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true); // allow non-browser requests like Postman
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = `CORS policy: Origin ${origin} not allowed`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

app.use(express.json());

app.use("/api/districts", districtRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 API running on http://localhost:${PORT}`)
);
