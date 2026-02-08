import { useState } from 'react'
import { Link } from 'react-router-dom'
import { typeTranslations } from '../constants'

const ITEMS_PER_PAGE = 8

export default function Sidebar({ items, onClose, onItemClick }) {
  const [currentPage, setCurrentPage] = useState(1)

  if (items.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const pageItems = items.slice(startIndex, endIndex)

  const displayStart = startIndex + 1
  const displayEnd = Math.min(endIndex, items.length)

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} />
      <div className="ghost-sidebar">
        <div className="sidebar-header">
          <span>📡 附近信号源 ({displayStart}-{displayEnd} / {items.length})</span>
          <span style={{ fontSize: '18px', cursor: 'pointer', padding: '0 5px' }} onClick={onClose}>x</span>
        </div>

        <div className="sidebar-content">
          {pageItems.map(item => (
            <div key={item.id} className="ghost-item" onClick={() => onItemClick(item)}>
              <h4>{item.name}</h4>
              <p>
                <span>{typeTranslations[item.type] || '👻 未知'}</span>
              </p>
              <p className="card-summary">
                {item.summary || '暂无简报...'}
              </p>
              {item.tags && item.tags.length > 0 && (
                <div className="sidebar-tags">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag.id} className="tag-chip small">{tag.name}</span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="tag-chip small">+{item.tags.length - 3}</span>
                  )}
                </div>
              )}
              <div className="sidebar-actions">
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
          <div style={{ height: '10px' }}></div>
        </div>

        {totalPages > 1 && (
          <div className="sidebar-footer">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setCurrentPage(page - 1)}
            >
              上一页
            </button>
            <span className="page-info">{page} / {totalPages}</span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setCurrentPage(page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </>
  );
}
