
### 部署步骤

```bash
git clone https://github.com/TXT2GAM/promptlayer-proxy.git
cd promptlayer-proxy

# 编辑 docker-compose.yml 配置
# 默认监听 3001 端口
nano docker-compose.yml

docker-compose up -d
```
---

### 支持模型 (`src\lib\model-map.js`)

- `claude-opus-4-1(-thinking)`
- `claude-opus-4(-thinking)`
- `claude-sonnet-4(-thinking)`
- `claude-3-7-sonnet(-thinking)`
- `gemini-2.5-pro`
- `gpt-5`
- `gpt-4.1`