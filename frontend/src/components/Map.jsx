import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function Map({ data }) {
    const [activeType, setActiveType] = useState(null); // null | 'schools' | 'kindergartens' | 'parks' | 'playgrounds'
    const [extraMarkers, setExtraMarkers] = useState([]);

    // Унікальний ключ кешу для району + типу
    const getCacheKey = (type) => {
        if (!data?.districts?.[0]) return null;
        const district = data.districts[0];
        return `map_cache_${district.name.replace(/\s+/g, '_')}_${type}`;
    };

    // Отримати дані з кешу
    const getCachedMarkers = (type) => {
        const key = getCacheKey(type);
        if (!key) return null;

        const cached = localStorage.getItem(key);
        if (!cached) return null;

        try {
            const parsed = JSON.parse(cached);
            const ageInDays = (Date.now() - parsed.timestamp) / (86400000); // 1000*60*60*24

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

    // Зберегти в кеш
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

    // Завантаження міток
    useEffect(() => {
        if (!activeType || !data?.districts?.[0]) {
            if (extraMarkers.length > 0) {
                console.log('🧹 Очищення міток (немає активного типу)');
            }
            setExtraMarkers([]);
            return;
        }

        const district = data.districts[0];
        console.log(`🎯 Завантаження міток для "${district.name}" — тип: ${activeType}`);

        // Спочатку кеш
        const cached = getCachedMarkers(activeType);
        if (cached !== null) {
            setExtraMarkers(cached);
            return;
        }

        // Якщо кешу немає — запит до Overpass
        console.log(`🌐 Запит до Overpass API для ${activeType}`);

        // Правильні теги для кожного типу
        const tagConfig = {
            schools:       { key: 'amenity',  value: 'school' },
            kindergartens: { key: 'amenity',  value: 'kindergarten' },
            parks:         { key: 'leisure',  value: 'park' },
            playgrounds:   { key: 'leisure',  value: 'playground' }
        };

        const config = tagConfig[activeType];
        if (!config) {
            console.warn(`Невідомий тип: ${activeType}`);
            return;
        }

        const query = `
          [out:json][timeout:30];
          (
            node["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
            way["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
            relation["${config.key}"="${config.value}"](around:2200,${district.lat},${district.lon});
          );
          out center;
        `;

        fetch('https://overpass.kumi.systems/api/interpreter', {
            method: 'POST',
            body: query
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(res => {
                const markers = res.elements
                    .filter(el => el.lat || (el.center && el.center.lat))
                    .map(el => ({
                        lat: el.lat || el.center.lat,
                        lon: el.lon || el.center.lon
                    }));

                console.log(`📍 Отримано з API: ${markers.length} міток (${activeType})`);
                setExtraMarkers(markers);
                setCachedMarkers(activeType, markers);
            })
            .catch(err => {
                console.error(`❌ Помилка Overpass (${activeType}):`, err);
                setExtraMarkers([]);
            });
    }, [activeType, data]);

    // Кольори міток
    const getColor = (type) => {
        switch (type) {
            case 'schools':       return '#e74c3c'; // червоний
            case 'kindergartens': return '#3498db'; // синій
            case 'parks':         return '#2ecc71'; // зелений
            case 'playgrounds':   return '#f39c12'; // помаранчевий
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

            {/* Коло та центр району */}
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

            {/* Мітки інфраструктури */}
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