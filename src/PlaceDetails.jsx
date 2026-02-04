import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom' // ❌ 删掉了 Link 引用，因为没地方用了
import { supabase } from './supabase'
import './PlaceDetails.css'

// 📚 翻译字典
const typeTranslations = {
  haunted_location: '🏠 凶宅', apparition: '👻 目击', cryptid: '🐾 未确认生物',
  yokai: '👺 妖怪', poltergeist: '🌪️ 骚灵', evp: '📻 异象',
  anomaly: '🌀 时空异常', ufo: '🛸 UFO', cursed_object: '🎁 诅咒物品',
  ritual: '🕯️ 仪式', urban_legend: '🔪 都市传说'
};

function formatType(type) {
  if (!type) return '❓ 未知类型';
  if (typeTranslations[type]) return typeTranslations[type];
  return type.replace(/\{/g, ' (').replace(/\}/g, ')').replace(/_/g, ' '); 
}

function formatDate(isoString) {
  if (!isoString) return '未知时间';
  try {
    return new Date(isoString).toLocaleString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { return isoString; }
}

export default function PlaceDetails() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [session, setSession] = useState(null) 
  const [newLog, setNewLog] = useState('')
  const [agentName, setAgentName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchPlaceAndLogs()
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [id])

  async function fetchPlaceAndLogs() {
    const { data: placeData, error: placeError } = await supabase
      .from('haunted_places')
      .select('*')
      .eq('id', id)
      .single()
    
    if (placeError) {
      console.error("读取地点失败:", placeError)
      setLoading(false)
      return
    }
    setPlace(placeData)

    const { data: logData, error: logError } = await supabase
      .from('investigation_logs')
      .select('*')
      .eq('place_id', id)
      .order('created_at', { ascending: false })

    if (logError) console.error("读取日志失败:", logError)

    const initialReportContent = `【📋 案情简报】\n${placeData.summary || '暂无简报'}\n\n【📄 事件详述 / Incident Report】\n${placeData.details || '暂无详细记录'}`;
    
    const initialReport = {
      id: 'initial-system-report', 
      agent_name: '📁 系统原案存档', 
      created_at: placeData.occurred_at || placeData.created_at, 
      content: initialReportContent,
      image_url: null, 
      isSystemReport: true 
    };

    setLogs([initialReport, ...(logData || [])]);
    setLoading(false)
  }

  async function handleSubmitLog(e) {
    e.preventDefault()
    if (!newLog.trim() && !selectedFile) return alert("请输入内容或上传图片")
    setUploading(true)
    let imageUrl = null

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${id}/${fileName}`
        const { error: uploadError } = await supabase.storage
          .from('evidence-files')
          .upload(filePath, selectedFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage
          .from('evidence-files')
          .getPublicUrl(filePath)
        imageUrl = urlData.publicUrl
      }

      const { error: insertError } = await supabase
        .from('investigation_logs')
        .insert({
          place_id: id,
          agent_name: agentName || '匿名特工',
          content: newLog,
          image_url: imageUrl
        })

      if (insertError) throw insertError
      setNewLog('')
      setSelectedFile(null)
      fetchPlaceAndLogs() 
    } catch (error) {
      alert('情报上传失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="details-container center-flex"><div className="loading-text">📡 正在调阅档案...</div></div>
  if (!place) return <div className="details-container center-flex"><h1>❌ 404 - 档案已被销毁</h1></div>

  return (
    <div className="details-container">
      {/* ❌ 删除了这里的 <nav> 返回按钮区域 </nav> */}

      <div className="dossier-card">
        
        <header className="dossier-header">
          <div className="header-info-col">
            <h1 className="place-title">{place.name}</h1>
            <div className="place-meta">
              <span className="meta-tag">📍 {place.country_code ? place.country_code.toUpperCase() : '未知'}</span>
              <span className="meta-tag">💀 威胁等级: {place.level || 1}</span>
              <span className="meta-tag" style={{backgroundColor: 'var(--accent-purple)', color:'white'}}>👁️ {formatType(place.type)}</span>
            </div>

            <div className="info-box-compact">
              <div className="attr-group full-width">
                <span className="attr-icon">📍</span>
                <div className="attr-content">
                  <span className="attr-label">具体位置 / ADDRESS</span>
                  <div className="attr-value address-text">
                    {place.address || '暂无详细地址'}
                  </div>
                </div>
              </div>

              <div className="divider-line"></div>

              <div className="attr-grid">
                <div className="attr-group">
                  <span className="attr-icon">📅</span>
                  <div className="attr-content">
                    <span className="attr-label">记录时间 / DATE</span>
                    <div className="attr-value">
                      {formatDate(place.occurred_at || place.created_at)}
                    </div>
                  </div>
                </div>

                <div className="attr-group">
                  <span className="attr-icon">🌐</span>
                  <div className="attr-content">
                    <span className="attr-label">经纬度 / COORDINATES</span>
                    <div className="attr-value mono">
                      {Number(place.latitude).toFixed(4)}, {Number(place.longitude).toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="warning-box">
              ⚠️ 警告：该区域存在 {place.level > 3 ? '高危' : '潜在'} 超自然现象。请勿在无防护情况下接近。
            </div>
          </div>

          <div className="header-image-col">
            <div 
              className="place-hero-image-side" 
              style={{ backgroundImage: `url(${place.image_url || 'https://via.placeholder.com/1200x500?text=NO+IMAGE'})` }}
            ></div>
          </div>
        </header>

        <main className="main-content-body">
          <h3 className="section-title">🕵️‍♂️ 调查档案与后续追踪 ({logs.length})</h3>

          {session ? (
            <div className="log-form-box">
              <div className="agent-status">🟢 安全线路已连接: {session.user.email}</div>
              <div className="form-row">
                <input type="text" placeholder="特工代号 (选填)" className="agent-input" value={agentName} onChange={e => setAgentName(e.target.value)} />
                <label className="file-upload-btn">
                  📷 上传证据图片
                  <input type="file" accept="image/*" hidden onChange={e => setSelectedFile(e.target.files[0])} />
                </label>
                <span className="file-name">{selectedFile ? selectedFile.name : ''}</span>
              </div>
              <textarea placeholder="在此处追加新的调查线索..." className="log-input" rows="3" value={newLog} onChange={e => setNewLog(e.target.value)}></textarea>
              <button onClick={handleSubmitLog} disabled={uploading} className="submit-btn">
                {uploading ? '加密传输中...' : '📡 发送情报'}
              </button>
            </div>
          ) : (
            <div className="login-hint-box">
              <h4>🔒 需要特工权限</h4>
              <p>您当前仅拥有浏览权限，如需追加调查报告，请接入系统。</p>
            </div>
          )}

          <div className="logs-list">
            {logs.map(log => (
              <div key={log.id} className={`log-item ${log.isSystemReport ? 'system-report' : ''}`}>
                <div className="log-header">
                  <span className="agent-name">
                    {log.isSystemReport ? '📁 ' : '🕶️ '} {log.agent_name}
                  </span>
                  <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <div className="log-content" style={{ whiteSpace: 'pre-wrap' }}>{log.content}</div>
                {log.image_url && (
                  <div className="log-image-wrapper">
                    <img src={log.image_url} alt="Evidence" className="log-image"/>
                  </div>
                )}
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}