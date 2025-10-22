<script setup lang="ts">
    import { reactive, ref, toRaw } from 'vue';
    import AiOptions from '../components/common/AiOptions.vue';
    import { useOptionsStore } from '../stores/options';
    import { ElMessage } from 'element-plus';

    const optionsStore = useOptionsStore();
    const softOptionForm = reactive({
        softNextRule: 'manual'
    })

    // 根据数据库中的配置信息，同步到响应式数据中
    const syncOption = ()=>{
        for (const key in softOptionForm) {
            if (Object.prototype.hasOwnProperty.call(softOptionForm, key)) {
                const element = softOptionForm[key];
                const data = optionsStore.getOptionByKey(key);
                if(data.index != -1 && data.data.val != element){
                    softOptionForm[key] = data.data.val;
                }
            }
        }
    }

    // 保存设置
    const saveOptions = ()=>{
        optionsStore.saveOptions(0, 'soft', toRaw(softOptionForm)).then((result)=>{
            if(result.length != 0){
                ElMessage.warning({
                    dangerouslyUseHTMLString: true,
                    message: `${result.length} 个配置保存失败: <br />${result.join("<br />")}`
                })
            }else{
                ElMessage.success("保存成功");
            }
        }).catch(()=>{})
    }

    syncOption()
</script>

<template>
    <div class="options-box">
        <el-tabs type="border-card">
            <el-tab-pane label="软件设置">
                <div class="ai-prompt-option-box">
                    <el-form label-width="80px">
                        <el-form-item label="前进规则">
                            <el-radio-group v-model="softOptionForm.softNextRule">
                                <el-radio value="manual" border>手动点击</el-radio>
                                <el-radio value="auto" border>自动进入下一步 (选择文件后)</el-radio>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="saveOptions">保存软件设置</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </el-tab-pane>
            <el-tab-pane label="AI设置"><AiOptions /></el-tab-pane>
        </el-tabs>
    </div>
</template>

<style scoped>
    
</style>