<template>
  <div class="modal-mask">
    <div class="modal-wrapper">
      <div class="modal-container">
        <div class="modal-content-container">
          <div class="modal-header d-flex align-items-center">
            <div class="col">Region Change Logs</div>
            <div class="col position-relative">
              <Input
                class="search-regions"
                :type="INPUT_TYPES.TEXT"
                :placeholder="'Search region names, types or status'"
                v-model="filters.name.value"
              ></Input>
              <!-- ref="searchRegion"
              name="searchRegion" -->
            </div>
          </div>
          <div class="modal-body">
            <div class="no-regions-message" v-if="activeLogData.length === 0">No regions defined at this time.</div>
            <div v-else-if="!!activeLogData && loading" class="d-flex align-items-center">
              <Spinner></Spinner>
            </div>
            <VTable v-else :data="activeLogData" :filters="filters">
              <template #head>
                <tr>
                  <VTh :sortKey="TABLE_COLUMNS.NAME">Name</VTh>
                  <VTh :sortKey="TABLE_COLUMNS.TYPE">Type</VTh>
                  <VTh :sortKey="TABLE_COLUMNS.STATUS">Status</VTh>
                  <VTh :sortKey="TABLE_COLUMNS.CREATED_DATE">Created</VTh>
                  <VTh :sortKey="TABLE_COLUMNS.START_DATE">Start</VTh>
                  <VTh :sortKey="TABLE_COLUMNS.END_DATE">End</VTh>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </template>
              <template #body="{ rows }">
                <tr
                  @mouseover="highlightRegionsByGroup(row)"
                  @mouseleave="clearHighlights()"
                  :class="{ current: row.current }"
                  :data-regionId="row.region_id"
                  v-for="row in rows"
                  :key="row.eid"
                >
                  <td><span v-if="row.current">*</span>{{ row.region_display_name }}</td>
                  <td>{{ row.region_type }}</td>
                  <td>{{ statusLabel(row.active) }}</td>
                  <td>{{ parseISOString(row.created_date, true) }}</td>
                  <td>{{ parseISOString(row.valid_from_date) }}</td>
                  <td>{{ parseISOString(row.valid_to_date) }}</td>
                  <td>
                    <Button
                      :disabled="row.current"
                      :class="{ revertDisabled: row.current }"
                      class="buttonStyle3 revert"
                      buttonText="Revert"
                      @click="revertToSelectedRegionHistory(row)"
                    ></Button>
                  </td>
                  <td>
                    <Popper class="popper">
                      <div class="info-icon" @click="getRegionSiblings(row)"></div>
                      <template #content>
                        <div>
                          <strong>{{ row.region_display_name }}</strong> created on:
                          {{ parseISOString(row.created_date, (showTime = true)) }}
                        </div>
                        <div>Related regions:</div>
                        <ul>
                          <li v-for="sibling in regionSiblings" :key="sibling">
                            {{ sibling.region_display_name }} : created on
                            {{ parseISOString(sibling.created_date, (showTime = true)) }}
                          </li>
                        </ul>
                      </template>
                    </Popper>
                  </td>
                </tr>
              </template>
            </VTable>
          </div>
          <div class="modal-footer">
            <slot name="footer">
              <Button class="buttonStyle3 modal-default-button" buttonText="Close" @click="$emit('close')"></Button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Input from "./Input.vue";
import Button from "./Button.vue";
import Spinner from "./Spinner.vue";
import Popper from "vue3-popper";
import { INPUT_TYPES, TABLE_COLUMNS } from "../assets/js/utilities/types.js";
import { parseISOString } from "../assets/js/utilities/helpers";
import { regionHTTP } from "../assets/js/utilities/httpFunctions";
export default {
  name: "Modal",
  components: {
    Input,
    Button,
    Spinner,
    Popper,
  },
  watch: {
    newLogs: {
      handler(newLogTrigger) {
        if (newLogTrigger) {
          this.onLoadRegions();
        }
      },
    },
  },
  props: {
    newLogs: {
      required: false,
      default: false,
      type: Boolean,
    },
    filters: {
      required: false,
      default: {},
      type: Object,
    },
  },
  mounted() {
    try {
      this.onLoadRegions();
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
      changeLogRegionData: [],
      regionSiblings: [],
      loading: false,
    };
  },
  methods: {
    parseISOString,
    onLoadRegions: function () {
      try {
        regionHTTP
          .getRegions()
          .then((regions) => {
            if (regions.length === 0) this.loading = false;
            else {
              this.changeLogRegionData = regions;
            }
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
      }
    },
    statusLabel: function (active) {
      let now = Date.now();
      let label = !!active.region_change_id ? "Draft" : active.active === true ? "Active" : "Archived";
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
    highlightRegionsByGroup: function (row) {
      let modalRowsByRegion = document.querySelectorAll(`[data-regionid='${row.region_id}']`);
      try {
        for (let i = 0; i < modalRowsByRegion.length; i++) {
          modalRowsByRegion[i].classList.add("group-highlight");
        }
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    clearHighlights: function () {
      let modalRows = document.querySelectorAll(`[data-regionid]`);
      try {
        for (let i = 0; i < modalRows.length; i++) {
          if (modalRows[i].classList.contains("group-highlight")) {
            modalRows[i].classList.remove("group-highlight");
          }
        }
      } catch (error) {
        $toast.error("Error:", {
          position: "top-right",
          message: error.message,
          type: "error",
        });
      }
    },
    getRegionSiblings: function (row) {
      if (this.regionSiblings.length > 0) this.regionSiblings = [];
      try {
        this.changeLogRegionData.map((log) => {
          if (log.region_id === row.region_id) {
            this.regionSiblings.push(log);
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
    revertToSelectedRegionHistory: function (row) {
      try {
        this.$emit("regionReverted", row);
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
    activeLogData() {
      const { changeLogRegionData } = this;
      const filteredData = Object.values(
        changeLogRegionData.reduce((acc, currentItem) => {
          acc[currentItem.region_name] =
            acc[currentItem.region_name] && acc[currentItem.region_name].eid > currentItem.eid
              ? acc[currentItem.region_name]
              : currentItem;
          acc[currentItem.region_name]["current"] = true;
          return acc;
        }, {})
      );
      return [...changeLogRegionData];
    },
  },
  emits: ["close", "regionReverted"],
};
</script>

<style lang="scss">
:root {
  --popper-theme-background-color: #333333;
  --popper-theme-background-color-hover: #333333;
  --popper-theme-text-color: #ffffff;
  --popper-theme-border-width: 0px;
  --popper-theme-border-style: solid;
  --popper-theme-border-radius: 6px;
  --popper-theme-padding: 32px;
  --popper-theme-box-shadow: 0 6px 30px -6px rgba(0, 0, 0, 0.25);
}
</style>
