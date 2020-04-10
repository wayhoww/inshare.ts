<template>
  <div>
    <door-view
      v-for="(door, idx) in doorsWithKey"
      v-bind:key="door.__hiddenid"
      :index="idx"
      v-model="doorsWithKey[idx]"
      @delete="deleteDoor(idx)"
      @input="updatedoors()"
      @property-updated="propertyUpdated"
    />
    <div class="door-block" v-bind:key="'key_for_add_btn'">
      <div class="center-text-wrapper">
        <div class="center-text move-up-3-px">
          <el-button @click="update()" icon="el-icon-plus" size="mini" circle></el-button>
        </div>
      </div>
    </div>
  </div>
</template>

  
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import DoorView from "./DoorView.vue";
import "../style/door.css";
import { Door } from "../lib/device";
import { EventType } from '../lib/events'

@Component({
  components: {
    DoorView
  }
})
export default class DoorsView extends Vue {
  constructor() {
    super();
  }
  data() {
    const doorsWithKey = [];
    for (const door of this.$props.value) {
      const obj = JSON.parse(JSON.stringify(door));
      obj.__hiddenid = Math.random();
      doorsWithKey.push(obj);
    }
    return {
      doorsWithKey: doorsWithKey
    };
  }
  propertyUpdated(t: EventType){
    this.$emit("property-updated", t);
  }
  emitEvents(){
    this.$emit("input", this.doors);
    const type: EventType = "doors-changed";
    this.propertyUpdated(type)
  }
  updatedoors() {
    this.emitEvents()
  }
  update() {
    this.$data.doorsWithKey.push({ opened: false, __hiddenid: Math.random() });
    this.emitEvents()
  }
  deleteDoor(idx: number) {
    this.$data.doorsWithKey.splice(idx, 1);
    this.emitEvents()
  }
  get doors(): { opened: boolean }[] {
    const rtn = [];
    for (const doork of this.$data.doorsWithKey) {
      const obj = JSON.parse(JSON.stringify(doork));
      delete obj.__hiddenid;
      rtn.push(obj);
    }
    return rtn;
  }
  @Prop() private value!: Door[];
}
</script>
