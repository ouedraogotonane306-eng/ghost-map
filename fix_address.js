
import { createClient } from '@supabase/supabase-js';

// 👇 1. 请在这里填入你的 Supabase URL (在 Dashboard 首页可以看到)
const SUPABASE_URL = 'https://xxpfuqoshaavgfbavcyx.supabase.co';

// 👇 2. 请在这里填入刚才复制的 Secret Key (sb_secret_xxxx...)
const SERVICE_KEY = 'sb_secret_a7FRd4Mp4fRdTCbcf-9xJw_Ij9hMpri';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 开始执行：地址清洗计划...');

  const { data: places, error } = await supabase
    .from('haunted_places')
    .select('id, name, latitude, longitude');

  if (error) {
    console.error('❌ 读取数据库失败:', error);
    return;
  }

  console.log(`📋 共找到 ${places.length} 个地点，准备开始处理...`);

  for (const place of places) {
    const { id, name, latitude, longitude } = place;
    
    if (!latitude || !longitude) {
        console.log(`⚠️  [${name}] 无坐标，跳过。`);
        continue;
    }

    console.log(`\n🔍 正在查询: [${name}] ...`);

    try {
      // 这里的 User-Agent 随便改改，防止被屏蔽
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'MyGhostMap/1.0' }
      });
      
      const data = await response.json();

      if (!data || !data.address) {
        console.log(`⚠️  [${name}] 查询失败。`);
        continue;
      }

      const addr = data.address;
      // 提取字段
      const countryCode = addr.country_code; 
      const country = addr.country;
      const state = addr.state || addr.province || addr.region || '';
      const city = addr.city || addr.town || addr.county || addr.village || '';
      const suburb = addr.suburb || addr.district || '';
      const road = addr.road || '';
      
      // 拼接
      let formattedAddress = [country, state, city, suburb, road]
        .filter((part) => part && part.trim() !== '') 
        .join(', ');

      console.log(`   ✅ 解析成功: ${formattedAddress} (${countryCode})`);

      // 更新
      await supabase
        .from('haunted_places')
        .update({ 
            address: formattedAddress,
            country_code: countryCode
        })
        .eq('id', id);

    } catch (err) {
      console.error(`   ❌ 网络错误:`, err.message);
    }
    
    await sleep(1500); // 必须等待
  }

  console.log('\n🎉 完成！');
}

main();