use crate::utils::custom_result::CustomResult;
use scopeguard::defer;
use serde_json::json;
use std::path::Path;
use tauri_plugin_log::log::warn;
use windows::core::Interface;
use windows::Win32::System::Com::{
    CoUninitialize, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
};
use windows::Win32::{
    System::{
        Com::{CoCreateInstance, CoInitializeEx, IDispatch, CLSCTX_LOCAL_SERVER},
        Variant::VARIANT,
    },
    UI::{
        Shell::{IShellFolderViewDual3, IShellWindows, IWebBrowser2, ShellWindows},
        WindowsAndMessaging::GetForegroundWindow,
    },
};

/// 文件类型分类命令
///
/// 该函数接收一个文件路径数组，将每个路径分类为文件或文件夹，
/// 并返回包含两个独立数组的结果：文件路径数组和文件夹路径数组。
///
/// # 参数
/// * `paths` - 字符串向量，包含要分类的完整文件系统路径
///
/// # 返回值
/// * `Result<CustomResult, CustomResult>` - 成功时返回包含分类结果的CustomResult，
///   失败时返回错误信息的CustomResult（当前实现中不会失败）
///
/// # 示例
/// ```
/// let paths = vec![
///     "/home/user/document.txt".to_string(),
///     "/home/user/pictures".to_string()
/// ];
/// let result = files_or_directory(paths);
/// ```
///
/// # 注意
/// * 不存在的路径会被静默忽略
/// * 符号链接会根据其指向的目标类型进行分类
/// * 权限不足的路径可能无法正确分类
#[tauri::command]
pub fn files_or_directory(paths: Vec<String>) -> Result<CustomResult, CustomResult> {
    let mut files = Vec::new();
    let mut folders = Vec::new();

    // 遍历输入的每个路径
    for path in paths {
        // 将字符串路径转换为 Path 对象以便进行文件系统操作
        let path_buf = Path::new(&path);
        // 检查路径是否存在
        if path_buf.exists() {
            if path_buf.is_dir() {
                folders.push(path);
            } else if path_buf.is_file() {
                files.push(path);
            }
        }
    }

    Ok(CustomResult::success(
        None,
        Some(json!({
            "files": files,
            "folders": folders
        })),
    ))
}

