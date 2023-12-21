<template>
  <!-- <VueDatePicker :model-value="date" @update:model-value="handleDate"></VueDatePicker> -->
  <VueDatePicker v-model="date" :is-24="false" @update:model-value="handleDate"></VueDatePicker>
</template>

<script>
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
export default {
  name: "DateTimePicker",
  components: { VueDatePicker },
  data() {
    return {
      date: "",
    };
  },
  methods: {
    handleDate: function (newData) {
      let newDate = new Date(newData);
      this.$emit("updateDate", newDate.toISOString());
    },
  },
  emits: ["updateDate"],
};
</script>

<style></style>
