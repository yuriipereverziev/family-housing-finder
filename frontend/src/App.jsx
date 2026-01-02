import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';

const API_BASE = 'https://family-housing-finder-server.vercel.app';

function App() {
    const [data, setData] = useState(null);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCity, setSelectedCity] = useState('ivano-frankivsk');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeType, setActiveType] = useState(null);

// Додай цей useEffect для синхронізації з Map
    useEffect(() => {
        const handler = (e) => {
            const type = e.detail.type;
            setActiveType(prev => prev === type ? null : type);
        };
        window.addEventListener('showMarkers', handler);
        return () => window.removeEventListener('showMarkers', handler);
    }, []);

// Функція кольору для карточок
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
        setLoading(true);
        setError(null);
        setData(null);
        setDistricts([]);
        setSelectedDistrict('');

        axios
            .get(`${API_BASE}/api/districts/${selectedCity}`)
            .then((response) => {
                const dist = response.data.districts || [];
                setDistricts(dist);
                if (dist.length > 0) {
                    setSelectedDistrict(dist[0].name);
                    setData(dist[0]);
                } else {
                    setError('У цьому місті поки що немає даних про райони');
                }
                setLoading(false);
            })
            .catch((err) => {
                if (err.response?.status === 404) {
                    setError(`Райони для міста ${selectedCity} в розробці`);
                } else {
                    setError('Помилка завантаження даних');
                }
                setLoading(false);
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

    if (loading) {
        return <div className="loading">Завантаження даних для {selectedCity}...</div>;
    }

    if (error) {
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
        return <div className="loading">Немає даних для відображення</div>;
    }
    console.log(data)

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
                            {districts.map((d) => (
                                <option key={d.name} value={d.name}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="stats-grid">
                    {['schools', 'parks', 'kindergartens',  'playgrounds'].map(type => {
                        const isActive = activeType === type; // Додаємо стан activeType в App
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

                    {/* Score карточка */}
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