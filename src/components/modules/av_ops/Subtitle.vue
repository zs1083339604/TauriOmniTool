<script setup lang="ts">
    import { ref } from 'vue';

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

    // 使用参数
    console.log('组件接收到的参数:')
    console.log('能力项:', props.capabilityId)
    console.log('快捷模式:', props.shortcut)
    console.log('文件列表:', props.fileList)
</script>

<template>
    <div class="subtitle-box">
        aaa
    </div>
</template>

<style scoped>
    
</style>