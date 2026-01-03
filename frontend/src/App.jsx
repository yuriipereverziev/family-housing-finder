import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import { MOCK_DATA } from './data/mockData';

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
    const [activeTypes, setActiveTypes] = useState([]); // ⬅️ Масив замість одного типу
    const [isRealData, setIsRealData] = useState(false);
    const [realCounts, setRealCounts] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Слухач для оновлення кількості з Map
    useEffect(() => {
        const handleCountUpdate = (e) => {
            console.log('📊 Оновлення підрахунку:', e.detail.counts);
            setRealCounts(e.detail.counts);
        };

        window.addEventListener('updateCounts', handleCountUpdate);
        return () => window.removeEventListener('updateCounts', handleCountUpdate);
    }, []);

    // ⬇️ Оновлений слухач для мультивибору
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
        switch (type) {
            case 'schools': return '#e74c3c';
            case 'kindergartens': return '#3498db';
            case 'parks': return '#2ecc71';
            case 'playgrounds': return '#f39c12';
            default: return '#95a5a6';
        }
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
            setActiveTypes([]); // ⬅️ Скидаємо масив
            setRealCounts(null);
            window.dispatchEvent(new CustomEvent('resetMarkers'));
        }
    };

    const handleCityChange = (e) => {
        setSelectedCity(e.target.value);
        setActiveTypes([]); // ⬅️ Скидаємо масив
        setRealCounts(null);
        window.dispatchEvent(new CustomEvent('resetMarkers'));
    };

    if (error && !data) {
        return (
            <div className="container">
                <nav>
                    <h1>🏠 Пошук житла для сімей</h1>
                    <div className="select-wrapper">
                        <label htmlFor="city-select">
                            Місто:
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
                <h1>🏠 Пошук житла для сімей</h1>

                <div className="select-wrapper">
                    <label htmlFor="city-select">
                        Місто:
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
                        Район:
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
                        ⚙️ Фільтри {activeTypes.length > 0 && (
                            <span className="filters-badge">({activeTypes.length})</span>
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
                            >
                                ✕
                            </button>
                        </div>

                        <div className="filters-list">
                            {[
                                { type: 'schools', label: 'Школи', icon: '🏫' },
                                { type: 'kindergartens', label: 'Дитячі садки', icon: '👶' },
                                { type: 'parks', label: 'Парки', icon: '🌳' },
                                { type: 'playgrounds', label: 'Майданчики', icon: '🎠' },
                            ].map(item => {
                                const checked = activeTypes.includes(item.type); // ⬅️ Перевірка в масиві

                                return (
                                    <label key={item.type} className="filter-row">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                window.dispatchEvent(
                                                    new CustomEvent('showMarkers', {
                                                        detail: { type: item.type }
                                                    })
                                                )
                                            }
                                        />
                                        <span className="icon">{item.icon}</span>
                                        <span className="label">{item.label}</span>
                                        <span className="count">
                                            ({getInfraValue(item.type)})
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
                                Скинути всі
                            </button>

                            <button
                                className="apply-btn"
                                onClick={() => setFiltersOpen(false)}
                            >
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