/// 获取当前激活的文件资源管理器窗口中选中的文件列表
///
/// 该函数通过 Windows COM API 遍历所有 Shell 窗口，找到当前激活的窗口，
/// 并获取该窗口中用户选中的文件列表。主要用于实现与文件资源管理器的交互功能。
/// 主要代码参考自：https://q.cnblogs.com/q/149229
///
/// # 实现原理
/// 1. 获取当前前景窗口句柄
/// 2. 初始化 COM 环境
/// 3. 枚举所有 Shell 窗口
/// 4. 匹配当前激活的窗口
/// 5. 提取选中文件路径
///
/// # 返回值
/// * `Result<CustomResult, CustomResult>` - 成功时返回包含选中文件路径数组的 CustomResult，
///   失败时返回错误信息的 CustomResult
///
/// # 错误情况
/// * 无法获取当前窗口句柄
/// * COM 初始化失败
/// * 无法创建 ShellWindows 实例
/// * 未找到匹配的 Shell 窗口
/// * 窗口对象转换失败
///
/// # 注意
/// * 需要管理员权限或适当的 COM 权限
/// * 仅适用于 Windows 系统
/// * 函数内部使用 unsafe 代码块操作 COM 接口
#[tauri::command]
pub fn get_active_explorer_select_files() -> Result<CustomResult, CustomResult> {
    unsafe {
        // 获取当前激活的窗口句柄
        let hwnd = GetForegroundWindow();
        if hwnd.0 == std::ptr::null_mut() {
            return Err(CustomResult::error(
                Some(format!("无法获取当前窗口句柄")),
                None,
            ));
        }

        // COM 初始化，设置为单线程公寓模式
        // COINIT_APARTMENTTHREADED 要求 COM 调用必须在创建该线程的同一线程中进行
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE)
            .ok()
            .map_err(|e| CustomResult::error(Some(format!("初始化COM失败：{}", e)), None))?;

        // 当前作用域结束时清理COM
        defer! { CoUninitialize(); }

        // 创建 ShellWindows 实例
        // CLSCTX_LOCAL_SERVER 表示在独立的进程中创建对象
        // ShellWindows 对象用于枚举系统中所有的 shell 窗口（包括桌面、文件资源管理器等）
        let shell_windows: IShellWindows =
            CoCreateInstance(&ShellWindows, None, CLSCTX_LOCAL_SERVER).map_err(|e| {
                CustomResult::error(Some(format!("创建 ShellWindows 实例失败：{}", e)), None)
            })?;

        // 获取 shell 窗口的总数，如果获取失败则默认为 0
        let count = shell_windows.Count().unwrap_or(0);

        // 遍历所有 shell 窗口
        for i in 0..count {
            // 将索引转换为 VARIANT 类型（COM 自动化中常用的数据类型）
            // VARIANT 可以包含多种类型的数据，这里存储的是 i32 索引
            let variant = VARIANT::from(i);

            // 获取指定索引的窗口对象
            let window: IDispatch = shell_windows.Item(&variant).map_err(|e| {
                CustomResult::error(Some(format!("获取 {} 索引窗口对象失败：{}", i, e)), None)
            })?;

            // 将窗口对象转换为 IWebBrowser2 接口
            // IWebBrowser2 是 WebBrowser 控件的主要接口，也用于 shell 窗口
            let web_browser: IWebBrowser2 = window.cast().map_err(|e| {
                CustomResult::error(Some(format!("{} 索引类型转换失败：{}", i, e)), None)
            })?;

            // 检查当前窗口是否为我们要找的桌面窗口
            // 通过比较窗口句柄来确认
            let item_hwnd = web_browser.HWND().map_err(|e| {
                CustomResult::error(Some(format!("{} 比较窗口句柄失败：{}", i, e)), None)
            })?;

            if item_hwnd.0 != hwnd.0 as isize {
                continue; // 不是目标窗口，继续查找下一个
            }

            // 找到桌面窗口后，获取其中选中的文件
            return get_selected_files(&web_browser);
        }
    }

    Ok(CustomResult::error(
        Some("未找到Shell窗口".to_string()),
        None,
    ))
}

/// 从指定的 WebBrowser 对象中获取选中的文件路径列表
///
/// 该函数通过 IShellFolderViewDual3 接口访问 Shell 文件夹视图，
/// 提取用户在当前文件资源管理器窗口中选中的文件项，并返回它们的完整路径。
///
/// # 参数
/// * `web_browser` - 实现了 IWebBrowser2 接口的浏览器对象，代表一个文件资源管理器窗口
///
/// # 返回值
/// * `Result<CustomResult, CustomResult>` - 成功时返回包含文件路径数组的 CustomResult，
///   失败时返回错误信息的 CustomResult
///
/// # 实现步骤
/// 1. 获取浏览器文档对象
/// 2. 转换为文件夹视图接口
/// 3. 获取选中项集合
/// 4. 遍历选中项并提取路径
///
/// # 错误情况
/// * 无法获取文档对象
/// * 接口转换失败
/// * 无法获取选中项集合
/// * 无法获取单个文件项
/// * 无法提取文件路径
///
/// # 注意
/// * 该函数是 `get_active_explorer_select_files` 的辅助函数
/// * 仅处理文件资源管理器类型的窗口
/// * 返回的路径是文件的完整系统路径
fn get_selected_files(web_browser: &IWebBrowser2) -> Result<CustomResult, CustomResult> {
    unsafe {
        // 获取浏览器中显示的文档对象
        // 在桌面窗口中，这个文档代表桌面文件夹
        let document = web_browser
            .Document()
            .map_err(|e| CustomResult::error(Some(format!("获取文档对象失败：{}", e)), None))?;

        // 将文档对象转换为文件夹视图接口
        // IShellFolderViewDual3 提供了操作文件夹视图的方法
        let folder_view: IShellFolderViewDual3 = document
            .cast()
            .map_err(|e| CustomResult::error(Some(format!("转换视图接口失败：{}", e)), None))?;

        // 获取当前选中的文件项集合
        let selected_items = folder_view.SelectedItems().map_err(|e| {
            CustomResult::error(Some(format!("获取选中文件项集合失败：{}", e)), None)
        })?;

        // 获取选中项的数量
        let count = selected_items
            .Count()
            .map_err(|e| CustomResult::error(Some(format!("获取选中项数量失败：{}", e)), None))?;

        // 没有选中文件，返回空数组
        if count == 0 {
            return Ok(CustomResult::success(None, Some(json!([]))));
        }

        // 收集所有选中文件的路径
        let mut paths = Vec::new();
        for i in 0..count {
            // 获取第 i 个选中的文件项
            let item = selected_items.Item(&VARIANT::from(i)).map_err(|e| {
                CustomResult::error(Some(format!("{} 获取文件失败：{}", i, e)), None)
            })?;

            // 获取文件项的完整路径
            let path = item
                .Path()
                .map_err(|e| {
                    CustomResult::error(Some(format!("{} 获取完整路径失败：{}", i, e)), None)
                })?
                .to_string();
            paths.push(path);
        }

        return Ok(CustomResult::success(None, Some(json!(paths))));
    }
}

