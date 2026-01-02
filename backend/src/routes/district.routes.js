import { Router } from "express";
import { getDistrictSummary } from "../controllers/district.controller.js";

const router = Router();

router.get("/:city", getDistrictSummary);

export default router;
