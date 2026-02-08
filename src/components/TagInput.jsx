import { useState } from 'react'

export default function TagInput({ tags, onAddTag, onRemoveTag, placeholder }) {
  const [inputValue, setInputValue] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  function addTag() {
    const trimmed = inputValue.trim().replace(/,/g, '')
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setInputValue('')
      return
    }
    onAddTag(trimmed)
    setInputValue('')
  }

  return (
    <div className="tag-input-container">
      <div className="tag-input-chips">
        {tags.map(tag => (
          <span key={tag} className="tag-chip">
            {tag}
            <button type="button" className="tag-remove-btn" onClick={() => onRemoveTag(tag)}>x</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        className="tag-text-input"
        placeholder={placeholder || '输入标签，按回车添加...'}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
