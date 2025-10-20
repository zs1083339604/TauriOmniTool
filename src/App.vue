<script setup>
import { ref, onUnmounted, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ElMessage, ElMessageBox } from 'element-plus'
// import { writeLog, attachConsole } from './utils/log'
import { attachConsole } from "@tauri-apps/plugin-log";
import { connect } from './utils/sqlite'
import { formatObjectString } from './utils/function'
import {
  House,
  Menu as IconMenu,
  Setting,
} from '@element-plus/icons-vue'
import { RouterView } from "vue-router";
import { useCapabilityStore } from "./stores/capability";
import mitter from './utils/mitt';
import { useRouter } from "vue-router";
import { useShortcutStore } from "./stores/shortcut";

const capabilityStore = useCapabilityStore();
const shortcutStore = useShortcutStore();

const router = useRouter();
const currentWindow = getCurrentWindow();
const isInit = ref(false);

// 打包时注释
attachConsole();

// 初始化SQL数据库
connect().then(()=>{
  return capabilityStore.init();
}).then(()=>{
  return shortcutStore.init();
}).then(()=>{
  console.log("程序初始化完成");
  isInit.value = true;
}).catch((error)=>{
  ElMessageBox.alert(formatObjectString(error), '程序初始化失败', {
    confirmButtonText: '确定',
    callback: (action) => {
      currentWindow.close();
    }
  });
})

watch(isInit, (val)=>{
  if(val){
    // 页面加载完成，绑定快捷键，因为快捷键绑定失败，不影响程序运行，所以不放在上面
    shortcutStore.bind().then((result)=>{
      if(result.length > 0){
        // 如果有错误
        ElMessage.warning({
            dangerouslyUseHTMLString: true,
            message: `以下快捷键绑定失败，可能与其他软件冲突：<br />${result.join('<br />')}`
        })
      }
    }).catch((error)=>{
      ElMessage.warning(error);
    })
  }
})

// 页面跳转
mitter.on("capabilitySkip", (data) => {
  router.push('/use/' + data.id + '?shortcut=' + (data.shortcut ? 'true' : 'false'));
})

onUnmounted(()=>{
  mitter.off("capabilitySkip");
})
</script>

<template>
  <div class="common-layout" v-if="isInit">
    <el-container class="container">
      <el-aside width="200px">
        <el-menu class="app-menu" default-active="/home" :router="true">
          <el-menu-item index="/home">
            <el-icon><house /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/capabilities">
            <el-icon><icon-menu /></el-icon>
            <span>功能库</span>
          </el-menu-item>
          <el-menu-item index="/setting">
            <el-icon><setting /></el-icon>
            <span>通用设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-main> <RouterView /> </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
  .common-layout,
  .container,
  .app-menu{
    height: 100%;
  }
</style>