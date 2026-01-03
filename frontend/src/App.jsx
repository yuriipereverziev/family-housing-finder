import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import { MOCK_DATA } from './data/mockData';
import {
    MapPin,
    Building2,
    Filter,
    X,
    RotateCcw,
    Check,
    School,
    Baby,
    Trees,
    PlaySquare
} from 'lucide-react';

const API_BASE =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5022'
        : 'https://family-housing-finder-server.vercel.app';

function App() {
    const [data, setData] = useState(null);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCity, setSelectedCity] = useState('ivano-frankivsk');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTypes, setActiveTypes] = useState([]);
    const [isRealData, setIsRealData] = useState(false);
    const [realCounts, setRealCounts] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Конфігурація іконок для фільтрів
    const FILTERS_CONFIG = [
        {
            type: 'schools',
            label: 'Школи',
            Icon: School,
            color: '#e74c3c'
        },
        {
            type: 'kindergartens',
            label: 'Дитячі садки',
            Icon: Baby,
            color: '#3498db'
        },
        {
            type: 'parks',
            label: 'Парки',
            Icon: Trees,
            color: '#2ecc71'
        },
        {
            type: 'playgrounds',
            label: 'Майданчики',
            Icon: PlaySquare,
            color: '#f39c12'
        },
    ];

    // Слухач для оновлення кількості з Map
    useEffect(() => {
        const handleCountUpdate = (e) => {
            console.log('📊 Оновлення підрахунку:', e.detail.counts);
            setRealCounts(e.detail.counts);
        };

        window.addEventListener('updateCounts', handleCountUpdate);
        return () => window.removeEventListener('updateCounts', handleCountUpdate);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            const type = e.detail.type;
            setActiveTypes(prev =>
                prev.includes(type)
                    ? prev.filter(t => t !== type)
                    : [...prev, type]
            );
        };
        window.addEventListener('showMarkers', handler);
        return () => window.removeEventListener('showMarkers', handler);
    }, []);

    const getCardColor = (type) => {
        const config = FILTERS_CONFIG.find(f => f.type === type);
        return config?.color || '#95a5a6';
    };

    // Функція для отримання значення (пріоритет реальним даним)
    const getInfraValue = (type) => {
        if (realCounts && realCounts[type] !== undefined) {
            return realCounts[type];
        }
        return data?.infrastructure?.[type] || 0;
    };

    useEffect(() => {
        setRealCounts(null);

        const mockCityData = MOCK_DATA[selectedCity];
        if (mockCityData && mockCityData.districts.length > 0) {
            setDistricts(mockCityData.districts);
            setSelectedDistrict(mockCityData.districts[0].name);
            setData(mockCityData.districts[0]);
            setIsRealData(false);
        } else {
            setError(`Дані для міста ${selectedCity} в розробці`);
        }

        setLoading(true);
        axios
            .get(`${API_BASE}/api/districts/${selectedCity}`)
            .then((response) => {
                const dist = response.data.districts || [];
                if (dist.length > 0) {
                    setDistricts(dist);

                    const currentDistrictName = selectedDistrict;
                    const matchedDistrict = dist.find(d => d.name === currentDistrictName) || dist[0];

                    setSelectedDistrict(matchedDistrict.name);
                    setData(matchedDistrict);
                    setIsRealData(true);
                    setError(null);

                    console.log('✅ Реальні дані завантажено:', matchedDistrict);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.log('⚠️ API недоступний, використовуємо статичні дані');
                setLoading(false);

                if (!mockCityData?.districts.length) {
                    setError(`Райони для міста ${selectedCity} в розробці`);
                }
            });
    }, [selectedCity]);

    const handleDistrictChange = (e) => {
        const name = e.target.value;
        setSelectedDistrict(name);
        const selected = districts.find((d) => d.name === name);
        if (selected) {
            setData(selected);
            setActiveTypes([]);
            setRealCounts(null);
            window.dispatchEvent(new CustomEvent('resetMarkers'));
        }
    };

    const handleCityChange = (e) => {
        setSelectedCity(e.target.value);
        setActiveTypes([]);
        setRealCounts(null);
        window.dispatchEvent(new CustomEvent('resetMarkers'));
    };

    if (error && !data) {
        return (
            <div className="container">
                <nav>
                    <h1> <Building2 size={16} style={{ display: 'inline', marginRight: '4px' }} /> Пошук житла для сімей</h1>
                    <div className="select-wrapper">
                        <label htmlFor="city-select">
                            Місто
                            <select
                                id="city-select"
                                value={selectedCity}
                                onChange={handleCityChange}
                                className="city-select"
                                aria-label="Виберіть місто"
                            >
                                <option value="ivano-frankivsk">Івано-Франківськ</option>
                                <option value="lviv">Львів</option>
                                <option value="kyiv">Київ</option>
                                <option value="odesa">Одеса</option>
                            </select>
                        </label>
                    </div>
                    <div className="error-message">{error}</div>
                </nav>
            </div>
        );
    }

    if (!data) {
        return <div className="loading">Завантаження...</div>;
    }

    return (
        <div className="container">
            <nav>
                <h1> <Building2 size={30} style={{ display: 'inline', marginRight: '4px' }} /> Пошук житла для сімей</h1>

                <div className="select-wrapper">
                    <label htmlFor="city-select">
                        Місто
                        <select
                            id="city-select"
                            value={selectedCity}
                            onChange={handleCityChange}
                            className="city-select"
                            aria-label="Виберіть місто"
                        >
                            <option value="ivano-frankivsk">Івано-Франківськ</option>
                            <option value="lviv">Львів</option>
                            <option value="kyiv">Київ</option>
                            <option value="odesa">Одеса</option>
                        </select>
                    </label>
                    <label htmlFor="district-select">

                        Район
                        <select
                            id="district-select"
                            value={selectedDistrict}
                            onChange={handleDistrictChange}
                            className="district-select"
                            aria-label="Виберіть район"
                        >
                            {(() => {
                                if (!districts || districts.length === 0) return null;

                                const recommendedNames = ['Центр', 'Каскад', 'Бам', 'Пасічна'];
                                const recommendedDistricts = districts.filter(d => recommendedNames.includes(d.name));
                                const otherDistricts = districts.filter(d => !recommendedNames.includes(d.name));

                                return (
                                    <>
                                        {recommendedDistricts.length > 0 && (
                                            <optgroup label="⭐ Рекомендовані">
                                                {recommendedDistricts.map(d => (
                                                    <option key={d.name} value={d.name}>
                                                        {d.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}

                                        {otherDistricts.length > 0 && (
                                            <optgroup label="Інші райони">
                                                {otherDistricts.map(d => (
                                                    <option key={d.name} value={d.name}>
                                                        {d.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </>
                                );
                            })()}
                        </select>
                    </label>
                    <button
                        className="filters-btn"
                        onClick={() => setFiltersOpen(true)}
                    >
                        <Filter size={18} />
                        Фільтри
                        {activeTypes.length > 0 && (
                            <span className="filters-badge">{activeTypes.length}</span>
                        )}
                    </button>
                </div>
            </nav>

            {filtersOpen && (
                <div className="filters-overlay" onClick={() => setFiltersOpen(false)}>
                    <div
                        className="filters-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="filters-header">
                            <h2>Фільтри інфраструктури</h2>
                            <button
                                className="close-btn"
                                onClick={() => setFiltersOpen(false)}
                                aria-label="Закрити"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="filters-list">
                            {FILTERS_CONFIG.map(({ type, label, Icon, color }) => {
                                const checked = activeTypes.includes(type);

                                return (
                                    <label
                                        key={type}
                                        className="filter-row"
                                        style={{
                                            borderColor: checked ? color : undefined,
                                            background: checked ? `${color}08` : undefined
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                window.dispatchEvent(
                                                    new CustomEvent('showMarkers', {
                                                        detail: { type }
                                                    })
                                                )
                                            }
                                        />
                                        <span
                                            className="icon"
                                            style={{
                                                background: checked ? color : undefined,
                                                color: checked ? 'white' : undefined
                                            }}
                                        >
                                            <Icon size={20} />
                                        </span>
                                        <span className="label">{label}</span>
                                        <span
                                            className="count"
                                            style={{
                                                background: checked ? color : undefined,
                                                color: checked ? 'white' : undefined
                                            }}
                                        >
                                            {getInfraValue(type)}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="filters-actions">
                            <button
                                className="clear-btn"
                                onClick={() => {
                                    setActiveTypes([]);
                                    window.dispatchEvent(new CustomEvent('resetMarkers'));
                                }}
                                disabled={activeTypes.length === 0}
                            >
                                <RotateCcw size={16} />
                                Скинути
                            </button>

                            <button
                                className="apply-btn"
                                onClick={() => setFiltersOpen(false)}
                            >
                                <Check size={16} />
                                Готово
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Map data={{ districts: [data] }} selectedDistrict={data} />
        </div>
    );
}

export default App;