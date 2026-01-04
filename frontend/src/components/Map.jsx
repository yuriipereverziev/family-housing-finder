import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    School, Baby, Trees, PlaySquare, Hospital, Pill, Stethoscope,
    Bus, Train, ShoppingCart, Store, Dumbbell, Film, ShieldCheck,
    Coffee, Landmark, BookOpen
} from 'lucide-react';

import EnableGestureHandling from './EnableGestureHandling';

const API_BASE =
    import.meta.env.DEV
        ? 'http://localhost:5023'
        : 'https://family-housing-finder-server.vercel.app';

const DEFAULT_CENTER = [48.9226, 24.7111];

const FACILITY_TYPES = {
    schools:        { Icon: School,        color: '#e74c3c' },
    kindergartens:  { Icon: Baby,          color: '#3498db' },
    libraries:      { Icon: BookOpen,      color: '#9b59b6' },
    hospitals:      { Icon: Hospital,      color: '#e74c3c' },
    pharmacies:     { Icon: Pill,          color: '#27ae60' },
    clinics:        { Icon: Stethoscope,   color: '#3498db' },
    busStops:       { Icon: Bus,           color: '#f39c12' },
    railwayStations:{ Icon: Train,         color: '#e67e22' },
    supermarkets:   { Icon: ShoppingCart,  color: '#2ecc71' },
    convenience:    { Icon: Store,         color: '#16a085' },
    parks:          { Icon: Trees,         color: '#2ecc71' },
    playgrounds:    { Icon: PlaySquare,    color: '#f39c12' },
    sportsCentres:  { Icon: Dumbbell,      color: '#e74c3c' },
    cinemas:        { Icon: Film,          color: '#9b59b6' },
    banks:          { Icon: Landmark,      color: '#34495e' },
    cafes:          { Icon: Coffee,        color: '#d35400' },
    police:         { Icon: ShieldCheck,   color: '#3498db' }
};

function ChangeMapView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, zoom, { animate: true, duration: 0.5 });
    }, [center, zoom, map]);
    return null;
}

