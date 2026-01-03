import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import { MOCK_DATA } from './data/mockData';

const API_BASE =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5002'
        : 'https://family-housing-finder-server.vercel.app';

function App() {
    const [data, setData] = useState(null);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCity, setSelectedCity] = useState('ivano-frankivsk');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeType, setActiveType] = useState(null);
    const [isRealData, setIsRealData] = useState(false);
    const [realCounts, setRealCounts] = useState(null); // Реальна кількість з карти
    const [filtersOpen, setFiltersOpen] = useState(true); // стан панелі фільтрів


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

    // Функція для отримання значення (пріоритет реальним даним)
    const getInfraValue = (type) => {
        // Якщо є реальні підраховані дані з Map, використовуємо їх
        if (realCounts && realCounts[type] !== undefined) {
            return realCounts[type];
        }
        // Інакше беремо з data (API або mock)
        return data?.infrastructure?.[type] || 0;
    };

    useEffect(() => {
        // Скидаємо реальні підрахунки при зміні міста
        setRealCounts(null);

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

                    // Зберігаємо вибраний район або беремо перший
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
            // Скидаємо активний тип і реальні підрахунки при зміні району
            setActiveType(null);
            setRealCounts(null);
            window.dispatchEvent(new CustomEvent('resetMarkers'));
        }
    };

    const handleCityChange = (e) => {
        setSelectedCity(e.target.value);
        // Скидаємо активний тип і реальні підрахунки при зміні міста
        setActiveType(null);
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

                                // Масив рекомендованих
                                const recommendedNames = ['Центр', 'Каскад', 'Бам', 'Пасічна'];

                                // Розділяємо райони на рекомендовані та інші
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
                        onClick={() => setFiltersOpen(prev => !prev)}
                    >
                        ⚙️ Фільтри
                    </button>

                </div>




                {/*<button*/}
                {/*    className="filter-toggle"*/}
                {/*    onClick={() => setFiltersOpen(prev => !prev)}*/}
                {/*>*/}
                {/*    {filtersOpen ? 'Сховати фільтри' : 'Показати фільтри'}*/}
                {/*</button>*/}

                {/*{filtersOpen && (*/}
                {/*    <div className="stats-grid">*/}
                {/*        {['schools', 'parks', 'kindergartens', 'playgrounds'].map(type => {*/}
                {/*            const isActive = activeType === type;*/}
                {/*            const labels = {*/}
                {/*                schools: { icon: '🏫', label: 'Шкіл', value: getInfraValue('schools') },*/}
                {/*                parks: { icon: '🌳', label: 'Парків', value: getInfraValue('parks') },*/}
                {/*                kindergartens: { icon: '👶', label: 'Дитячих садків', value: getInfraValue('kindergartens') },*/}
                {/*                playgrounds: { icon: '🎠', label: 'Дитячих майданчиків', value: getInfraValue('playgrounds') }*/}
                {/*            };*/}

                {/*            const info = labels[type];*/}

                {/*            return (*/}
                {/*                <div*/}
                {/*                    key={type}*/}
                {/*                    className={`stat-card ${isActive ? 'active' : ''}`}*/}
                {/*                    style={{*/}
                {/*                        background: isActive ? getCardColor(type) : 'white',*/}
                {/*                        color: isActive ? 'white' : '#333',*/}
                {/*                        border: isActive ? `3px solid ${getCardColor(type)}` : 'none'*/}
                {/*                    }}*/}
                {/*                    onClick={() => window.dispatchEvent(new CustomEvent('showMarkers', { detail: { type } }))}*/}
                {/*                    tabIndex={0}*/}
                {/*                    role="button"*/}
                {/*                    aria-pressed={isActive}*/}
                {/*                >*/}
                {/*                    <div className="stat-icon">{info.icon}</div>*/}
                {/*                    <div className="stat-value">{info.value}</div>*/}
                {/*                    <div className="stat-label">{info.label}</div>*/}
                {/*                </div>*/}
                {/*            );*/}
                {/*        })}*/}

                {/*        <div className="stat-card score-card">*/}
                {/*            <div className="stat-icon">⭐</div>*/}
                {/*            <div className="stat-value">{data.score.toFixed(1)}</div>*/}
                {/*            <div className="stat-label">Рейтинг району</div>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*)}*/}

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
                                const checked = activeType === item.type;

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

                        <button
                            className="apply-btn"
                            onClick={() => setFiltersOpen(false)}
                        >
                            Готово
                        </button>
                    </div>
                </div>
            )}

            <Map data={{ districts: [data] }} selectedDistrict={data} />
        </div>
    );
}

export default App;