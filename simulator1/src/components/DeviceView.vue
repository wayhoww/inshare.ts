<template>
  <div class="root-ele" @mouseover="showDeleteBtn=true" @mouseleave="showDeleteBtn=false">
    <el-card class="box-card">
      <div slot="header" style="height:40; overflow: auto" class="header">
        <editable-label
          style="float: left; padding: 3px 0"
          :nonEmpty="true"
          v-model="valueData.deviceID"
          @input="deviceIDUpdated"
        />
        <span style="float: right; padding: 3px 0; color: #67C23A">{{valueData.captcha}}</span>
      </div>
      <div class="card-body">
        <div class="entry">
          <el-tooltip content="南纬, 西经：用负数表示">
            <div style="display:inline-block" class="title">地理位置</div>
          </el-tooltip>
          <div style="margin-right: 16px">
            经度：
            <editable-label
              v-bind:nonEmpty="true"
              v-bind:prop="{type:'number'}"
              v-model="valueData.location.x"
              @input="propertyUpdated('location-changed')"
            />
          </div>
          <div>
            纬度：
            <editable-label
              v-bind:nonEmpty="true"
              v-bind:prop="{type:'number'}"
              v-model="valueData.location.y"
              @input="propertyUpdated('location-changed')"
            />
          </div>
        </div>
        <div class="entry">
          <el-tooltip content="从开始工作到现在经过的秒数">
            <div class="title">工作时间</div>
          </el-tooltip>
          <div>{{valueData.workingTime}}</div>
        </div>
        <div class="entry">
          <div class="title">箱门</div>
          <div style="display:block; overflow:auto">
            <doors-view v-model="valueData.doors" @property-updated="propertyUpdated" />
          </div>
        </div>
        <div class="entry">
          <div class="title">器材</div>
          <div style="display:block;">
            <instruments-view v-model="valueData.instruments"
               @property-updated="propertyUpdated" />
          </div>
        </div>
      </div>
    </el-card>
    <div class="right-top" v-show="showDeleteBtn">
      <el-button
        class="closebtn"
        type="danger"
        @click="deleteHandler()"
        icon="el-icon-delete"
        circle
      ></el-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import EditableLabel from "./EditableLabel.vue";
import DoorsView from "./DoorsView.vue";
import InstrumentsView from "./InstrumentsView.vue";
import { DeviceData } from '../lib/device'
import { EventType } from '../lib/events'

@Component({
  components: {
    EditableLabel,
    DoorsView,
    InstrumentsView
  }
})
export default class DeviceView extends Vue {
  constructor() {
    super();
  }

  deleteHandler(){
    this.$emit('deleted')
  }

  propertyUpdated(t: EventType, oldid?: string){
    this.$emit("property-updated", t, this.$data.valueData.deviceID, oldid)
  }

  deviceIDUpdated(to: string, from: string){
    this.propertyUpdated('deviceid-changed', from)
  }

  data() {
    return {
      valueData: this.value,
      showDeleteBtn: true
    };
  }

  @Prop() private value!: DeviceData;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>


.right-top {
  position: absolute;
  width: 38px;
  height: 38px;
  top: -15px;
  right: -15px;
  text-align: center;
  overflow: hidden;
}


.root-ele {
  position: relative;
  margin: 0px;
}

.entry {
  padding-bottom: 12px;
}

.entry .title {
  font-weight: bold;
  padding-right: 24px;
}

.entry > * {
  display: inline-block;
  padding-right: 8px;
}

.card-body > .entry:last-child {
  padding-bottom: 0px;
}

.header {
  color: #409eff;
  font-weight: bold;
  font-size: larger;
}


</style>
