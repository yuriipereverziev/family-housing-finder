import { getRealEstateStats } from "../services/ria.service.js";
import { getFamilyInfrastructure } from "../services/osm.service.js";

export const getDistrictSummary = async (req, res) => {
  try {
    const realEstate = await getRealEstateStats();
    const infrastructure = await getFamilyInfrastructure();

    res.json({
      city: "Ivano-Frankivsk",
      realEstate,
      infrastructure
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to load district data" });
  }
};
