import axios from "axios";

export const getFamilyInfrastructure = async () => {
  const query = `
  [out:json];
  (
    node["amenity"="school"](around:5000,48.9226,24.7111);
    node["amenity"="kindergarten"](around:5000,48.9226,24.7111);
    node["leisure"="park"](around:5000,48.9226,24.7111);
    node["leisure"="playground"](around:5000,48.9226,24.7111);
  );
  out;
  `;

  try {
    const response = await axios.post(
      process.env.OSM_OVERPASS_URL,
      query,
      { headers: { "Content-Type": "text/plain" } }
    );

    const elements = response.data.elements || [];

    return {
      schools: elements.filter(e => e.tags?.amenity === "school").length,
      kindergartens: elements.filter(e => e.tags?.amenity === "kindergarten").length,
      parks: elements.filter(e => e.tags?.leisure === "park").length,
      playgrounds: elements.filter(e => e.tags?.leisure === "playground").length
    };
  } catch (error) {
    console.error("OSM API Error:", error.message);
    return {
      schools: 0,
      kindergartens: 0,
      parks: 0,
      playgrounds: 0
    };
  }
};
