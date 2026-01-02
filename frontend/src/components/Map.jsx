// import { useState, useEffect } from 'react';
// import { MapContainer, TileLayer, Polygon, Marker } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';
// import geojsonData from '../data/GeoJSON.json'; // Переконайся, що шлях правильний
//
// function Map({ data }) {
//     const [activeType, setActiveType] = useState(null);
//     const [extraMarkers, setExtraMarkers] = useState([]);
//
//     const currentDistrict = data?.districts?.[0];
//
//     // === Кешування ===
//     const getCacheKey = (type) => {
//         if (!currentDistrict) return null;
//         return `map_cache_${currentDistrict.name.replace(/\s+/g, '_')}_${type}`;
//     };
//
//
//
//     const getCachedMarkers = (type) => {
//         const key = getCacheKey(type);
//         if (!key) return null;
//         const cached = localStorage.getItem(key);
//         if (!cached) return null;
//         try {
//             const parsed = JSON.parse(cached);
//             const ageInDays = (Date.now() - parsed.timestamp) / 86400000;
//             if (ageInDays > 30) {
//                 console.log(`Кеш застарів: ${key}`);
//                 localStorage.removeItem(key);
//                 return null;
//             }
//             console.log(`З кешу: ${key} → ${parsed.markers.length} міток`);
//             return parsed.markers;
//         } catch (e) {
//             localStorage.removeItem(key);
//             return null;
//         }
//     };
//
//     const setCachedMarkers = (type, markers) => {
//         const key = getCacheKey(type);
//         if (!key) return;
//         localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), markers }));
//         console.log(`Збережено в кеш: ${key} → ${markers.length} міток`);
//     };
//
//
//     // === Тогл і скидання ===
//     useEffect(() => {
//         const handleToggle = (e) => {
//             const type = e.detail.type;
//             setActiveType(prev => prev === type ? null : type);
//         };
//         const handleReset = () => {
//             setActiveType(null);
//             setExtraMarkers([]);
//         };
//         window.addEventListener('showMarkers', handleToggle);
//         window.addEventListener('resetMarkers', handleReset);
//         return () => {
//             window.removeEventListener('showMarkers', handleToggle);
//             window.removeEventListener('resetMarkers', handleReset);
//         };
//     }, []);
//
//     // === Завантаження міток з Overpass ===
//     useEffect(() => {
//         if (!activeType || !currentDistrict) {
//             setExtraMarkers([]);
//             return;
//         }
//
//         const cached = getCachedMarkers(activeType);
//         if (cached !== null) {
//             setExtraMarkers(cached);
//             return;
//         }
//
//         const tagConfig = {
//             schools:       { key: 'amenity',  value: 'school' },
//             kindergartens: { key: 'amenity',  value: 'kindergarten' },
//             parks:         { key: 'leisure',  value: 'park' },
//             playgrounds:   { key: 'leisure',  value: 'playground' }
//         };
//
//         const config = tagConfig[activeType];
//         if (!config) return;
//
//         const query = `
//           [out:json][timeout:40];
//           (
//             node["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
//             way["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
//             relation["${config.key}"="${config.value}"](around:4000,${currentDistrict.lat},${currentDistrict.lon});
//           );
//           out center;
//         `;
//
//         fetch('https://overpass.kumi.systems/api/interpreter', {
//             method: 'POST',
//             body: query
//         })
//             .then(r => {
//                 if (!r.ok) throw new Error(`HTTP ${r.status}`);
//                 return r.json();
//             })
//             .then(res => {
//                 const markers = res.elements
//                     .filter(el => el.lat || el.center?.lat)
//                     .map(el => ({
//                         lat: el.lat || el.center.lat,
//                         lon: el.lon || el.center.lon
//                     }));
//                 setExtraMarkers(markers);
//                 setCachedMarkers(activeType, markers);
//             })
//             .catch(err => {
//                 console.error(`Помилка Overpass (${activeType}):`, err);
//                 setExtraMarkers([]);
//             });
//     }, [activeType, currentDistrict]);
//
//     // === Кольори ===
//     const getColor = (type) => {
//         switch (type) {
//             case 'schools': return '#e74c3c';
//             case 'kindergartens': return '#3498db';
//             case 'parks': return '#2ecc71';
//             case 'playgrounds': return '#f39c12';
//             default: return '#95a5a6';
//         }
//     };
//
//     const getFillColor = (score) => `hsl(${score * 15}, 70%, 60%)`;
//
//     // === Полігон району ===
//     const districtFeature = geojsonData.features.find(
//         f => f.properties.Name === currentDistrict?.name
//     );
//
//     const polygonPositions = districtFeature?.geometry
//         ? districtFeature.geometry.type === 'MultiPolygon'
//             ? districtFeature.geometry.coordinates.map(poly =>
//                 poly.map(ring => ring.map(coord => [coord[1], coord[0]]))
//             )
//             : [districtFeature.geometry.coordinates.map(ring =>
//                 ring.map(coord => [coord[1], coord[0]])
//             )]
//         : null;
//
//     // === Перевірка точки в полігоні ===
//     const isPointInPolygon = (lat, lon, positions) => {
//         if (!positions) return false;
//
//         const polys = Array.isArray(positions[0][0][0]) ? positions : [positions];
//
//         for (const poly of polys) {
//             let inside = false;
//             const ring = poly[0];
//             for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
//                 const xi = ring[i][0], yi = ring[i][1];
//                 const xj = ring[j][0], yj = ring[j][1];
//
//                 const intersect = ((yi > lon) !== (yj > lon))
//                     && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
//                 if (intersect) inside = !inside;
//             }
//             if (inside) return true;
//         }
//         return false;
//     };
//
//     // Фільтровані мітки — тільки всередині району
//     const filteredMarkers = extraMarkers.filter(marker =>
//         isPointInPolygon(marker.lat, marker.lon, polygonPositions)
//     );
//
//     return (
//         <MapContainer
//             center={currentDistrict ? [currentDistrict.lat, currentDistrict.lon] : [48.9226, 24.7111]}
//             zoom={14}
//             style={{
//                 height: '600px',
//                 width: '100%',
//                 borderRadius: '16px',
//                 boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
//                 marginTop: '20px'
//             }}
//         >
//             <TileLayer
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                 attribution='&copy; OpenStreetMap contributors'
//             />
//
//             {/* Полігон району */}
//             {polygonPositions && (
//                 <Polygon
//                     positions={polygonPositions}
//                     pathOptions={{
//                         fillColor: getFillColor(currentDistrict?.score || 3),
//                         fillOpacity: 0.45,
//                         color: '#ffffff',
//                         weight: 5,
//                         opacity: 0.9
//                     }}
//                 />
//             )}
//
//             {/* Мітки інфраструктури — тільки всередині району */}
//             {filteredMarkers.map((m, i) => (
//                 <Marker
//                     key={`${activeType}-${i}`}
//                     position={[m.lat, m.lon]}
//                     icon={L.divIcon({
//                         className: 'infra-marker',
//                         html: `
//                           <div style="
//                             background: ${getColor(activeType)};
//                             width: 18px;
//                             height: 18px;
//                             border-radius: 50%;
//                             border: 4px solid white;
//                             box-shadow: 0 3px 10px rgba(0,0,0,0.4);
//                           "></div>
//                         `,
//                         iconSize: [18, 18],
//                         iconAnchor: [9, 9]
//                     })}
//                 />
//             ))}
//         </MapContainer>
//     );
// }
//
// export default Map;

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import geojsonData from '../data/GeoJSON.json';

