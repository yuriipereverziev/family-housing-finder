
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import { MOCK_DATA } from './data/mockData';
import {
    School, Baby, Trees, PlaySquare,Building2,MapPin,ChevronDown,
    Hospital, Pill, Stethoscope,
    Bus, Train, ShoppingCart, Store,
    Dumbbell, Film, ShieldCheck,
    Coffee, Landmark, BookOpen, X, Filter
} from 'lucide-react';

const API_BASE =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:5023'
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
    const [activeCategory, setActiveCategory] = useState('education');


    // Конфігурація іконок для фільтрів
    const FILTERS_CATEGORIES = {
        education: {
            label: '🎓 Освіта',
            items: [
                { type: 'schools', label: 'Школи', Icon: School, color: '#e74c3c' },
                { type: 'kindergartens', label: 'Дитсадки', Icon: Baby, color: '#3498db' },
                { type: 'libraries', label: 'Бібліотеки', Icon: BookOpen, color: '#9b59b6' }
            ]
        },
        health: {
            label: '🏥 Здоров\'я',
            items: [
                { type: 'hospitals', label: 'Лікарні', Icon: Hospital, color: '#e74c3c' },
                { type: 'pharmacies', label: 'Аптеки', Icon: Pill, color: '#27ae60' },
                { type: 'clinics', label: 'Клініки', Icon: Stethoscope, color: '#3498db' }
            ]
        },
        transport: {
            label: '🚌 Транспорт',
            items: [
                { type: 'busStops', label: 'Зупинки', Icon: Bus, color: '#f39c12' },
                { type: 'railwayStations', label: 'Вокзали', Icon: Train, color: '#e67e22' }
            ]
        },
        shopping: {
            label: '🛒 Магазини',
            items: [
                { type: 'supermarkets', label: 'Супермаркети', Icon: ShoppingCart, color: '#2ecc71' },
                { type: 'convenience', label: 'Продуктові', Icon: Store, color: '#16a085' }
            ]
        },
        leisure: {
            label: '🎭 Дозвілля',
            items: [
                { type: 'parks', label: 'Парки', Icon: Trees, color: '#2ecc71' },
                { type: 'playgrounds', label: 'Майданчики', Icon: PlaySquare, color: '#f39c12' },
                { type: 'sportsCentres', label: 'Спортзали', Icon: Dumbbell, color: '#e74c3c' },
                { type: 'cinemas', label: 'Кінотеатри', Icon: Film, color: '#9b59b6' }
            ]
        },
        services: {
            label: '💼 Послуги',
            items: [
                { type: 'banks', label: 'Банки', Icon: Landmark, color: '#34495e' },
                { type: 'cafes', label: 'Кафе', Icon: Coffee, color: '#d35400' },
                { type: 'police', label: 'Поліція', Icon: ShieldCheck, color: '#3498db' }
            ]
        }
    };

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

    // Функція для отримання значення (пріоритет реальним даним)
    const getInfraValue = (type) => {
        if (realCounts && realCounts[type] !== undefined) {
            return realCounts[type];
        }
        return data?.infrastructure?.[type] || 0;
    };

    useEffect(() => {
        setRealCounts(null);
        setActiveTypes([]);
        window.dispatchEvent(new CustomEvent('resetMarkers'));

        setLoading(true);
        setError(null);

        // Спочатку намагаємося завантажити реальні дані
        axios
            .get(`${API_BASE}/api/districts/${selectedCity}`)
            .then((response) => {
                const dist = response.data.districts || [];

                if (dist.length === 0) {
                    throw new Error('Немає районів у відповіді');
                }

                console.log('✅ Реальні дані завантажено:', dist.length, 'районів');
                console.log('📍 Перший район має полігон:', !!dist[0]?.polygon);
                console.log('Список назв:', dist.map(d => d.name));

                setDistricts(dist);

                // ✅ ВИПРАВЛЕНО: правильний вибір району
                let matchedDistrict;
                if (selectedDistrict && dist.find(d => d.name === selectedDistrict)) {
                    // Якщо selectedDistrict існує і знайдений - використовуємо його
                    matchedDistrict = dist.find(d => d.name === selectedDistrict);
                } else {
                    // Інакше беремо перший район зі списку
                    matchedDistrict = dist[0];
                }

                console.log('🎯 Вибрано район:', matchedDistrict.name);

                setSelectedDistrict(matchedDistrict.name);
                setData(matchedDistrict);
                setIsRealData(true);
                setLoading(false);
            })
            .catch((err) => {
                // Якщо API недоступний - використовуємо мок-дані як fallback
                console.warn('⚠️ API недоступний:', err.message);
                console.log('📦 Використовуємо мок-дані як fallback');

                const mockCityData = MOCK_DATA[selectedCity];

                if (mockCityData && mockCityData.districts.length > 0) {
                    const dist = mockCityData.districts;
                    setDistricts(dist);
                    setSelectedDistrict(dist[0].name);
                    setData(dist[0]);
                    setIsRealData(false);
                    console.log('✅ Завантажено мок-дані:', dist.length, 'районів');
                    setLoading(false);
                } else {
                    setError(`Райони для міста ${selectedCity} в розробці`);
                    setLoading(false);
                }
            });
    }, [selectedCity]); // ⬅️ Тільки selectedCity у залежностях


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
                <nav className="modern-nav">
                    <div className="nav-header">
                        <div className="logo">
                            <Building2 size={28} strokeWidth={2.5} />
                            <h1>Пошук житла для сімей</h1>
                        </div>
                    </div>
                    <div className="nav-controls">
                        <div className="select-group">
                            <div className="select-icon">
                                <MapPin size={18} />
                            </div>
                            <select
                                id="city-select"
                                value={selectedCity}
                                onChange={handleCityChange}
                                className="modern-select"
                                aria-label="Виберіть місто"
                            >
                                <option value="ivano-frankivsk">Івано-Франківськ</option>
                                <option value="lviv">Львів</option>
                                <option value="kyiv">Київ</option>
                                <option value="odesa">Одеса</option>
                            </select>
                            <ChevronDown size={16} className="select-arrow" />
                        </div>
                    </div>
                </nav>
                <div className="error-message">{error}</div>
            </div>
        );
    }

    if (!data) {
        return <div className="loading">Завантаження...</div>;
    }

    return (
        <div className="container">
            <nav className="modern-nav">
                <div className="nav-header">
                    <div className="logo">
                        <Building2 size={28} strokeWidth={2.5} />
                        <h1>Пошук житла для сімей</h1>
                    </div>
                </div>

                <div className="nav-controls">
                    {/* Місто */}
                    <div className="select-group">
                        <div className="select-icon">
                            <MapPin size={18} />
                        </div>
                        <select
                            id="city-select"
                            value={selectedCity}
                            onChange={handleCityChange}
                            className="modern-select"
                            aria-label="Виберіть місто"
                        >
                            <option value="ivano-frankivsk">Івано-Франківськ</option>
                            <option value="lviv">Львів</option>
                            <option value="kyiv">Київ</option>
                            <option value="odesa">Одеса</option>
                        </select>
                        <ChevronDown size={16} className="select-arrow" />
                    </div>

                    {/* Район */}
                    <div className="select-group">
                        <div className="select-icon">
                            <Building2 size={18} />
                        </div>
                        <select
                            id="district-select"
                            value={selectedDistrict}
                            onChange={handleDistrictChange}
                            className="modern-select"
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
                        <ChevronDown size={16} className="select-arrow" />
                    </div>

                    {/* Фільтри */}
                    <button
                        className="filters-btn-modern"
                        onClick={() => setFiltersOpen(true)}
                    >
                        <Filter size={18} />
                        <span>Фільтри</span>
                        {activeTypes.length > 0 && (
                            <span className="filters-badge-modern">{activeTypes.length}</span>
                        )}
                    </button>
                </div>
            </nav>

            {/* МОДАЛЬНЕ ВІКНО З КАТЕГОРІЯМИ */}
            {filtersOpen && (
                <div className="filters-overlay" onClick={() => setFiltersOpen(false)}>
                    <div
                        className="filters-modal-categories"
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

                        {/* Вкладки категорій */}
                        <div className="categories-tabs">
                            {Object.entries(FILTERS_CATEGORIES).map(([key, category]) => {
                                const isActive = activeCategory === key;
                                const categoryItems = category.items.map(item => item.type);
                                const selectedCount = categoryItems.filter(type =>
                                    activeTypes.includes(type)
                                ).length;

                                return (
                                    <button
                                        key={key}
                                        className={`category-tab ${isActive ? 'active' : ''}`}
                                        onClick={() => setActiveCategory(key)}
                                    >
                                        {category.label}
                                        {selectedCount > 0 && (
                                            <span className="tab-badge">{selectedCount}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Фільтри активної категорії */}
                        <div className="filters-list">
                            {FILTERS_CATEGORIES[activeCategory].items.map(({ type, label, Icon, color }) => {
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

                        <div className="filters-actions-modern">
                            <button
                                className="action-btn clear-btn-modern"
                                onClick={() => {
                                    setActiveTypes([]);
                                    window.dispatchEvent(new CustomEvent('resetMarkers'));
                                }}
                                disabled={activeTypes.length === 0}
                            >
                                Скинути всі
                            </button>

                            <button
                                className="action-btn apply-btn-modern"
                                onClick={() => setFiltersOpen(false)}
                            >
                                Застосувати ({activeTypes.length})
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