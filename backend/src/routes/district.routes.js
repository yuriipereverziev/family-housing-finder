import { Router } from "express";
import { getDistrictSummary } from "../controllers/district.controller.js";

const router = Router();

router.get("/ivano-frankivsk", getDistrictSummary);

export default router;
