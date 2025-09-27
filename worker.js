// Cloudflare Worker 代码
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 构建 PromptLayer API URL
    const targetUrl = `https://api.promptlayer.com${url.pathname}${url.search}`;

    // 复制原始请求头，添加必要的认证
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'Mozilla/5.0 (compatible; CFProxy/1.0)');

    // 创建新的请求
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : null,
    });

    try {
      // 发送请求到 PromptLayer
      const response = await fetch(newRequest);

      // 复制响应并允许跨域
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });

      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};