function Map({ data, city = 'ivano-frankivsk' }) {
    const [activeTypes, setActiveTypes] = useState([]);
    const [markersData, setMarkersData] = useState({});
    const [counts, setCounts] = useState({});
    const cache = useMemo(() => ({}), []);

    const currentDistrict = data?.districts?.[0];

    const polygonPositions = useMemo(() => {
        if (!currentDistrict?.polygon || !Array.isArray(currentDistrict.polygon)) {
            console.log('⚠️ Полігон відсутній');
            return null;
        }

        // Якщо полігон вже у правильному форматі [[lat, lon], ...]
        if (currentDistrict.polygon.length > 0 && Array.isArray(currentDistrict.polygon[0])) {
            console.log(`✅ Полігон знайдено: ${currentDistrict.polygon[0].length} точок`);
            return currentDistrict.polygon; // Вже правильний формат для Leaflet
        }

        return null;
    }, [currentDistrict]);

    // ✅ Обчислення центру карти
    const mapCenter = useMemo(() => {
        if (currentDistrict?.lat && currentDistrict?.lon) {
            console.log(`📍 Центр району: [${currentDistrict.lat}, ${currentDistrict.lon}]`);
            return [currentDistrict.lat, currentDistrict.lon];
        }

        if (polygonPositions?.[0]?.length > 0) {
            const ring = polygonPositions[0];
            const sum = ring.reduce(
                (acc, [lat, lon]) => ({ lat: acc.lat + lat, lon: acc.lon + lon }),
                { lat: 0, lon: 0 }
            );
            const center = [sum.lat / ring.length, sum.lon / ring.length];
            console.log(`📍 Центр з полігону: [${center[0]}, ${center[1]}]`);
            return center;
        }

        console.log('📍 Використовується дефолтний центр');
        return DEFAULT_CENTER;
    }, [currentDistrict, polygonPositions]);

    const fetchInfrastructure = async (type) => {
        try {
            const res = await fetch(
                `${API_BASE}/api/infrastructure/${city}/${encodeURIComponent(
                    currentDistrict.name
                )}/${type}`
            );

            if (!res.ok) {
                const text = await res.text();
                console.error(`HTTP error ${res.status} for ${type}:`, text);
                return { count: 0, markers: [] };
            }

            const contentType = res.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const text = await res.text();
                console.error(`Expected JSON for ${type} but got:`, text);
                return { count: 0, markers: [] };
            }

            const json = await res.json();
            console.log(`✅ Завантажено ${type}: ${json.count} об'єктів`);
            return { count: json.count || 0, markers: json.markers || [] };
        } catch (err) {
            console.error(`Error fetching ${type}:`, err);
            return { count: 0, markers: [] };
        }
    };

    // Попереднє завантаження лічильників
    useEffect(() => {
        if (!currentDistrict?.name) return;

        Object.keys(FACILITY_TYPES).forEach(async (type) => {
            if (cache[type]) {
                setCounts(prev => ({ ...prev, [type]: cache[type].count }));
                return;
            }

            const result = await fetchInfrastructure(type);
            cache[type] = result;
            setCounts(prev => ({ ...prev, [type]: result.count }));
            window.dispatchEvent(new CustomEvent('updateCounts', { detail: { counts: { [type]: result.count } } }));
        });
    }, [currentDistrict?.name, city, cache]);

    // Завантаження маркерів для активних типів
    useEffect(() => {
        if (!currentDistrict?.name || !activeTypes.length) return;

        activeTypes.forEach(async (type) => {
            if (markersData[type]) return;

            const result = cache[type] || await fetchInfrastructure(type);
            cache[type] = result;
            setMarkersData(prev => ({ ...prev, [type]: result.markers }));
        });
    }, [activeTypes, currentDistrict, city, cache, markersData]);

    // Обробка подій show/reset
    useEffect(() => {
        const handleToggle = e => {
            const type = e.detail.type;
            setActiveTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
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

    const allMarkers = useMemo(() =>
            activeTypes.flatMap(type =>
                (markersData[type] || []).map(m => ({ ...m, type }))
            ),
        [activeTypes, markersData]
    );

    // ✅ Додано логування для дебагу
    useEffect(() => {
        console.log('🗺️ Map render:', {
            hasDistrict: !!currentDistrict,
            districtName: currentDistrict?.name,
            hasPolygon: !!polygonPositions,
            polygonRings: polygonPositions?.length,
            mapCenter,
            activeMarkersTypes: activeTypes,
            totalMarkers: allMarkers.length
        });
    }, [currentDistrict, polygonPositions, mapCenter, activeTypes, allMarkers]);

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
            <EnableGestureHandling text="Використовуйте Ctrl + скрол для зуму" />

            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {polygonPositions && polygonPositions.length > 0 && (
                <Polygon
                    positions={polygonPositions}
                    pathOptions={{
                        fillColor: `hsl(${(currentDistrict?.score || 3) * 15}, 70%, 60%)`,
                        fillOpacity: 0.45,
                        color: '#ffffff',
                        weight: 5,
                        opacity: 0.9
                    }}
                />
            )}

            {allMarkers
                .filter(m => m.lat != null && m.lon != null)
                .map((m) => {
                    const { Icon, color } = FACILITY_TYPES[m.type] || {};
                    if (!Icon) return null;

                    const iconHtml = `
                        <div style="
                            width: 36px; height: 36px; background: ${color}; border-radius: 50%;
                            display: flex; align-items: center; justify-content: center;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;
                        ">
                            ${renderToStaticMarkup(<Icon size={20} color="white" strokeWidth={2.5} />)}
                        </div>
                    `;

                    const markerKey = `${m.type}-${m.lat.toFixed(6)}-${m.lon.toFixed(6)}`;

                    return (
                        <Marker
                            key={markerKey}
                            position={[m.lat, m.lon]}
                            icon={L.divIcon({
                                className: 'custom-marker',
                                html: iconHtml,
                                iconSize: [36, 36],
                                iconAnchor: [18, 18]
                            })}
                        />
                    );
                })}
        </MapContainer>
    );
}

export default Map;