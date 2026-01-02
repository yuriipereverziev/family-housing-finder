export const MOCK_DATA = {
    'ivano-frankivsk': {
        city: "Ivano-frankivsk",
        realEstate: {
            totalOffers: 456
        },
        districts: [
            {
                name: "Центр",
                lat: 48.9226,
                lon: 24.7111,
                score: 4.4,
                infrastructure: {
                    schools: 29,
                    kindergartens: 16,
                    parks: 29,
                    playgrounds: 77
                }
            },
            {
                name: "Пасічна",
                lat: 48.936,
                lon: 24.715,
                score: 3.5,
                infrastructure: {
                    schools: 26,
                    kindergartens: 12,
                    parks: 23,
                    playgrounds: 54
                }
            },
            {
                name: "Бам",
                lat: 48.915,
                lon: 24.735,
                score: 2.7,
                infrastructure: {
                    schools: 20,
                    kindergartens: 10,
                    parks: 12,
                    playgrounds: 41
                }
            },
            {
                name: "Каскад",
                lat: 48.905,
                lon: 24.72,
                score: 2.2,
                infrastructure: {
                    schools: 11,
                    kindergartens: 9,
                    parks: 6,
                    playgrounds: 41
                }
            }
        ]
    },
    'lviv': {
        city: "Lviv",
        realEstate: {
            totalOffers: 823
        },
        districts: [
            {
                name: "Личаківський",
                lat: 49.8383,
                lon: 24.0232,
                score: 4.2,
                infrastructure: {
                    schools: 35,
                    kindergartens: 28,
                    parks: 18,
                    playgrounds: 92
                }
            }
        ]
    },
    'kyiv': {
        city: "Kyiv",
        realEstate: {
            totalOffers: 1542
        },
        districts: []
    },
    'odesa': {
        city: "Odesa",
        realEstate: {
            totalOffers: 687
        },
        districts: []
    }
};