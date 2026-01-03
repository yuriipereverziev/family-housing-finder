import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// import geojsonData from '../data/GeoJSON.json';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon, multiPolygon } from '@turf/helpers';

// Компонент для зміни центру карти
function ChangeMapView({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        if (center) {
            map.setView(center, zoom || 14, {
                animate: true,
                duration: 0.5
            });
        }
    }, [center, zoom, map]);

    return null;
}

function Map({ data }) {
    const [activeType, setActiveType] = useState(null);
    const [extraMarkers, setExtraMarkers] = useState([]);

    const currentDistrict = data?.districts?.[0];


    // === Кешування ===
    const getCacheKey = (type) => {
        if (!currentDistrict) return null;
        return `map_cache_v3_${currentDistrict.name.replace(/\s+/g, '_')}_${type}`;
    };

    const getCachedMarkers = (type) => {
        const key = getCacheKey(type);
        if (!key) return null;
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        try {
            const parsed = JSON.parse(cached);
            const ageInDays = (Date.now() - parsed.timestamp) / 86400000;
            if (ageInDays > 30) {
                console.log(`Кеш застарів: ${key}`);
                localStorage.removeItem(key);
                return null;
            }
            console.log(`З кешу: ${key} → ${parsed.markers.length} міток`);
            return parsed.markers;
        } catch (e) {
            localStorage.removeItem(key);
            return null;
        }
    };

    const setCachedMarkers = (type, markers) => {
        const key = getCacheKey(type);
        if (!key) return;
        localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), markers }));
        console.log(`Збережено в кеш: ${key} → ${markers.length} міток`);
    };

    // console.log('Райони:', geojsonData.features.map(f => f.properties.Name));

    console.log('🧩 currentDistrict object:', currentDistrict);

    // === Перевірка точки в полігоні з Turf.js ===
    // const normalizePolygon = (coords) => {
    //     if (!Array.isArray(coords)) return null;
    //
    //     // [lon, lat] ❌
    //     if (typeof coords[0] === 'number') {
    //         return null;
    //     }
    //
    //     // [ [lon, lat], ... ] → обгортаємо
    //     if (typeof coords[0][0] === 'number') {
    //         return [coords];
    //     }
    //
    //     // MultiPolygon → беремо перший
    //     if (Array.isArray(coords[0][0][0])) {
    //         return coords[0];
    //     }
    //
    //     return coords;
    // };

    console.log(
        '🧩 polygon shape:',
        JSON.stringify(currentDistrict?.polygon)?.slice(0, 120)
    );


    const isPointInPolygon = (lat, lon, districtName) => {
        try {
            const district = data?.districts?.find(d => d.name === districtName);
            if (!district?.polygon) return false;

            const polyCoords = district.polygon;
            if (!polyCoords) return false;

            // Polygon Turf.js чекає [ [ [lon, lat], ... ] ]
            const turfPolygon = polygon(polyCoords);

            return booleanPointInPolygon(point([lon, lat]), turfPolygon);
        } catch (e) {
            console.error(`❌ Помилка Turf.js для "${districtName}":`, e);
            return false;
        }
    };

    // === Функція для розрахунку центру полігону ===
    const getPolygonCenter = (positions) => {
        if (!positions || !positions[0]) return null;

        const ring = Array.isArray(positions[0][0][0]) ? positions[0][0] : positions[0];

        let latSum = 0;
        let lonSum = 0;
        let count = 0;

        ring.forEach(coord => {
            latSum += coord[0];
            lonSum += coord[1];
            count++;
        });

        return [latSum / count, lonSum / count];
    };

    // === Отримати полігон району для відображення ===
    const getDistrictPolygon = (district) => {
        if (!district?.polygon) return null;

        // district.polygon = GeoJSON Polygon → [ [ [lon, lat], ... ] ]
        // Leaflet очікує [lat, lon]
        return district.polygon.map(ring =>
            ring.map(([lon, lat]) => [lat, lon])
        );
    };


    // === Центр карти ===
    const polygonPositions = getDistrictPolygon(currentDistrict);
    const mapCenter = polygonPositions
        ? getPolygonCenter(polygonPositions)
        : (currentDistrict ? [currentDistrict.lat, currentDistrict.lon] : [48.9226, 24.7111]);


    // === Тогл і скидання ===
    useEffect(() => {
        const handleToggle = (e) => {
            const type = e.detail.type;
            setActiveType(prev => prev === type ? null : type);
        };
        const handleReset = () => {
            setActiveType(null);
            setExtraMarkers([]);
        };
        window.addEventListener('showMarkers', handleToggle);
        window.addEventListener('resetMarkers', handleReset);
        return () => {
            window.removeEventListener('showMarkers', handleToggle);
            window.removeEventListener('resetMarkers', handleReset);
        };
    }, []);

    // === ПОПЕРЕДНЄ ЗАВАНТАЖЕННЯ з фільтрацією Turf.js ===
    useEffect(() => {
        if (!currentDistrict) return;

        const types = ['schools', 'kindergartens', 'parks', 'playgrounds'];
        const counts = {};

        console.log(`🚀 Попереднє завантаження для "${currentDistrict.name}"`);

        types.forEach(async (type, index) => {
            const cached = getCachedMarkers(type);

            if (cached !== null) {
                // Фільтруємо кеш з Turf.js
                const filtered = cached.filter(marker =>
                    isPointInPolygon(marker.lat, marker.lon, currentDistrict.name)
                );

                counts[type] = filtered.length;
                console.log(`✅ ${type}: ${filtered.length} (з кешу, Turf.js)`);

                window.dispatchEvent(new CustomEvent('updateCounts', {
                    detail: { counts: {...counts} }
                }));
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000 * index));

            const tagConfig = {
                schools:       { key: 'amenity',  value: 'school' },
                kindergartens: { key: 'amenity',  value: 'kindergarten' },
                parks:         { key: 'leisure',  value: 'park' },
                playgrounds:   { key: 'leisure',  value: 'playground' }
            };

            const config = tagConfig[type];
            const query = `
              [out:json][timeout:40];
              (
                node["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
                way["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
                relation["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
              );
              out center;
            `;

            try {
                console.log(`⏳ Завантаження ${type}...`);
                const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
                    method: 'POST',
                    body: query
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const res = await response.json();
                let markers = res.elements
                    .filter(el => el.lat || el.center?.lat)
                    .map(el => ({
                        lat: el.lat || el.center.lat,
                        lon: el.lon || el.center.lon
                    }));

                console.log(`📍 ${type}: отримано ${markers.length} міток з API`);

                // Фільтруємо з Turf.js
                markers = markers.filter(marker =>
                    isPointInPolygon(marker.lat, marker.lon, currentDistrict.name)
                );

                console.log(`✅ ${type}: ${markers.length} міток після Turf.js фільтрації`);

                counts[type] = markers.length;
                setCachedMarkers(type, markers);

                window.dispatchEvent(new CustomEvent('updateCounts', {
                    detail: { counts: {...counts} }
                }));

            } catch (err) {
                console.error(`❌ Помилка (${type}):`, err);
                counts[type] = 0;
            }
        });
    }, [currentDistrict?.name]);

    // === Завантаження міток при кліку ===
    useEffect(() => {
        if (!activeType || !currentDistrict) {
            setExtraMarkers([]);
            return;
        }

        const cached = getCachedMarkers(activeType);
        if (cached !== null) {
            setExtraMarkers(cached);
            return;
        }

        const tagConfig = {
            schools:       { key: 'amenity',  value: 'school' },
            kindergartens: { key: 'amenity',  value: 'kindergarten' },
            parks:         { key: 'leisure',  value: 'park' },
            playgrounds:   { key: 'leisure',  value: 'playground' }
        };

        const config = tagConfig[activeType];
        if (!config) return;

        const query = `
          [out:json][timeout:40];
          (
            node["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
            way["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
            relation["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
          );
          out center;
        `;

        console.log(`🌐 Завантаження ${activeType} (клік)`);

        fetch('https://overpass.kumi.systems/api/interpreter', {
            method: 'POST',
            body: query
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(res => {
                let markers = res.elements
                    .filter(el => el.lat || el.center?.lat)
                    .map(el => ({
                        lat: el.lat || el.center.lat,
                        lon: el.lon || el.center.lon
                    }));

                markers = markers.filter(marker =>
                    isPointInPolygon(marker.lat, marker.lon, currentDistrict.name)
                );

                setExtraMarkers(markers);
                setCachedMarkers(activeType, markers);
            })
            .catch(err => {
                console.error(`❌ Помилка Overpass (${activeType}):`, err);
                setExtraMarkers([]);
            });
    }, [activeType, currentDistrict]);

    // === Кольори ===
    // const getColor = (type) => {
    //     switch (type) {
    //         case 'schools': return '#e74c3c';
    //         case 'kindergartens': return '#3498db';
    //         case 'parks': return '#2ecc71';
    //         case 'playgrounds': return '#f39c12';
    //         default: return '#95a5a6';
    //     }
    // };


    const emojiIcons = {
        schools: '🏫',
        parks: '🌳',
        kindergartens: '👶',
        playgrounds: '🎠'
    };

    const getFillColor = (score) => `hsl(${score * 15}, 70%, 60%)`;

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

            {extraMarkers.map((m, i) => (
                <Marker
                    key={`${activeType}-${i}`}
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
                            ${emojiIcons[activeType]}
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