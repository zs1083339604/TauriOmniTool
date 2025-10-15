<script setup lang="ts">
    import { ref, computed, onMounted, watch, markRaw } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { useCapabilityStore } from '@/stores/capability'
    import { Back, Setting, Key, Unlock } from '@element-plus/icons-vue'
    import { error as errorLog } from '@tauri-apps/plugin-log'
    import { formatObjectString } from '@/utils/function'
    import ShortcutCapture from '../components/common/Shortcut.vue'
    import { ElMessage } from 'element-plus'
    import { useShortcutStore } from '../stores/shortcut'
    
    const route = useRoute()
    const router = useRouter();

    const capabilityStore = useCapabilityStore();
    const shortcutStore = useShortcutStore();

    const loading = ref(true)
    const error = ref(null)
    const currentCapability = ref(null)
    // 设置快捷键Dom引用
    const shortcutCaptureRef = ref(null)
    // 当前快捷键
    const currentShortcut = ref(null);

    // 获取查询参数
    const shortcut = computed(() => {
        return route.query.shortcut === 'true'
    })

    // 动态加载组件
    const loadComponent = async () => {
        try {
            loading.value = true
            error.value = null
            
            const capabilityId = route.params.id
            currentCapability.value = capabilityStore.getCapabilityById(capabilityId);
            
            if (!currentCapability.value) {
                throw new Error(`未找到 ID 为 ${capabilityId} 的能力项`)
            }

            // 获取快捷键信息
            currentShortcut.value = shortcutStore.getKeyByCapabilityId(capabilityId);
            
            // 动态导入组件
            const module = await import(
                /* @vite-ignore */
                `../components/modules/${currentCapability.value.component}`
            )
            
            dynamicComponent.value = markRaw(module.default || module)
        } catch (err) {
            errorLog(formatObjectString("加载组件失败: ", err))
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    const dynamicComponent = ref(null)

    // 传递给动态组件的 props
    const componentProps = computed(() => ({
        capabilityId: currentCapability.value.id,
        shortcut: shortcut.value,
    }))

    // 监听路由变化
    watch([() => route.params.id, () => route.query.shortcut], () => {
        loadComponent()
    })

    const handleClick = ()=>{
        router.back();
    }

    // 组件挂载时加载
    onMounted(() => {
        loadComponent()
    })

    // 格式化快捷键显示
    const formatShortcutDisplay = (shortcut) => {
        return shortcut.split('+')
            .map(key => key.charAt(0).toUpperCase() + key.slice(1))
            .join(' + ')
    }

    const handleShortcutCaptured = (shortcut) => {
        if(currentCapability.value){
            shortcutStore.add(shortcut, currentCapability.value.id).then(()=>{
                ElMessage.success("绑定成功")
            }).catch((error)=>{
                ElMessage.warning(error);
            })
        }
    }

    const handleCaptureCancel = () => {
        ElMessage.info('已取消快捷键设置')
    }
</script>

<template>
    <div class="use-box">
        <div class="use-breadcrumb-box">
            <!-- 返回按钮和当前位置 -->
            <div class="breadcrumb-left">
                <el-button :icon="Back" circle @click="handleClick" />
                <div class="location-info">
                    <span class="location-label">当前位置：</span>
                    <span class="location-value">{{ currentCapability ? currentCapability.name : '未知' }}</span>
                </div>
            </div>

            <!-- 快捷键及设置信息 -->
            <div class="shortcut-info">
                <!-- 解绑快捷键 -->
                <template v-if="currentShortcut">
                    <el-tooltip content="解除快捷键绑定">
                        <el-button 
                            type="warning"
                            :icon="Unlock"
                            circle
                        ></el-button>
                    </el-tooltip>
                </template>

                <!-- 当前快捷键显示 -->
                <div class="current-shortcut">
                    <el-tooltip content="当前绑定的快捷键">
                        <div class="shortcut-display">
                            <el-icon><Key /></el-icon>
                            <span class="shortcut-keys" 
                                :class="{bindSuccess: currentShortcut ? !currentShortcut.bindSuccess : false}"
                            >
                                {{ currentShortcut ? formatShortcutDisplay(currentShortcut.key) : '无' }}
                            </span>
                        </div>
                    </el-tooltip>
                </div>

                <!-- 设置快捷键按钮 -->
                <el-tooltip content="绑定快捷键">
                    <el-button 
                        :icon="Key"
                        @click="shortcutCaptureRef?.startCapture()"
                        circle
                    ></el-button>
                </el-tooltip>
                <!-- 该功能的设置按钮 -->
                <template v-if="currentCapability && currentCapability.showSetting">
                    <el-tooltip content="功能设置">
                        <el-button type="primary"  :icon="Setting" circle title="功能设置"></el-button>
                    </el-tooltip>
                </template>
            </div>
        </div>

        <ShortcutCapture
            ref="shortcutCaptureRef"
            @shortcut-captured="handleShortcutCaptured"
            @cancel="handleCaptureCancel"
        />
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="error" class="error">加载组件时出错: {{ error }}</div>
        <component 
            v-else 
            :is="dynamicComponent" 
            v-bind="componentProps"
        />
    </div>
</template>

<style scoped>
    .use-breadcrumb-box {
        width: 100%;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 12px;
        border: 1px solid #e1e5e9;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        box-sizing: border-box;
    }

    .breadcrumb-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .location-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .location-label {
        color: #6c757d;
        font-size: 14px;
        font-weight: 500;
    }

    .location-value {
        color: #495057;
        font-size: 16px;
        font-weight: 600;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .shortcut-info {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .current-shortcut {
        background: white;
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid #e1e5e9;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .current-shortcut:hover {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
    }

    .shortcut-display {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
    }

    .shortcut-keys {
        color: #495057;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background: #f8f9fa;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #dee2e6;
    }

    .shortcut-keys.bindSuccess{
        background-color: #f56c6c;
        color: #fff;
    }

    .loading, .error {
        text-align: center;
        padding: 40px;
        font-size: 16px;
    }

    .error {
        color: #f56c6c;
    }
</style>