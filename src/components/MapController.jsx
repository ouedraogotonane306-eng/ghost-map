import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

export function MapController({ target, markerRefs }) {
  const map = useMap();

  useEffect(() => {
    if (target && target.center && Array.isArray(target.center) && target.center.length === 2) {
      map.closePopup();
      map.flyTo(target.center, target.zoom || 14, { duration: 1.5 });

      if (target.id && markerRefs.current[target.id]) {
        const marker = markerRefs.current[target.id];
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [target, map, markerRefs]);

  return null;
}

export function ZoomHandler({ onZoomChange }) {
  const map = useMapEvents({ zoomend: () => onZoomChange(map.getZoom()) });
  return null;
}

export function MoveHandler({ onMoveEnd }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd([center.lat, center.lng]);
    }
  });
  return null;
}
