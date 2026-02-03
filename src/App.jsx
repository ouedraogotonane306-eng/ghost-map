import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' 
import { supabase } from './supabase'
import './App.css' 
import PlaceDetails from './PlaceDetails'

// 📚 1. 翻译字典
const typeTranslations = {
  haunted_location: '🏠 凶宅',
  apparition: '👻 目击',
  cryptid: '🐾 未确认生物',
  yokai: '👺 妖怪',
  poltergeist: '🌪️ 骚灵',
  evp: '📻 异象',
  anomaly: '🌀 时空异常',
  ufo: '🛸 UFO',
  cursed_object: '🎁 诅咒',
  ritual: '🕯️ 仪式',
  urban_legend: '🔪 都市传说'
};

const ghostIcon = new L.DivIcon({
  className: 'dynamic-ghost-icon', 
  html: '<div class="ghost-emoji" style="filter: drop-shadow(0 0 5px orange);">🔥</div>',
  iconSize: [60, 60], 
  iconAnchor: [30, 30] 
});

// 🧮 工具函数：计算两个经纬度之间的距离 (Haversine公式)
// 返回单位：公里 (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // 距离
}

// 🎮 组件：地图遥控器
function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.center) {
      map.flyTo(target.center, target.zoom || 14, { duration: 1.5 }); 
    }
  }, [target, map]);
  return null;
}

function ZoomHandler({ onZoomChange }) {
  const map = useMapEvents({ zoomend: () => onZoomChange(map.getZoom()) });
  return null;
}

function MoveHandler({ onMoveEnd }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd([center.lat, center.lng]);
    }
  });
  return null;
}

