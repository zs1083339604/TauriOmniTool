import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import { selectCustom } from '@/utils/sqlite'
import { warn } from '@tauri-apps/plugin-log';
import { formatObjectString } from '@/utils/function'

export const useCapabilityStore = defineStore('capability', {
    actions: {
        /**
         * 检查ID是否有重复
         * @returns Promise
         */
        checkDuplicateIds() {
            return new Promise((resolve, reject) => {
                // 存储所有id和backgroundIndex
                const allIds = new Set();
                const allBackgroundIndices = new Set();

                // 检查重复的函数
                const checkAndAdd = (value, type, location) => {
                    if (allIds.has(value)) {
                        reject(new Error(`发现重复的${type}: ${value}，位置: ${location}`));
                        return false;
                    }
                    allIds.add(value);
                    return true;
                };

                try {
                    // 遍历主列表
                    for (let i = 0; i < this.list.length; i++) {
                        const item = this.list[i];

                        // 检查对象的id
                        if (!checkAndAdd(item.id, '对象id', `list[${i}].id`)) {
                            return;
                        }

                        // 检查backgroundIndex
                        if (allBackgroundIndices.has(item.backgroundIndex)) {
                            reject(new Error(`发现重复的backgroundIndex: ${item.backgroundIndex}，位置: list[${i}].backgroundIndex`));
                            return;
                        }
                        allBackgroundIndices.add(item.backgroundIndex);

                        // 检查child中的id
                        if (item.child && Array.isArray(item.child)) {
                            for (let j = 0; j < item.child.length; j++) {
                                const childItem = item.child[j];
                                if (!checkAndAdd(childItem.id, 'child对象id', `list[${i}].child[${j}].id`)) {
                                    return;
                                }
                            }
                        }
                    }

                    // 所有检查通过
                    resolve('所有id和backgroundIndex均无重复');
                } catch (error) {
                    reject(error);
                }
            });
        },
        /**
         * 获取所有功能分类
         * @returns Array
         */
        getCategoryList(){
            const tempArray = [];
            this.list.forEach(item => {
                tempArray.push({
                    id: item.id,
                    name: item.name
                })
            })

            return tempArray;
        },
        /**
         * 传入字符串获取功能
         * @param {String} name 完整的功能名字
         * @returns undefined | Object
         */
        getCapabilityByName(name) {
            for (let i = 0; i < this.list.length; i++) {
                const item = this.list[i].child;
                const findItem = item.find(n => n.name == name);
                if (findItem) return findItem;
            }

            return undefined;
        },
        /**
         * 传入id获取功能
         * @param {Number} id 功能id
         * @returns undefined | Object
         */
        getCapabilityById(id) {
            for (let i = 0; i < this.list.length; i++) {
                const item = this.list[i].child;
                const findItem = item.find(n => n.id == id);
                if (findItem) return findItem;
            }

            return undefined;
        },
        /**
         * 传入关键词，获取功能列表
         * @param {String} keyWord 关键词
         * @returns Array
         */
        getCapabilitiesByKeyWord(keyWord) {
            const result = [];

            for (let i = 0; i < this.list.length; i++) {
                const item = this.list[i].child;
                const findIndex = item.findIndex(n => n.name.includes(keyWord));
                if (findIndex != -1) {
                    const findItem = item[findIndex];
                    result.push({...toRaw(findItem), icon: this.getIconByIDorPOS(findItem.id, i, findIndex), value: findItem.name});
                }
            }

            return result;
        },
        /**
         * 传入分类ID获取功能列表
         * @param {String} id 分类id
         * @returns Array
         */
        getCapabilitiesByCategoryId(id) {
            for (let i = 0; i < this.list.length; i++) {
                const item = this.list[i];
                if(item.id == id){
                    return item.child.map((n, index) => {return {...n, icon: this.getIconByIDorPOS(0, i, index), categoryName: item.name}})
                }
            }

            return [];
        },
        /**
         * 传入ID或功能和分类的下标，返回该功能的图标（HTML）
         * @param {Number} id 功能的ID
         * @param {Number} categoryIndex 分类的index，如果大于等于0，则是指定下标，不在看上面的ID
         * @param {Number} capabilityIndex 功能的index，如果大于等于0，则是指定下标，不在看上面的ID
         * @returns String
         */
        getIconByIDorPOS(id, categoryIndex = -1, capabilityIndex = -1){
            let categoryObj = null, capabilityObj = null;
            if(categoryIndex >= 0 && capabilityIndex >= 0){
                categoryObj = this.list[categoryIndex] ? toRaw(this.list[categoryIndex]) : null;
                capabilityObj = this.list[categoryIndex].child[capabilityIndex] ? toRaw(this.list[categoryIndex].child[capabilityIndex]) : null;
            }else{
                // 非指定下标，查找整个数组
                for(let i = 0; i < this.list.length; i++){
                    const item = this.list[i];
                    const findItem = item.find(n => n.id == id);
                    if (findItem) {
                        categoryObj = toRaw(item);
                        capabilityObj = toRaw(findItem);
                        break;
                    }
                }
            }

            if(categoryObj == null || capabilityObj == null){
                return "";
            }else{
                const background = this.backgrounds[categoryObj.backgroundIndex];
                return `<span class="capabilityIcon" style="background: linear-gradient(135deg, ${background[0]}, ${background[1]}); color: #fff;">${capabilityObj.name.substring(0,1)}</span>`;
            }
        },
        /**
         * 获取功能（按最近添加）
         * @param {Number} count 要获取的数量
         * @returns Array
         */
        getCapabilityByLastAdd(count = 10){
            let tempArray = [];
            // 获取所有功能
            this.list.forEach(item => {
                tempArray = tempArray.concat(item.child.map(n => {return {...n}}));
            })
            // 进行时间排序
            tempArray.sort((a, b) => new Date(b.time) - new Date(a.time));

            return tempArray.slice(0, count);
        },
        /**
         * 获取功能（按收藏 或 最近使用）
         * @param {Number} count 要获取的数量
         * @param {String} type star是按收藏，recently是按使用
         * @returns Array
         */
        getCapabilityByStarOrRecently(count = 10, type = 'star'){
            return new Promise((resolve, reject) => {
                let tempArray = [];
                selectCustom(`SELECT capabilityID FROM ${type} ORDER BY createTime DESC LIMIT 0,$1;`, [count]).then((result)=>{
                    result.rows.forEach(item => {
                        const findCapability = this.getCapabilityById(item.capabilityID);
                        if(findCapability != undefined){
                            tempArray.push({...findCapability});
                        }else{
                            warn(`[getCapabilityByStarOrRecently] 数据库ID： '${item.capabilityID}' 在Store中未查到`);
                        }
                    })
                    resolve(tempArray);
                }).catch((error)=>{
                    const errorInfo = formatObjectString(error);
                    reject(errorInfo);
                    warn(`[getCapabilityByStarOrRecently] 自定义查询语句失败：${errorInfo}`);
                })
            })
        }
    },
    state() {
        return {
            /**
             * 分类的背景颜色
             * next: 2
             * rotate: 135deg
             * max: 5
             */
            backgrounds: [
                ['#3498db', '#2980b9'],
                ['#2ecc71', '#27ae60'],
                ['#e74c3c', '#c0392b'],
                ['#f39c12', '#d35400'],
                ['#9b59b6', '#8e44ad'],
                ['#1abc9c', '#16a085']
            ],
            /**
             * 功能列表
             * next: 3
             */
            list: [{
                name: '文件操作',
                id: 'file',
                // 分类背景
                backgroundIndex: 0,
                time: '2025-10-09 11:00:00',
                child: [{
                    id: 1,
                    name: '批量重命名',
                    desc: '按照自定义的模板，批量重命名文件',
                    time: '2025-10-09 13:00:00',
                    // 该功能是否有单独的设置权限
                    showSetting: false,
                    // 功能的vue组件位置，@/components/modules 下
                    component: 'file_ops/Rename.vue'
                }]
            },{
                name: '音视频',
                id: 'av',
                backgroundIndex: 1,
                time: '2025-10-15 11:00:00',
                child: [{
                    id: 2,
                    name: '字幕翻译',
                    desc: '翻译字幕文件',
                    time: '2025-10-15 11:00:00',
                    showSetting: true,
                    component: 'av_ops/Subtitle.vue'
                }]
            }]
        }
    }
});