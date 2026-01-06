import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    School, Baby, Trees, PlaySquare, Hospital, Pill, Stethoscope,
    Bus, Train, ShoppingCart, Store, Dumbbell, Film, ShieldCheck,
    Coffee, Landmark, BookOpen, Home
} from 'lucide-react';

import EnableGestureHandling from './EnableGestureHandling';

const API_BASE =
    import.meta.env.DEV
        ? 'http://localhost:5030'
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

const ChangeMapView = memo(({ center, zoom }) => {
    const map = useMap();

    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, zoom, {
                animate: true,
                duration: 0.5,
                easeLinearity: 0.5
            });
        }
    }, [center, zoom, map]);

    return null;
});

ChangeMapView.displayName = 'ChangeMapView';

const DistrictPolygon = memo(({ positions, score }) => {
    if (!positions || positions.length === 0) return null;

    return (
        <Polygon
            positions={positions}
            pathOptions={{
                fillColor: `hsl(${(score || 3) * 15}, 70%, 60%)`,
                fillOpacity: 0.45,
                color: '#ffffff',
                weight: 2.5,
                opacity: 0.9,
                smoothFactor: 2
            }}
        />
    );
});

DistrictPolygon.displayName = 'DistrictPolygon';

function Map({ data, city = 'ivano-frankivsk' }) {
    const [activeTypes, setActiveTypes] = useState([]);
    const [markersData, setMarkersData] = useState({});
    const [counts, setCounts] = useState({});
    const [listingMarkers, setListingMarkers] = useState([]);
    const [listingStats, setListingStats] = useState(null);
    const [listingTypes, setListingTypes] = useState(['sale', 'rent']);
    const [listingError, setListingError] = useState(null);
    const [listingLoading, setListingLoading] = useState(false);

    const cache = useRef({}).current;
    const isLoadingRef = useRef(false);
    const prevDistrictRef = useRef(null);

    const currentDistrict = data?.districts?.[0];

    // ✅ ВИПРАВЛЕНО: Очищення кешу при зміні району
    useEffect(() => {
        if (prevDistrictRef.current && prevDistrictRef.current !== currentDistrict?.name) {
            console.log('🔄 Район змінився:', prevDistrictRef.current, '→', currentDistrict?.name);

            // Очищаємо весь кеш
            Object.keys(cache).forEach(key => delete cache[key]);

            // Скидаємо всі стани
            setMarkersData({});
            setCounts({});
            setActiveTypes([]);
            isLoadingRef.current = false;
        }

        prevDistrictRef.current = currentDistrict?.name;
    }, [currentDistrict?.name, cache]);

    const polygonPositions = useMemo(() => {
        if (!currentDistrict?.polygon || !Array.isArray(currentDistrict.polygon)) {
            return null;
        }

        if (currentDistrict.polygon.length === 0) {
            return null;
        }

        console.log('🗺️ Полігон для району:', currentDistrict.name, '- точок:', currentDistrict.polygon[0]?.length);

        return currentDistrict.polygon;
    }, [currentDistrict?.polygon, currentDistrict?.name]);

    const mapCenter = useMemo(() => {
        if (currentDistrict?.lat && currentDistrict?.lon) {
            return [currentDistrict.lat, currentDistrict.lon];
        }

        if (polygonPositions?.[0]?.length > 0) {
            const ring = polygonPositions[0];
            const sum = ring.reduce(
                (acc, [lat, lon]) => ({ lat: acc.lat + lat, lon: acc.lon + lon }),
                { lat: 0, lon: 0 }
            );
            return [sum.lat / ring.length, sum.lon / ring.length];
        }

        return DEFAULT_CENTER;
    }, [currentDistrict?.lat, currentDistrict?.lon, polygonPositions]);

    const fetchInfrastructure = useCallback(async (type) => {
        if (!currentDistrict?.name) return { count: 0, markers: [] };

        // Створюємо унікальний ключ з назвою району
        const cacheKey = `${currentDistrict.name}-${type}`;

        if (cache[cacheKey]) {
            console.log(`📦 З кешу: ${type} для ${currentDistrict.name}`);
            return cache[cacheKey];
        }

        try {
            console.log(`📡 Завантаження: ${type} для ${currentDistrict.name}`);

            const res = await fetch(
                `${API_BASE}/api/infrastructure/${city}/${encodeURIComponent(
                    currentDistrict.name
                )}/${type}`
            );

            if (!res.ok) {
                return { count: 0, markers: [] };
            }

            const json = await res.json();
            const result = { count: json.count || 0, markers: json.markers || [] };

            cache[cacheKey] = result;

            console.log(`✅ Завантажено: ${type} → ${result.count} об'єктів`);

            return result;
        } catch (err) {
            console.error(`❌ Помилка ${type}:`, err);
            return { count: 0, markers: [] };
        }
    }, [currentDistrict?.name, city, cache]);

    useEffect(() => {
        if (!currentDistrict?.name || isLoadingRef.current) return;

        console.log('🔄 Завантаження лічильників для району:', currentDistrict.name);
        isLoadingRef.current = true;

        const loadCounts = async () => {
            const newCounts = {};

            for (const type of Object.keys(FACILITY_TYPES)) {
                const result = await fetchInfrastructure(type);
                newCounts[type] = result.count;
            }

            setCounts(newCounts);

            window.dispatchEvent(
                new CustomEvent('updateCounts', {
                    detail: { counts: newCounts }
                })
            );

            isLoadingRef.current = false;
            console.log('✅ Лічильники завантажено:', newCounts);
        };

        loadCounts();
    }, [currentDistrict?.name, fetchInfrastructure]);

    useEffect(() => {
        if (!currentDistrict?.name || activeTypes.length === 0) return;

        const loadMarkers = async () => {
            const newMarkersData = { ...markersData };
            let hasChanges = false;

            for (const type of activeTypes) {
                const cacheKey = `${currentDistrict.name}-${type}`;

                if (!newMarkersData[type]) {
                    const result = await fetchInfrastructure(type);
                    newMarkersData[type] = result.markers;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                setMarkersData(newMarkersData);
            }
        };

        loadMarkers();
    }, [activeTypes, currentDistrict?.name, fetchInfrastructure]);

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
            console.log('🔄 Скидання маркерів');
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
                (markersData[type] || [])
                    .filter(m => m.lat != null && m.lon != null)
                    .map(m => ({ ...m, type }))
            ),
        [activeTypes, markersData]
    );

    const markerIcons = useMemo(() => {
        const icons = {};

        Object.entries(FACILITY_TYPES).forEach(([type, { Icon, color }]) => {
            const iconHtml = `
                <div style="
                    width: 36px; height: 36px; background: ${color}; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;
                ">
                    ${renderToStaticMarkup(<Icon size={20} color="white" strokeWidth={2.5} />)}
                </div>
            `;

            icons[type] = L.divIcon({
                className: 'custom-marker',
                html: iconHtml,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
        });

        return icons;
    }, []);

    const listingIcons = useMemo(() => ({
        sale: L.divIcon({
            className: 'listing-marker',
            html: `
                <div style="
                    width: 36px; height: 36px; background: #e74c3c; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;
                ">
                    ${renderToStaticMarkup(<Home size={18} color="white" strokeWidth={2.5} />)}
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        }),
        rent: L.divIcon({
            className: 'listing-marker',
            html: `
                <div style="
                    width: 36px; height: 36px; background: #2ecc71; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;
                ">
                    ${renderToStaticMarkup(<Home size={18} color="white" strokeWidth={2.5} />)}
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    }), []);

    // Завантаження оголошень для вибраного району
    useEffect(() => {
        if (!currentDistrict?.name) return;

        let cancelled = false;
        setListingMarkers([]);
        setListingStats(null);
        setListingError(null);

        const loadListings = async () => {
            try {
                setListingLoading(true);
                const res = await fetch(
                    `${API_BASE}/api/listings/${city}/${encodeURIComponent(currentDistrict.name)}`
                );

                if (!res.ok) {
                    throw new Error('Не вдалося отримати оголошення');
                }

                const json = await res.json();
                if (cancelled) return;

                const list = Array.isArray(json.listings) ? json.listings : [];
                const prepared = list
                    .filter((l) => l.lat != null && l.lon != null)
                    .map((l) => ({ ...l, type: l.type || 'rent' }));

                setListingMarkers(prepared);
                setListingStats(json.stats || null);
            } catch (err) {
                if (cancelled) return;
                setListingError(err.message || 'Помилка завантаження квартир');
                setListingMarkers([]);
                setListingStats(null);
            } finally {
                if (!cancelled) setListingLoading(false);
            }
        };

        loadListings();

        return () => {
            cancelled = true;
        };
    }, [city, currentDistrict?.name]);

    const visibleListings = useMemo(
        () => listingMarkers.filter((l) => listingTypes.includes(l.type)),
        [listingMarkers, listingTypes]
    );

    const toggleListingType = (type) => {
        setListingTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    return (
        <div style={{ position: 'relative' }}>
            <MapContainer
                key={currentDistrict?.name} // ✅ ДОДАНО: змушує MapContainer перестворюватися при зміні району
                center={mapCenter}
                zoom={15}
                style={{
                    height: '600px',
                    width: '100%',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    marginTop: '20px'
                }}
                zoomControl={true}
                // SVG-рендер вместо canvas даёт более плавный зум для полигонів
                preferCanvas={false}
                // Плавный зум колесиком
                zoomSnap={0}
                zoomDelta={0.3}
                wheelDebounceTime={25}
                wheelPxPerZoomLevel={200}
                // Инерция при перетаскивании карты
                inertia={true}
                inertiaDeceleration={2500}
                // Анимации
                zoomAnimation={true}
                zoomAnimationThreshold={8}
                fadeAnimation={true}
            >
                <ChangeMapView center={mapCenter} zoom={15} />
                <EnableGestureHandling text="Використовуйте Ctrl + скрол для зуму" />

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    updateWhenIdle={false}
                    updateWhenZooming={false}
                    keepBuffer={2}
                />

                {polygonPositions && polygonPositions.length > 0 && (
                    <DistrictPolygon
                        positions={polygonPositions}
                        score={currentDistrict?.score}
                    />
                )}

                {allMarkers.map((m) => {
                    const icon = markerIcons[m.type];
                    if (!icon) return null;

                    const markerKey = `${m.type}-${m.lat.toFixed(6)}-${m.lon.toFixed(6)}`;

                    return (
                        <Marker
                            key={markerKey}
                            position={[m.lat, m.lon]}
                            icon={icon}
                        />
                    );
                })}

                {visibleListings.map((listing) => {
                    const icon = listingIcons[listing.type] || listingIcons.sale;
                    const key = listing._id || `${listing.type}-${listing.lat}-${listing.lon}`;

                    return (
                        <Marker
                            key={key}
                            position={[listing.lat, listing.lon]}
                            icon={icon}
                        >
                            <Popup>
                                <div style={{ maxWidth: '240px' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                        {listing.title || 'Квартира'}
                                    </div>
                                    <div style={{ marginBottom: 4 }}>
                                        {listing.type === 'sale' ? 'Продаж' : 'Оренда'} ·{' '}
                                        {listing.price ? `$${listing.price}` : '—'}
                                    </div>
                                    <div style={{ fontSize: 14, color: '#555' }}>
                                        {listing.rooms ? `${listing.rooms}-кімн · ` : ''}
                                        {listing.area ? `${listing.area} м²` : ''}
                                    </div>
                                    {listing.externalUrl && (
                                        <a
                                            href={listing.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'inline-block', marginTop: 8, color: '#3498db' }}
                                        >
                                            Відкрити оголошення
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            <div
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    display: 'flex',
                    gap: 8,
                    zIndex: 1000
                }}
            >
                <button
                    onClick={() => toggleListingType('sale')}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        border: '1px solid #e74c3c',
                        background: listingTypes.includes('sale') ? '#e74c3c' : '#fff',
                        color: listingTypes.includes('sale') ? '#fff' : '#e74c3c',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }}
                >
                    Продаж
                </button>
                <button
                    onClick={() => toggleListingType('rent')}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        border: '1px solid #2ecc71',
                        background: listingTypes.includes('rent') ? '#2ecc71' : '#fff',
                        color: listingTypes.includes('rent') ? '#fff' : '#2ecc71',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }}
                >
                    Оренда
                </button>
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#ffffff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    minWidth: 220,
                    zIndex: 1000,
                    fontSize: 14,
                    lineHeight: 1.4
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Квартири в районі</div>
                {listingLoading && <div>Завантаження…</div>}
                {listingError && <div style={{ color: '#e74c3c' }}>{listingError}</div>}
                {!listingLoading && !listingError && listingStats && (
                    <>
                        <div>Усього: {listingStats.total}</div>
                        <div>Продаж: {listingStats.sale} (Ø ${listingStats.avgPriceSale || 0})</div>
                        <div>Оренда: {listingStats.rent} (Ø ${listingStats.avgPriceRent || 0})</div>
                    </>
                )}
                {!listingLoading && !listingError && !listingStats && (
                    <div>Немає даних по району</div>
                )}
            </div>
        </div>
    );
}

export default memo(Map);