// 🗺️ 核心页面
function MapPage() {
  const [stories, setStories] = useState([])
  const [searchQuery, setSearchQuery] = useState('') 
  
  // 📋 新增：侧边栏列表数据
  const [sidebarList, setSidebarList] = useState([]) 

  const [mapCenter, setMapCenter] = useState(() => {
    try {
      const savedCenter = sessionStorage.getItem('ghostMapCenter')
      return savedCenter ? JSON.parse(savedCenter) : [39.90, 116.40] 
    } catch (e) { return [39.90, 116.40] }
  })

  const [currentZoom, setCurrentZoom] = useState(() => {
    const savedZoom = sessionStorage.getItem('ghostMapZoom')
    return savedZoom ? parseInt(savedZoom) : 11 
  })

  const [flyTarget, setFlyTarget] = useState(null)

  // 📡 自动定位
  useEffect(() => {
    const hasHistory = sessionStorage.getItem('ghostMapCenter');
    if (!hasHistory && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const pos = [latitude, longitude];
          setMapCenter(pos);
          setCurrentZoom(14); 
          setFlyTarget({ center: pos, zoom: 14 });
          
          // 📍 定位后，也顺便更新一下列表，显示周围的灵异点
          updateSidebarList(latitude, longitude, stories); 
        },
        (error) => console.warn("定位失败", error)
      );
    }
  }, [stories]); // 依赖 stories，确保数据加载完再计算

  // 💾 实时保存状态
  useEffect(() => {
    sessionStorage.setItem('ghostMapCenter', JSON.stringify(mapCenter))
    sessionStorage.setItem('ghostMapZoom', currentZoom.toString())
  }, [mapCenter, currentZoom])

  useEffect(() => {
    getStories()
  }, [])

  async function getStories() {
    const { data, error } = await supabase
      .from('haunted_places')
      .select('*')
      .eq('status', 'active')
    if (error) console.error('抓取失败:', error)
    else setStories(data || [])
  }

  // 🧮 核心逻辑：更新侧边栏列表
  function updateSidebarList(lat, lon, allStories) {
    if (!allStories || allStories.length === 0) return;

    // 1. 计算所有点到当前中心的距离，并加上 distance 属性
    const storiesWithDistance = allStories.map(story => {
      return {
        ...story,
        distance: calculateDistance(lat, lon, story.latitude, story.longitude)
      }
    });

    // 2. 排序：近的在前
    storiesWithDistance.sort((a, b) => a.distance - b.distance);

    // 3. 筛选：只显示 500公里以内的，或者显示最近的 10 个
    // 这里我们取最近的 10 个显示
    const nearby = storiesWithDistance.slice(0, 10);
    
    setSidebarList(nearby);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const pos = [parseFloat(lat), parseFloat(lon)];
        
        setMapCenter(pos); 
        setFlyTarget({ center: pos, zoom: 13 }); 

        // 🔍 搜索成功后，更新右侧列表！
        updateSidebarList(parseFloat(lat), parseFloat(lon), stories);
        
      } else {
        alert('👻 未找到该地点...');
      }
    } catch (err) {
      console.error("搜索出错", err);
    }
  }

  // 👉 点击侧边栏列表项：飞过去
  function handleSidebarClick(story) {
    const pos = [story.latitude, story.longitude];
    setMapCenter(pos);
    setFlyTarget({ center: pos, zoom: 16 }); // 飞得更近一点 (16级)
  }

  return (
    <div className="map-container" style={{ '--current-zoom': currentZoom }}>
      <div className="search-box-container">
        <form onSubmit={handleSearch} className="search-form">
          <input 
            className="search-input"
            type="text" 
            placeholder="搜索地区 (如: Tokyo)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">搜 索</button>
        </form>
      </div>

     {/* 📜 侧边栏：只在有列表数据时显示 */}
      {sidebarList.length > 0 && (
        <div className="ghost-sidebar">
          <div className="sidebar-title">
            <span>📡 附近信号源 ({sidebarList.length})</span>
            <span style={{fontSize: '12px', cursor:'pointer'}} onClick={() => setSidebarList([])}>✖</span>
          </div>
          
          {sidebarList.map(item => (
            <div 
              key={item.id} 
              className="ghost-item" 
              // 👇 点击整个卡片时：只负责在地图上飞
              onClick={() => handleSidebarClick(item)}
            >
              <h4>{item.name}</h4>
              <p>
                <span>{typeTranslations[item.type] || '👻 未知'}</span>
                <span className="distance-tag">
                  {item.distance < 1 ? '< 1 km' : `${Math.round(item.distance)} km`}
                </span>
              </p>

              {/* 👇 新增：操作栏 */}
              <div className="sidebar-actions">
                {/* e.stopPropagation() 是关键！
                   它的作用是：当你点击这个按钮时，不要触发外层的 onClick (不要让地图飞)
                   而是直接执行 Link 的跳转。
                */}
                <Link 
                  to={`/place/${item.id}`} 
                  className="sidebar-btn"
                  onClick={(e) => e.stopPropagation()} 
                >
                  📄 调阅档案 ➜
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

      {currentZoom < 10 && (
        <div className="zoom-hint">🔍 放大地图以侦测灵异讯号...</div>
      )}

      <MapContainer 
        center={mapCenter} 
        zoom={currentZoom} 
        minZoom={3}
        maxZoom={18}
        worldCopyJump={true} 
        maxBounds={[[-90, -Infinity], [90, Infinity]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false} 
      >
        <MapController target={flyTarget} />
        <ZoomHandler onZoomChange={setCurrentZoom} />
        <MoveHandler onMoveEnd={setMapCenter} />

        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {currentZoom >= 10 && stories.map((story) => (
          <Marker 
            key={story.id} 
            position={[story.latitude, story.longitude]} 
            icon={ghostIcon} 
          >
            <Popup className="custom-popup">
              <div className="popup-content">
                {story.image_url && (
                  <div className="popup-image" style={{backgroundImage: `url(${story.image_url})`}}></div>
                )}
                <div className="popup-header">
                   <span className="type-badge">
                     {typeTranslations[story.type] || '👻 未知现象'}
                   </span>
                   <h3>{story.name}</h3>
                </div>
                {story.address && <p className="address-text">📍 {story.address}</p>}
                <p className="description-text">{story.summary || story.description}</p>
                <small>恐怖等级: {'💀'.repeat(story.level)}</small>
                
                <Link to={`/place/${story.id}`} className="popup-btn">
                   📂 查看绝密档案
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/place/:id" element={<PlaceDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App