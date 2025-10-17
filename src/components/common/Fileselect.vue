<script setup>
    // 拖拽获取真实文件路径的代码参考自，稀土掘金-阿阳热爱前端：https://juejin.cn/post/7504915376901455935

    import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
    import { onMounted, ref, useTemplateRef, onUnmounted } from 'vue'
    import { Delete, Document, UploadFilled } from '@element-plus/icons-vue'
    import { ElMessage } from 'element-plus'
    import { formatObjectString } from '../../utils/function'
    import { error as errorLog } from '@tauri-apps/plugin-log'
    import { open } from '@tauri-apps/plugin-dialog';
    import { invoke } from '@tauri-apps/api/core'

    const props = defineProps({
        // 允许的文件扩展名
        allowedExtensions: {type: String, default: "*"},
        // 是否允许多选
        multiple: {type: Boolean, default: true},
        // 是否是文件夹的选择
        directory: {type: Boolean, default: false},
        // 文件数量限制 0表示无限制
        maxFiles: {
            type: Number,
            default: 0,
            validator: (value) => {
                return value >= 0
            }
        }
    });

    // 拖放区域的引用
    const dropRef = useTemplateRef('drop');
    // 是否允许拖放
    const dragenter = ref(false)
    // 文件列表
    const fileList = ref([])
    // 被拒绝的文件列表
    const rejectedFiles = ref([])
    // tauri拖拽事件的卸载函数
    let unlisten = null;

    // 移除文件
    const removeFile = (index) => {
        fileList.value.splice(index, 1)
    }

    // 添加文件
    const addFiles = (paths) => {
        const { valid, invalid } = filterFilesByExtension(paths)
  
        // 记录被拒绝的文件
        if (invalid.length > 0) {
            rejectedFiles.value = [...rejectedFiles.value, ...invalid]
        }

        // 添加有效文件（包含重复检测）
        const newFiles = valid.filter(path => 
            !fileList.value.includes(path)
        )
        
        if (newFiles.length > 0) {
            let isAdd = true;
            // 判断是否是多选
            if(props.multiple){
                // 判断文件的数量是否达到限制
                const fileCount = fileList.value.length + newFiles.length;
                // 计算差值
                const diffCount = props.maxFiles === 0 ? false : props.maxFiles - fileCount;
                if(diffCount !== false){
                    if(fileList.value.length === props.maxFiles){
                        // 文件数量已经达到了限制，禁止添加，并提示用户
                        isAdd = false;
                    }else if(diffCount < 0){
                        // 如果有文件数量的限制，判断数量是否到了限制
                        // 到了限制，限制newFiles的length
                        newFiles.length = newFiles.length + diffCount;
                    }
                }
            }else{
                // 如果不是多选
                // 判断是否有文件了
                if(fileList.value.length >= 1){
                    isAdd = false;
                }else{
                    // 如果不是多选并且列表中没有文件，newFiles的length只能为1，否则拖拽还是会添加多个文件
                    newFiles.length = 1;
                }
            }

            if(isAdd){
                fileList.value = [...fileList.value, ...newFiles]
                ElMessage.success(`成功添加 ${newFiles.length} 个文件`)
            }else{
                ElMessage.warning('文件数量已达上限')
            }
        }

        // 如果有被拒绝的文件，显示提示
        if (invalid.length > 0) {
            showRejectedFilesAlert(invalid);
        } else if (paths.length > 0 && newFiles.length === 0) {
            ElMessage.warning('文件已存在列表中')
        }
    }

    // 移除全部
    const clearAll = () => {
        fileList.value = []
    }

    // 过滤文件扩展名
    const filterFilesByExtension = (paths) => {
        // * 全部允许
        if (props.allowedExtensions === '*') {
            return { valid: paths, invalid: [] }
        }
        
        const extensions = props.allowedExtensions.split(',').map(ext => 
            ext.trim().toLowerCase().replace(/^\./, '')
        )
        
        const valid = []
        const invalid = []
        
        paths.forEach(path => {
            const fileExt = path.split('.').pop()?.toLowerCase() || ''
            
            if (extensions.includes(fileExt) || extensions.includes('*')) {
                valid.push(path)
            } else {
                invalid.push(path)
            }
        })
        
        return { valid, invalid }
    }

    // 显示被拒绝文件的警告
    const showRejectedFilesAlert = (invalidFiles) => {
        const fileNames = invalidFiles.map(path => path.split(/[\\/]/).pop()).join('<br />')
        const allowedExts = props.allowedExtensions === '*' ? '所有类型' : props.allowedExtensions
        
        ElMessage.warning({
            dangerouslyUseHTMLString: true,
            message: `${invalidFiles.length} 个文件类型不被支持: <br />${fileNames}<br /> 允许的类型: ${allowedExts}`
        })
    }

    // 点击选择文件
    const clickSelectFiles = async ()=>{
        try {
            console.log(props.allowedExtensions.split(","))
            let files = await open({
                title: props.directory ? '选择文件夹' : '选择文件',
                multiple: props.multiple,
                directory: props.directory,
                filters: [
                    {name: 'File', extensions: props.allowedExtensions.split(",")}
                ]
            });

            if(typeof files == 'string'){
                // 如果是string，转为数组，否则addFiles中无法判断
                files = [files];
            }

            addFiles(files || [])
        } catch (error) {
            const info = formatObjectString("选择文件失败：", error);
            errorLog(info);
            ElMessage.error(info)
        }
        
    }

    onMounted(() => {
        getCurrentWebviewWindow().onDragDropEvent(({ payload }) => {
            const { type } = payload;

            if (type === 'over') {
                const { x, y } = payload.position

                if (dropRef.value) {
                    const { left, right, top, bottom } = dropRef.value.getBoundingClientRect()

                    const inBoundsX = x >= left && x <= right
                    const inBoundsY = y >= top && y <= bottom

                    dragenter.value = inBoundsX && inBoundsY
                }
            } else if (type === 'drop' && dragenter.value) {
                dragenter.value = false
                // 只在拖拽这里判断文件或文件夹就行，点击选择是弹出的对话框，不会出现要求文件，却选择了文件夹的情况，以后遇到的话在转移
                invoke('files_or_directory', {paths: payload.paths}).then((result)=>{
                    const { files, folders } = result.data;
                    let paths = files;

                    if(props.directory){
                        // 如果是文件夹
                        paths = folders;
                        if(paths.length == 0 && files.length != 0){
                            // 允许的是文件夹，但拖入的是文件
                            ElMessage.warning("请将文件夹拖入此处，而非文件");
                        }else if(files.length != 0){
                            ElMessage.warning({
                                dangerouslyUseHTMLString: true,
                                message: `${files.length} 个文件未添加: <br />${files.join('<br />')}`
                            })
                        }
                    }else{
                        if(paths.length == 0 && folders.length != 0){
                            // 允许的是文件，但拖入的文件夹
                            ElMessage.warning("请将文件拖入此处，而非文件夹");
                        }else if(folders.length != 0){
                            ElMessage.warning({
                                dangerouslyUseHTMLString: true,
                                message: `${folders.length} 个文件未添加: <br />${folders.join('<br />')}`
                            })
                        }
                    }

                    addFiles(paths || [])
                }).catch((error)=>{
                    const info = formatObjectString("拖拽添加文件失败：", error);
                    ElMessage.error(info);
                    errorLog(info);
                });
                
            } else {
                dragenter.value = false
            }
        }).then((unListenFn)=>{
            unlisten = unListenFn;
        }).catch((error)=>{
            const info = formatObjectString("绑定Tauri拖放事件失败：", error);
            errorLog(info);
            ElMessage.error(info);
        })
    })

    onUnmounted(()=>{
        if(unlisten){
            // 卸载时清理
            unlisten();
        }
    })

    // 格式化文件名（提取文件名）
    const getFileName = (path) => {
        return path.split(/[\\/]/).pop() || path
    }

    // 格式化显示路径（中间省略）
    const formatPath = (path, maxLength = 30) => {
        if (path.length <= maxLength) return path
        
        const half = Math.floor(maxLength / 2) - 2
        return path.substring(0, half) + '...' + path.substring(path.length - half)
    }
