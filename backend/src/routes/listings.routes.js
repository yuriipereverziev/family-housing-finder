// server/routes/listings.routes.js
import { Router } from 'express';
import {
    getCityListings,
    getDistrictListings,
    getNearbyListings,
    getListingDetails
} from '../controllers/listings.controller.js';

const router = Router();

// GET /api/listings/:city - всі оголошення міста
router.get('/:city', getCityListings);

// GET /api/listings/:city/nearby - оголошення поруч з точкою
router.get('/:city/nearby', getNearbyListings);

// GET /api/listings/:city/:district - оголошення району
router.get('/:city/:district', getDistrictListings);

// GET /api/listings/id/:id - деталі оголошення
router.get('/id/:id', getListingDetails);

export default router;