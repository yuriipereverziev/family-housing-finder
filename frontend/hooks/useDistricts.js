import { useEffect, useState } from 'react';

export function useDistricts() {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch('/geo/GeoJSON.json')
            .then(res => res.json())
            .then(setData)
            .catch(console.error);
    }, []);

    return data;
}
