<script setup lang="ts">
    import { ref, onUnmounted } from 'vue'
    import { Key, InfoFilled } from '@element-plus/icons-vue'

    // 定义 props 和 emit
    const emit = defineEmits(['shortcut-captured', 'cancel'])

    const isCapturing = ref(false)
    const currentKeys = ref([])

    // 键盘事件处理
    const pressedKeys = new Set()

    const handleKeyDown = (event) => {
        if (!isCapturing.value) return
        
        event.preventDefault()
        event.stopPropagation()

        const key = event.key.toLowerCase()
        
        // 过滤掉重复按键
        if (pressedKeys.has(key)) return
        
        pressedKeys.add(key)
        updateCurrentKeys()
    }

    const handleKeyUp = (event) => {
        if (!isCapturing.value) return
        
        const key = event.key.toLowerCase()
        pressedKeys.delete(key)
        
        // 如果所有键都松开，完成捕获
        if (pressedKeys.size === 0 && currentKeys.value.length > 0) {
            // 是否自动完成，待定
            console.log("所有按键松开了")
        }
    }

    const updateCurrentKeys = () => {
        currentKeys.value = Array.from(pressedKeys)
            .filter(key => key !== ' ' || key !== 'space') // 过滤空格
            .map(key => key === ' ' ? 'space' : key) // 将空格转换为 'space'
    }

    // 格式化显示按键
    const formatKey = (key) => {
        const keyMap = {
            'control': 'Ctrl',
            'meta': 'Cmd',
            'alt': 'Alt',
            'shift': 'Shift',
            'escape': 'Esc',
            ' ': 'Space',
            'space': 'Space',
            'arrowup': '↑',
            'arrowdown': '↓',
            'arrowleft': '←',
            'arrowright': '→'
        }
        
        return keyMap[key] || key.toUpperCase()
    }

    // 开始捕获
    const startCapture = () => {
        isCapturing.value = true
        currentKeys.value = []
        pressedKeys.clear()
        
        // 添加事件监听
        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('keyup', handleKeyUp)
    }

    // 取消捕获
    const cancelCapture = () => {
        emit('cancel')
        closePage();
    }

    // 确认快捷键
    const confirmShortcut = () => {
        if (currentKeys.value.length > 0) {
            const shortcut = currentKeys.value.map(n => {
                // Ctrl需要特殊处理
                if(n == "control"){
                    return 'CommandOrControl'
                }
                return n.charAt(0).toUpperCase() + n.slice(1);
            }).join('+')
            emit('shortcut-captured', shortcut)
            closePage();
        }
    }

    // 关闭页面
    const closePage = ()=>{
        isCapturing.value = false
        currentKeys.value = []
        pressedKeys.clear()
        
        // 移除事件监听
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('keyup', handleKeyUp)
    }

    // 暴露方法给父组件
    defineExpose({
        startCapture,
        cancelCapture
    })

    // 清理
    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('keyup', handleKeyUp)
    })
</script>

<template>
    <div class="shortcut-box">
        <el-dialog v-model="isCapturing" :show-close="false" width="500px" align-center class="shortcut-dialog">
            <template #header>
                <div class="dialog-header">
                    <el-icon>
                        <Key />
                    </el-icon>
                    <span>快捷键设置</span>
                </div>
            </template>

            <div class="capture-content">
                <el-alert title="请按下您想要设置的快捷键组合" type="info" :closable="false" show-icon class="mb-4" />

                <div class="key-display">
                    <el-tag v-for="key in currentKeys" :key="key" type="primary" size="large" class="key-tag">
                        {{ formatKey(key) }}
                    </el-tag>

                    <div v-if="currentKeys.length === 0" class="empty-hint">
                        <el-text type="info">等待按键输入...</el-text>
                    </div>
                </div>

                <el-divider />

                <div class="hint-text">
                    <el-text type="info">
                        <el-icon>
                            <InfoFilled />
                        </el-icon>
                        提示：支持组合键（如 Ctrl + A），点击空白处取消
                    </el-text>
                </div>
            </div>

            <template #footer>
                <div class="dialog-footer">
                    <el-button type="primary" :disabled="currentKeys.length === 0" @click.stop="confirmShortcut">
                        确认快捷键
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
    :deep(.shortcut-dialog) {
        .el-dialog__header {
            padding: 20px 20px 10px;
        }
    
        .el-dialog__body {
            padding: 10px 20px;
        }
    }

    .dialog-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
    }

    .capture-content {
        text-align: center;
    }

    .key-display {
        min-height: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 16px;
        border: 2px dashed var(--el-border-color);
        border-radius: 8px;
        margin: 16px 0;
    }

    .key-tag {
        font-size: 14px;
        font-weight: bold;
        padding: 8px 12px;
    }

    .empty-hint {
        color: var(--el-text-color-placeholder);
    }

    .hint-text {
        margin-top: 16px;
    }

    .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    .mb-4 {
        margin-bottom: 16px;
    }
</style>