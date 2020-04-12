<template>
  <div>
    <devices-view v-model="devices"
      @property-updated="propertyUpdated" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import DevicesView from "./components/DevicesView.vue";
import { DeviceData, Device } from './lib/device'
import ElementUI from "element-ui";
Vue.use(ElementUI);

import "element-ui/lib/theme-chalk/index.css";
import { EventType } from './lib/events';
import * as Config from './lib/config';

const url = Config.MQTT_SERVER_WS;
const prefix = Config.MQTT_PREFIX;

@Component({
  components: {
    DevicesView
  }
})
export default class App extends Vue {
  private devicesMap: Map<string, Device>

  constructor(){
    super()
    this.devicesMap = new Map()
  }

  data() {
    return {
      devices: []
    };
  }

  mounted() {
    setInterval(() => {
      for (const device of this.$data.devices) {
        this.$set(device, "workingTime", device.workingTime + 1);
      }
    }, 1000);
  }

  beforeDestroy(){
    for(const device of this.devicesMap.values()){
      device.exit()
    }
  }

  addDevice(deviceData: DeviceData){
    const device = new Device(url, prefix, deviceData)
    device.onConnect = ()=>this.$notify.success({
      title: '连接成功',
      message: `虚拟设备 ${device.data.deviceID} 已连接到${url}`
    })
    device.onError = (err: string)=>this.$notify.warning({
      title: `${deviceData.deviceID} 出错`,
      message: err
    })
    device.onRent = (token: number, delay: number, rent: boolean,
       haveTheType: boolean, remained: boolean, machine: boolean)=>{
      const delaystr = (delay/1000).toFixed(2)
      if(rent){
        this.$notify.success({
          title: '借取成功',
          message: `${device.data.deviceID} 将在 ${delaystr} 秒后响应一条借用请求，token为${token}。`
        })
      }else{
        let reason = "其他错误"
        if(!machine) reason = "机器错误"
        else if(!haveTheType) reason = "不存在请求的器材类型"
        else if(!remained)reason = "该类型的器材已经全部借出"

        this.$notify.warning({
          title: '借取失败',
          message: `${device.data.deviceID} 将在 ${delaystr} 秒后响应一条借用请求\
              ，token为${token}。失败原因：${reason}`
        })
      }
    }
    
    this.devicesMap.set(device.data.deviceID, device)
  }

  notifyDelete(deviceID: string){
    this.$notify.info({
      title: '主动退网',
      message: `虚拟设备 ${deviceID} 已发出主动退网请求`
    })
  }

  deleteDevice(deviceData: DeviceData){
    this.devicesMap.delete(deviceData.deviceID)
  }

  propertyUpdated(t: EventType, deviceID: string, oldID?: string, deviceData?: DeviceData){
    const device = this.devicesMap.get(deviceID)
    switch(t){
      case "doors-changed":
        if(device){
          device.sendDoors()
        }
        break;
        
      case "instruments-changed":
        if(device){
          device.sendInstruments()
        }
        break;
      
      case "location-changed":
        if(device){
          device.sendLocation()
        }
        break;
      
      case "device-added":
        if(deviceData){
          this.addDevice(deviceData)
        }
        break;
      
      case "device-deleted":
        if(device) device.exit()
        this.devicesMap.delete(deviceID)
        this.notifyDelete(deviceID)
        break;

      case "deviceid-changed":
        if(oldID){
          const device = this.devicesMap.get(oldID)
          if(device){
            const data = device.data
            data.deviceID = oldID
            device.exit()
            this.notifyDelete(oldID)
            data.deviceID = deviceID
            this.devicesMap.delete(oldID)
            this.addDevice(data);
          }
        }
    }
  }
}
</script>