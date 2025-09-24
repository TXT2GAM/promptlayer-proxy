const express = require('express')
const axios = require('axios')
const WebSocket = require('ws')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { uploadFileBuffer } = require('../lib/upload')
const { isJsonString } = require('../lib/tools')
const verify = require('./verify')
const modelMap = require('../lib/model-map')


async function parseMessages(req, res, next) {
  const messages = req.body.messages
  if (!Array.isArray(messages)) {
    req.processedMessages = []
    return next()
  }

  try {
    const transformedMessages = await Promise.all(messages.map(async (msg) => {
      const message = {
        role: msg.role,
        tool_calls: [],
        template_format: "f-string"
      }

      if (Array.isArray(msg.content)) {
        const contentItems = await Promise.all(msg.content.map(async (item) => {
          if (item.type === "text") {
            return {
              type: "text",
              text: item.text
            }
          }
          else if (item.type === "image_url") {
            try {
              const base64Match = item.image_url.url.match(/^data:image\/\w+;base64,(.+)$/)
              if (base64Match) {
                const base64 = base64Match[1]
                const data = Buffer.from(base64, 'base64')
                const uploadResult = await uploadFileBuffer(data)

                return {
                  type: "media",
                  media: {
                    "type": "image",
                    "url": uploadResult.file_url,
                    "title": `image_${Date.now()}.png`
                  }
                }
              } else {
                return {
                  type: "media",
                  media: {
                    "type": "image",
                    "url": item.image_url.url,
                    "title": "external_image"
                  }
                }
              }
            } catch (error) {
              console.error("处理图像时出错:", error)
              return {
                type: "text",
                text: "[图像处理失败]"
              }
            }
          } else {
            return {
              type: "text",
              text: JSON.stringify(item)
            }
          }
        }))

        message.content = contentItems
      } else {
        message.content = [
          {
            type: "text",
            text: msg.content || ""
          }
        ]
      }

      return message
    }))

    req.body.messages = transformedMessages
    return next()
  } catch (error) {
    console.error("处理消息时出错:", error.status)
    req.body.messages = []
    return next(error)
  }
}

async function getChatID(req, retryCount = 0) {
  const maxRetries = 3
  const retryDelay = 1000 * (retryCount + 1) // 递增延迟

  try {
    const url = 'https://api.promptlayer.com/api/dashboard/v2/workspaces/' + req.account.workspaceId + '/playground_sessions'
    const headers = { Authorization: "Bearer " + req.account.token }

    let data = {
      "id": uuidv4(),
      "name": "Not implemented",
      "prompt_blueprint": {
        "inference_client_name": null,
        "metadata": {
          "model": modelMap[req.body.model] ? modelMap[req.body.model] : modelMap["claude-3-7-sonnet-20250219"]
        },
        "prompt_template": {
          "type": "chat",
          "messages": req.body.messages,
          "tools": null,
          "input_variables": [],
          "functions": []
        },
        "provider_base_url_name": null
      },
      "input_variables": []
    }

    const response = await axios.put(url, data, {
      headers,
      timeout: 30000, // 30秒超时
      retry: {
        retries: 0 // 这里不重试，由外层函数处理
      }
    })

    if (response.data.success) {
      console.log(`生成会话ID成功: ${response.data.playground_session.id}`)
      req.chatID = response.data.playground_session.id
      return response.data.playground_session.id
    } else {
      throw new Error(`API返回失败: ${JSON.stringify(response.data)}`)
    }
  } catch (error) {
    console.error(`获取ChatID失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error.message)

    // 检查是否需要重试
    if (retryCount < maxRetries) {
      // 检查错误类型，决定是否重试
      const shouldRetry = error.code === 'ECONNRESET' ||
                         error.code === 'ETIMEDOUT' ||
                         error.code === 'ENOTFOUND' ||
                         error.code === 'ECONNREFUSED' ||
                         (error.response && [429, 502, 503, 504].includes(error.response.status))

      if (shouldRetry) {
        console.log(`${retryDelay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return await getChatID(req, retryCount + 1)
      }
    }

    throw error
  }
}

