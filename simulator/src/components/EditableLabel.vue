<template>
  <el-popover class="editable-label" placement="top-start" width="240" trigger="hover">
    <!-- 编辑弹窗 -->
    <el-row>
      <el-col :span="15">
        <el-input v-bind="prop" v-model="editorValue" />
      </el-col>
      <el-col :span="9" style="text-align: right">
        <el-button type="primary" @click="updateValue()">确定</el-button>
      </el-col>
    </el-row>

    <!-- 显示的数值 -->
    <div class="value" slot="reference">{{textValue}}</div>
  </el-popover>
</template>

  
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class EditableLabel extends Vue {
  data() {
    return {
      textValue: this.$props.value,
      editorValue: this.$props.value
    };
  }
  updateValue() {
    if (this.$props.nonEmpty === true && this.$data.editorValue === "") {
      this.$message.error("不可以为空");
    } else if (this.$data.editorValue === this.$data.textValue) {
      this.$message.warning("没有更改");
    } else {
      const t = this.$data.textValue
      this.$data.textValue = this.$data.editorValue;
      this.$emit("input", this.$data.editorValue, t);
    }
  }
  @Prop() private nonEmpty!: boolean;
  @Prop() private value!: string;
  @Prop() private prop!: object;
}
</script>


<style scoped>
.value {
  display: inline-block;
  padding: 0px;
  margin: 0px;
}

.editable-label {
  padding: 0px;
  display: inline-block;
}
</style>