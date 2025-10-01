export default ()=>{
    
    /**
     * 格式化日志信息
     * @param {String} msg 日志信息
     * @param {Object | String} additionalData 附加数据
     */
    const formatLogMsg = (msg, additionalData)=>{
        let additionalString = "";
        if(typeof additionalData == 'object'){
            additionalString = JSON.stringify(additionalData);
        }else{
            additionalString = additionalData;
        }

        return msg + additionalString;
    }

    return {
        formatLogMsg
    }
}