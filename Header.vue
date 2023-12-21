<template>
  <header>
    <div class="container-fluid header-nav-container">
      <div class="d-flex align-items-center">
        <div class="header-nav d-flex align-items-center flex-row">
          <div @click="servicesNavigation" class="header-services">Services</div>
          <div class="header-import-from-staging">Import from staging</div>
          <div class="header-import-spreadsheet">Import spreadsheet</div>
          <div @click="$emit('toggleModal')" class="header-change-logs">View change logs</div>
        </div>
        <div>
          <div class="d-flex">
            <div class="d-flex align-items-center env-button">{{ environment }}</div>
            <div class="bg-light text-dark rounded-pill d-flex justify-content-center">Welcome, Jason</div>
          </div>
        </div>
      </div>
    </div>
    <Transition name="slide-fade">
      <div v-if="showServicesNavigation" class="services-navigation-card">
        <div v-for="region_service in Object.keys(REGION_SERVICE_TYPES)" :key="region_service">
          <Button class="buttonStyle2" :buttonText="REGION_SERVICE_TYPES[region_service]"></Button>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script>
import { REGION_SERVICE_TYPES } from "@/assets/js/utilities/types";
import Button from "./Button.vue";
export default {
  name: "Header",
  components: {
    Button,
  },
  props: {
    environment: {
      default: "",
      required: true,
      type: String,
    },
  },
  data() {
    return {
      REGION_SERVICE_TYPES,
      showServicesNavigation: false,
      showModal: false,
    };
  },
  methods: {
    servicesNavigation: function () {
      this.showServicesNavigation = !this.showServicesNavigation;
    },
  },
  emits: ["toggleModal"],
};
</script>

<style lang="scss">
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