async function sentRequest(req, retryCount = 0) {
  const maxRetries = 3
  const retryDelay = 1000 * (retryCount + 1) // 递增延迟

  try {
    const url = 'https://api.promptlayer.com/api/dashboard/v2/workspaces/' + req.account.workspaceId + '/run_groups'
    const headers = { Authorization: "Bearer " + req.account.token }

    let data = {
      "id": uuidv4(),
      "playground_session_id": req.chatID,
      "shared_prompt_blueprint": {
        "inference_client_name": null,
        "metadata": {
          "model": modelMap[req.body.model] ? modelMap[req.body.model] : modelMap["claude-3-7-sonnet-20250219"]
        },
        "prompt_template": {
          "type": "chat",
          "messages": req.body.messages,
          "tools": null,
          "input_variables": [],
          "functions": []
        },
        "provider_base_url_name": null
      },
      "individual_run_requests": [
        {
          "input_variables": {},
          "run_group_position": 1
        }
      ]
    }

    const response = await axios.post(url, data, {
      headers,
      timeout: 30000, // 30秒超时
      retry: {
        retries: 0 // 这里不重试，由外层函数处理
      }
    })

    if (response.data.success) {
      return response.data.run_group.individual_run_requests[0].id
    } else {
      throw new Error(`API返回失败: ${JSON.stringify(response.data)}`)
    }
  } catch (error) {
    console.error(`发送请求失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error.message)

    // 检查是否需要重试
    if (retryCount < maxRetries) {
      // 检查错误类型，决定是否重试
      const shouldRetry = error.code === 'ECONNRESET' ||
                         error.code === 'ETIMEDOUT' ||
                         error.code === 'ENOTFOUND' ||
                         error.code === 'ECONNREFUSED' ||
                         (error.response && [429, 502, 503, 504].includes(error.response.status))

      if (shouldRetry) {
        console.log(`${retryDelay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return await sentRequest(req, retryCount + 1)
      }
    }

    throw error
  }
}

