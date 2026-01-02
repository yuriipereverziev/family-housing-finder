import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function Map({ data }) {
    const [activeType, setActiveType] = useState(null);
    const [extraMarkers, setExtraMarkers] = useState([]);
    const [preloadStatus, setPreloadStatus] = useState({});

    const getCacheKey = (type) => {
        if (!data?.districts?.[0]) return null;
        const district = data.districts[0];
        return `map_cache_${district.name.replace(/\s+/g, '_')}_${type}`;
    };

    const getCachedMarkers = (type) => {
        const key = getCacheKey(type);
        if (!key) return null;

        const cached = localStorage.getItem(key);
        if (!cached) return null;

        try {
            const parsed = JSON.parse(cached);
            const ageInDays = (Date.now() - parsed.timestamp) / (86400000);

            if (ageInDays > 30) {
                console.log(`🗑️ Кеш застарів (${ageInDays.toFixed(1)} днів) — видаляємо: ${key}`);
                localStorage.removeItem(key);
                return null;
            }

            console.log(`⚡ Дані з кешу (${ageInDays.toFixed(1)} днів): ${key} → ${parsed.markers.length} міток`);
            return parsed.markers;
        } catch (e) {
            console.warn(`Помилка читання кешу (${key}) — видаляємо`);
            localStorage.removeItem(key);
            return null;
        }
    };

    const setCachedMarkers = (type, markers) => {
        const key = getCacheKey(type);
        if (!key) return;

        const cacheData = {
            timestamp: Date.now(),
            markers
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
        console.log(`💾 Збережено в кеш: ${key} → ${markers.length} міток`);
    };

    // Функція завантаження міток для конкретного типу
    const fetchMarkersForType = async (type, district) => {
        const tagConfig = {
            schools:       { key: 'amenity',  value: 'school' },
            kindergartens: { key: 'amenity',  value: 'kindergarten' },
            parks:         { key: 'leisure',  value: 'park' },
            playgrounds:   { key: 'leisure',  value: 'playground' }
        };

        const config = tagConfig[type];
        if (!config) return;

        const query = `
          [out:json][timeout:30];
          (
            node["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
            way["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
            relation["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
          );
          out center;
        `;

        try {
            const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
                method: 'POST',
                body: query
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const res = await response.json();
            const markers = res.elements
                .filter(el => el.lat || (el.center && el.center.lat))
                .map(el => ({
                    lat: el.lat || el.center.lat,
                    lon: el.lon || el.center.lon
                }));

            console.log(`📍 Preload: ${type} → ${markers.length} міток`);
            setCachedMarkers(type, markers);
            return markers;
        } catch (err) {
            console.error(`❌ Помилка Overpass (preload ${type}):`, err);
            return null;
        }
    };

    // ПОПЕРЕДНЄ ЗАВАНТАЖЕННЯ при старті
    useEffect(() => {
        if (!data?.districts?.[0]) return;

        const district = data.districts[0];
        const types = ['schools', 'kindergartens', 'parks', 'playgrounds'];

        console.log(`🚀 Попереднє завантаження для "${district.name}"`);

        types.forEach(async (type) => {
            // Перевіряємо чи є вже в кеші
            const cached = getCachedMarkers(type);

            if (cached !== null) {
                console.log(`✅ ${type} вже в кеші`);
                setPreloadStatus(prev => ({ ...prev, [type]: 'cached' }));
            } else {
                console.log(`⏳ Завантаження ${type}...`);
                setPreloadStatus(prev => ({ ...prev, [type]: 'loading' }));

                // Затримка між запитами щоб не перевантажити API
                await new Promise(resolve => setTimeout(resolve, 500 * types.indexOf(type)));

                const markers = await fetchMarkersForType(type, district);

                if (markers) {
                    setPreloadStatus(prev => ({ ...prev, [type]: 'loaded' }));
                } else {
                    setPreloadStatus(prev => ({ ...prev, [type]: 'error' }));
                }
            }
        });
    }, [data]);

    // Тогл через кастомну подію
    useEffect(() => {
        const handleToggle = (e) => {
            const type = e.detail.type;
            const newType = activeType === type ? null : type;
            setActiveType(newType);

            if (newType) {
                console.log(`🟢 Активовано: ${newType.toUpperCase()}`);
            } else if (activeType) {
                console.log(`🔴 Деактивовано: ${activeType.toUpperCase()}`);
            }
        };

        window.addEventListener('showMarkers', handleToggle);
        return () => window.removeEventListener('showMarkers', handleToggle);
    }, [activeType]);

    // Відображення активних міток
    useEffect(() => {
        if (!activeType || !data?.districts?.[0]) {
            setExtraMarkers([]);
            return;
        }

        const district = data.districts[0];
        console.log(`🎯 Відображення міток для "${district.name}" — тип: ${activeType}`);

        // Беремо з кешу (вже має бути завантажено)
        const cached = getCachedMarkers(activeType);
        if (cached !== null) {
            setExtraMarkers(cached);
        } else {
            // Якщо з якоїсь причини не завантажилось, завантажуємо зараз
            console.log(`🌐 Додатковий запит до Overpass API для ${activeType}`);
            fetchMarkersForType(activeType, district).then(markers => {
                if (markers) setExtraMarkers(markers);
            });
        }
    }, [activeType, data]);

    const getColor = (type) => {
        switch (type) {
            case 'schools':       return '#e74c3c';
            case 'kindergartens': return '#3498db';
            case 'parks':         return '#2ecc71';
            case 'playgrounds':   return '#f39c12';
            default:              return '#95a5a6';
        }
    };

    return (
        <MapContainer
            center={[48.9226, 24.7111]}
            zoom={13}
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
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            />

            {data?.districts?.map(district => (
                <Circle
                    key={district.name}
                    center={[district.lat, district.lon]}
                    radius={2000}
                    pathOptions={{
                        fillColor: `hsl(${district.score * 15}, 70%, 60%)`,
                        fillOpacity: 0.25,
                        color: '#ffffff',
                        weight: 3,
                        opacity: 0.8
                    }}
                >
                    <CircleMarker
                        center={[district.lat, district.lon]}
                        radius={14}
                        pathOptions={{
                            fillColor: `hsl(${district.score * 15}, 80%, 50%)`,
                            fillOpacity: 1,
                            color: '#fff',
                            weight: 4
                        }}
                    />
                </Circle>
            ))}

            {extraMarkers.map((marker, i) => (
                <Marker
                    key={`${activeType}-${i}`}
                    position={[marker.lat, marker.lon]}
                    icon={L.divIcon({
                        className: 'custom-marker',
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