<template>
  <div class="d-flex flex-row">
    <aside class="control-card">
      <div class="table-container">
        <div class="no-regions-message" v-if="regionsData.length === 0">No regions defined at this time.</div>
        <div v-if="!!regionsData && loading" class="d-flex align-items-center">
          <Spinner></Spinner>
        </div>
        <VTable v-else :data="regionsDataFilter" :filters="filters">
          <template #head>
            <tr>
              <th></th>
              <VTh :sortKey="TABLE_COLUMNS.NAME">Region</VTh>
              <VTh :sortKey="TABLE_COLUMNS.TYPE">Type</VTh>
              <VTh :sortKey="TABLE_COLUMNS.STATUS">Status</VTh>
              <th>Actions</th>
            </tr>
          </template>
          <template #body="{ rows }">
            <tr v-for="row in rows" :key="row.eid">
              <td>
                <Input :type="INPUT_TYPES.CHECKBOX" :checked="true" @change="filterRegionsChecked($event, row)"></Input>
              </td>
              <td>{{ row.region_display_name }}</td>
              <td>{{ row.region_type }}</td>
              <td>{{ statusLabel(row) }}</td>
              <td>
                <Button @click="getFutureRegionChangeById(row)" class="buttonStyle3" buttonText="Edit"></Button>
                <Button class="buttonStyle3" buttonText="Archive"></Button>
                <Button v-if="!!row.current_pending_draft" class="buttonStyle3" buttonText="Revert"></Button>
              </td>
            </tr>
          </template>
        </VTable>
      </div>
    </aside>
    <Transition name="slide-fade">
      <RegionEditCard
        v-if="showRegionEditCard || isRevertedRegion"
        @close-region-edit-modal="onCloseRegionEditModal"
        @save-region-edit-modal="onSaveRegionEditModal"
        @save-sorted-list="onSaveRegionEditModal"
        class="region-edit-card"
        :regionObject="regionObject"
      >
        <div v-if="loading" class="d-flex align-items-center">
          <Spinner></Spinner>
        </div>
      </RegionEditCard>
    </Transition>
    <div class="map-wrapper">
      <div v-if="searchMapForRegions" id="regionSearchCard">Click to view all regions in the selected area.</div>
      <main id="map" ref="map"></main>
    </div>
  </div>
</template>

