use serde_json::json;
use crate::utils::custom_result::{CustomResult};
use std::path::Path;
use windows::core::Interface;
use windows::Win32::{
    System::{
        Variant::VARIANT,
        Com::{CoCreateInstance, CoInitializeEx, CLSCTX_LOCAL_SERVER, COINIT_MULTITHREADED, IDispatch}
    }, 
    UI::{
        Shell::{IShellFolderViewDual3, IShellWindows, IWebBrowser2, ShellWindows}, 
        WindowsAndMessaging::GetForegroundWindow
    }
};
use scopeguard::defer;

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

    Ok(
        CustomResult::success(None, Some(
            json!({
                "files": files,
                "folders": folders
            })
        ))
    )
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
            return Err(CustomResult::error(Some(format!("无法获取当前窗口句柄")), None))
        }
        
        // COM 初始化，设置为多线程公寓模式
        // COINIT_MULTITHREADED 允许多个线程同时调用 COM 组件
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED).ok().map_err(|e| CustomResult::error(Some(format!("初始化COM失败：{}", e)), None))?;

        // 当前作用域结束时清理COM
        defer! { CoUninitialize(); }

        // 创建 ShellWindows 实例
        // CLSCTX_LOCAL_SERVER 表示在独立的进程中创建对象
        // ShellWindows 对象用于枚举系统中所有的 shell 窗口（包括桌面、文件资源管理器等）
        let shell_windows: IShellWindows = CoCreateInstance(&ShellWindows, None, CLSCTX_LOCAL_SERVER).
            map_err(|e| CustomResult::error(Some(format!("创建 ShellWindows 实例失败：{}", e)), None))?;

        // 获取 shell 窗口的总数，如果获取失败则默认为 0
        let count = shell_windows.Count().unwrap_or(0);

        // 遍历所有 shell 窗口
        for i in 0..count {
            // 将索引转换为 VARIANT 类型（COM 自动化中常用的数据类型）
            // VARIANT 可以包含多种类型的数据，这里存储的是 i32 索引
            let variant = VARIANT::from(i);
            
            // 获取指定索引的窗口对象
            let window: IDispatch = shell_windows.Item(&variant).
                map_err(|e| CustomResult::error(Some(format!("获取 {} 索引窗口对象失败：{}", i, e)), None))?;
            
            // 将窗口对象转换为 IWebBrowser2 接口
            // IWebBrowser2 是 WebBrowser 控件的主要接口，也用于 shell 窗口
            let web_browser: IWebBrowser2 = window.cast().
                map_err(|e| CustomResult::error(Some(format!("{} 索引类型转换失败：{}", i, e)), None))?;
            
            // 检查当前窗口是否为我们要找的桌面窗口
            // 通过比较窗口句柄来确认
            let item_hwnd = web_browser.HWND().
                map_err(|e| CustomResult::error(Some(format!("{} 比较窗口句柄失败：{}", i, e)), None))?;

            if item_hwnd.0 != hwnd.0 as isize {
                continue; // 不是目标窗口，继续查找下一个
            }
            
            // 找到桌面窗口后，获取其中选中的文件
            return get_selected_files(&web_browser);
        }
    }

    Err(
        CustomResult::error(Some("未找到Shell窗口".to_string()), None)
    )
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
        let document = web_browser.Document().
            map_err(|e| CustomResult::error(Some(format!("获取文档对象失败：{}", e)), None))?;
        
        // 将文档对象转换为文件夹视图接口
        // IShellFolderViewDual3 提供了操作文件夹视图的方法
        let folder_view: IShellFolderViewDual3 = document.cast().
            map_err(|e| CustomResult::error(Some(format!("转换视图接口失败：{}", e)), None))?;
        
        // 获取当前选中的文件项集合
        let selected_items = folder_view.SelectedItems().map_err(|e| CustomResult::error(Some(format!("获取选中文件项集合失败：{}", e)), None))?;
        
        // 获取选中项的数量
        let count = selected_items.Count().map_err(|e| CustomResult::error(Some(format!("获取选中项数量失败：{}", e)), None))?;
        
        // 没有选中文件，返回空数组
        if count == 0 {
            return Ok(CustomResult::success(None, Some(json!([]))))
        }
        
        // 收集所有选中文件的路径
        let mut paths = Vec::new();
        for i in 0..count {
            // 获取第 i 个选中的文件项
            let item = selected_items.Item(&VARIANT::from(i)).map_err(|e| CustomResult::error(Some(format!("{} 获取文件失败：{}", i, e)), None))?;
            
            // 获取文件项的完整路径
            let path = item.Path().
                map_err(|e| CustomResult::error(Some(format!("{} 获取完整路径失败：{}", i, e)), None))?.to_string();
            paths.push(path);
        }
        
        return Ok(CustomResult::success(None, Some(json!(paths))))
    }
}