import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabase';
import './App.css'; // 复用我们的午夜蓝样式

export default function PlaceDetails() {
  const { id } = useParams(); // 从网址里拿到 id
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getPlaceDetails() {
      // 去数据库抓取这一条数据的全部信息
      const { data, error } = await supabase
        .from('haunted_places')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('档案读取失败:', error);
      } else {
        setPlace(data);
      }
      setLoading(false);
    }
    getPlaceDetails();
  }, [id]);

  if (loading) return <div className="loading-screen">📡 正在解密档案...</div>;
  if (!place) return <div className="loading-screen">❌ 档案不存在或权限不足</div>;

  return (
    <div className="details-container">
      {/* 顶部导航 */}
      <nav className="details-nav">
        <Link to="/" className="back-btn">⬅ 返回雷达地图</Link>
      </nav>

      <div className="file-content">
        {/* 标题区 */}
        <header className="file-header">
            <span className="file-id">CASE FILE #{place.id.toString().padStart(4, '0')}</span>
            <h1>{place.name}</h1>
            <div className="file-meta">
                <span>📍 {place.address || '未知坐标'}</span>
                <span>📅 {place.occurred_at ? new Date(place.occurred_at).toLocaleDateString() : '时间不明'}</span>
                <span>💀 恐怖等级: {place.level}</span>
            </div>
        </header>

        {/* 图片区 */}
        {place.image_url && (
            <div className="file-image-box">
                <img src={place.image_url} alt={place.name} />
            </div>
        )}

        {/* 档案正文 */}
        <section className="file-body">
            <h3>👁‍🗨 调查报告</h3>
            <p>{place.details || '暂无详细记录...'}</p>
            
            {place.solution && (
                <div className="solution-box">
                    <strong>💡 赛博道长建议：</strong>
                    {place.solution}
                </div>
            )}
        </section>
      </div>
    </div>
  );
}