function Map({ data }) {
    const [activeType, setActiveType] = useState(null);
    const [extraMarkers, setExtraMarkers] = useState([]);

    const currentDistrict = data?.districts?.[0];

    // === Кешування ===
    const getCacheKey = (type) => {
        if (!currentDistrict) return null;
        return `map_cache_${currentDistrict.name.replace(/\s+/g, '_')}_${type}`;
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

    // === Перевірка точки в полігоні ===
    const isPointInPolygon = (lat, lon, positions) => {
        if (!positions) return false;

        const polys = Array.isArray(positions[0][0][0]) ? positions : [positions];

        for (const poly of polys) {
            let inside = false;
            const ring = poly[0];
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                const xi = ring[i][0], yi = ring[i][1];
                const xj = ring[j][0], yj = ring[j][1];

                const intersect = ((yi > lon) !== (yj > lon))
                    && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            if (inside) return true;
        }
        return false;
    };

    // === Отримати полігон району ===
    const getDistrictPolygon = (districtName) => {
        const districtFeature = geojsonData.features.find(
            f => f.properties.Name === districtName
        );

        if (!districtFeature?.geometry) return null;

        return districtFeature.geometry.type === 'MultiPolygon'
            ? districtFeature.geometry.coordinates.map(poly =>
                poly.map(ring => ring.map(coord => [coord[1], coord[0]]))
            )
            : [districtFeature.geometry.coordinates.map(ring =>
                ring.map(coord => [coord[1], coord[0]])
            )];
    };

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

    // === ПОПЕРЕДНЄ ЗАВАНТАЖЕННЯ з фільтрацією ===
    useEffect(() => {
        if (!currentDistrict) return;

        const types = ['schools', 'kindergartens', 'parks', 'playgrounds'];
        const counts = {};

        console.log(`🚀 Попереднє завантаження для "${currentDistrict.name}"`);

        const polygonPositions = getDistrictPolygon(currentDistrict.name);

        types.forEach(async (type, index) => {
            // Перевірка кешу
            const cached = getCachedMarkers(type);

            if (cached !== null) {
                // Фільтруємо кеш
                const filtered = polygonPositions
                    ? cached.filter(marker => isPointInPolygon(marker.lat, marker.lon, polygonPositions))
                    : cached;

                counts[type] = filtered.length;
                console.log(`✅ ${type}: ${filtered.length} (з кешу)`);

                // Відправляємо оновлення підрахунку
                window.dispatchEvent(new CustomEvent('updateCounts', {
                    detail: { counts: {...counts} }
                }));
                return;
            }

            // Затримка між запитами
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

                // ФІЛЬТРУЄМО по полігону
                if (polygonPositions) {
                    markers = markers.filter(marker =>
                        isPointInPolygon(marker.lat, marker.lon, polygonPositions)
                    );
                    console.log(`✅ ${type}: ${markers.length} міток після фільтрації`);
                }

                counts[type] = markers.length;

                // Зберігаємо ВЖЕ ВІДФІЛЬТРОВАНІ мітки
                setCachedMarkers(type, markers);

                // Відправляємо оновлення підрахунку
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

        // Беремо з кешу (вже відфільтровані)
        const cached = getCachedMarkers(activeType);
        if (cached !== null) {
            setExtraMarkers(cached);
            return;
        }

        // Якщо немає в кеші - завантажуємо
        const tagConfig = {
            schools:       { key: 'amenity',  value: 'school' },
            kindergartens: { key: 'amenity',  value: 'kindergarten' },
            parks:         { key: 'leisure',  value: 'park' },
            playgrounds:   { key: 'leisure',  value: 'playground' }
        };

        const config = tagConfig[activeType];
        if (!config) return;

        const polygonPositions = getDistrictPolygon(currentDistrict.name);

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

                // Фільтруємо
                if (polygonPositions) {
                    markers = markers.filter(marker =>
                        isPointInPolygon(marker.lat, marker.lon, polygonPositions)
                    );
                }

                setExtraMarkers(markers);
                setCachedMarkers(activeType, markers);
            })
            .catch(err => {
                console.error(`❌ Помилка Overpass (${activeType}):`, err);
                setExtraMarkers([]);
            });
    }, [activeType, currentDistrict]);

    // === Кольори ===
    const getColor = (type) => {
        switch (type) {
            case 'schools': return '#e74c3c';
            case 'kindergartens': return '#3498db';
            case 'parks': return '#2ecc71';
            case 'playgrounds': return '#f39c12';
            default: return '#95a5a6';
        }
    };

    const getFillColor = (score) => `hsl(${score * 15}, 70%, 60%)`;

    // === Полігон району для відображення ===
    const polygonPositions = getDistrictPolygon(currentDistrict?.name);

    return (
        <MapContainer
            center={currentDistrict ? [currentDistrict.lat, currentDistrict.lon] : [48.9226, 24.7111]}
            zoom={14}
            style={{
                height: '600px',
                width: '100%',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                marginTop: '20px'
            }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {/* Полігон району */}
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

            {/* Мітки інфраструктури */}
            {extraMarkers.map((m, i) => (
                <Marker
                    key={`${activeType}-${i}`}
                    position={[m.lat, m.lon]}
                    icon={L.divIcon({
                        className: 'infra-marker',
                        html: `
                          <div style="
                            background: ${getColor(activeType)};
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            border: 4px solid white;
                            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                          "></div>
                        `,
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    })}
                />
            ))}
        </MapContainer>
    );
}

export default Map;