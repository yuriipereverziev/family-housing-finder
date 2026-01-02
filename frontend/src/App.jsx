import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import { MOCK_DATA } from './data/mockData';

const API_BASE = 'https://family-housing-finder-server.vercel.app';

function App() {
    const [data, setData] = useState(null);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCity, setSelectedCity] = useState('ivano-frankivsk');
    const [loading, setLoading] = useState(false); // Змінили на false
    const [error, setError] = useState(null);
    const [activeType, setActiveType] = useState(null);
    const [isRealData, setIsRealData] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            const type = e.detail.type;
            setActiveType(prev => prev === type ? null : type);
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

    useEffect(() => {
        // Одразу показуємо mock дані
        const mockCityData = MOCK_DATA[selectedCity];
        if (mockCityData && mockCityData.districts.length > 0) {
            setDistricts(mockCityData.districts);
            setSelectedDistrict(mockCityData.districts[0].name);
            setData(mockCityData.districts[0]);
            setIsRealData(false);
        } else {
            setError(`Дані для міста ${selectedCity} в розробці`);
        }

        // Паралельно завантажуємо реальні дані
        setLoading(true);
        axios
            .get(`${API_BASE}/api/districts/${selectedCity}`)
            .then((response) => {
                const dist = response.data.districts || [];
                if (dist.length > 0) {
                    setDistricts(dist);
                    setSelectedDistrict(dist[0].name);
                    setData(dist[0]);
                    setIsRealData(true);
                    setError(null);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.log('API недоступний, використовуємо статичні дані');
                setLoading(false);
                // Не показуємо помилку, якщо є mock дані
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
        }
    };

    const handleCityChange = (e) => {
        setSelectedCity(e.target.value);
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

                {/* Індикатор типу даних */}
                {loading && (
                    <div className="loading-indicator">
                        ⏳ Завантаження актуальних даних...
                    </div>
                )}
                {!isRealData && !loading && (
                    <div className="demo-badge">
                        📊 Демо-дані (API завантажується)
                    </div>
                )}

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
                            {districts.map((d) => (
                                <option key={d.name} value={d.name}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="stats-grid">
                    {['schools', 'parks', 'kindergartens', 'playgrounds'].map(type => {
                        const isActive = activeType === type;
                        const labels = {
                            schools: { icon: '🏫', label: 'Шкіл', value: data.infrastructure.schools },
                            parks: { icon: '🌳', label: 'Парків', value: data.infrastructure.parks },
                            kindergartens: { icon: '👶', label: 'Дитячих садків', value: data.infrastructure.kindergartens },
                            playgrounds: { icon: '🎠', label: 'Дитячих майданчиків', value: data.infrastructure.playgrounds }
                        };

                        const info = labels[type];

                        return (
                            <div
                                key={type}
                                className={`stat-card ${isActive ? 'active' : ''}`}
                                style={{
                                    background: isActive ? getCardColor(type) : 'white',
                                    color: isActive ? 'white' : '#333',
                                    border: isActive ? `3px solid ${getCardColor(type)}` : 'none'
                                }}
                                onClick={() => window.dispatchEvent(new CustomEvent('showMarkers', { detail: { type } }))}
                                tabIndex={0}
                                role="button"
                                aria-pressed={isActive}
                            >
                                <div className="stat-icon">{info.icon}</div>
                                <div className="stat-value">{info.value}</div>
                                <div className="stat-label">{info.label}</div>
                            </div>
                        );
                    })}

                    <div className="stat-card score-card">
                        <div className="stat-icon">⭐</div>
                        <div className="stat-value">{data.score.toFixed(1)}</div>
                        <div className="stat-label">Рейтинг району</div>
                    </div>
                </div>
            </nav>

            <Map data={{ districts: [data] }} selectedDistrict={data} />
        </div>
    );
}

export default App;