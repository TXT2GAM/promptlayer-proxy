const axios = require('axios')
const FormData = require('form-data')
const imageCache = require('./caches')
const manager = require('./manager')


async function uploadFileBuffer(fileBuffer) {
  try {
    const account = manager.getAccount()
    const authToken = account.token
    // 转换为base64用于缓存检查
    const base64Data = fileBuffer.toString('base64')
    
    // 检查缓存中是否已存在此图片
    const cachedUrl = imageCache.getImageUrl(base64Data)
    if (cachedUrl) {
      return { success: true, file_url: cachedUrl }
    }
    
    // 创建表单数据
    const form = new FormData()

    // 添加文件内容到表单
    form.append('file', fileBuffer, `image_${Date.now()}.png`)

    // 设置请求头
    const headers = {
      ...form.getHeaders(),
      'Authorization': `Bearer ${authToken}`,
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0',
    }

    // 发送请求
    const response = await axios.post('https://promptlayer.acips.workers.dev/upload', form, { headers })
    
    // 如果上传成功，添加到缓存
    if (response.data && response.data.success && response.data.file_url) {
      imageCache.addImage(base64Data, response.data.file_url)
    }

    // 返回响应数据
    return response.data
  } catch (error) {
    console.log(error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  uploadFileBuffer
}
