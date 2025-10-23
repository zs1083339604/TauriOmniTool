<script setup lang="ts">
    import { ref } from 'vue';
    import { useOptionsStore } from '../../stores/options';
    import useAiChat from '../../hooks/useAiChat';
    import { ElLoading } from 'element-plus';
    import AiDialogs from './AiDialogs.vue';

    const optionsStore = useOptionsStore();
    const { aiUse } = useAiChat();
    const aiDialogsRef = ref(null);

    /**
     * 切割长文本执行函数，由sliceLongText调用，是sliceLongText的子函数
     * @param {String} content 文本内容，非完整内容，按级别分隔好的内容
     * @param {Number} nowLength 当前长度，用于递归时计算文本长度
     * @param {Number} maxLength 允许的最大长度
     * @param {Number} allowLevel 当前的级别 
     * @param {Number} maxAllowLevel 最大级别 1级按换行切割 2级按句号分句 3级按逗号分词
     * @returns {Object<{content, index}>} content 分隔好的字符串，index 当前分割的字符数
     */
    const sliceStrByLength = (content, nowLength, maxLength, allowLevel, maxAllowLevel)=>{
        // 分隔内容
        let contentArray = [];
        switch(allowLevel){
            case 1: 
                // 1级按换行分隔
                contentArray = content.split(/[\n\r\n]/);
                break;
            case 2:
                // 2级按句号、感叹号、问号等分句
                contentArray = content.split(/[。！？\.!\?]/);
                break;
            case 3:
                // 3级按逗号、顿号、冒号、引号分词
                contentArray = content.split(/[，\,：\:“‘\"\']/);
                break;
            default: 
                throw Error("切割长文本失败：未知级别 " + allowLevel);
        }

        let resultStr = "";
        let resultIndex = 0;
        // 分割的标点
        let sliceStr = "";

        for(let i = 0; i < contentArray.length; i++){
            const item = contentArray[i];
            // 判断是否到达限制了
            const newStr = resultStr + item;
            if(newStr.length + nowLength > maxLength){
                // 如果达到限制，判断第字符串是否为空
                if(resultStr == ""){
                    // 如果字符串为空，代表第1项就超出了预期长度，判断是否允许往下细分
                    if(allowLevel + 1 > maxAllowLevel){
                        // 不允许往下细分了，冒险添加
                        resultStr = newStr;
                        resultIndex += item.length + 1;
                        sliceStr = content.slice(resultIndex - 1 , resultIndex);
                        resultStr += sliceStr;
                    }else{
                        // 允许往下细分
                        const tempData = sliceStrByLength(item, resultIndex + nowLength, maxLength, allowLevel + 1, maxAllowLevel);
                        resultStr += tempData.content;
                        resultIndex += tempData.index;
                        sliceStr = tempData.sliceStr;
                    }
                    // 不管是否允许往下细分，当前这句话必会达到限制，所以执行完后退出
                    break;
                }else{
                    // 字符串不为空，则退出循环
                    break;
                }
            }else{
                // 如果没达到则添加字符串
                resultStr = newStr;
                resultIndex += item.length + 1;
                sliceStr = content.slice(resultIndex - 1 , resultIndex);
                resultStr += sliceStr;
            }
        }

        return {
            // 切割好的文字
            content: resultStr,
            // 截取的文字长度
            index: resultIndex,
            // 截取文字的最一个标点或字符
            sliceStr: sliceStr
        }
    }

    /**
     * 切割长文本，根据标点符号的划分，最终文本长度可能会有偏差
     * @param {String} content 完整的文本数据
     * @param {Number} maxLength 允许的最大长度
     * @param {Number} maxAllowLevel 最大级别 1级按换行切割 2级按句号分句 3级按逗号分词
     * @returns {Array} 切割好的文本数组
     */
    const sliceLongText = (content, maxLength, maxAllowLevel) => {
        let index = 0;
        const result = [];
        while(content.slice(index) != ''){
            const data = sliceStrByLength(content.slice(index), 0, maxLength, 1, maxAllowLevel);
            result.push(data);
            index += data.index;
        }

        return result;
    }

    /**
     * 输入提示词和文字内容，返回AI输出
     * @param {String} prompt 发送给AI的提示词
     * @param {String} content 对应的内容
     * @param {Number} allowLevel 限制字数时的最大分词级别 3是最高级 以逗号顿号分割
     * @param {Boolean} fullSyncLastStrForSlice 在开启分词时，是否完全匹配最后一个标点字符 默认开启 (字幕翻译功能添加，为了完全匹配换行)
     * @returns {Promise<[]>} AI返回的内容
     */
    const run = async (prompt, content, allowLevel = 3, fullSyncLastStrForSlice = true)=>{
        // 是否使用半自动模式
        let manualAutoString = 'auto';
        let manualAutoDialogFirstTips = "";
        let tempData = optionsStore.getOptionByKey("softUseAiModel");
        if(tempData.index != -1){
            manualAutoString = tempData.data.val;
        }
        let manualAuto = manualAutoString == 'auto' ? false : true;

        let aiOptions = {
            aiPlatform: '',
            model: '',
            proxy: '',
            apiKey: ''
        }

        // 使用全自动时，获取AI信息
        if(!manualAuto){
            // 获取设置中的AI平台、密钥等数据
            tempData = optionsStore.getOptionByKey("selectedAiPlatform");
            if(tempData.index != -1){
                aiOptions.aiPlatform = tempData.data.val;
            }

            // 如果没有AI平台，代表用户没有在设置中选择AI和填写信息，强制使用半自动模式
            if(aiOptions.aiPlatform == ""){
                manualAuto = true;
                // 设置了全自动，但没有设置API密钥，用来提示用户
                manualAutoDialogFirstTips = "由于您未设置API密钥，系统自动使用半自动模式";
            }else{
                // 当有AI模型时，才去获取API密钥及代理信息
                tempData = optionsStore.getOptionByKey(aiOptions.aiPlatform + "_Option");
                if(tempData.index != -1){
                    // 如果找到了模型信息
                    const data = JSON.parse(tempData.data.val);
                    aiOptions.model = data.model;
                    aiOptions.apiKey = data.apiKey;
                    aiOptions.proxy = data.proxy;
                }else{
                    // 没有找到模型信息，强制使用半自动模式
                    manualAuto = true;
                    manualAutoDialogFirstTips = "由于您未设置API密钥，系统自动使用半自动模式";
                }
            }
        }
        
        let contentArray = [content];
        
        tempData = optionsStore.getOptionByKey("softAiSendMaxTextLength");
        let maxTextLength = 0;
        if(tempData.index != -1){
            maxTextLength = tempData.data.val;
        }

        // 完整的分词数据
        let sliceContentArray = null;
        if(maxTextLength > 0){
            // 如果开启AI字数限制
            sliceContentArray = sliceLongText(content, maxTextLength, allowLevel);
            contentArray = sliceContentArray.map(n => n.content);
        }
        
        const result = [];
        const contentArrayLength = contentArray.length;

        // 半自动先打开对话框
        if(manualAuto){
            if (aiDialogsRef.value) {
                // 等待用户反应
                const showResult = await aiDialogsRef.value.show(manualAutoDialogFirstTips);
                if (!showResult) {
                    throw Error("用户取消了操作");
                }
            }else{
                throw Error("半自动模式无法打开AI对话框");
            }
        }

        for(let i = 0; i < contentArrayLength; i++){
            const item = contentArray[i];

            // 判断是自动还是半自动
            if(manualAuto){
                // 半自动模式
                const aiResult = await aiDialogsRef.value.run(prompt + item, i, contentArrayLength);
                result.push(aiResult)
            }else{
                // 全自动模式
                const loadingInstance = ElLoading.service({ fullscreen: true, text: `当前进度：${i} / ${contentArrayLength}` });
                try {
                    const aiResult = await aiUse(aiOptions.aiPlatform, prompt + item, aiOptions.model, aiOptions.apiKey, aiOptions.proxy);
                    result.push(aiResult)
                } catch (error) {
                    // 出错则中止运行
                    loadingInstance.close();
                    throw Error(error);
                }
                loadingInstance.close();
            }
        }

        if(maxTextLength > 0 && fullSyncLastStrForSlice){
            // 如果开启字数限制并且要求完全匹配最后一项字符
            for(let i = 0; i < result.length; i++){
                const lastAiText = result[i].slice(-1);
                const lastOriginText = sliceContentArray[i].sliceStr;
                if(lastAiText != lastOriginText){
                    result[i] += lastOriginText;
                }
            }
        }

        return result;
    }

    defineExpose({
        run
    });
</script>

<template>
    <div class="ai-chat">
        <AiDialogs ref="aiDialogsRef" />
    </div>
</template>

<style scoped>
    
</style>