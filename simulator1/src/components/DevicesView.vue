<template>
  <div id="app">
    <div class="devicecontainer">
      <device-view
        class="device"
        v-for="(simulator, index) of simulators"
        v-bind:key="simulator.deviceID"
        v-model="simulators[index]"
        @deleted="deleteHandler(index)"
        @property-updated="propertyUpdated"
      />
      <el-card class="device add-device" :key="'key_for_block'">
        <div class="addbtn">
          <el-button icon="el-icon-plus" @click="addDevice()" circle></el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ElementUI from "element-ui";
Vue.use(ElementUI);

import "element-ui/lib/theme-chalk/index.css";
import { Device, DeviceData } from '../lib/device'
import DeviceView from './DeviceView.vue'

import "../style/door.css";
import { EventType } from '../lib/events';

@Component({
  components: {
    DeviceView
  }
})
export default class DevicesView extends Vue {
  data() {
    return {
      simulators: this.$props.value
    };
  }

  deleteHandler(idx: number){
    const t = this.$data.simulators[idx]
    this.$data.simulators.splice(idx, 1)
    this.propertyUpdated("device-deleted", t.deviceID)
  }

  propertyUpdated(t: EventType, deviceID: string, oldID?: string, data?: DeviceData){
    this.$emit('property-updated', t, deviceID, oldID, data)
  }

  addDevice() {
    const prefix = "js.";
    const simulator = {
      deviceID: prefix + Math.round(Math.random() * 99999999),
      workingTime: 0,
      location: {
        x: parseFloat((Math.random() * 360 - 180).toFixed(4)),
        y: parseFloat((Math.random() * 180 - 90).toFixed(4))
      },
      captcha: "UNINITIALIZED",
      doors: [],
      instruments: []
    };
    this.$data.simulators.push(simulator);
    this.$emit("input", this.$data.simulators);
    this.propertyUpdated("device-added", simulator.deviceID, undefined ,simulator)
  }

  @Prop() private value!: DeviceData[];
}
</script>

<style scoped>
.device {
  width: 500px;
  float: left;
}

.add-device {
  height: 200px;
  position: relative;
}

.addbtn {
  transform: scale(2.5, 2.5);
  width: 40px;
  height: 40px;
  position: absolute;
  top: 80px;
  left: 210px;
}

.devicecontainer > * {
  margin: 20px;
}
</style>
