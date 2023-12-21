<template>
  <div>
    <div class="container-fluid d-flex flex-column">
      <div class="region-block-container">
        <div class="region-edit-block d-flex flex-column">
          <div class="region-edit-block-name">
            <label>Region</label>
            <Input :type="INPUT_TYPES.TEXT" v-model="regionObject.region_display_name"></Input>
          </div>
          <div class="region-edit-block-type">
            <label>Type</label>
            <Multiselect
              @change="onUpdateRegionType($event)"
              :searchable="true"
              v-model="regionObject.region_type"
              :options="Object.values(REGION_TYPES)"
            />
          </div>
          <div class="region-edit-block-status">
            <label>Status</label>
            <Multiselect :searchable="true" :placeholder="statusLabel" v-model="statusValues" :options="STATUS_TYPES" />
          </div>
        </div>
      </div>
      <div class="border-element-container">
        <div class="border-element-container-header d-flex align-items-center">
          <label>Border elements </label>
          <Button :class="{ disabled: isEditing }" :disabled="isEditing" @click="addRegionBorderElement"></Button>
        </div>
        <p v-show="regionObject['type'] === 'PPP'">Counties only</p>
        <draggable
          @end="resortList"
          class="border-element-body-container d-flex flex-column"
          :list="regionObjectBorderComponentsParsed"
        >
          <div
            class="row"
            :class="{
              isDeleting: borderElementItem.flaggedForDeletion,
            }"
            v-for="borderElementItem in regionObjectBorderComponentsParsed"
            :key="borderElementItem"
          >
            <div class="border-element-toggle-container">
              <Toggle @change="toggleChangeRedraw()" v-model="borderElementItem.addSub" />
            </div>
            <div class="border-element-input-container">
              <Input
                @mouseover="onBorderElementHover(borderElementItem, $event)"
                @mouseleave="onBorderElementLeave(borderElementItem)"
                @blur-value="onBlurRegionBorderElementText(borderElementItem)"
                :toggleInput="borderElementItem.toggleInput"
                :data-label="borderElementItem.label"
                v-model="borderElementItem.label"
                :disabled="borderElementItem.disabled"
              ></Input>
            </div>
            <div class="border-element-button-container">
              <Button
                @click="enableRegionBorderElementText"
                :data-label="borderElementItem.label"
                :disabled="isEditing"
                class="border-element-container-button edit-border-element"
                :class="{ 'edit-border-element-disabled': isEditing }"
              ></Button>
              <Button
                @click="borderElementItem.flaggedForDeletion = !borderElementItem.flaggedForDeletion"
                :data-label="borderElementItem.label"
                class="border-element-container-button delete-border-element"
              ></Button>
              <Button
                :data-label="borderElementItem.label"
                class="border-element-container-button sort-border-element"
              ></Button>
            </div>
            <div v-if="borderElementItem.isValidEntityType === false" class="invalid-entity">
              Please provide a valid location.
            </div>
          </div>
        </draggable>
      </div>
    </div>
    <div class="container-fluid d-flex flex-column">
      <Button
        @click="$emit('saveRegionEditModal', $event)"
        class="button-region-action button-save"
        buttonText="Save changes"
      ></Button>
      <Button
        @click="$emit('closeRegionEditModal')"
        class="button-region-action button-cancel"
        buttonText="Cancel / Close"
      ></Button>
    </div>
  </div>
</template>

