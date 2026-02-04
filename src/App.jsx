import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' 
import { supabase } from './supabase'
import './App.css' 
import PlaceDetails from './PlaceDetails'

// 📚 1. 翻译字典
const typeTranslations = {
  haunted_location: '🏠 凶宅', apparition: '👻 目击', cryptid: '🐾 未确认生物',
  yokai: '👺 妖怪', poltergeist: '🌪️ 骚灵', evp: '📻 异象',
  anomaly: '🌀 时空异常', ufo: '🛸 UFO', cursed_object: '🎁 诅咒物品',
  ritual: '🕯️ 仪式', urban_legend: '🔪 都市传说'
};

// 🎨 2. 定义类型颜色字典
const categoryColors = {
  haunted_location: '#ef4444', apparition: '#f97316', cryptid: '#16a34a',
  yokai: '#84cc16', poltergeist: '#eab308', evp: '#06b6d4',
  anomaly: '#db2777', ufo: '#2563eb', cursed_object: '#9333ea',
  ritual: '#4f46e5', urban_legend: '#475569'
};

// 🛠️ 3. 动态生成圆点图标
function getMarkerIcon(type) {
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

// 🧮 工具函数
function calculateDistance(lat1, lon1, lat2, lon2) {
  if(!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

function getPlaceName(details) {
  if (!details) return null;
  return details.city || details.town || details.village || details.county;
}

// 🎮 组件：地图遥控器
function MapController({ target, markerRefs }) {
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

// 🗺️ 核心地图页面
function MapPage() {
  const [stories, setStories] = useState([])
  const [searchQuery, setSearchQuery] = useState('') 
  const [sidebarList, setSidebarList] = useState([]) 
  const markerRefs = useRef({});

  const [mapCenter, setMapCenter] = useState(() => {
    try {
      const savedCenter = sessionStorage.getItem('ghostMapCenter')
      if (savedCenter) {
        const parsed = JSON.parse(savedCenter);
        if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0])) {
          return parsed;
        }
      }
      return [39.90, 116.40]; 
    } catch (e) { 
      return [39.90, 116.40]; 
    }
  })

  const [currentZoom, setCurrentZoom] = useState(() => {
    try {
      const savedZoom = sessionStorage.getItem('ghostMapZoom')
      return savedZoom ? parseInt(savedZoom) : 11 
    } catch { return 11 }
  })

  const [flyTarget, setFlyTarget] = useState(null)
  const [session, setSession] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const hasHistory = sessionStorage.getItem('ghostMapCenter');
    if (!hasHistory && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const pos = [latitude, longitude];
          setMapCenter(pos);
          setCurrentZoom(14); 
          setFlyTarget({ center: pos, zoom: 14, uuid: 'init' });
        },
        (error) => console.warn("定位失败", error)
      );
    }
    
    if (supabase && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
      getStories();
      return () => subscription.unsubscribe()
    } else {
      console.error("Supabase 未初始化");
    }
  }, []) 

  useEffect(() => {
    if (stories.length > 0) updateSidebarList(mapCenter[0], mapCenter[1], stories, null, null)
  }, [stories])

  useEffect(() => {
    sessionStorage.setItem('ghostMapCenter', JSON.stringify(mapCenter))
    sessionStorage.setItem('ghostMapZoom', currentZoom.toString())
  }, [mapCenter, currentZoom])

  async function getStories() {
    try {
      const { data, error } = await supabase
        .from('haunted_places')
        .select('*')
        .eq('status', 'active')
        .not('latitude', 'is', null) 
        .not('longitude', 'is', null)

      if (error) throw error;
      setStories(data || [])
    } catch (err) {
      console.error("获取数据失败:", err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('❌ 拒绝访问: ' + error.message)
    else { setShowLoginModal(false); setEmail(''); setPassword(''); }
    setAuthLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    alert('已安全断开连接。')
  }

  function updateSidebarList(lat, lon, allStories, boundingBox, searchAddressDetails) {
    if (!allStories || allStories.length === 0) return;
    
    const validStories = allStories.filter(s => 
      s.latitude !== null && s.longitude !== null && !isNaN(s.latitude) && !isNaN(s.longitude)
    );

    const targetCountryCode = searchAddressDetails ? searchAddressDetails.country_code : null;
    const targetState = searchAddressDetails ? (searchAddressDetails.state || searchAddressDetails.province) : null;
    const targetCity = getPlaceName(searchAddressDetails);

    const storiesWithDistance = validStories.map(story => ({
      ...story,
      distance: calculateDistance(lat, lon, story.latitude, story.longitude)
    }));

    const filtered = storiesWithDistance.filter(item => {
      const itemAddress = item.address ? item.address.toLowerCase() : "";
      if (targetCountryCode && item.country_code && item.country_code !== targetCountryCode) return false;
      if (targetState && item.distance > 50 && !itemAddress.includes(targetState.toLowerCase())) return false;
      if (targetCity && item.distance > 30 && !itemAddress.includes(targetCity.toLowerCase())) return false;
      if (boundingBox && boundingBox.length === 4) {
        const [minLat, maxLat, minLon, maxLon] = boundingBox.map(parseFloat);
        if (item.latitude >= minLat && item.latitude <= maxLat && item.longitude >= minLon && item.longitude <= maxLon) return true;
      }
      return item.distance < 50; 
    });

    filtered.sort((a, b) => a.distance - b.distance);
    setSidebarList(filtered.slice(0, 10));
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&addressdetails=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0]; 
        const { lat, lon, boundingbox, address } = result;
        const pos = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(pos); 
        let zoomLevel = 13;
        if (boundingbox) {
           const latDiff = parseFloat(boundingbox[1]) - parseFloat(boundingbox[0]);
           if (latDiff > 10) zoomLevel = 5; else if (latDiff > 2) zoomLevel = 8; else if (latDiff > 0.5) zoomLevel = 11; else zoomLevel = 14;
        }
        setFlyTarget({ center: pos, zoom: zoomLevel, uuid: Date.now() }); 
        updateSidebarList(parseFloat(lat), parseFloat(lon), stories, boundingbox, address);
      } else { alert('👻 未找到该地点...'); }
    } catch (err) { console.error("搜索出错", err); }
  }

  function handleSidebarClick(story) {
    if(!story.latitude || !story.longitude) return;
    const pos = [story.latitude, story.longitude];
    setFlyTarget({ center: pos, zoom: 16, uuid: Date.now(), id: story.id }); 
  }

  return (
    <div className="map-container" style={{ '--current-zoom': currentZoom }}>
      
      <div className="auth-widget">
        {session ? (
          <div className="auth-status logged-in">
             <span className="agent-badge">🟢 特工在线</span>
             <button onClick={handleLogout} className="auth-btn logout">断开</button>
          </div>
        ) : (
          <button onClick={() => setShowLoginModal(true)} className="auth-btn login">🔌 接入系统</button>
        )}
      </div>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔒 身份识别终端</h3>
            <p>请输入特工密钥以解锁全局权限</p>
            <form onSubmit={handleLogin} className="global-login-form">
              <input type="text" placeholder="特工 ID" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <input type="password" placeholder="访问口令" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="submit" disabled={authLoading}>{authLoading ? '验证中...' : '确认接入'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="search-box-container">
        <form onSubmit={handleSearch} className="search-form">
          <input className="search-input" type="text" placeholder="搜索地区 (如: Tokyo)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="search-btn">搜 索</button>
        </form>
      </div>

      {/* Sidebar 侧边栏 */}
      {sidebarList.length > 0 && (
        <div className="ghost-sidebar">
          
          <div className="sidebar-header">
            <span>📡 附近信号源 ({sidebarList.length})</span>
            <span style={{fontSize: '18px', cursor:'pointer', padding:'0 5px'}} onClick={() => setSidebarList([])}>×</span>
          </div>
          
          <div className="sidebar-content">
            {sidebarList.map(item => (
              <div key={item.id} className="ghost-item" onClick={() => handleSidebarClick(item)}>
                <h4>{item.name}</h4>
                <p>
                  <span>{typeTranslations[item.type] || '👻 未知'}</span>
                  <span className="distance-tag">
                    {item.distance < 1 ? '< 1 km' : `${Math.round(item.distance)} km`}
                  </span>
                </p>
                <div className="sidebar-actions">
                  {/* 👇 侧边栏按钮：新窗口打开 target="_blank" */}
                  <Link 
                    to={`/place/${item.id}`} 
                    className="sidebar-btn" 
                    onClick={(e) => e.stopPropagation()}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    📄 调阅档案 ➜
                  </Link>
                </div>
              </div>
            ))}
            <div style={{height: '10px'}}></div>
          </div>
        </div>
      )}

      {currentZoom < 10 && <div className="zoom-hint">🔍 放大地图以侦测灵异讯号...</div>}

      <MapContainer center={mapCenter} zoom={currentZoom} minZoom={3} maxZoom={18} worldCopyJump={true} maxBounds={[[-90, -Infinity], [90, Infinity]]} maxBoundsViscosity={1.0} style={{ height: "100%", width: "100%" }} zoomControl={false} >
        <MapController target={flyTarget} markerRefs={markerRefs} />
        <ZoomHandler onZoomChange={setCurrentZoom} />
        <MoveHandler onMoveEnd={setMapCenter} />
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        {currentZoom >= 10 && stories.map((story) => {
          if (!story.latitude || !story.longitude || isNaN(story.latitude)) return null;

          const typeColor = categoryColors[story.type] || '#64748b';
          return (
            <Marker 
              key={story.id} 
              position={[story.latitude, story.longitude]} 
              icon={getMarkerIcon(story.type)}
              ref={(element) => {
                if (element) { markerRefs.current[story.id] = element; }
              }}
            >
              <Popup className="custom-popup">
                <div className="popup-content">
                  {story.image_url && (<div className="popup-image" style={{backgroundImage: `url(${story.image_url})`}}></div>)}
                  <div className="popup-header">
                     <span className="type-badge" style={{ backgroundColor: typeColor }}>{typeTranslations[story.type] || '👻 未知现象'}</span>
                     <h3>{story.name}</h3>
                  </div>
                  {/* 👇 地图气泡按钮：新窗口打开 target="_blank" */}
                  <Link 
                    to={`/place/${story.id}`} 
                    className="popup-btn"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    📂 查看绝密档案
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
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