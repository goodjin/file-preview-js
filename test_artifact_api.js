// 测试工件 API 返回的内容
const artifactId = "019beb04-1f78-4000-9ab7-2066ac7c1489";

async function testArtifactAPI() {
  try {
    const response = await fetch(`http://localhost:2999/api/artifacts/${artifactId}`);
    const data = await response.json();
    
    console.log("=== API 返回数据 ===");
    console.log("ID:", data.id);
    console.log("Type:", data.type);
    console.log("isBinary:", data.isBinary);
    console.log("Content type:", typeof data.content);
    console.log("Content length:", data.content?.length);
    console.log("Content preview (first 200 chars):");
    console.log(data.content?.substring(0, 200));
    
    // 检查是否是 base64
    if (typeof data.content === 'string' && data.content.length > 0) {
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(data.content.substring(0, 100));
      console.log("\n可能是 base64:", isBase64);
      
      if (isBase64) {
        console.log("\n尝试解码 base64:");
        try {
          const decoded = Buffer.from(data.content, 'base64').toString('utf8');
          console.log(decoded.substring(0, 200));
        } catch (e) {
          console.log("解码失败:", e.message);
        }
      }
    }
  } catch (error) {
    console.error("测试失败:", error);
  }
}

testArtifactAPI();
