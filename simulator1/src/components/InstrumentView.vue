<template>
  <div
    class="rootbox"
    style="padding-right:0px"
    @mousemove="showDeleteBtn=true"
    @mouseleave="showDeleteBtn=false"
  >
    <span>
      类型：
      <editable-label
        v-bind:nonEmpty="true"
        v-bind:prop="{type:'number'}"
        v-model="instrument.typeid"
        @input="emitInput()"
      />
    </span>
    <el-divider direction="vertical"></el-divider>
    <span>
      总量：
      <editable-label
        v-bind:nonEmpty="true"
        v-bind:prop="{type:'number'}"
        v-model="instrument.total"
        @input="emitInput()"
      />
    </span>
    <el-divider direction="vertical"></el-divider>
    <span>
      余量：
      <editable-label
        v-bind:nonEmpty="true"
        v-bind:prop="{type:'number'}"
        v-model="instrument.remained"
        @input="emitInput()"
      />
    </span>
    <div class="deleteBtnwrapper" v-show="showDeleteBtn">
      <el-tooltip content="在上方新增">
        <el-button
          class="littlebtn"
          type="primary"
          @click="addHandler('before')"
          icon="el-icon-caret-top"
          size="mini"
          circle
        ></el-button>
      </el-tooltip>
      <el-tooltip content="在下方新增">
        <el-button
          class="littlebtn"
          type="primary"
          @click="addHandler('after')"
          icon="el-icon-caret-bottom"
          size="mini"
          circle
        ></el-button>
      </el-tooltip>
      <el-tooltip content="删除">
        <el-button
          class="littlebtn"
          type="danger"
          @click="deleteHandler()"
          icon="el-icon-delete"
          size="mini"
          circle
        ></el-button>
      </el-tooltip>
    </div>
  </div>
</template>

  
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import EditableLabel from "./EditableLabel.vue";
import { EventType } from '../lib/events';

@Component({
  components: {
    EditableLabel
  }
})
export default class InstrumentView extends Vue {
  data() {
    return {
      instrument: this.$props.value,
      showDeleteBtn: false
    };
  }
  addHandler(type: string) {
    this.$emit("add", type);
  }
  emitInput() {
    this.$emit("input", this.$data.instrument);
    const t: EventType = "instruments-changed"
    this.$emit("property-updated", t)
  }
  deleteHandler() {
    this.$emit("deleted");
  }
  @Prop() private value!: InstrumentView;
}
</script>

<style scoped>
.littlebtn {
  transform: scale(0.8, 0.8);
  margin: 0px;
}

.deleteBtnwrapper {
  float: right;
}

span {
  padding: 12px;
}

span > * {
  display: inline-block;
}

editable-label {
  padding-left: -30px;
}
</style>