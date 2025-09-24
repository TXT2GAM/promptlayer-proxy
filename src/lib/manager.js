const axios = require("axios")
require('dotenv').config()

class Manager {
  constructor(accounts) {
    this.accounts = []
    this.init(accounts)
    // 移除不必要的 current_account 属性
    this.interval = setInterval(() => {
      this.refreshToken()
    }, 1000 * 60 * 60 * 24 * 5)
  }

  async init(accounts) {
    accounts = accounts.split(",").filter(account => account.trim() !== "")
    for (const account of accounts) {
      const [username, password] = account.split(":")
      const account_result = await this.initAccount(username, password)
      if (account_result) {
        console.log(`初始化账户成功: ${username}`)
        this.accounts.push(account_result)
      }
    }
  }

  async login(username, password) {
    try {
      const response = await axios.post("https://api.promptlayer.com/login", {
        email: username,
        password: password
      }, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0"
        }
      })

      if (response.data) {
        return response.data.access_token
      }
      return false
    } catch (error) {
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.login(username, password)
      }
      return false
    }
  }

  async getClientId(token) {
    try {
      const response = await axios.post("https://api.promptlayer.com/ws-token-request", null, {
        headers: {
          Authorization: "Bearer " + token
        }
      })
      if (response.data.success) {
        const access_token = response.data.token_details.token
        const clientId = response.data.token_details.clientId
        return { access_token, clientId }
      }
    } catch (error) {
      // console.error('获取clientId失败:', error)
      return false
    }
  }

  async getWorkspaceId(token) {
    try {
      const response = await axios.get("https://api.promptlayer.com/workspaces", {
        headers: {
          Authorization: "Bearer " + token
        }
      })
      if (response.data.success && response.data.workspaces.length > 0) {
        const workspaceId = response.data.workspaces[0].id
        return workspaceId
      }
    } catch (error) {
      // console.error('获取workspaceId失败:', error)
      return false
    }
  }

  async initAccount(username, password) {
    const token = await this.login(username, password)
    if (!token) {
      return false
    }
    const { clientId, access_token } = await this.getClientId(token)
    if (!clientId || !access_token) {
      return false
    }
    const workspaceId = await this.getWorkspaceId(token)
    if (!workspaceId) {
      return false
    }
    return { token, clientId, workspaceId, access_token }
  }

  getAccount() {
    if (this.accounts.length === 0) {
      throw new Error("没有可用的账户")
    }

    // 使用随机选择避免竞态条件，而不是轮换
    const randomIndex = Math.floor(Math.random() * this.accounts.length)
    const account = this.accounts[randomIndex]

    if (!account) {
      throw new Error("获取到的账户无效")
    }

    return account
  }

  async refreshToken() {
    console.log("开始刷新账户token...")
    const oldAccounts = this.accounts // 保留旧账户作为备份
    try {
      const newAccounts = []
      const accounts = process.env.ACCOUNTS.split(",").filter(account => account.trim() !== "")

      for (const account of accounts) {
        const [username, password] = account.split(":")
        const account_result = await this.initAccount(username, password)
        if (account_result) {
          console.log(`刷新账户成功: ${username}`)
          newAccounts.push(account_result)
        }
      }

      // 只有在成功初始化新账户后才替换旧账户
      if (newAccounts.length > 0) {
        this.accounts = newAccounts
        console.log(`账户刷新完成，共${newAccounts.length}个可用账户`)
      } else {
        console.warn("刷新失败，保留原有账户")
        // 保持原有账户不变
      }
    } catch (error) {
      console.error("刷新账户时出错:", error)
      // 出错时保持原有账户不变
    }
  }


}


if (!process.env.ACCOUNTS || process.env.ACCOUNTS === "" || process.env.AUTH_TOKEN === undefined) {
  console.error("ACCOUNTS 或 AUTH_TOKEN 未设置")
  process.exit(1)
}

const manager = new Manager(process.env.ACCOUNTS)

module.exports = manager
