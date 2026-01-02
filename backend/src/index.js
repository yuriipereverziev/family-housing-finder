import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import districtRoutes from "./routes/district.routes.js";

dotenv.config();

const app = express();


const allowedOrigins = [
    "http://localhost:5175",
    "https://family-housing-finder.vercel.app"
];

app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            return callback(new Error(`CORS: Origin ${origin} не дозволений`), false);
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
