const modelMap = {
//////////////////////////////////////////////////
  "claude-opus-4-1": {
    "provider": "anthropic",
    "name": "claude-opus-4-1-20250805",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "temperature": 1
    }
  },
  "claude-opus-4-1-thinking": {
    "provider": "anthropic",
    "name": "claude-opus-4-1-20250805",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "thinking": {
        "type": "enabled",
        "budget_tokens": 32000
      },
      "temperature": 1
    }
  },
//////////////////////////////////////////////////
  "claude-opus-4": {
    "provider": "anthropic",
    "name": "claude-opus-4-20250514",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "temperature": 1
    }
  },
  "claude-opus-4-thinking": {
    "provider": "anthropic",
    "name": "claude-opus-4-20250514",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "thinking": {
        "type": "enabled",
        "budget_tokens": 32000
      },
      "temperature": 1
    }
  },
//////////////////////////////////////////////////
  "claude-sonnet-4": {
    "provider": "anthropic",
    "name": "claude-sonnet-4-20250514",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "temperature": 1
    }
  },
  "claude-sonnet-4-thinking": {
    "provider": "anthropic",
    "name": "claude-sonnet-4-20250514",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "thinking": {
        "type": "enabled",
        "budget_tokens": 32000
      },
      "temperature": 1
    }
  },
//////////////////////////////////////////////////
  "claude-3-7-sonnet": {
    "provider": "anthropic",
    "name": "claude-3-7-sonnet-latest",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "temperature": 1
    }
  },
  "claude-3-7-sonnet-thinking": {
    "provider": "anthropic",
    "name": "claude-3-7-sonnet-latest",
    "model_config_display_name": null,
    "parameters": {
      "max_tokens": 64000,
      "thinking": {
        "type": "enabled",
        "budget_tokens": 32000
      },
      "temperature": 1
    }
  },
//////////////////////////////////////////////////
  "gemini-2.5-pro": {
    "provider": "google",
    "name": "gemini-2.5-pro",
    "model_config_display_name": null,
    "parameters": {
      "response_format": null,
      "candidateCount": 1,
      "stopSequences": null,
      "maxOutputTokens": 50000,
      "temperature": 0,
      "topP": 0.95,
      "topK": 40
    }
  },
  "gemini-2.5-flash": {
    "provider": "google",
    "name": "gemini-2.5-flash",
    "model_config_display_name": null,
    "parameters": {
      "response_format": null,
      "candidateCount": 1,
      "stopSequences": null,
      "maxOutputTokens": 50000,
      "temperature": 0,
      "topP": 0.95,
      "topK": 40
    }
  },
//////////////////////////////////////////////////
  "gpt-5": {
    "provider": "openai",
    "name": "gpt-5",
    "model_config_display_name": null,
    "parameters": {
      "temperature": 1,
      "seed": 0,
      "response_format": null,
      "top_p": 1,
      "frequency_penalty": 0,
      "presence_penalty": 0
    }
  },
  "gpt-4.1": {
    "provider": "openai",
    "name": "gpt-4.1",
    "model_config_display_name": null,
    "parameters": {
      "temperature": 1,
      "seed": 0,
      "response_format": null,
      "top_p": 1
    }
  }
//////////////////////////////////////////////////
}

module.exports = modelMap
