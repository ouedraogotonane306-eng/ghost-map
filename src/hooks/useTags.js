import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useTags() {
  const [popularTags, setPopularTags] = useState([])

  useEffect(() => {
    fetchPopularTags()
  }, [])

  async function fetchPopularTags() {
    try {
      const { data, error } = await supabase
        .from('place_tags')
        .select('tag_id, tags ( id, name )')

      if (error) throw error
      if (!data) return

      // Count references per tag
      const countMap = {}
      for (const row of data) {
        const tag = row.tags
        if (!tag) continue
        if (!countMap[tag.id]) {
          countMap[tag.id] = { id: tag.id, name: tag.name, count: 0 }
        }
        countMap[tag.id].count++
      }

      const sorted = Object.values(countMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setPopularTags(sorted)
    } catch (err) {
      console.error('获取热门标签失败:', err.message)
    }
  }

  async function searchByTag(tagName) {
    try {
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single()

      if (tagError || !tagData) return []

      const { data, error } = await supabase
        .from('place_tags')
        .select('place_id')
        .eq('tag_id', tagData.id)

      if (error) throw error
      return (data || []).map(row => row.place_id)
    } catch (err) {
      console.error('标签搜索失败:', err.message)
      return []
    }
  }

  async function fuzzySearchTags(query) {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(10)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('模糊搜索标签失败:', err.message)
      return []
    }
  }

  return { popularTags, searchByTag, fuzzySearchTags, refreshPopularTags: fetchPopularTags }
}
