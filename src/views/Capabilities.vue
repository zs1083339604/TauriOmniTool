<script setup lang="ts">
    import { ref } from 'vue';
    import { useCapabilityStore } from '@/stores/capability';
    import mitter from '@/utils/mitt'

    const capabilityStore = useCapabilityStore();

    const categories = ref([]);
    const selectedCategory = ref('file');
    const capabilityList = ref([]);

    capabilityStore.getCategoryList().forEach(item => {
        categories.value.push(item)
    });

    function reloadCapabilityList(){
        capabilityList.value.length = 0;

        capabilityStore.getCapabilitiesByCategoryId(selectedCategory.value).forEach(item=>{
            capabilityList.value.push(item);
        })
    }

    const selectCategory = (id)=>{
        selectedCategory.value = id;
        reloadCapabilityList();
    };

    const selectCapability = (id) => {
        mitter.emit('capabilitySkip', {id: id})
    }

    reloadCapabilityList();
</script>

<template>
    <div class="capabilities">
        <!-- 页面标题 -->
        <h1 class="page-title">功能库</h1>
        <p class="page-subtitle">精选各类电脑实用工具，提升您的工作效率与电脑使用体验</p>

        <!-- 分类筛选 -->
        <div class="category-filter">
            <button 
                v-for="category in categories" 
                :key="category.id"
                :class="['category-btn', { active: selectedCategory === category.id }]"
                @click="selectCategory(category.id)"
            >
                {{ category.name }}
            </button>
        </div>

        <!-- 工具网格 -->
        <div class="tools-grid">
            <div class="tool-card" @click="selectCapability(item.id)" v-for="item in capabilityList">
                <div class="tool-header">
                    <div class="tool-icon" v-html="item.icon"></div>
                    <div>
                        <div class="tool-title">{{ item.name }}</div>
                        <div class="tool-category">{{ item.categoryName }}</div>
                    </div>
                </div>
                <div class="tool-content">
                    <p class="tool-desc">{{ item.desc }}</p>
                </div>
                <div class="tool-footer">
                    <button class="tool-action">立即使用</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    /* 页面标题 */
    .page-title {
        font-size: 32px;
        margin: 30px 0 20px;
        color: #2c3e50;
        text-align: center;
    }

    .page-subtitle {
        font-size: 16px;
        color: #7f8c8d;
        text-align: center;
        margin-bottom: 40px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    /* 分类筛选 */
    .category-filter {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 40px;
    }

    .category-btn {
        padding: 10px 20px;
        background: white;
        border: none;
        border-radius: 20px;
        font-size: 14px;
        color: #555;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }

    .category-btn:hover {
        background: #f8f9fa;
        transform: translateY(-2px);
    }

    .category-btn.active {
        background: #3498db;
        color: white;
    }

    /* 工具网格 */
    .tools-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 25px;
        margin-bottom: 40px;
    }

    .tool-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .tool-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
    }

    .tool-header {
        padding: 25px 20px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .tool-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
    }

    .tool-title {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
    }

    .tool-category {
        font-size: 14px;
        color: #7f8c8d;
        margin-top: 5px;
    }

    .tool-content {
        padding: 0 20px 20px;
    }

    .tool-desc {
        font-size: 14px;
        color: #555;
        line-height: 1.5;
    }

    .tool-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: #f8f9fa;
        border-top: 1px solid #eaeaea;
    }

    .tool-status {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 12px;
        background: #e8f4fd;
        color: #3498db;
    }

    .tool-status.free {
        background: #e8f6f3;
        color: #2ecc71;
    }

    .tool-status.hot {
        background: #fdedec;
        color: #e74c3c;
    }

    .tool-action {
        padding: 6px 15px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.3s;
    }

    .tool-action:hover {
        background: #2980b9;
    }
</style>

<style>
    .tool-icon .capabilityIcon{
        width: 100%;
        height: 100%;
        text-align: center;
        border-radius: 5px;
        line-height: 50px;
    }
</style>