<template>
  <button>
    {{ buttonText }}
  </button>
</template>

<script>
export default {
  name: "Button",
  props: {
    buttonText: {
      default: "",
      required: false,
      type: String,
    },
  },
};
</script>
