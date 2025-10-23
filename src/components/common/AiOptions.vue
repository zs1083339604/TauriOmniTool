<script setup>
    import { ref, reactive } from 'vue';
    import { ElMessage } from 'element-plus';
    import { Refresh } from '@element-plus/icons-vue'
    import { useOptionsStore } from '../../stores/options';
    import useAiChat from '../../hooks/useAiChat';
    import { ElLoading } from 'element-plus'
    import { formatObjectString } from '../../utils/function';

    const optionsStore = useOptionsStore();
    const { getModelList } = useAiChat();

    // AI平台配置
    const aiModels = {
        ChatGLM: {
            // 是否需要从网络上获取模型
            modelsFormAPI: false,
            // modelsFormAPI = fasle时，才有这个，模型列表
            modelList: [
                { label: 'GLM-4.5-Flash(免费)', value: 'glm-4.5-flash' },
                { label: 'GLM-4-Flash-250414(免费)', value: 'glm-4-flash-250414' },
                { label: 'GLM-4.6', value: 'glm-4.6' },
                { label: 'GLM-4.5', value: 'glm-4.5' },
                { label: 'GLM-4.5-X', value: 'glm-4.5-x' },
                { label: 'GLM-4.5-Air', value: 'glm-4.5-air' },
                { label: 'GLM-4.5-AirX', value: 'glm-4.5-airx' },
                { label: 'GLM-4-Plus', value: 'glm-4-plus' },
                { label: 'GLM-4-Air-250414', value: 'glm-4-air-250414' },
                { label: 'GLM-4-Long', value: 'glm-4-long' },
                { label: 'GLM-4-AirX', value: 'glm-4-airx' },
                { label: 'GLM-4-FlashX', value: 'glm-4-flashx' },
            ]
        },
        DeepSeek: {
            modelsFormAPI: true,
            // modelsFormAPI = true时才有这个，获取模型的配置
            getModelsOption: {
                // api接口地址
                url: 'https://api.deepseek.com/models',
                // 请求方式
                method: 'GET',
                // 请求头
                header: ['Accept: application/json', 'Authorization: Bearer <TOKEN>'],
                // 添加数据时的 lable 对应的key值
                labelKey: 'id',
                // 添加数据时，value 对应的key值
                valueKey: 'id',
                // 接口返回的数据对应的Key值
                arrayKey: ['data', 'data']
            }
        },
        Groq: {
            modelsFormAPI: true,
            getModelsOption: {
                url: 'https://api.groq.com/openai/v1/models',
                method: 'GET',
                header: ['Authorization: Bearer <TOKEN>', 'Content-Type: application/json'],
                labelKey: 'id',
                valueKey: 'id',
                arrayKey: ['data', 'data']
            }
        },
        Google: {
            modelsFormAPI: true,
            getModelsOption: {
                url: 'https://generativelanguage.googleapis.com/v1beta/models?key=<TOKEN>',
                method: 'GET',
                header: [],
                labelKey: 'displayName',
                valueKey: 'name',
                arrayKey: ['data', 'models']
            }
        },
        ChatGPT: {
            modelsFormAPI: true,
            getModelsOption: {
                url: 'https://api.openai.com/v1/models',
                method: 'GET',
                header: ['Authorization: Bearer <TOKEN>'],
                labelKey: 'id',
                valueKey: 'id',
                arrayKey: ['data', 'data']
            }
        },
    };

    // 当前对应的模型列表
    const modelsList = ref([
        { label: '配置好API密钥后，点右侧按钮获取模型。(如需代理请一并配置好)', value: 'first' }
    ]);

    // 响应式设置，用于在页面中显示和使用
    const optionObj = reactive({
        selectedAiPlatform: 'ChatGLM',
        model: 'first',
        apiKey: '',
        proxy: '',
    });

    // 加载模型到页面
    const loadModelList = ()=>{
        const aiPlatform = optionObj.selectedAiPlatform;
        const aiModelsItem = aiModels[aiPlatform];
        modelsList.value.length = 0;
        if(!aiModelsItem.modelsFormAPI){
            // 如果该平台模型不是从网络获取
            aiModelsItem.modelList.forEach(item => {
                modelsList.value.push(item);
            });
        }else{
            // 如果是从网络获取的
            const findModelItem = optionsStore.getOptionByKey(aiPlatform + '_ModelList');
            if(findModelItem.index != -1){
                // 如果数据库中存在
                const arr = JSON.parse(findModelItem.data.val);
                arr.forEach(item => {
                    modelsList.value.push(item);
                });
            }
        }

        // 如果没有模型，model必须是first，用来提示用户
        if(modelsList.value.length == 0) optionObj.model = 'first';
        // 如果有模型，model不能是first
        if(modelsList.value.length != 0 && optionObj.model == 'first') optionObj.model = '';
    }

    // 刷新相应的平台设置及模型列表
    const refreshOptionAndModelList = ()=>{
        const aiPlatform = optionObj.selectedAiPlatform;
        // 获取该平台下的数据
        const findOptionItem = optionsStore.getOptionByKey(aiPlatform + '_Option');
        if(findOptionItem.index != -1){
            const data = JSON.parse(findOptionItem.data.val);
            optionObj.model = data.model;
            optionObj.apiKey = data.apiKey;
            optionObj.proxy = data.proxy;
        }else{
            optionObj.model = "";
            optionObj.apiKey = "";
            optionObj.proxy = "";
        }

        // 加载模型
        loadModelList();
    }

    // 根据数据库中的配置信息，同步到响应式数据中
    const syncOption = ()=>{
        // 同步当前选择的平台
        const selectedAiPlatformFindItem = optionsStore.getOptionByKey("selectedAiPlatform");
        if(selectedAiPlatformFindItem.index != -1){
            optionObj.selectedAiPlatform = selectedAiPlatformFindItem.data.val;
        }
        refreshOptionAndModelList();
    }

    // 刷新模型列表
    const refreshModelList = ()=>{
        if(optionObj.apiKey.trim() == ''){
            ElMessage.error("请先填写API密钥");
            return;
        }
        const aiPlatform = optionObj.selectedAiPlatform;
        const aiModelsItem = aiModels[aiPlatform];
        if(!aiModelsItem.modelsFormAPI){
            // 如果该平台模型不是从网络获取
            ElMessage.success("刷新成功");
            return;
        }

        const loadingInstance = ElLoading.service({ fullscreen: true });
        const getModelsOption = aiModelsItem.getModelsOption;
        // 从网络获取
        getModelList(optionObj.apiKey, optionObj.proxy, getModelsOption.header, getModelsOption.url, getModelsOption.method).then((result)=>{
            // 获取配置信息
            const arrayKey = getModelsOption.arrayKey;
            const modelOptionObjName = aiPlatform + "_ModelList";
            const modelArray = [];
            let resultModelList = result.data;
            for(let i = 0; i < arrayKey.length; i++){
                resultModelList = resultModelList[arrayKey[i]];
            }

            resultModelList.forEach( item=> {
                modelArray.push({
                    label: item[getModelsOption.labelKey],
                    value: item[getModelsOption.valueKey]
                });
            });

            const saveObj = {
                [modelOptionObjName]: JSON.stringify(modelArray)
            }
            
            return optionsStore.saveOptions(0, 'ai', saveObj);
        }).then((result)=>{
            // 保存模型列表
            if(result.length != 0){
                ElMessage.warning({
                    dangerouslyUseHTMLString: true,
                    message: `模型列表保存失败: <br />${result.join("<br />")}`
                })
            }else{
                ElMessage.success("保存成功");
                loadModelList();
            }
        }).catch((error)=>{
            ElMessage.error(formatObjectString(error));
        }).finally(()=>{
            loadingInstance.close();
        })
    }

    // 保存设置
    const saveOptions = ()=>{
        if(optionObj.apiKey.trim() == ""){
            ElMessage.error("请先填写API密钥");
            return;
        }

        if(optionObj.model.trim() == "" || optionObj.model.trim() == 'first'){
            ElMessage.error("请选择一个模型");
            return;
        }

        if(optionObj.proxy.trim() != ""){
            // 如果输入了代理，检查是否合法
            const regex = /^(http|https|socks5):\/\/.+$/;
           if(!regex.test(optionObj.proxy)){
                ElMessage.error('代理地址格式不正确，请使用 http://, https:// 或 socks5:// 开头');
                return;
           }
        }

        const aiPlatform = optionObj.selectedAiPlatform;

        // 获取配置信息
        const modelOptionObjName = aiPlatform + "_Option";
        const modelOptionObj = {
            model: optionObj.model.trim(),
            apiKey: optionObj.apiKey.trim(),
            proxy: optionObj.proxy.trim()
        };

        let saveObj = {
            selectedAiPlatform: aiPlatform
        };
        saveObj[modelOptionObjName] = JSON.stringify(modelOptionObj);

        optionsStore.saveOptions(0, 'ai', saveObj).then((result)=>{
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

    syncOption();

</script>

<template>
    <el-form label-width="120px">
        <el-form-item label="选择 AI 平台">
            <el-radio-group v-model="optionObj.selectedAiPlatform" @change="refreshOptionAndModelList">
                <el-radio-button value="ChatGLM">ChatGLM</el-radio-button>
                <el-radio-button value="DeepSeek">DeepSeek</el-radio-button>
                <el-radio-button value="Groq">Groq(部分免费)</el-radio-button>
                <el-radio-button value="Google">Google(免费)</el-radio-button>
                <el-radio-button value="ChatGPT">ChatGPT</el-radio-button>
            </el-radio-group>
        </el-form-item>

        <el-form-item label="模型选择">
            <div class="model-select-box">
                <el-select v-model="optionObj.model" placeholder="请选择模型" class="model-select-select">
                    <template v-if="modelsList.length == 0">
                        <el-option
                        :label="'配置好API密钥后，点右侧按钮获取模型。(如需代理请一并配置好)'"
                        :value="'first'"
                        />
                    </template>
                    <template v-else>
                        <el-option
                        v-for="model in modelsList"
                        :key="model.value"
                        :label="model.label"
                        :value="model.value"
                        />
                    </template>
                </el-select>
                <el-button :icon="Refresh" @click="refreshModelList">刷新</el-button>
            </div>
        </el-form-item>

        <el-form-item label="API 密钥">
            <el-input
                v-model="optionObj.apiKey"
                type="password"
                show-password
                placeholder="请输入 API 密钥"
            />
        </el-form-item>

        <el-form-item label="代理地址 (可选)">
            <el-input
                v-model="optionObj.proxy"
                placeholder="例如: http://user:pass@host:port 或 socks5://host:port"
            />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="saveOptions">保存AI设置</el-button>
        </el-form-item>
    </el-form>
</template>

<style scoped>
    .model-select-box{
        display: flex;
        width: 100%;
    }

    .model-select-select{
        flex-grow: 1;
    }
</style>