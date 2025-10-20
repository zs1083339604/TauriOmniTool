<script setup lang="ts">
    import { ref } from 'vue';
    import { Search } from '@element-plus/icons-vue'
    import { useCapabilityStore } from '../stores/capability';
    import { ElMessage } from 'element-plus';
    import mitter from '@/utils/mitt'

    const capabilityStore = useCapabilityStore();

    const searchVal = ref("");
    // 最近添加功能列表
    const lastAddList = ref([]);
    // 收藏功能列表
    const starList = ref([]);
    // 最近使用的列表
    const recentlyList = ref([]);

    // 获取最近添加
    capabilityStore.getCapabilityByLastAdd().forEach(item => {
        lastAddList.value.push(item);
    })

    // 获取收藏
    capabilityStore.getCapabilityByStar(10).forEach(item => {
        starList.value.push(item);
    })

    // 获取最近访问
    capabilityStore.getCapabilityByRecently(10).then((result)=>{
        result.forEach(item => {
            recentlyList.value.push(item)
        });
    }).catch((error)=>{
        ElMessage.error(error);
    })

    const handelSuggestions = (queryString, callback) => {
        const item = capabilityStore.getCapabilitiesByKeyWord(queryString);
        callback(item)
    }

    const handleSelect = (data) => {
        selectCapability(data.id);
    }

    const selectCapability = (id) => {
        mitter.emit('capabilitySkip', {id: id})
    }
</script>

<template>
    <div id="home">
        <!-- 搜索区域 -->
        <section class="home-search-section">
            <h1 class="home-search-title">一站式电脑工具解决方案</h1>
            <p class="home-search-subtitle">集合各类实用工具，提升您的电脑使用体验</p>
            <div class="home-search-box">
                <el-autocomplete
                    v-model="searchVal"
                    :fetch-suggestions="handelSuggestions"
                    popper-class="my-autocomplete"
                    placeholder="搜索工具或功能..."
                    size="large"
                    @select="handleSelect"
                >
                    <template #prefix>
                        <el-icon class="el-input__icon">
                            <search />
                        </el-icon>
                    </template>
                    <template #default="{ item }">
                        <div class="home-capability-item">
                            <div class="home-capability-icon" v-html="item.icon"></div>
                            <div class="home-capability-right-box">
                                <p class="home-capability-title">{{ item.name }}</p>
                                <p class="home-capability-desc">{{ item.desc }}</p>
                            </div>
                        </div>
                    </template>
                </el-autocomplete>
            </div>
        </section>
        <h2 class="section-title">功能分类</h2>
        <div class="categories-grid">
            <!-- 最近使用 -->
            <div class="category-card">
                <div class="card-header">
                    <div class="card-icon">
                        <el-icon><Files /></el-icon>
                    </div>
                    <div>
                        <div class="card-title">最近使用</div>
                        <div class="card-desc">十个最近使用的功能</div>
                    </div>
                </div>
                <div class="card-content">
                    <ul class="tools-list">
                        <li class="tool-item" v-for="item in recentlyList">
                            <span class="tool-name" @click="selectCapability(item.id)">{{ item.name }}</span>
                        </li>
                    </ul>
                </div>
            </div>
            <!-- 最近收藏 -->
            <div class="category-card">
                <div class="card-header">
                    <div class="card-icon">
                        <el-icon><StarFilled /></el-icon>
                    </div>
                    <div>
                        <div class="card-title">最近收藏</div>
                        <div class="card-desc">十个最近收藏的功能</div>
                    </div>
                </div>
                <div class="card-content">
                    <ul class="tools-list">
                        <li class="tool-item" v-for="item in starList">
                            <span class="tool-name" @click="selectCapability(item.id)">{{ item.name }}</span>
                        </li>
                    </ul>
                </div>
            </div>
            <!-- 最新添加 -->
            <div class="category-card">
                <div class="card-header">
                    <div class="card-icon">
                        <el-icon><Money /></el-icon>
                    </div>
                    <div>
                        <div class="card-title">最新添加</div>
                        <div class="card-desc">十个最新添加的功能</div>
                    </div>
                </div>
                <div class="card-content">
                    <ul class="tools-list">
                        <li class="tool-item" v-for="item in lastAddList">
                            <span class="tool-name" @click="selectCapability(item.id)">{{ item.name }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    /* 搜索区域 */
    .home-search-section {
        background: white;
        border-radius: 16px;
        padding: 40px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        margin-bottom: 40px;
        text-align: center;
    }

    .home-search-title {
        font-size: 32px;
        margin-bottom: 15px;
        color: #2c3e50;
    }

    .home-search-subtitle {
        font-size: 16px;
        color: #7f8c8d;
        margin-bottom: 30px;
    }

    .home-search-box {
        max-width: 800px;
        margin: 0 auto;
    }

    /* 功能分类区域 */
    .section-title {
        font-size: 24px;
        margin: 40px 0 20px;
        color: #2c3e50;
        position: relative;
        padding-left: 15px;
    }
    
    .section-title::before {
        content: '';
        position: absolute;
        left: 0;
        top: 5px;
        height: 20px;
        width: 5px;
        background: linear-gradient(to bottom, #3498db, #8e44ad);
        border-radius: 3px;
    }
    
    .categories-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 25px;
        margin-bottom: 40px;
    }
    
    .category-card {
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .category-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
    }
    
    .card-header {
        padding: 25px 20px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .card-icon {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        background-color: #409EFF;
    }
    
    .card-title {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
    }
    
    .card-desc {
        font-size: 14px;
        color: #7f8c8d;
        margin-top: 5px;
    }
    
    .card-content {
        padding: 0 20px 20px;
    }
    
    .tools-list {
        list-style: none;
    }
    
    .tool-item {
        padding: 10px 0;
        border-bottom: 1px solid #f1f2f6;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .tool-item:last-child {
        border-bottom: none;
    }
    
    .tool-name {
        font-size: 14px;
    }
    
    .tool-hot {
        background: #e74c3c;
        color: white;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 10px;
    }
</style>

<style>
    .home-capability-item{
        display: flex;
        padding-top: 10px;
    }

    .home-capability-icon .capabilityIcon{
        width: 40px;
        height: 40px;
        border-radius: 5px;
        display: block;
        text-align: center;
        font-size: 18px;
        margin-right: 10px;
    }

    .home-capability-title{
        font-size: 16px;
        margin-top: -8px;
    }

    .home-capability-desc{
        font-size: 12px;
        color: #909399;
        margin-top: -12px;
    }
</style>