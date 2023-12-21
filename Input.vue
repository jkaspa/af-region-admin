<template>
  <div class="input-container d-flex align-items-center">
    <label v-if="labelName && type !== INPUT_TYPES.CHECKBOX && type !== INPUT_TYPES.RADIO" for="">{{
      labelName
    }}</label>
    <input
      :class="{
        'no-padding': type === INPUT_TYPES.COLOR,
        'no-border': toggleInput === true,
      }"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :name="name"
      :checked="checked"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blurValue', $event.target.value)"
    />
    <!-- @input="$emit('update:modelValue', $event.target.value)" -->
    <label v-if="labelName && (type !== INPUT_TYPES.CHECKBOX || type !== INPUT_TYPES.RADIO)">{{ labelName }} </label>
    <slot></slot>
  </div>
</template>

<script>
import { INPUT_TYPES } from "../assets/js/utilities/types.js";
export default {
  name: "Input",
  props: {
    labelName: {
      default: "",
      required: false,
      type: String,
    },
    type: {
      default: "text",
      required: false,
      type: String,
    },
    placeholder: {
      default: "",
      required: false,
      type: String,
    },
    disabled: {
      default: false,
      required: false,
      type: Boolean,
    },
    name: {
      default: "",
      required: false,
      type: String,
    },
    modelValue: {
      required: false,
      type: [String, Array, Boolean],
    },
    value: {
      default: "",
      required: false,
      type: String,
    },
    toggleInput: {
      default: false,
      required: false,
      type: Boolean,
    },
    checked: {
      default: false,
      required: false,
      type: Boolean,
    },
  },
  data() {
    return {
      INPUT_TYPES,
    };
  },
  emits: ["update:value", "update:modelValue", "blurValue"],
};
</script>

<style lang="scss">
* {
}
</style>
