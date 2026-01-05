// server/routes/ria.routes.js
import { Router } from "express";
import {
    getCityRealEstate,
    getDistrictRealEstate,
    getBulkDistrictsRealEstate
} from "../controllers/ria.controller.js";

const router = Router();

// GET /api/realestate/:city - загальна статистика по місту
router.get("/:city", getCityRealEstate);

// POST /api/realestate/:city/bulk - статистика для кількох районів
router.post("/:city/bulk", getBulkDistrictsRealEstate);

// GET /api/realestate/:city/:district - статистика по району
router.get("/:city/:district", getDistrictRealEstate);

export default router;