<script>
import Input from "./Input.vue";
import Button from "./Button.vue";
import Multiselect from "@vueform/multiselect";
import Toggle from "@vueform/toggle";
import { VueDraggableNext } from "vue-draggable-next";
import { mapping } from "../assets/js/utilities/microsoftMapHelpers";
import { findIndex } from "../assets/js/utilities/helpers";
import {
  REGIONS,
  INPUT_TYPES,
  TABLE_COLUMNS,
  REGION_TYPES,
  STATUS_TYPES,
  ENTITY_TYPES,
} from "../assets/js/utilities/types";
export default {
  name: "RegionEditCard",
  components: {
    Input,
    Button,
    Multiselect,
    Toggle,
    draggable: VueDraggableNext,
  },
  props: {
    regionObject: {},
  },
  mounted() {
    try {
      this.$store.dispatch("updateRegionObject", this.regionObject);
    } catch (error) {
      $toast.error("Error:", {
        position: "top-right",
        message: error.message,
        type: "error",
      });
    }
  },
  data() {
    return {
      REGIONS,
      INPUT_TYPES,
      TABLE_COLUMNS,
      REGION_TYPES,
      STATUS_TYPES,
      ENTITY_TYPES,
      isEditing: false,
    };
  },
  methods: {
    validateEntityType: function (element, allowedTypes) {
      const { regionObject } = this;
      let entityCheck = mapping.validateEntity(element);
      try {
        entityCheck.then((entityValidation) => {
          if (!entityValidation || entityValidation.data.resourceSets[0].resources.length === 0) {
            element.flaggedForDeletion = true;
            element.isValidEntityType = false;
            return;
          }
          /* Note: Auto-correct */
          let matchLabel = entityValidation.data.resourceSets[0].resources.find((resource) => {
            return resource.address.formattedAddress === element.label;
          });
          if (!matchLabel) {
            element.label = entityValidation.data.resourceSets[0].resources[0].address.formattedAddress;
          } else {
            element.label = matchLabel.address.formattedAddress;
          }
          /* /Notes: Auto-correct */
          let validationResponse = entityValidation.data.resourceSets[0].resources[0].entityType.toLowerCase();
          if (!validationResponse) return;
          element.isValidEntityType = allowedTypes.indexOf(validationResponse.toLowerCase()) > -1 ? true : false;
          if (element.isValidEntityType === false) {
            element.flaggedForDeletion = true;
            return;
          } else {
            if (element.isValidEntityType === true) {
              delete element.flaggedForDeletion;
              element.entityType = validationResponse;
            }
            /* Note: assumes we are adding new polygons to definition */
            mapping.checkLocationEntities(element);
          }
        });
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    toggleChangeRedraw: function () {
      const { regionObject } = this;
      try {
        mapping.clearMap();
        mapping.itemArrayPromise(regionObject.border_components, mapping.encodeCoordinates, regionObject).then(() => {
          console.log("Region definition redrawn");
        });
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    onBorderElementHover: function (elem) {
      let storeBorderElements = this.$store.state.regionDetails.border_components;
      try {
        if (this.isEditing || !storeBorderElements) return;
        const result = storeBorderElements.find((item) => {
          return item.label === elem.label;
        });
        if (!result.encodedString) return;
        let decodedCoords = Microsoft.Maps.PointCompression.decode(result.encodedString);
        mapping.drawTransparentShape(decodedCoords);
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    onBorderElementLeave: function () {
      try {
        mapping.removeTransparentShape();
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    onUpdateRegionType: function (event) {
      try {
        mapping.setRegionType(event);
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    onBlurRegionBorderElementText: function (element) {
      const { regionObject } = this;
      if (!element.label) return;
      this.isEditing = false;
      element.toggleInput = true;

      let allowedTypesPPP = [
        ENTITY_TYPES.ADMINDIVISION1,
        ENTITY_TYPES.ADMINDIVISION2,
        ENTITY_TYPES.POSTCODE,
        ENTITY_TYPES.POSTCODE1,
      ];
      let allowedTypesMarketing = [
        ENTITY_TYPES.ADMINDIVISION1,
        ENTITY_TYPES.ADMINDIVISION2,
        ENTITY_TYPES.POSTCODE,
        ENTITY_TYPES.POSTCODE1,
        ENTITY_TYPES.POPULATEDPLACE,
        ENTITY_TYPES.NEIGHBORHOOD,
      ];
      try {
        switch (regionObject.region_type) {
          case REGION_TYPES.MARKETING:
            this.validateEntityType(element, allowedTypesMarketing);
            break;
          case REGION_TYPES.DISPLAY:
            this.validateEntityType(element, allowedTypesMarketing);
            break;
          case REGION_TYPES.PPP:
            this.validateEntityType(element, allowedTypesPPP);
            break;
        }
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    enableRegionBorderElementText: function (e) {
      const { regionObject } = this;
      let borderElementByLabel = e.target.dataset.label;
      this.isEditing = true;
      try {
        let borderElementRowIndex = findIndex(regionObject.border_components, "label", borderElementByLabel);
        regionObject.border_components[borderElementRowIndex].toggleInput = false;
        regionObject.border_components[borderElementRowIndex].disabled = false;
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    addRegionBorderElement: function () {
      this.isEditing = true;
      try {
        if (this.isEditing) {
          let elementToAdd = {
            addSub: true,
            label: "",
            entityType: "",
            sortIndex: 0,
            disabled: false,
            isValidEntityType: true,
            entityType: undefined,
          };
          this.regionObject.border_components.push(elementToAdd);
        }
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    resortList: function () {
      try {
        this.regionObject.border_components.map((component, index) => {
          component.sortIndex = index;
        });
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
  },
  computed: {
    regionObjectBorderComponentsParsed() {
      if (typeof this.regionObject.border_components === "string") {
        return this.regionObject.border_components;
      } else {
        return this.regionObject.border_components;
      }
    },
    statusValues: {
      get() {
        return [this.regionObject.active, this.regionObject.draft];
      },
      set(value) {
        if (value === "Draft") {
          this.regionObject.active = 0;
          this.regionObject.draft = 1;
        } else if (value === "Active") {
          this.regionObject.active = 1;
          this.regionObject.draft = 0;
        }
      },
    },
    statusLabel() {
      const { regionObject } = this;
      let now = Date.now();
      let label = !!regionObject.region_change_id ? "Draft" : regionObject.active === true ? "Active" : "Archived";
      return label;
    },
  },
  emits: ["closeRegionEditModal", "saveRegionEditModal", "saveSortedList", "toggleElementState"],
};
</script>

<style>
.multiselect-option {
  font-size: 0.875em !important;
}
.multiselect-option.is-selected {
  background: #1d4ed8 !important;
}
.toggle {
  border-width: 1px !important;
  border-style: solid !important;
}
.toggle-handle {
  top: 2px !important;
}
.toggle-on {
  background: #f0fdf4 !important;
  border-color: #15803d !important;
}
.toggle-handle-on {
  background: #15803d !important;
  left: 95% !important;
  height: 1rem !important;
  width: 1rem !important;
}
.toggle-off {
  background: #fef2f2 !important;
  border-color: #b91c1c !important;
}
.toggle-handle-off {
  background: #b91c1c !important;
  left: 3px !important;
  right: 95% !important;
  height: 1rem !important;
  width: 1rem !important;
}
</style>
<style src="@vueform/multiselect/themes/default.css"></style>
<style src="@vueform/toggle/themes/default.css"></style>