// 聊天完成路由
router.post('/v1/chat/completions', verify, parseMessages, async (req, res) => {
  // console.log(JSON.stringify(req.body))

  let ws = null // WebSocket引用
  let requestTimeout = null // 超时定时器引用
  let isCleanedUp = false // 防止重复清理

  // 资源清理函数
  const cleanup = () => {
    if (isCleanedUp) return // 防止重复清理
    isCleanedUp = true

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    } catch (err) {
      console.error("关闭WebSocket时出错:", err)
    }

    try {
      if (requestTimeout) {
        clearTimeout(requestTimeout)
      }
    } catch (err) {
      console.error("清除超时定时器时出错:", err)
    }
  }

  try {

    let isSetHeader = false
    const setHeader = () => {
      if (isSetHeader) return
      if (req.body.stream === true) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
      } else {
        res.setHeader('Content-Type', 'application/json')
      }
      isSetHeader = true
    }

    setHeader()

    const { access_token, clientId } = req.account

    // 生成会话ID - 现在有重试机制
    try {
      await getChatID(req)
    } catch (error) {
      console.error("生成会话ID失败:", error.message)
      return res.status(500).json({
        "error": {
          "message": "无法创建会话，请稍后重试",
          "type": "server_error",
          "param": null,
          "code": "session_creation_failed"
        }
      })
    }

    // 发送的数据
    const sendAction = `{"action":10,"channel":"user:${clientId}","params":{"agent":"react-hooks/2.0.2"}}`
    // 构建 WebSocket URL
    const wsUrl = `wss://realtime.ably.io/?access_token=${encodeURIComponent(access_token)}&clientId=${clientId}&format=json&heartbeats=true&v=3&agent=ably-js%2F2.0.2%20browser`

    // WebSocket 连接重试逻辑
    const createWebSocketConnection = () => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl)
        let connectionTimeout = setTimeout(() => {
          ws.close()
          reject(new Error('WebSocket连接超时'))
        }, 15000) // 15秒连接超时

        ws.on('open', () => {
          clearTimeout(connectionTimeout)
          console.log('WebSocket连接已建立')
          resolve(ws)
        })

        ws.on('error', (error) => {
          clearTimeout(connectionTimeout)
          console.error('WebSocket连接错误:', error)
          reject(error)
        })
      })
    }

    // 尝试建立 WebSocket 连接，最多重试3次
    let wsRetries = 0
    const maxWsRetries = 3

    while (wsRetries <= maxWsRetries) {
      try {
        ws = await createWebSocketConnection()
        break
      } catch (error) {
        wsRetries++
        console.error(`WebSocket连接失败 (尝试 ${wsRetries}/${maxWsRetries + 1}):`, error.message)

        if (wsRetries > maxWsRetries) {
          return res.status(500).json({
            "error": {
              "message": "无法建立连接，请稍后重试",
              "type": "server_error",
              "param": null,
              "code": "connection_failed"
            }
          })
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * wsRetries))
      }
    }

    // 现在注册响应事件监听器，确保WebSocket已创建
    res.on('close', cleanup)
    res.on('finish', cleanup)

    // 状态详细
    let ThinkingLastContent = ""
    let TextLastContent = ""
    let ThinkingStart = false
    let ThinkingEnd = false
    let RequestID = ""
    let MessageID = "chatcmpl-" + uuidv4()
    let streamChunk = {
      "id": MessageID,
      "object": "chat.completion.chunk",
      "system_fingerprint": "fp_44709d6fcb",
      "created": Math.floor(Date.now() / 1000),
      "model": req.body.model,
      "choices": [
        {
          "index": 0,
          "delta": {
            "content": null
          },
          "finish_reason": null
        }
      ]
    }

    ws.on('open', async () => {
      try {
        ws.send(sendAction)
        RequestID = await sentRequest(req)
      } catch (error) {
        console.error("发送请求失败:", error)
        cleanup()
        if (!res.headersSent) {
          res.status(500).json({
            "error": {
              "message": "请求处理失败",
              "type": "server_error",
              "param": null,
              "code": "request_failed"
            }
          })
        }
      }
    })

    ws.on('message', async (data) => {
      try {
        data = data.toString()
        // console.log(`收到消息: ${JSON.stringify(data)}`)
        let ContentText = JSON.parse(data)?.messages?.[0]
        let output = ""

        if (ContentText?.name === "UPDATE_LAST_MESSAGE" && isJsonString(ContentText.data) && JSON.parse(ContentText.data).individual_run_request_id === RequestID) {

          if (JSON.parse(ContentText.data).payload.message.content[0].text) {
            output = JSON.parse(ContentText.data).payload.message.content[0].text.replace(TextLastContent, "")
            if (ThinkingStart && !ThinkingEnd) {
              ThinkingEnd = true
              output = `${output}\n\n</think>`
            }
            TextLastContent = JSON.parse(ContentText.data).payload.message.content[0].text
          } else if (JSON.parse(ContentText.data).payload.message.content[0].thinking) {
            output = JSON.parse(ContentText.data).payload.message.content[0].thinking.replace(ThinkingLastContent, "")
            if (!ThinkingStart) {
              ThinkingStart = true
              output = `<think>\n\n${output}`
            }
            ThinkingLastContent = JSON.parse(ContentText.data).payload.message.content[0].thinking
          }

          if (req.body.stream === true) {
            streamChunk.choices[0].delta.content = output
            res.write(`data: ${JSON.stringify(streamChunk)}\n\n`)
          }

        } else if (ContentText?.name === "INDIVIDUAL_RUN_COMPLETE" && isJsonString(ContentText.data) && JSON.parse(ContentText.data).individual_run_request_id === RequestID) {

          if (req.body.stream !== true) {
            output = ThinkingLastContent ? `<think>\n\n${ThinkingLastContent}\n\n</think>\n\n${TextLastContent}` : TextLastContent
          }

          if (ThinkingLastContent === "" && TextLastContent === "") {
            output = "该模型暂时不可用，请切换至其他模型"
            streamChunk.choices[0].delta.content = output
            res.write(`data: ${JSON.stringify(streamChunk)}\n\n`)
          }

          if (!req.body.stream || req.body.stream !== true) {
            let responseJson = {
              "id": MessageID,
              "object": "chat.completion",
              "created": Math.floor(Date.now() / 1000),
              "system_fingerprint": "fp_44709d6fcb",
              "model": req.body.model,
              "choices": [
                {
                  "index": 0,
                  "message": {
                    "role": "assistant",
                    "content": output
                  },
                  "finish_reason": "stop"
                }
              ],
              "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
              }
            }

            res.json(responseJson)
            ws.close()
            return
          } else {
            // 流式响应：发送结束标记
            let finalChunk = {
              "id": MessageID,
              "object": "chat.completion.chunk",
              "created": Math.floor(Date.now() / 1000),
              "model": req.body.model,
              "choices": [
                {
                  "index": 0,
                  "delta": {},
                  "finish_reason": "stop"
                }
              ]
            }

            // 仅当模型是OpenAI模型时添加system_fingerprint字段
            if (!req.body.model.includes("claude")) {
              finalChunk.system_fingerprint = "fp_44709d6fcb"
            }

            res.write(`data: ${JSON.stringify(finalChunk)}\n\n`)
            res.write(`data: [DONE]\n\n`)
            res.end()
          }
          cleanup() // 清理资源
        }

      } catch (err) {
        console.error("处理WebSocket消息出错:", err)
      }
    })

    ws.on('error', (err) => {
      console.error("WebSocket连接错误:", err)
      cleanup() // 清理资源

      if (!res.headersSent) {
        // 标准OpenAI错误响应格式
        res.status(500).json({
          "error": {
            "message": err.message,
            "type": "server_error",
            "param": null,
            "code": "server_error"
          }
        })
      }
    })

    ws.on('close', (code, reason) => {
      console.log(`WebSocket连接关闭: ${code} ${reason}`)
      cleanup() // 清理资源
    })

    // 设置请求超时
    requestTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("请求超时，关闭WebSocket连接")
        cleanup()
        if (!res.headersSent) {
          // 标准OpenAI超时错误响应格式
          res.status(504).json({
            "error": {
              "message": "请求超时",
              "type": "timeout",
              "param": null,
              "code": "timeout_error"
            }
          })
        }
      }
    }, 300 * 1000)

  } catch (error) {
    console.error("请求处理错误:", error)
    cleanup() // 确保清理资源

    if (!res.headersSent) {
      // 标准OpenAI通用错误响应格式
      res.status(500).json({
        "error": {
          "message": error.message || "服务器内部错误",
          "type": "server_error",
          "param": null,
          "code": "server_error"
        }
      })
    }
  }
})

module.exports = router