</script>

<template>
    <div class="file-selector-container">
        <!-- 主内容区域 -->
        <div class="main-content">
            <!-- 左侧拖拽区域 -->
            <div class="drop-zone" :class="{ 'drop-zone--active': dragenter }" ref="drop" @click="clickSelectFiles">
                <div class="drop-content">
                    <el-icon class="drop-icon" :size="48">
                        <UploadFilled />
                    </el-icon>
                    <h3 class="drop-title">
                        {{ dragenter ? '释放文件' : '拖放文件到此处' }}
                    </h3>
                    <p class="drop-desc">或点击选择</p>
                </div>
            </div>

            <!-- 右侧文件列表 -->
            <div class="file-list-panel">
                <div class="panel-header">
                    <span class="panel-title">已选择文件</span>
                    <el-button v-if="fileList.length > 0" type="danger" text size="small" @click="clearAll">
                        清空
                    </el-button>
                </div>

                <div class="file-list-container">
                    <div v-for="(filePath, index) in fileList" :key="index" class="file-item">
                        <el-icon class="file-icon">
                            <Document />
                        </el-icon>
                        <div class="file-info">
                            <div class="file-name" :title="getFileName(filePath)">
                                {{ getFileName(filePath) }}
                            </div>
                            <div class="file-path" :title="filePath">
                                {{ formatPath(filePath) }}
                            </div>
                        </div>
                        <el-button class="delete-btn" type="danger" :icon="Delete" circle size="small"
                            @click="removeFile(index)" />
                    </div>

                    <div v-if="fileList.length === 0" class="empty-state">
                        <el-icon class="empty-icon">
                            <Document />
                        </el-icon>
                        <p class="empty-text">暂无文件</p>
                    </div>
                </div>

                <div v-if="fileList.length > 0" class="file-count">
                    共 {{ fileList.length }} 个文件
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .file-selector-container {
        width: 100%;
        height: 400px;
        box-sizing: border-box;
    }

    .main-content {
        display: flex;
        gap: 20px;
        height: 100%;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        overflow: hidden;
    }

    /* 拖拽区域样式 */
    .drop-zone {
        flex: 1;
        border: 2px dashed #dcdfe6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
    }

    .drop-zone::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(64, 158, 255, 0.05);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .drop-zone:hover::before {
        opacity: 1;
    }

    .drop-zone:hover {
        border-color: #409eff;
        background: #f0f7ff;
    }

    .drop-zone--active {
        border-color: #409eff;
        background: #ecf5ff;
        border-style: solid;
    }

    .drop-zone--active::before {
        opacity: 1;
    }

    .drop-content {
        text-align: center;
        padding: 40px;
    }

    .drop-icon {
        color: #c0c4cc;
        margin-bottom: 16px;
        transition: color 0.3s ease;
    }

    .drop-zone:hover .drop-icon,
    .drop-zone--active .drop-icon {
        color: #409eff;
    }

    .drop-title {
        margin: 0 0 8px 0;
        color: #606266;
        font-size: 18px;
        font-weight: 600;
        transition: color 0.3s ease;
    }

    .drop-zone:hover .drop-title,
    .drop-zone--active .drop-title {
        color: #409eff;
    }

    .drop-desc {
        margin: 0;
        color: #909399;
        font-size: 14px;
    }

    /* 文件列表面板样式 */
    .file-list-panel {
        width: 300px;
        display: flex;
        flex-direction: column;
        background: #f8f9fa;
        border-left: 1px solid #e4e7ed;
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: white;
        border-bottom: 1px solid #e4e7ed;
    }

    .panel-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
    }

    .file-list-container {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
    }

    .file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        margin-bottom: 8px;
        border: 1px solid #e4e7ed;
        transition: all 0.3s ease;
        position: relative;
    }

    .file-item:hover {
        border-color: #409eff;
        box-shadow: 0 2px 6px rgba(64, 158, 255, 0.1);
    }

    .file-item:hover .delete-btn {
        opacity: 1;
    }

    .file-icon {
        color: #409eff;
        font-size: 18px;
        flex-shrink: 0;
    }

    .file-info {
        flex: 1;
        min-width: 0;
    }

    .file-name {
        font-weight: 500;
        color: #303133;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .file-path {
        font-size: 12px;
        color: #909399;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .delete-btn {
        opacity: 0;
        transition: opacity 0.3s ease;
        flex-shrink: 0;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #c0c4cc;
    }

    .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
    }

    .empty-text {
        margin: 0;
        font-size: 14px;
        color: #909399;
    }

    .file-count {
        padding: 12px 20px;
        background: white;
        border-top: 1px solid #e4e7ed;
        text-align: center;
        color: #909399;
        font-size: 14px;
    }
</style>