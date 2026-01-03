import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

// ============ КОНСТАНТИ ============
const CACHE_VERSION = 'v3';
const CACHE_EXPIRY_DAYS = 30;
const OVERPASS_API = 'https://overpass.kumi.systems/api/interpreter';
const OVERPASS_TIMEOUT = 40;
const SEARCH_RADIUS = 4000;
const DEFAULT_CENTER = [48.9226, 24.7111];

const FACILITY_TYPES = {
    schools: { key: 'amenity', value: 'school', emoji: '🏫' },
    kindergartens: { key: 'amenity', value: 'kindergarten', emoji: '👶' },
    parks: { key: 'leisure', value: 'park', emoji: '🌳' },
    playgrounds: { key: 'leisure', value: 'playground', emoji: '🎠' }
};

// ============ УТИЛІТИ ============
const createCacheKey = (districtName, type) =>
    `map_cache_${CACHE_VERSION}_${districtName.replace(/\s+/g, '_')}_${type}`;

const isCacheValid = (timestamp) =>
    (Date.now() - timestamp) / 86400000 <= CACHE_EXPIRY_DAYS;

const getPolygonCenter = (positions) => {
    if (!positions?.[0]) return null;

    const ring = Array.isArray(positions[0][0][0]) ? positions[0][0] : positions[0];
    const sum = ring.reduce((acc, [lat, lon]) => ({
        lat: acc.lat + lat,
        lon: acc.lon + lon
    }), { lat: 0, lon: 0 });

    return [sum.lat / ring.length, sum.lon / ring.length];
};

const getFillColor = (score) => `hsl(${score * 15}, 70%, 60%)`;

// ============ ХУКИ ============
const useCache = (districtName) => {
    const getCached = (type) => {
        if (!districtName) return null;

        const key = createCacheKey(districtName, type);
        const cached = localStorage.getItem(key);

        if (!cached) return null;

        try {
            const { timestamp, markers } = JSON.parse(cached);

            if (!isCacheValid(timestamp)) {
                localStorage.removeItem(key);
                return null;
            }

            console.log(`📦 Кеш: ${type} → ${markers.length} міток`);
            return markers;
        } catch {
            localStorage.removeItem(key);
            return null;
        }
    };

    const setCached = (type, markers) => {
        if (!districtName) return;

        const key = createCacheKey(districtName, type);
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            markers
        }));
        console.log(`💾 Збережено: ${type} → ${markers.length} міток`);
    };

    return { getCached, setCached };
};

const usePointInPolygon = (districts) => {
    return (lat, lon, districtName) => {
        try {
            const district = districts?.find(d => d.name === districtName);
            if (!district?.polygon) return false;

            const turfPolygon = polygon(district.polygon);
            return booleanPointInPolygon(point([lon, lat]), turfPolygon);
        } catch (e) {
            console.error(`❌ Помилка перевірки точки для "${districtName}":`, e);
            return false;
        }
    };
};

// ============ OVERPASS API ============
const buildOverpassQuery = (config, lat, lon) => `
  [out:json][timeout:${OVERPASS_TIMEOUT}];
  (
    node["${config.key}"="${config.value}"](around:${SEARCH_RADIUS},${lat},${lon});
    way["${config.key}"="${config.value}"](around:${SEARCH_RADIUS},${lat},${lon});
    relation["${config.key}"="${config.value}"](around:${SEARCH_RADIUS},${lat},${lon});
  );
  out center;
`;

const fetchOverpassData = async (type, district) => {
    const config = FACILITY_TYPES[type];
    const query = buildOverpassQuery(config, district.lat, district.lon);

    const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: query
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.elements
        .filter(el => el.lat || el.center?.lat)
        .map(el => ({
            lat: el.lat || el.center.lat,
            lon: el.lon || el.center.lon
        }));
};

// ============ КОМПОНЕНТИ ============
function ChangeMapView({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, zoom, {
                animate: true,
                duration: 0.5
            });
        }
    }, [center, zoom, map]);

    return null;
}

