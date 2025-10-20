import { defineStore } from "pinia";
import { select, insert, update, deleteData } from '../utils/sqlite'
import { error as errorLog, warn } from "@tauri-apps/plugin-log";
import { formatObjectString, getCurrentDateTime } from '../utils/function'
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import mitter from "../utils/mitt";
import { invoke } from "@tauri-apps/api/core";
import { message } from '@tauri-apps/plugin-dialog';

export const useShortcutStore = defineStore("shortcut", {
    actions: {
        /**
         * 初始化快捷键
         * @returns Promise
         */
        init(){
            return new Promise((resolve, reject) => {
                this.list.length = 0;
                select("shortcut", ['*']).then((result)=>{
                    result.rows.forEach(item => {
                        this.list.push(item);
                    });
                    resolve();
                }).catch((error)=>{
                    errorLog(formatObjectString('快捷键初始化失败：', error));
                    reject(error);
                })
            })
        },
        /**
         * 快捷键绑定基础函数
         * @param {ShortcutEvent} event 快捷键事件
         * @param {Number} capabilityId 功能id
         */
        bindBaseFn(event, capabilityId){
            if (event.state === "Pressed") {
                invoke("get_active_explorer_select_files").then((result)=>{
                    localStorage.setItem("shortcutData", JSON.stringify(result));
                    return this.currentWindow.setFocus();
                }).then(()=>{
                    mitter.emit('capabilitySkip', {id: capabilityId, shortcut: true})
                }).catch((error)=>{
                    const info = formatObjectString("快捷键调用出错：", error);
                    errorLog(info);
                    message(info, { title: '错误', kind: 'error' }).catch((error)=>{
                        const info = formatObjectString("对话框出错", error);
                        errorLog(info);
                        console.log("对话框出错" , error);
                    })
                    console.log(error);
                })
            }
        },
        /**
         * 快捷键绑定
         * @returns Promise
         */
        bind(){
            return new Promise(async (resolve, reject) => {
                try {
                    let errorList = [];
                    for(let i = 0; i < this.list.length; i++){
                        const item = this.list[i];
                        const registered = await isRegistered(item.key);
                        if(registered){
                            // 先解绑
                            await unregister(item.key);
                        }
                        // 快捷键绑定不要跳到最外面的catch，否则会终止循环，这个绑定不了，应该尝试绑定下一个
                        try {
                            // 绑定
                            await register(item.key, (event)=>{
                                this.bindBaseFn(event, item.capabilityID)
                            });
                            this.list[i].bindSuccess = true;
                        } catch (error) {
                            this.list[i].bindSuccess = false;
                            errorList.push(item.key);
                        }
                    }

                    resolve(errorList);
                } catch (error) {
                    const info = formatObjectString("快捷键绑定失败：", error);
                    warn(info);
                    reject(info);
                }
            })
        },
        /**
         * 添加快捷键
         * @param {String} key 快捷键
         * @param {Number} capabilityId 功能id
         * @returns Promise
         */
        add(key, capabilityId){
            return new Promise(async (resolve, reject) => {
                try {
                    // 先绑定快捷键，如果失败，不会执行后续的数据库操作
                    await register(key, (event)=>{
                        this.bindBaseFn(event, capabilityId)
                    });
                    
                    // 查询该功能id是否有快捷键绑定
                    let findIndex = this.list.findIndex(n => n.capabilityID == capabilityId);
                    if(findIndex >= 0){
                        // 如果有绑定的快捷键，判断是否绑定成功了
                        const findItem = this.list[findIndex];
                        if(findItem.bindSuccess){
                            // 绑定成功就解绑
                            await unregister(findItem.key);
                        }
                        // 修改数据库信息
                        await update('shortcut', {key: key, createTime: getCurrentDateTime()}, 'id = ?', [findItem.id]);
                        // 赋值
                        this.list[findIndex].key = key;
                    }else{
                        // 如果没有
                        const insertResult = await insert("shortcut", ['capabilityID', 'key'], [capabilityId, key]);
                        const result = await select('shortcut', ['*'], 'id = ?', [insertResult.lastId]);
                        this.list.push(result.rows[0]);
                        findIndex = this.list.length - 1;
                    }
                    this.list[findIndex].bindSuccess = true;
                    resolve();
                } catch (error) {
                    const info = formatObjectString("添加快捷键失败：", error);
                    warn(info);
                    reject(info);
                }
                
            })
        },
        /**
         * 解除快捷键绑定
         * @param {Number} capabilityId 功能id
         */
        unlock(capabilityId){
            return new Promise(async (resolve, reject) => {
                const item = this.getKeyByCapabilityId(capabilityId);
                if(!item){
                    reject("该功能未绑定快捷键");
                    return;
                }

                try {
                    if(item.bindSuccess){
                        // 绑定成功就解绑
                        await unregister(item.key);
                    }

                    // 解绑成功，从数据库中删除
                    await deleteData("shortcut", "id = ?", [item.id]);
                    // 删除成功后从Store中删除
                    const findIndex = this.list.findIndex(n => n.id == item.id);
                    this.list.splice(findIndex, 1);
                    resolve();
                } catch (error) {
                    const info = formatObjectString("解绑快捷键失败：", error);
                    warn(info);
                    reject(info);
                }
                
            });
        },
        /**
         * 根据功能ID 获取快捷键
         * @param {Number} id 功能id
         * @returns Object | Null
         */
        getKeyByCapabilityId(id){
            return this.list.find(n => n.capabilityID == id);
        }
    },
    state() {
        return{
            list: [],
            currentWindow: getCurrentWindow()
        }
    }
})