<script setup lang="ts">
    import { ref, onMounted } from 'vue';
    import AiChat from '../../common/AiChat.vue';
    import { formatObjectString } from '../../../utils/function'
    import { warn } from '@tauri-apps/plugin-log';
    import { ElMessage } from 'element-plus';

    // 定义 props
    const props = defineProps({
        capabilityId: {
            type: Number,
            required: true
        },
        shortcut: {
            type: Boolean,
            default: false
        },
        fileList: {
            type: Array,
            required: true
        }
    })

    const aiChatRef = ref(null);

    // 使用参数
    console.log('组件接收到的参数:')
    console.log('能力项:', props.capabilityId)
    console.log('快捷模式:', props.shortcut)
    console.log('文件列表:', props.fileList)

    onMounted(()=>{
        if(aiChatRef.value){
            aiChatRef.value.run('aa111211111s111111111111111111111111211q111112221a').then((result)=>{
                console.log(result)
            }).catch((error)=>{
                const errorInfo = formatObjectString("AI聊天失败", error);
                warn(errorInfo);
                ElMessage.error(errorInfo)
            })
        }
    })
</script>

<template>
    <div class="rename-box">
        bbbb
        <AiChat ref="aiChatRef" />
    </div>
</template>

<style scoped>
    
</style>