use tauri_plugin_http::{
    reqwest:: {
        header::{HeaderMap, HeaderName, HeaderValue},
        ClientBuilder, Proxy,
    }
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tauri::Url;

/// API 请求配置结构体
///
/// 用于封装 HTTP 请求的所有必要参数，支持代理配置和自定义请求头
#[derive(Deserialize, Serialize)]
pub struct ApiRequest {
    /// 请求的目标 URL
    pub url: String,
    /// HTTP 方法（GET、POST 等）
    pub method: String,
    /// 自定义请求头，键值对形式
    pub headers: HashMap<String, String>,
    /// 请求体数据，JSON 格式
    pub body: serde_json::Value,
    /// 代理服务器配置，格式：http://host:port 或 socks5://host:port
    pub proxy: Option<String>,
}

/// 发送 HTTP API 请求的命令函数
///
/// 该函数接收一个完整的 API 请求配置，构建并发送 HTTP 请求，
/// 支持代理、自定义请求头和 JSON 请求体，返回服务器响应结果。
///
/// # 参数
/// * `request` - ApiRequest 结构体实例，包含请求的所有配置信息
///
/// # 返回值
/// * `Result<CustomResult, CustomResult>` - 成功时返回包含响应数据的 CustomResult，
///   失败时返回错误信息的 CustomResult
///
/// # 处理流程
/// 1. 创建 HTTP 客户端，配置连接超时
/// 2. 解析并设置代理（如果提供）
/// 3. 构建自定义请求头
/// 4. 根据方法类型创建请求构建器
/// 5. 添加 JSON 请求体（如果存在）
/// 6. 发送请求并处理响应
///
/// # 支持的代理协议
/// * HTTP 代理：http://host:port
/// * HTTPS 代理：https://host:port  
/// * SOCKS5 代理：socks5://host:port
///
/// # 支持的 HTTP 方法
/// * GET - 获取资源
/// * POST - 创建资源或提交数据
///
/// # 错误处理
/// * 代理 URL 解析失败
/// * 不支持的代理协议
/// * 客户端创建失败
/// * 无效的请求头名称或值
/// * 不支持的 HTTP 方法
/// * 网络请求发送失败
/// * HTTP 响应状态码非 2xx
/// * JSON 响应解析失败
///
/// # 注意
/// * 默认连接超时时间为 5 秒
/// * 请求头名称和值需要符合 HTTP 标准格式
/// * 函数会自动处理 JSON 请求体和响应解析
#[tauri::command]
pub async fn send_api_request(request: ApiRequest) -> Result<CustomResult, CustomResult> {
    let client_builder = ClientBuilder::new().connect_timeout(Duration::from_secs(5));
    let client: tauri_plugin_http::reqwest::Client;

    if let Some(proxy_url_str) = request.proxy {
        match Url::parse(&proxy_url_str) {
            Ok(proxy_url) => {
                if proxy_url.scheme() == "http"
                    || proxy_url.scheme() == "https"
                    || proxy_url.scheme() == "socks5"
                {
                    let proxy = Proxy::all(proxy_url_str).map_err(|e| {
                        CustomResult::error(Some(format!("添加代理失败：{}", e)), None)
                    })?;
                    client = client_builder.proxy(proxy).build().map_err(|e| {
                        CustomResult::error(Some(format!("创建客户端失败：{}", e)), None)
                    })?;
                } else {
                    return Err(CustomResult::error(
                        Some("不支持的代理协议".to_string()),
                        None,
                    ));
                }
            }
            Err(e) => {
                return Err(CustomResult::error(
                    Some(format!("解析代理URL失败: {}", e)),
                    None,
                ))
            }
        }
    } else {
        client = client_builder
            .build()
            .map_err(|e| CustomResult::error(Some(format!("创建客户端失败：{}", e)), None))?;
    }

    let mut headers = HeaderMap::new();
    for (key, value) in request.headers {
        // key 是 String 类型
        // 尝试将 String 类型的 key 转换为 HeaderName
        match HeaderName::from_bytes(key.as_bytes()) {
            Ok(header_name) => {
                // 尝试将 String 类型的 value 转换为 HeaderValue
                if let Ok(header_value) = HeaderValue::from_str(&value) {
                    // 如果 key 和 value 都成功转换，则插入到 HeaderMap
                    headers.insert(header_name, header_value);
                } else {
                    // 处理 header_value 解析失败的情况
                    warn!(
                        "Warning: Invalid HeaderValue for key '{}': '{}'",
                        key, value
                    );
                }
            }
            Err(e) => {
                // 处理 key 无法解析为有效 HeaderName 的情况
                warn!("Warning: Invalid HeaderName '{}': {}", key, e);
                // 如果希望遇到无效头名称就停止并返回错误，可以这样做：
                // return Err(CustomResult::error(Some(format!("无效的请求头名称 '{}': {}", key, e)), None));
            }
        }
    }

    let mut request_builder = match request.method.as_str() {
        "GET" => client.get(&request.url),
        "POST" => client.post(&request.url),
        "PUT" => client.put(&request.url),
        "DELETE" => client.delete(&request.url),
        _ => {
            return Err(CustomResult::error(
                Some(format!("不支持的 HTTP 方法: {}", request.method)),
                None,
            ));
        }
    };

    if !request.body.is_null() {
        request_builder = request_builder.json(&request.body);
    }

    request_builder = request_builder.headers(headers);

    // 超时时间 - 可能会影响正常输出
    // if let Some(timeout_s) = request.timeout_seconds {
    //     request_builder = request_builder.timeout(Duration::from_secs(timeout_s));
    // }

    match request_builder.send().await {
        Ok(response) => {
            let status = response.status();
            let text = response.text().await.unwrap_or_else(|_| "".to_string());

            if status.is_success() {
                match serde_json::from_str::<serde_json::Value>(&text) {
                    Ok(json_data) => Ok(CustomResult::success(
                        None,
                        Some(json!({"data": json_data})),
                    )),
                    Err(e) => Err(CustomResult::error(
                        Some(format!("解析 JSON 响应失败: {} - 响应内容: {}", e, text)),
                        None,
                    )),
                }
            } else {
                Err(CustomResult::error(
                    Some(format!("API 请求失败，状态码: {}，响应: {}", status, text)),
                    None,
                ))
            }
        }
        Err(e) => Err(CustomResult::error(
            Some(format!("发送 HTTP 请求失败: {}", e)),
            None,
        )),
    }
}
