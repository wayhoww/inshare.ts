<template>
    <div class="door-block" @mouseover="showDeleteBtn=true" @mouseleave="showDeleteBtn=false">
      <div>
        <div class="left-top">
          <span>{{index}}</span>
        </div>
      </div>
      <div class="center-text-wrapper" @click="updateHandler()">
        <span class="center-text">{{door.opened ? "开" : "关"}}</span>
      </div>
      <div class="right-top" v-show="showDeleteBtn">
        <el-button
          class="closebtn"
          type="danger"
          @click="deleteHandler()"
          icon="el-icon-delete"
          size="mini"
          circle
        ></el-button>
      </div>
    </div>
</template>

  
<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Door } from '../lib/device'

@Component
export default class DoorView extends Vue {
  data() {
    return {
      door: this.$props.value,
      showDeleteBtn: false
    };
  }
  updateHandler() {
    this.$data.door.opened = !this.$data.door.opened;
    this.$emit("input", this.$data.door);
    this.$emit("propertyUpdate", "doors-changed")
  }
  deleteHandler() {
    this.$emit("delete");
  }
  @Prop() private value!: Door;
  @Prop() private index!: number;
}
</script>
