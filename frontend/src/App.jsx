import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Тестові дані для демонстрації
const mockData = {
  city: "Ivano-Frankivsk",
  realEstate: { totalOffers: 156 },
  infrastructure: {
    schools: 42,
    kindergartens: 38,
    parks: 15,
    playgrounds: 67
  }
};

function App() {
  const [data, setData] = useState(mockData); // Показуємо тестові дані одразу
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5000/api/districts/ivano-frankivsk')
      .then(response => {
        setData(response.data);
        setUsingMockData(false);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.log('Backend недоступний, використовуємо тестові дані');
        setUsingMockData(true);
        setLoading(false);
        setError(null); // Не показуємо помилку, просто використовуємо mock дані
      });
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Завантаження даних...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>🏠 Пошук житла для сімей</h1>
        <p className="subtitle">Івано-Франківськ</p>
        {usingMockData && (
          <div className="demo-badge">
            📊 Демо-режим (тестові дані)
          </div>
        )}
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏘️</div>
          <div className="stat-value">{data.realEstate.totalOffers}</div>
          <div className="stat-label">Пропозицій нерухомості</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-value">{data.infrastructure.schools}</div>
          <div className="stat-label">Шкіл</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👶</div>
          <div className="stat-value">{data.infrastructure.kindergartens}</div>
          <div className="stat-label">Дитячих садків</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌳</div>
          <div className="stat-value">{data.infrastructure.parks}</div>
          <div className="stat-label">Парків</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎠</div>
          <div className="stat-value">{data.infrastructure.playgrounds}</div>
          <div className="stat-label">Дитячих майданчиків</div>
        </div>
      </div>

      <div className="info-section">
        <h2>Про сервіс</h2>
        <p>
          Цей додаток допомагає сім'ям з дітьми знайти ідеальне місце для життя
          в Івано-Франківську, враховуючи близькість шкіл, садочків, парків
          та інших важливих об'єктів інфраструктури.
        </p>
        {usingMockData && (
          <div className="demo-note">
            💡 <strong>Зараз показані тестові дані.</strong> Запустіть backend
            (<code>cd backend && npm run dev</code>) для отримання реальних даних з API.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
