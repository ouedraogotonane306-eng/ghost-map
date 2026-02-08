export default function SearchBox({ query, setQuery, onSubmit, popularTags, onTagClick, activeTag, onClearTag }) {
  return (
    <div className="search-box-container">
      <form onSubmit={onSubmit} className="search-form">
        <input className="search-input" type="text" placeholder="搜索地区或标签..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="search-btn">搜 索</button>
      </form>

      {activeTag ? (
        <div className="active-tag-filter">
          <span>🏷️ 标签筛选: {activeTag}</span>
          <button className="clear-tag-btn" onClick={onClearTag}>清除</button>
        </div>
      ) : (
        popularTags && popularTags.length > 0 && (
          <div className="popular-tags-row">
            <span className="popular-tags-label">🔥 热门:</span>
            {popularTags.map(tag => (
              <button key={tag.id} className="popular-tag-btn" onClick={() => onTagClick(tag.name)}>
                {tag.name}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
