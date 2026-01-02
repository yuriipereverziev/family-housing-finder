import axios from "axios";

export const getRealEstateStats = async () => {
  try {
    const response = await axios.get(
      "https://developers.ria.com/dom/search",
      {
        params: {
          api_key: process.env.RIA_API_KEY,
          city_id: 15,
          operation_type: 1,
          realty_type: 2
        }
      }
    );

    return {
      totalOffers: response.data?.items?.length || 0
    };
  } catch (error) {
    console.error("RIA API Error:", error.message);
    return { totalOffers: 0 };
  }
};
