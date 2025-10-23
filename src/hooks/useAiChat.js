import { invoke } from '@tauri-apps/api/core';
import { warn } from '@tauri-apps/plugin-log';
import { formatObjectString } from '../utils/function'

const useAiChat = () => {
    const sendRequest = (url, method, headers, body, proxy) => {
        return new Promise((resolve, reject) => {

            proxy = proxy ? proxy : null;
            invoke('send_api_request', {
                request: {
                    url,
                    method,
                    headers,
                    body,
                    proxy,
                },
            }).then((response)=>{
                if (response.code == 200) {
                    resolve(response);
                } else {
                    warn("AI接口返回数据不正确: " + response.msg || '未知错误');
                    reject(response.msg || '未知错误');
                }
            }).catch((error)=>{
                const infoError = formatObjectString("AI接口返回错误", error);
                warn(infoError);
                reject(infoError);
            });
        })
    };

    /**
     * ChatGLM 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "glm-4", "glm-4-plus")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址 (如 "http://user:pass@host:port" 或 "socks5://user:pass@host:port")
     * @returns {Promise<string>} AI 模型输出或错误信息
     */
    const chatGLM = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            const headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false, // 禁用流式传输
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;

                const choices = data?.choices;
                if (choices && choices.length > 0) {
                    const message = choices[0].message;
                    if (message.content) {
                        resolve(message.content);
                        return;
                    }
                }

                reject('ChatGLM 响应格式不正确或无内容');
            }).catch((error)=>{
                // 接口错误返回示例："API 请求失败，状态码: 401 Unauthorized，响应: {\"error\":{\"code\":\"401\",\"message\":\"令牌已过期或验证不正确！\"}}"
                // 懒得解析了，直接展示给用户吧😀
                reject(error);
            });
        })
        
    };

    /**
     * DeepSeek 模型 *作者没有deepSeek Api 该函数未经测试！*
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "deepseek-chat", "deepseek-reasoner")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<string>} AI 模型输出或错误信息
     */
    const deepSeek = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.deepseek.com/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                messages: [
                    {
                        content: 'You are a helpful assistant',
                        role: 'system',
                    },
                    {
                        content: prompt,
                        role: 'user',
                    },
                ],
                model: model,
                stream: false,
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('DeepSeek 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                reject(error);
            })
        })
    };

    /**
     * Groq 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "llama3-8b-8192", "llama3-70b-8192")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<string>} AI 模型输出或错误信息
     */
    const groq = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.groq.com/openai/v1/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false,
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('Groq 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                // 接口错误示例："API 请求失败，状态码: 401 Unauthorized，响应: {"error":{"message":"Invalid API Key","type":"invalid_request_error","code":"invalid_api_key"}}"
                reject(error);
            });
        })
    };

    /**
     * Google Gemini 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "gemini-1.5-flash", "gemini-1.5-pro")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<string>} AI 模型输出或错误信息
     */
    const google = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const headers = {
                'Content-Type': 'application/json',
            };
            const body = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const candidates = data?.candidates;
                if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts.length > 0) {
                    const textPart = candidates[0].content.parts.find(part => part.text);
                    if (textPart) {
                        resolve(textPart.text);
                        return;
                    }
                }

                reject('Google Gemini 响应格式不正确或无内容');
            }).catch((error)=>{
                /**
                 * 接口错误示例：
                 * "API 请求失败，状态码: 400 Bad Request，响应: {
                    "error": {
                        "code": 400,
                        "message": "API key not valid. Please pass a valid API key.",
                        "status": "INVALID_ARGUMENT",
                        "details": [
                        {
                            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                            "reason": "API_KEY_INVALID",
                            "domain": "googleapis.com",
                            "metadata": {
                            "service": "generativelanguage.googleapis.com"
                            }
                        },
                        {
                            "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
                            "locale": "en-US",
                            "message": "API key not valid. Please pass a valid API key."
                        }
                        ]
                    }
                    }
                    "
                 */
                reject(error);
            })
        })
    };

    /**
     * ChatGPT 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "gpt-4.1", "gpt-3.5-turbo-0125")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<string>} AI 模型输出或错误信息
     */
    const chatGPT = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.openai.com/v1/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('ChatGPT 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                /**
                 * 接口错误返回示例："API 请求失败，状态码: 401 Unauthorized，响应: {
                        "error": {
                            "message": "Incorrect API key provided: qqqqqqqq**********1231. You can find your API key at https://platform.openai.com/account/api-keys.",
                            "type": "invalid_request_error",
                            "param": null,
                            "code": "invalid_api_key"
                        }
                    }
                    "
                 */
                reject(error);
            })
        })
    };

    /**
     * 使用AI聊天，非流模式
     * @param {String} nowAiPlatform AI平台
     * @param {String} prompt 发送给AI的数据
     * @param {String} model 所用模型
     * @param {String} apiKey API密钥
     * @param {String} proxy 代理
     * @returns {Promise<String>} AI返回的内容 或 错误信息
     */
    const aiUse = (nowAiPlatform, prompt, model, apiKey, proxy)=>{
        switch(nowAiPlatform){
            case 'ChatGLM':
                return chatGLM(prompt, model, apiKey, proxy);
            case 'DeepSeek':
                return deepSeek(prompt, model, apiKey, proxy);
            case 'Groq':
                return groq(prompt, model, apiKey, proxy);
            case 'Google':
                return google(prompt, model, apiKey, proxy);
            case 'ChatGPT':
                return chatGPT(prompt, model, apiKey, proxy);
            default :
                return Promise.reject("未知的AI平台");
        }
    }

    /**
     * 获取AI模型列表
     * @param {String} apiKey api密钥
     * @param {String} proxy 代理地址
     * @param {Array} headers 请求头 <TOKEN> 会被替换为密钥
     * @param {String} url 请求地址
     * @param {String} method 请求方式
     * @returns {Promise} 请求完成或失败的信息
     */
    const getModelList = (apiKey, proxy, headers, url, method = 'GET') => {
        const header = {};
        headers.forEach(item => {
            const array = item.split(":");
            if(array.length == 2){
                array[1] = array[1].replace("<TOKEN>", apiKey);
                header[array[0]] = array[1];
            }
        });

        // 请求头组装完成
        return sendRequest(url.replace("<TOKEN>", apiKey), method, header, null, proxy);
    }

    return {
        getModelList, aiUse
    };
};

export default useAiChat;