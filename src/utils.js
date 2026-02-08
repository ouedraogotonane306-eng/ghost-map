import L from 'leaflet'
import { categoryColors } from './constants'

// 动态生成圆点图标
export function getMarkerIcon(type) {
  const safeType = type || 'unknown';
  const color = categoryColors[safeType] || '#64748b';

  return new L.DivIcon({
    className: 'color-dot-icon',
    html: `<div class="dot-point" style="background-color: ${color}; box-shadow: 0 0 8px ${color}90;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}

// Haversine 距离计算
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if(!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 从地址详情中提取地名
export function getPlaceName(details) {
  if (!details) return null;
  return details.city || details.town || details.village || details.county;
}