<script>
import { debounce } from "lodash";
import Input from "./Input.vue";
import Button from "./Button.vue";
import Spinner from "./Spinner.vue";
import RegionEditCard from "../components/RegionEditCard.vue";
import { INPUT_TYPES, TABLE_COLUMNS } from "../assets/js/utilities/types.js";
import { mapping } from "../assets/js/utilities/microsoftMapHelpers.js";
import { isJson } from "../assets/js/utilities/helpers";
import { regionHTTP } from "../assets/js/utilities/httpFunctions.js";
export default {
  name: "RegionControl",
  components: {
    Input,
    Button,
    Spinner,
    RegionEditCard,
  },
  watch: {
    regionsData: {
      handler(regions) {
        if (!!regions) {
          regions.map((region) => {
            mapping
              .itemArrayPromise(region.border_coordinates, mapping.convertCoordinatesToBingMapReadable, region)
              .then(() => {})
              .catch((error) => {
                $toast.error("Error:", {
                  position: "top-right",
                  message: error.message,
                  type: "error",
                });
              });
          });
        }
      },
    },
    newRegion: {
      handler(newRegion) {
        this.regionObject = newRegion;
        if (!newRegion.id) this.showRegionEditCard = true;
      },
      deep: true,
    },
    searchMapForRegions: {
      handler(searchMapForRegions) {
        mapping.regionSearchByLocation(searchMapForRegions);
      },
    },
    revertedRegion: {
      handler(newRevertedRegion) {
        this.isRevertedRegion = true;
        Object.keys(newRevertedRegion).map((key) => {
          if (key === "border_components" || key === "border_coordinates") {
            this.regionObject[key] = newRevertedRegion[key];
          } else {
            this.regionObject[key] = newRevertedRegion[key];
          }
        });
      },
    },
    regionsToFilter: {
      handler(data) {
        if (Array.isArray(data)) return;
        this.emitToggleData(data);
      },
    },
    inputFilters: {
      handler(data) {
        this.emitToggleData(data);
      },
    },
  },
  props: {
    newRegion: {},
    searchMapForRegions: false,
    revertedRegion: {},
    filters: {
      required: false,
      default: {},
      type: Object,
    },
    regionsToFilter: {
      required: false,
      default: [],
      type: Array,
    },
    inputFilters: {
      required: false,
      default: "",
      type: String,
    },
  },
  mounted() {
    try {
      this.loadBingMaps();
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
      INPUT_TYPES,
      TABLE_COLUMNS,
      loading: false,
      show: true,
      isEditing: false,
      regionObject: {},
      regionsData: [],
      showRegionEditCard: false,
      isRevertedRegion: false,
    };
  },
  methods: {
    loadBingMaps: function () {
      if (document.getElementById("scriptBingMaps")) {
        return;
      }
      try {
        // Load the Bing Maps v8 Web Control
        var scriptTag = document.createElement("script");
        scriptTag.src = `${process.env.VUE_APP_BING_MAP_CONTROL}`;
        scriptTag.id = "scriptBingMaps";
        document.head.appendChild(scriptTag);
        // Add a global function for the callback from Bing Maps api
        window.onLoadBingMapsApi = () => {
          mapping.drawMap().then(() => {
            this.onLoadRegions();
          });
        };
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    emitToggleData: function (data) {
      const { regionsData } = this;
      mapping.clearMap();
      let tempRegions = [];
      if (data === "") {
        tempRegions = [];
      }
      if (
        data[0] === "PPP" ||
        data[0] === "Marketing" ||
        data[0] === "Display" ||
        data[0] === "Active" ||
        data[0] === "Draft" ||
        data[0] === "Archived"
      ) {
        regionsData.map((region) => {
          if (region.region_type.toLowerCase() === data[0].toLowerCase()) {
            tempRegions.push(region);
            this.filterRegionsChecked(undefined, region);
          }
        });
      } else {
        regionsData.map((region) => {
          if (
            region.region_display_name.toLowerCase().includes(data.toLowerCase()) &&
            !tempRegions.includes(region.region_type)
          ) {
            tempRegions.push(region);
            this.filterRegionsChecked(undefined, region);
          }
        });
      }
      this.$emit("checkToggleStatusOnInput", tempRegions);
    },
    filterRegionsChecked: function (event, row) {
      /* Note: checkbox clicks in left table, and input search filter, as soon as region filters update, re-render map */
      try {
        function asyncRegionsMapDraw(matchRegion) {
          mapping
            .itemArrayPromise(matchRegion.border_coordinates, mapping.convertCoordinatesToBingMapReadable, matchRegion)
            .then(() => {})
            .catch((error) => {
              $toast.error("Error:", {
                position: "top-right",
                message: error.message,
                type: "error",
              });
            });
        }
        if (!event) {
          // Input search filter...
          let matchRegion = this.regionsDataFilter.find((localRegion) => {
            return localRegion.eid === row.eid;
          });
          if (!matchRegion) return;
          mapping.setRegionType(matchRegion.region_type);
          asyncRegionsMapDraw(matchRegion);
        } else {
          // Region table checkbox...
          let regionsMaster = this.regionsDataFilter;
          let thisRegion = regionsMaster.find((r) => r.eid === row.eid);
          if (event.target.checked) {
            let thisRegionAtIndex = regionsMaster.findIndex((item) => {
              return item.eid === thisRegion.eid;
            });
            if (regionsMaster[thisRegionAtIndex].hasOwnProperty("isChecked")) {
              delete regionsMaster[thisRegionAtIndex].isChecked;
            }
          } else {
            let thisRegionAtIndex = regionsMaster.findIndex((item) => {
              return item.eid === thisRegion.eid;
            });
            regionsMaster[thisRegionAtIndex].isChecked = false;
          }
          mapping.clearMap();
          regionsMaster.map((localRegion) => {
            if (!localRegion.hasOwnProperty("isChecked") || localRegion.isChecked === true) {
              mapping.setRegionType(localRegion.region_type);
              asyncRegionsMapDraw(localRegion);
            }
          });
        }
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    statusLabel: function (row) {
      let now = Date.now();
      let label = !!row.region_change_id ? "Draft" : row.active === true ? "Active" : "Archived";
      try {
        return label;
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    onLoadRegions: debounce(async function () {
      try {
        this.loading = true;
        await regionHTTP
          .getRegions()
          .then((regions) => {
            this.regionsData = regions;
          })
          .catch((error) => {
            $toast.error("Error:", {
              position: "top-right",
              message: error.message,
              type: "error",
            });
          });
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    }, 1000),
    getFutureRegionChangeById: async function (region) {
      try {
        this.loading = true;
        this.isEditing = true;
        await regionHTTP
          .getRegionById(region.id)
          .then((regionByIdResponse) => {
            // let borderComponentsValidJson = isJson(regionByIdResponse.border_components);
            // let borderCoordinatesValidJson = isJson(regionByIdResponse.border_coordinates);
            this.regionObject = regionByIdResponse;
            // this.regionObject.border_components = borderComponentsValidJson ? regionByIdResponse.border_components : [];
            // this.regionObject.border_coordinates = borderCoordinatesValidJson
            //   ? regionByIdResponse.border_coordinates
            //   : [];
            this.showRegionEditCard = !this.showRegionEditCard;
            // Set region
            mapping.setRegionType(this.regionObject.region_type);
            // Reset store
            this.$store.dispatch("updateRegionObject", regionByIdResponse);
            // Redraw polygons from response payload
            mapping.itemArrayPromise(
              regionByIdResponse.border_coordinates,
              mapping.convertCoordinatesToBingMapReadable,
              regionByIdResponse
            );
          })
          .catch((error) => {
            $toast.error("Error:", {
              position: "top-right",
              message: error.message,
              type: "error",
            });
          });
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    },
    onSaveRegionEditModal: async function () {
      const { $toast, onLoadRegions } = this;
      try {
        if (!this.regionObject) return;
        /* Note: clear map and store's border_coordinate array */
        mapping.clearMap();

        /* Note: update border components in card */
        this.regionObject.border_components = this.regionObject.border_components.filter((bc) => {
          return !bc.hasOwnProperty("flaggedForDeletion");
        });
        if (!!this.regionObject?.id) {
          // this.isEditing || this.isRevertedRegion) &&
          this.loading;
          /* PUT */
          regionHTTP
            .updateFutureRegion(this.regionObject)
            .then(() => {
              $toast.success("Success!", {
                position: "top-right",
                message: "Region Updated",
                type: "success",
              });
              onLoadRegions();
            })
            .catch(function (error) {
              $toast.error("Error:", {
                position: "top-right",
                message: error.message,
                type: "error",
              });
            });
        } else {
          /* POST */
          regionHTTP.createFutureRegion(this.regionObject).then((response) => {
            $toast.success("Success!", {
              position: "top-right",
              message: "Region Created",
              type: "success",
            });
            onLoadRegions();
          });
        }
        //});
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      } finally {
        this.isEditing = false;
        this.showRegionEditCard = false;
        this.isRevertedRegion = false;
        this.loading = false;
      }
    },
    onCloseRegionEditModal: function () {
      this.isEditing = false;
      this.showRegionEditCard = false;
      this.isRevertedRegion = false;
      this.loading = false;
      try {
        this.$store.dispatch("deleteRegion");
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
    regionsDataFilter() {
      /* Note: Table rendering with :checked style filter */
      if (this.regionsToFilter.length === 0) return this.regionsData;
      let regionsArray = [];
      this.regionsData.map((region) => {
        if (!this.regionsToFilter.includes(region.region_type)) {
          region = { ...region, isChecked: true };
          regionsArray.push(region);
        }
      });
      // this.$emit("checkToggleStatusOnInput", regionsArray);
      return regionsArray;
    },
  },
  emits: ["checkToggleStatusOnInput"],
};
</script>

<style lang="scss" scoped>
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
