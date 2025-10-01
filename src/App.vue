<script setup>
import { ref, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ElMessageBox } from 'element-plus'
// import { writeLog, attachConsole } from './utils/log'
import { attachConsole } from "@tauri-apps/plugin-log";
import { connect } from './utils/sqlite'

const currentWindow = getCurrentWindow();
const isInit = ref(false);

// 打包时注释
attachConsole();

// 初始化SQL数据库
connect().then(()=>{
  console.log("程序初始化完成")
  isInit.value = true;
}).catch((error)=>{
  let msg = error;
  if(typeof msg == 'object'){
    msg = JSON.stringify(msg);
  }

  ElMessageBox.alert(msg, '程序初始化失败', {
    confirmButtonText: '确定',
    callback: (action) => {
      currentWindow.close();
    }
  });
})

// register('CommandOrControl+Shift+C', (event) => {
//   if (event.state === "Pressed") {
//     console.log('Shortcut triggered');
//     currentWindow.setFocus().catch((error)=>{
//       console.log(error, "setfocus error")
//     })
//   }
// }).then(()=>{
//   console.log("success")
// }).catch((error)=>{
//   console.log("error " ,error)
// })
// console.log("aaaaaa")
// onUnmounted(()=>{
//   unregister('CommandOrControl+Shift+C').then(()=>{
//     console.log("unregister success")
//   }).catch((error)=>{
//     console.log("unregister error ", error)
//   })
// })

const greetMsg = ref("");
const name = ref("");

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", { name: name.value });
}
</script>

<template>
  <main class="container" v-if="isInit">
    <h1>Welcome to Tauri + Vue</h1>

    <div class="row">
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main>
</template>

<style scoped>

</style>