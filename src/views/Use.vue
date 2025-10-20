<script setup lang="ts">
    import { ref, computed, onMounted, watch, markRaw, reactive } from 'vue'
    import { useRoute, useRouter } from 'vue-router'
    import { useCapabilityStore } from '../stores/capability'
    import { Back, Setting, Key, Unlock, Star, StarFilled } from '@element-plus/icons-vue'
    import { error as errorLog } from '@tauri-apps/plugin-log'
    import { formatObjectString } from '../utils/function'
    import ShortcutCapture from '../components/common/Shortcut.vue'
    import { ElMessage } from 'element-plus'
    import { useShortcutStore } from '../stores/shortcut'
    import Fileselect from '../components/common/Fileselect.vue'
    
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

    // 文件选择默认列表
    const selectFile = ref([]);

    // 文件是否选择完成，要加载组件了
    const isLoadComponent = ref(false);

    // 功能文件选择的默认配置对象
    const defaultFileSelectOption = reactive({
        selectData: 'file',
        allowedExtensions: '*',
        multiple: true,
        maxFiles: 0,
    });

    // 文件选择器的ref
    const fileSelectRef = ref(null);
    // 已经选择的文件，用于传值到热组件
    const selectedFiles = ref([]);

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

            // 判断是否是快捷键进来的
            if(route.query.shortcut == 'true'){
                const data = JSON.parse(localStorage.getItem("shortcutData"));
                if(data.code == 200){
                    selectFile.value.length = 0;
                    data.data.forEach(item => {
                        selectFile.value.push(item);
                    });
                }else{
                    ElMessage.warning("无法获取选中文件：" + data.msg);
                }
            }
            
            // 动态导入组件
            const module = await import(
                /* @vite-ignore */
                `../components/modules/${currentCapability.value.component}`
            )

            // 加载完成后，将此ID添加到最近使用
            capabilityStore.addCapabilityByRecently(capabilityId);
            
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
        fileList: selectedFiles.value
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

    // 绑定快捷键
    const handleShortcutCaptured = (shortcut) => {
        if(currentCapability.value){
            shortcutStore.add(shortcut, currentCapability.value.id).then(()=>{
                currentShortcut.value = shortcutStore.getKeyByCapabilityId(currentCapability.value.id);
                ElMessage.success("绑定成功")
            }).catch((error)=>{
                ElMessage.warning(error);
            })
        }
    }

    // 解除快捷键绑定
    const unlockShortcut = ()=>{
        if(currentCapability.value){
            shortcutStore.unlock(currentCapability.value.id).then(()=>{
                currentShortcut.value = null;
                ElMessage.success("解绑成功")
            }).catch((error)=>{
                ElMessage.warning(error);
            })
        }
    }

    // 收藏或取消收藏 
    const handleStarClick = () => {
        capabilityStore.switchCapabilityStarTypeById(currentCapability.value.id).then((msg)=>{
            ElMessage.success(msg);
        }).catch((error)=>{
            ElMessage.warning(error);
        })
    }

    // 下一步的点击
    const nextStep = ()=>{
        if(fileSelectRef.value){
            const list = fileSelectRef.value.fileList;
            if(list.length == 0){
                ElMessage.warning("请至少选择1个文件");
                return;
            }
            selectedFiles.value.length = 0;
            list.forEach(item => {
                selectedFiles.value.push(item);
            });
            isLoadComponent.value = true
        }else{
            ElMessage.error("无法获取到文件选择器的Ref")
        }
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
                <!-- 收藏 -->
                <template v-if="currentCapability">
                    <el-tooltip content="收藏" v-if="!capabilityStore.isStarByCapabilityID(currentCapability.id)">
                        <el-button type="success" :icon="Star" circle @click="handleStarClick"/>
                    </el-tooltip>
                    <el-tooltip content="取消收藏" v-else>
                        <el-button type="warning" :icon="StarFilled" circle @click="handleStarClick"/>
                    </el-tooltip>
                </template>
                

                <!-- 解绑快捷键 -->
                <template v-if="currentShortcut">
                    <el-tooltip content="解除快捷键绑定">
                        <el-button 
                            type="warning"
                            :icon="Unlock"
                            circle
                            @click="unlockShortcut"
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

        <!-- 加载框 -->
        <template v-if="loading">
            <div class="loading">加载中...</div>
        </template>
        <!-- 加载、完成或失败 -->
        <template v-else>
            <!-- 加载出错 -->
            <template v-if="error">
                <div class="error">加载组件时出错: {{ error }}</div>
            </template>
            <!-- 加载成功 -->
            <template v-else>
                <!-- 点击下一步之前 -->
                <template v-if="!isLoadComponent">
                    <Fileselect 
                        ref="fileSelectRef"
                        :defaultFiles="selectFile" 
                        class="file-select-box"
                        :allowedExtensions = "currentCapability && currentCapability.allowedExtensions ? currentCapability.allowedExtensions : defaultFileSelectOption.allowedExtensions"
                        :multiple = "currentCapability && currentCapability.multiple ? currentCapability.multiple : defaultFileSelectOption.multiple"
                        :directory = "currentCapability && currentCapability.selectData ? currentCapability.selectData == 'directory' : defaultFileSelectOption.selectData == 'directory'"
                        :maxFiles = "currentCapability && currentCapability.maxFiles ? currentCapability.maxFiles : defaultFileSelectOption.maxFiles"
                    />
                    <el-button type="primary" @click="nextStep">下一步</el-button>
                </template>
                <!-- 点击下一步后 -->
                <template v-else>
                    <component 
                        class="component-box"
                        :is="dynamicComponent" 
                        v-bind="componentProps"
                    />
                </template>
            </template>
        </template>

        <!-- 快捷键 -->
        <ShortcutCapture
            ref="shortcutCaptureRef"
            @shortcut-captured="handleShortcutCaptured"
        />
    </div>
</template>

<style scoped>
    .use-box{
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
    }

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

    .file-select-box{
        flex-grow: 1;
        margin-bottom: 15px;
    }

    .component-box{
        flex-grow: 1;
    }
</style>