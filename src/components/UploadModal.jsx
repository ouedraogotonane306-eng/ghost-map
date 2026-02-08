import { typeTranslations } from '../constants'
import TagInput from './TagInput'

export default function UploadModal({ show, onClose, newPlace, setNewPlace, placeImage, setPlaceImage, onSubmit, loading, onUseLocation, tags, setTags }) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
        <h3>📤 上报灵异地点</h3>
        <p>填写以下信息提交新发现的灵异事件</p>
        <form onSubmit={onSubmit} className="upload-form">
          <input
            type="text"
            placeholder="地点名称 *"
            value={newPlace.name}
            onChange={e => setNewPlace({...newPlace, name: e.target.value})}
            autoFocus
            required
          />

          <select
            value={newPlace.type}
            onChange={e => setNewPlace({...newPlace, type: e.target.value})}
            className="type-select"
          >
            {Object.entries(typeTranslations).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="coord-row">
            <input
              type="number"
              step="any"
              placeholder="纬度 (Latitude) *"
              value={newPlace.latitude}
              onChange={e => setNewPlace({...newPlace, latitude: e.target.value})}
              required
            />
            <input
              type="number"
              step="any"
              placeholder="经度 (Longitude) *"
              value={newPlace.longitude}
              onChange={e => setNewPlace({...newPlace, longitude: e.target.value})}
              required
            />
            <button type="button" className="use-location-btn" onClick={onUseLocation}>
              📍 使用地图中心
            </button>
          </div>

          <input
            type="text"
            placeholder="详细地址（选填）"
            value={newPlace.address}
            onChange={e => setNewPlace({...newPlace, address: e.target.value})}
          />

          <div className="level-row">
            <label>威胁等级：</label>
            <input
              type="range"
              min="1"
              max="5"
              value={newPlace.level}
              onChange={e => setNewPlace({...newPlace, level: e.target.value})}
            />
            <span className="level-value">💀 {newPlace.level}</span>
          </div>

          <textarea
            placeholder="简要描述（显示在列表中）"
            rows="2"
            value={newPlace.summary}
            onChange={e => setNewPlace({...newPlace, summary: e.target.value})}
          />

          <textarea
            placeholder="详细描述（事件经过、目击详情等）"
            rows="4"
            value={newPlace.details}
            onChange={e => setNewPlace({...newPlace, details: e.target.value})}
          />

          <label className="file-upload-label">
            🖼️ 上传图片（选填）
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={e => setPlaceImage(e.target.files[0])}
            />
          </label>
          {placeImage && <span className="file-name">📎 {placeImage.name}</span>}

          <TagInput
            tags={tags || []}
            onAddTag={tag => setTags(prev => [...prev, tag])}
            onRemoveTag={tag => setTags(prev => prev.filter(t => t !== tag))}
            placeholder="添加标签，按回车确认..."
          />

          <button type="submit" disabled={loading}>
            {loading ? '📡 上传中...' : '✅ 提交上报'}
          </button>
        </form>
      </div>
    </div>
  );
}
