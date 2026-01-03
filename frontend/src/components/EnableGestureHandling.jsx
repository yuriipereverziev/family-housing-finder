import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css';
import 'leaflet-gesture-handling';

export default function EnableGestureHandling({ text = 'Use two fingers to move the map' }) {
    const map = useMap();

    useEffect(() => {
        if (!map || !L.GestureHandling) return;

        // створюємо плагін
        const gh = new L.GestureHandling(map, { text });

        return () => {
            // видаляємо при демонтовані
            if (gh?.remove) gh.remove();
        };
    }, [map, text]);

    return null;
}
