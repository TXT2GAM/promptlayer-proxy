const manager = require('../lib/manager')

const verify = (req, res, next) => {
  try {
    const authorization = req.headers.authorization
    if (!authorization) {
      return res.status(401).json({
        "error": {
          "message": "未提供授权令牌",
          "type": "authentication_error",
          "param": null,
          "code": "missing_api_key"
        }
      })
    }

    const token = authorization.replace('Bearer ', '')

    if (token === process.env.AUTH_TOKEN) {
      // 获取账户信息 - 增加错误处理
      try {
        const account = manager.getAccount()
        if (!account) {
          throw new Error("没有可用的账户")
        }
        req.account = account
        // console.log(`身份校验成功，使用账号=> ${JSON.stringify(req.account)}`)
        next()
      } catch (error) {
        console.error("获取账户失败:", error.message)
        return res.status(503).json({
          "error": {
            "message": "服务暂时不可用，请稍后重试",
            "type": "service_unavailable",
            "param": null,
            "code": "service_unavailable"
          }
        })
      }
    } else {
      return res.status(401).json({
        "error": {
          "message": "无效的API密钥",
          "type": "authentication_error",
          "param": null,
          "code": "invalid_api_key"
        }
      })
    }
  } catch (error) {
    console.error("验证过程出错:", error)
    return res.status(500).json({
      "error": {
        "message": "服务器内部错误",
        "type": "server_error",
        "param": null,
        "code": "server_error"
      }
    })
  }
}

module.exports = verify
