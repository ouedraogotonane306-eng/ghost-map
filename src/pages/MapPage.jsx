import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabase'
import { categoryColors, typeTranslations } from '../constants'
import { getMarkerIcon, calculateDistance, getPlaceName } from '../utils'
import { useAuth } from '../hooks/useAuth'
import { useTags } from '../hooks/useTags'
import { MapController, ZoomHandler, MoveHandler } from '../components/MapController'
import LoginModal from '../components/LoginModal'
import UploadModal from '../components/UploadModal'
import SearchBox from '../components/SearchBox'
import Sidebar from '../components/Sidebar'
import AuthWidget from '../components/AuthWidget'
import '../App.css'

export default function MapPage() {
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
    } catch {
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
  const [minZoomForMarkers, setMinZoomForMarkers] = useState(10)

  // 认证
  const { session, email, setEmail, password, setPassword, authLoading, handleLogin, handleLogout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 上传地点
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [newPlace, setNewPlace] = useState({
    name: '', type: 'haunted_location', summary: '', details: '',
    address: '', latitude: '', longitude: '', level: 1
  })
  const [placeImage, setPlaceImage] = useState(null)
  const [uploadTags, setUploadTags] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const { popularTags, searchByTag, fuzzySearchTags, refreshPopularTags } = useTags()

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
    getStories();
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
        .select('*, place_tags ( tags ( id, name ) )')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error) throw error;
      const withTags = (data || []).map(item => ({
        ...item,
        tags: (item.place_tags || []).map(pt => pt.tags).filter(Boolean),
        place_tags: undefined
      }))
      setStories(withTags)
    } catch (err) {
      console.error("获取数据失败:", err.message);
    }
  }

  async function onLogin(e) {
    const success = await handleLogin(e)
    if (success) setShowLoginModal(false)
  }

  async function handleSubmitPlace(e) {
    e.preventDefault()
    if (!newPlace.name.trim()) return alert('请输入地点名称')
    if (!newPlace.latitude || !newPlace.longitude) return alert('请输入经纬度坐标')

    setUploadLoading(true)
    let imageUrl = null

    try {
      if (placeImage) {
        const fileExt = placeImage.name.split('.').pop()
        const fileName = `place_${Date.now()}.${fileExt}`
        const filePath = `places/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('evidence-files')
          .upload(filePath, placeImage)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('evidence-files')
          .getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }

      const { data: insertData, error: insertError } = await supabase
        .from('haunted_places')
        .insert({
          name: newPlace.name,
          type: newPlace.type,
          summary: newPlace.summary,
          details: newPlace.details,
          address: newPlace.address,
          latitude: parseFloat(newPlace.latitude),
          longitude: parseFloat(newPlace.longitude),
          level: parseInt(newPlace.level),
          image_url: imageUrl,
          status: 'active',
          country_code: 'cn'
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Save tags
      if (uploadTags.length > 0 && insertData) {
        for (const tagName of uploadTags) {
          const { data: tagData } = await supabase
            .from('tags')
            .upsert({ name: tagName }, { onConflict: 'name' })
            .select('id')
            .single()

          if (tagData) {
            await supabase
              .from('place_tags')
              .insert({ place_id: insertData.id, tag_id: tagData.id })
          }
        }
        refreshPopularTags()
      }

      alert('✅ 灵异地点上报成功！')
      setShowUploadModal(false)
      setNewPlace({
        name: '', type: 'haunted_location', summary: '', details: '',
        address: '', latitude: '', longitude: '', level: 1
      })
      setPlaceImage(null)
      setUploadTags([])
      getStories()
    } catch (error) {
      alert('❌ 上报失败: ' + error.message)
    } finally {
      setUploadLoading(false)
    }
  }

  function useCurrentLocation() {
    setNewPlace(prev => ({
      ...prev,
      latitude: mapCenter[0].toFixed(6),
      longitude: mapCenter[1].toFixed(6)
    }))
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
    setSidebarList(filtered);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      // 1. Try exact tag match
      const exactPlaceIds = await searchByTag(searchQuery)
      if (exactPlaceIds.length > 0) {
        filterByTagPlaceIds(exactPlaceIds, searchQuery)
        return
      }

      // 2. Try fuzzy tag match
      const fuzzyTags = await fuzzySearchTags(searchQuery)
      if (fuzzyTags.length > 0) {
        const firstTag = fuzzyTags[0]
        const fuzzyPlaceIds = await searchByTag(firstTag.name)
        if (fuzzyPlaceIds.length > 0) {
          filterByTagPlaceIds(fuzzyPlaceIds, firstTag.name)
          return
        }
      }

      // 3. Nominatim geo search
      setActiveTag(null)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&addressdetails=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const { lat, lon, boundingbox, address, addresstype } = result;
        const pos = [parseFloat(lat), parseFloat(lon)];
        setMapCenter(pos);

        const addressTypeZoom = {
          continent: 3, country: 5,
          state: 7, province: 7,
          county: 9,
          city: 11,
          town: 13,
          village: 14, hamlet: 14,
          suburb: 15,
          neighbourhood: 16,
          road: 17, street: 17,
          building: 18, house: 18,
        };
        let zoomLevel;
        if (addresstype && addressTypeZoom[addresstype] !== undefined) {
          zoomLevel = addressTypeZoom[addresstype];
        } else if (boundingbox) {
          const latDiff = parseFloat(boundingbox[1]) - parseFloat(boundingbox[0]);
          if (latDiff > 10) zoomLevel = 5; else if (latDiff > 2) zoomLevel = 8; else if (latDiff > 0.5) zoomLevel = 11; else zoomLevel = 14;
        } else {
          zoomLevel = 13;
        }

        if (addresstype === 'country' || addresstype === 'continent') {
          setMinZoomForMarkers(10);
        } else if (addresstype === 'state' || addresstype === 'province' || addresstype === 'county') {
          setMinZoomForMarkers(7);
        } else {
          setMinZoomForMarkers(0);
        }

        setFlyTarget({ center: pos, zoom: zoomLevel, uuid: Date.now() });
        updateSidebarList(parseFloat(lat), parseFloat(lon), stories, boundingbox, address);
      } else { alert('👻 未找到该地点...'); }
    } catch (err) { console.error("搜索出错", err); }
  }

  function filterByTagPlaceIds(placeIds, tagName) {
    const placeIdSet = new Set(placeIds)
    const matched = stories
      .filter(s => placeIdSet.has(s.id))
      .map(s => ({
        ...s,
        distance: calculateDistance(mapCenter[0], mapCenter[1], s.latitude, s.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
    setActiveTag(tagName)
    setSidebarList(matched)
  }

  function handleTagClick(tagName) {
    setSearchQuery(tagName)
    const matched = stories
      .filter(s => s.tags && s.tags.some(t => t.name === tagName))
      .map(s => ({
        ...s,
        distance: calculateDistance(mapCenter[0], mapCenter[1], s.latitude, s.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
    setActiveTag(tagName)
    setSidebarList(matched)
  }

  function handleClearTag() {
    setActiveTag(null)
    setSearchQuery('')
    updateSidebarList(mapCenter[0], mapCenter[1], stories, null, null)
  }

  function handleSidebarClick(story) {
    if (!story.latitude || !story.longitude) return;
    const pos = [story.latitude, story.longitude];
    setFlyTarget({ center: pos, zoom: 16, uuid: Date.now(), id: story.id });
  }

  return (
    <div className="map-container" style={{ '--current-zoom': currentZoom }}>

      <AuthWidget
        session={session}
        onLoginClick={() => setShowLoginModal(true)}
        onUploadClick={() => setShowUploadModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={onLogin}
        loading={authLoading}
      />

      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        newPlace={newPlace}
        setNewPlace={setNewPlace}
        placeImage={placeImage}
        setPlaceImage={setPlaceImage}
        onSubmit={handleSubmitPlace}
        loading={uploadLoading}
        onUseLocation={useCurrentLocation}
        tags={uploadTags}
        setTags={setUploadTags}
      />

      <SearchBox
        query={searchQuery}
        setQuery={setSearchQuery}
        onSubmit={handleSearch}
        popularTags={popularTags}
        onTagClick={handleTagClick}
        activeTag={activeTag}
        onClearTag={handleClearTag}
      />

      <Sidebar items={sidebarList} onClose={() => setSidebarList([])} onItemClick={handleSidebarClick} />

      {currentZoom < minZoomForMarkers && <div className="zoom-hint">🔍 放大地图以侦测灵异讯号...</div>}

      <MapContainer center={mapCenter} zoom={currentZoom} minZoom={3} maxZoom={18} worldCopyJump={true} maxBounds={[[-90, -Infinity], [90, Infinity]]} maxBoundsViscosity={1.0} style={{ height: "100%", width: "100%" }} zoomControl={false} >
        <MapController target={flyTarget} markerRefs={markerRefs} />
        <ZoomHandler onZoomChange={setCurrentZoom} />
        <MoveHandler onMoveEnd={setMapCenter} />
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {currentZoom >= minZoomForMarkers && stories.map((story) => {
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
                  {story.image_url && (<div className="popup-image" style={{ backgroundImage: `url(${story.image_url})` }}></div>)}
                  <div className="popup-header">
                    <h3>{story.name}</h3>
                    <p style={{ margin: '0', fontSize: '13px', color: '#475569' }}>
                      <span>{typeTranslations[story.type] || '👻 未知'}</span>
                    </p>
                    <p className="card-summary">
                      {story.summary || '暂无简报...'}
                    </p>
                    {story.tags && story.tags.length > 0 && (
                      <div className="popup-tags" style={{ gap: '4px' }}>
                        {story.tags.slice(0, 3).map(tag => (
                          <span key={tag.id} className="tag-chip small" style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b' }}>{tag.name}</span>
                        ))}
                      </div>
                    )}
                    <div className="sidebar-actions" style={{ marginTop: '10px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/place/${story.id}`}
                        className="sidebar-btn"
                        style={{ background: '#e2e8f0', color: '#475569', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📄 调阅档案 ➜
                      </Link>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div >
  )
}
