// server/services/scrapers/lunScraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import Listing from '../../models/Listing.js';

const BASE_URL = 'https://www.lun.ua';
const API_BASE_URL = 'https://lun.ua/api/v2';

// На данный момент в Python-скрипте жёстко зашит Киев.
// Делаем функцию параметризованной, но по умолчанию оставляем Киев.
const CITY_SLUGS = {
    'kyiv': 'аренда-квартир-киев'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Парсинг одной страницы LUN
 */
async function scrapePage(url, city) {
    try {
        console.log(`🔍 LUN парсинг страницы: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en-US;q=0.7,en;q=0.6'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const cards = $('div.jss159'); // из Python-скрипта: announcement = soup.find_all('div', class_='jss159')
        const listings = [];

        cards.each((_, element) => {
            const $card = $(element);

            // Заголовок
            const title = $card.find('div.jss170').text().trim();

            // Район
            const district = $card.find('div.jss175').text().trim();

            // Цена + дата
            let priceDateText = $card.find('div.jss179').text().trim();
            // Python: .replace('грн', 'грн. дата: ')
            priceDateText = priceDateText.replace('грн', 'грн. дата: ');

            // Описание
            let description = $card.find('div.jss183.jss180').text().trim();
            // Python: .replace('комнатная', 'комнатная, площадь: ')
            description = description.replace('комнатная', 'комнатная, площадь: ');

            // Ссылка
            const linkEl = $card.find('a.jss61.jss35.jss37.jss38.jss40.jss41.jss58.jss190').first();
            let href = linkEl.attr('href') || '';
            if (href && !href.startsWith('http')) {
                href = BASE_URL + href;
            }

            // Пытаемся выделить цену числом
            const price = parsePriceFromPriceDate(priceDateText);

            // Вытаскиваем id из ссылки, если получится
            const externalId = extractExternalId(href);

            // Координат нет → пока что пропускаем без геокодинга (структура LUN сложнее, чем OLX)
            // Чтобы не ломать схему (lat/lon required), делаем временный упрощенный подход:
            // Если нет внешнего ID или цены/заголовка — пропускаем запись.
            if (!title || !price || !href || !externalId) {
                return;
            }

            // В ЭТОЙ версии: lat/lon мы не знаем → ставить null нельзя (required:true).
            // Поэтому временно не сохраняем в БД, а только возвращаем структуру
            // (можно будет потом добавить отдельный шаг геокодинга для LUN).

            listings.push({
                city: city,
                district: district || null,
                type: 'rent',
                externalId: `lun-${externalId}`,
                externalUrl: href,
                title,
                price,
                pricePerSqm: null,
                currency: 'UAH',
                rooms: extractRoomsFromDescription(description),
                area: extractAreaFromDescription(description),
                images: [],
                source: 'lun',
                lat: null,
                lon: null,
                address: district || '',
                description,
                isActive: true,
                publishedAt: new Date(),
                lastChecked: new Date()
            });
        });

        console.log(`✅ LUN: найдено ${listings.length} объявлений на странице`);
        return listings;
    } catch (error) {
        console.error('❌ LUN ошибка парсинга страницы:', error.message);
        return [];
    }
}

/**
 * Главная функция парсинга LUN
 * Пока что: только аренда квартир в Киеве, как в Python-скрипте.
 * Чтобы не ломать схему Listing (обязательные lat/lon), пока НЕ сохраняем в БД,
 * а только возвращаем список "сырых" объектов.
 */
export async function scrapeLunKyivRent(maxPages = 3) {
    const city = 'kyiv';
    const slug = CITY_SLUGS[city];

    if (!slug) {
        console.warn(`⚠️ Для города ${city} не настроен slug LUN`);
        return { total: 0, items: [] };
    }

    const baseUrl = `${BASE_URL}/${slug}?withoutBrokers=1`;
    console.log(`\n🚀 Старт парсинга LUN (аренда, Киев): ${baseUrl}\n`);

    const allListings = [];

    // Сначала узнаем общее количество страниц
    const firstPageHtml = await fetchHtml(baseUrl);
    const totalPages = firstPageHtml ? getTotalPages(firstPageHtml) : 1;
    const pagesToParse = Math.min(maxPages, totalPages);

    console.log(`📄 LUN всего страниц: ${totalPages}, будем парсить: ${pagesToParse}`);

    for (let page = 0; page < pagesToParse; page++) {
        const url = `${baseUrl}&page=${page}`;
        const listings = await scrapePage(url, city);
        allListings.push(...listings);
        await delay(2000);
    }

    console.log(`\n✅ LUN парсинг завершен. Всего найдено объявлений: ${allListings.length}\n`);

    // На данном этапе просто возвращаем массив.
    // Позже можно добавить:
    // 1) геокодинг (на основе описания/района),
    // 2) сохранение в Listing с проверкой lat/lon.
    return {
        total: allListings.length,
        items: allListings
    };
}

/**
 * Прямой вызов LUN API: market-geo/house-accessibility
 * Используется для экспериментов и анализа структуры ответа.
 */
export async function fetchLunHouseAccessibility(houseId = '10283801') {
    try {
        const url = `${API_BASE_URL}/market-geo/house-accessibility`;
        console.log(`🔗 LUN API запрос: ${url}?houseId=${houseId}`);

        const { data } = await axios.get(url, {
            params: { houseId },
            headers: {
                'User-Agent': 'FamilyHousingFinder/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        console.log('✅ LUN API ответ получен');
        return data;
    } catch (error) {
        console.error('❌ Ошибка LUN API (house-accessibility):', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Body:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

async function fetchHtml(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en-US;q=0.7,en;q=0.6'
            },
            timeout: 15000
        });
        return response.data;
    } catch (error) {
        console.error('❌ LUN ошибка при получении HTML:', error.message);
        return null;
    }
}

function getTotalPages(html) {
    try {
        const $ = cheerio.load(html);
        // Python: soup.find('div', class_="jss225 jss14")
        const pagesDiv = $('div.jss225.jss14').first();
        const links = pagesDiv.find('a.jss61.jss35.jss46.jss49.jss58.jss226.jss228');
        const lastHref = links.last().attr('href') || '';
        const parts = lastHref.split('=');
        const totalPages = parseInt(parts[2], 10);
        return Number.isNaN(totalPages) ? 1 : totalPages;
    } catch (e) {
        console.warn('⚠️ Не удалось определить количество страниц LUN, используем 1:', e.message);
        return 1;
    }
}

function parsePriceFromPriceDate(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
}

function extractRoomsFromDescription(description) {
    if (!description) return null;
    const match = description.match(/(\d+)\s*комнатн/i);
    return match ? parseInt(match[1], 10) : null;
}

function extractAreaFromDescription(description) {
    if (!description) return null;
    const match = description.match(/(\d+)\s*м/i);
    return match ? parseInt(match[1], 10) : null;
}

function extractExternalId(href) {
    if (!href) return null;
    // Простой хэш по URL или попытка достать ID из пути.
    // На LUN часто используются slug-URL без явного ID, поэтому используем сам URL как ID.
    return Buffer.from(href).toString('base64').slice(0, 32);
}


