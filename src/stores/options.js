import { defineStore } from 'pinia';
import { select, insert, update } from '../utils/sqlite';
import { error as errorLog, warn } from '@tauri-apps/plugin-log';
import { formatObjectString, getCurrentDateTime } from '../utils/function'

export const useOptionsStore = defineStore('options', {
    actions: {
        init(){
            return new Promise((resolve, reject) => {
                select('options', ['*']).then((result)=>{
                    this.list = result.rows;
                    resolve();
                }).catch((error)=>{
                    errorLog(formatObjectString("设置初始化失败", error));
                    reject(error);
                })
            })
        },
        /**
         * 获取配置数据，从备注名称
         * @param {String} remake 备注
         * @returns {Array} 查找到的数组
         */
        getOptionsByRemake(remake){
            let tempArray = [];

            this.list.forEach(item => {
                if(item.remake == remake){
                    tempArray.push({...item});
                }
            })

            return tempArray;
        },
        /**
         * 获取设置项从设置名称
         * @param {String} key 设置名称
         * @returns {Object<{index: number, data: Object}>}} index 数据下标 data 数据项
         */
        getOptionByKey(key){
            const result = {
                index: -1,
                data: null
            }

            const findIndex = this.list.findIndex(n => n.key == key);

            if(findIndex != -1){
                result.index = findIndex;
                result.data = {...this.list[findIndex]};
            }

            return result;
        },
        /**
         * 保存设置，如果库中已存在，则会替换，否则会添加
         * @param {Number} capabilityID 功能ID 0代表通用设置
         * @param {String} remake 备注
         * @param {Object} optionObject 要保存的设置对象
         * @returns {Promise<[]>} 如果修改出错，返回错误信息 该函数不会出发.catch
         */
        saveOptions(capabilityID, remake, optionObject){
            return new Promise(async (resolve, reject) => {
                const errorArray = [];

                for (const key in optionObject) {
                    const element = optionObject[key];
    
                    // 根据key查找配置项
                    const result = this.getOptionByKey(key);
    
                    try {
                        const lastTime = getCurrentDateTime();
                        if(result.index == -1){
                            // 配置不存在，新增
                            // 因为要获取lastId，这里只能await等待了
                            const insertResult = await insert('options', ['capabilityID', 'key', 'val', 'remake'], [capabilityID, key, element, remake]);
                            this.list.push({
                                id: insertResult.lastId,
                                capabilityID: capabilityID,
                                key: key,
                                val: element,
                                remake: remake,
                                lastTime: lastTime
                            });
                        }else{
                            // 配置存在，判断配置是否发生了变化
                            const item = result.data;
                            if(element === item.val){
                                // 如果相同，不执行任何操作
                                continue;
                            }else{
                                // 不相同修改
                                await update('options', {val: element, lastTime: lastTime}, 'id = ?', [item.id]);
                                // 修改store中的list
                                this.list[result.index].val = element;
                                this.list[result.index].lastTime = lastTime;
                            }
                        }
                    } catch (error) {
                        const errorInfo = formatObjectString(`配置修改失败，Key: ${key}, val: ${element}, 错误信息：`, error);
                        warn(errorInfo);
                        errorArray.push(errorInfo);
                    }
                    
                }

                resolve(errorArray);
            })
        },
    },
    state() {
        return{
            list: []
        }
    } 
});