function Map({ data }) {
    const [activeTypes, setActiveTypes] = useState([]);
    const [markersData, setMarkersData] = useState({});

    const currentDistrict = data?.districts?.[0];
    const { getCached, setCached } = useCache(currentDistrict?.name);
    const isPointInPolygon = usePointInPolygon(data?.districts);

    // Конвертація полігону для Leaflet
    const polygonPositions = useMemo(() => {
        if (!currentDistrict?.polygon) return null;
        return currentDistrict.polygon.map(ring =>
            ring.map(([lon, lat]) => [lat, lon])
        );
    }, [currentDistrict]);

    // Центр карти
    const mapCenter = useMemo(() => {
        if (polygonPositions) {
            return getPolygonCenter(polygonPositions);
        }
        return currentDistrict
            ? [currentDistrict.lat, currentDistrict.lon]
            : DEFAULT_CENTER;
    }, [polygonPositions, currentDistrict]);

    // Обробка подій - МУЛЬТИВИБІР
    useEffect(() => {
        const handleToggle = (e) => {
            const type = e.detail.type;
            setActiveTypes(prev =>
                prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
            );
        };

        const handleReset = () => {
            setActiveTypes([]);
            setMarkersData({});
        };

        window.addEventListener('showMarkers', handleToggle);
        window.addEventListener('resetMarkers', handleReset);

        return () => {
            window.removeEventListener('showMarkers', handleToggle);
            window.removeEventListener('resetMarkers', handleReset);
        };
    }, []);

    // Попереднє завантаження даних
    useEffect(() => {
        if (!currentDistrict) return;

        const counts = {};
        console.log(`🚀 Попереднє завантаження для "${currentDistrict.name}"`);

        Object.keys(FACILITY_TYPES).forEach(async (type, index) => {
            const cached = getCached(type);

            if (cached) {
                const filtered = cached.filter(m =>
                    isPointInPolygon(m.lat, m.lon, currentDistrict.name)
                );
                counts[type] = filtered.length;
                console.log(`✅ ${type}: ${filtered.length} (кеш)`);

                window.dispatchEvent(new CustomEvent('updateCounts', {
                    detail: { counts: { ...counts } }
                }));
                return;
            }

            // Затримка між запитами
            await new Promise(resolve => setTimeout(resolve, 1000 * index));

            try {
                console.log(`⏳ Завантаження ${type}...`);
                let markers = await fetchOverpassData(type, currentDistrict);

                markers = markers.filter(m =>
                    isPointInPolygon(m.lat, m.lon, currentDistrict.name)
                );

                counts[type] = markers.length;
                setCached(type, markers);

                window.dispatchEvent(new CustomEvent('updateCounts', {
                    detail: { counts: { ...counts } }
                }));
            } catch (err) {
                console.error(`❌ Помилка (${type}):`, err);
                counts[type] = 0;
            }
        });
    }, [currentDistrict?.name]);

    // Завантаження міток для ВСІХ активних типів
    useEffect(() => {
        if (!currentDistrict) return;

        activeTypes.forEach(type => {
            // Якщо вже завантажено - пропускаємо
            if (markersData[type]) return;

            const cached = getCached(type);
            if (cached) {
                const filtered = cached.filter(m =>
                    isPointInPolygon(m.lat, m.lon, currentDistrict.name)
                );
                setMarkersData(prev => ({ ...prev, [type]: filtered }));
                return;
            }

            fetchOverpassData(type, currentDistrict)
                .then(markers => {
                    const filtered = markers.filter(m =>
                        isPointInPolygon(m.lat, m.lon, currentDistrict.name)
                    );
                    setMarkersData(prev => ({ ...prev, [type]: filtered }));
                    setCached(type, filtered);
                })
                .catch(err => {
                    console.error(`❌ Помилка Overpass (${type}):`, err);
                    setMarkersData(prev => ({ ...prev, [type]: [] }));
                });
        });
    }, [activeTypes, currentDistrict]);

    // Об'єднання всіх міток з активних типів
    const allMarkers = useMemo(() => {
        return activeTypes.flatMap(type =>
            (markersData[type] || []).map(m => ({ ...m, type }))
        );
    }, [activeTypes, markersData]);

    return (
        <MapContainer
            center={mapCenter}
            zoom={14}
            style={{
                height: '600px',
                width: '100%',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                marginTop: '20px'
            }}
        >
            <ChangeMapView center={mapCenter} zoom={14} />

            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {polygonPositions && (
                <Polygon
                    positions={polygonPositions}
                    pathOptions={{
                        fillColor: getFillColor(currentDistrict?.score || 3),
                        fillOpacity: 0.45,
                        color: '#ffffff',
                        weight: 5,
                        opacity: 0.9
                    }}
                />
            )}

            {allMarkers.map((m, i) => (
                <Marker
                    key={`${m.type}-${i}`}
                    position={[m.lat, m.lon]}
                    icon={L.divIcon({
                        className: 'emoji-marker',
                        html: `
              <div style="
                font-size: 22px;
                line-height: 22px;
                background: white;
                border-radius: 50%;
                padding: 4px;
                box-shadow: 0 4px 10px rgba(0,0,0,.35);
                transform: translate(-50%, -50%);
              ">
                ${FACILITY_TYPES[m.type].emoji}
              </div>
            `,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })}
                />
            ))}
        </MapContainer>
    );
}

export default Map;