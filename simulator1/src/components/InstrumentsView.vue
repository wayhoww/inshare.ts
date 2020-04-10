<template>
  <div class="rootbox" style="padding-right:0px">
    <ul>
      <li v-for="(val, index) of instruments" v-bind:key="val.typeid">
        <instrument-view
          v-model="instruments[index]"
          @deleted="deleteHandler(index)"
          @add="(type)=>addHandler(index, type)"
          @property-updated="propertyUpdated"
        />
      </li>
      <li>
        <div class="addbtnWrapper" v-show="instruments.length===0">
          <div class="addbtn">
            <el-button @click="addHandler(0, 'before')" icon="el-icon-plus" size="mini" circle></el-button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

  
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import EditableLabel from "./EditableLabel.vue";
import InstrumentView from "./InstrumentView.vue";
import { Instrument } from '../lib/device'
import { EventType } from '../lib/events';

@Component({
  components: {
    EditableLabel,
    InstrumentView
  }
})
export default class InstrumentsView extends Vue {
  data() {
    return {
      instruments: this.$props.value
    };
  }
  addHandler(idx: number, type: string) {
    if (type === "after") idx++;

    const S = new Set();
    for (const entry of this.$data.instruments) {
      S.add(entry.typeid);
    }
    let typeid = 0;
    while (S.has(typeid)) {
      typeid++;
    }

    const newitem = {
      typeid: typeid,
      total: 8,
      remained: 4
    };
    this.$data.instruments.splice(idx, 0, newitem);
    this.emitInput();
  }
  deleteHandler(idx: number) {
    this.$data.instruments.splice(idx, 1);
    this.emitInput();
  }
  emitInput() {
    this.$emit("input", this.$data.instruments);
    const t: EventType = "instruments-changed"
    this.propertyUpdated(t)
  }
  propertyUpdated(t: EventType){
    this.$emit('property-updated', t)
  }
  @Prop() private value!: Instrument[];
}
</script>

<style scope>
ul {
  padding-left: 0px;
  list-style: none;
}

li {
  margin: 6px;
}

.addbtnWrapper {
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 40px;
  width: 360px;
  position: relative;
  text-align: center;
  border-radius: 4px;
}

.addbtn {
  top: 6px;
  left: 166px;
  position: relative;
  height: 28px;
  width: 28px;
  text-align: center;
}

.addbtnWrapper{
  margin-left: 10px;
}

li{
  margin-left: 0px;
}
</style>