import axios from "axios";
import store from "../../../store";
import { squishHTTP } from "./httpFunctions";

let map;
let activeRegion;
let selectedRegionPolygonOptions;
let highlightPolygonId;
const regionPolygonOptions = {
  MARKETING: {
    options: {
      fillColor: "#009aff33",
      strokeColor: "#006ED4",
      strokeThickness: 3,
      strokeDashArray: "1 4 2 1",
    },
  },
  DISPLAY: {
    options: {
      fillColor: "#c82a2233",
      strokeColor: "#FF00F5",
      strokeThickness: 3,
    },
  },
  PPP: {
    options: {
      fillColor: "transparent", // "#fffead80",
      strokeColor: "#000000",
      strokeThickness: 3,
    },
  },
};

export const mapping = {
  validateEntity: async (e) => {
    if (!e) {
      throw new Error("There was an error receiving the region.");
    }
    let regionLabel = e.label;
    let entityValidationResponse = await axios.get(
      `${process.env.VUE_APP_BING_LOCATIONS_DOMAIN}/${regionLabel}?include=queryParse&o=json&key=${process.env.VUE_APP_BING_API_KEY}`
    );
    if (!entityValidationResponse) throw new Error("There was an error validating the entity.");
    else {
      return entityValidationResponse;
    }
  },
  checkLocationEntities: async (region) => {
    const regionDataCheck = () => {
      // Get map bounds
      let mapCenterBounds = map.getCenter();
      const regionResponse = axios.get(
        `${process.env.VUE_APP_BING_AUTOSUGGEST_DOMAIN}?query=${region.label}&userCircularMapView=${mapCenterBounds.latitude},${mapCenterBounds.longitude},300000&maxResults=1&countryFilter=US&key=${process.env.VUE_APP_BING_API_KEY}`
      );
      return regionResponse;
    };
    regionDataCheck().then((response) => {
      let locationName = response.data.resourceSets[0].resources[0].value[0].address.formattedAddress;
      let fetchEntityType = axios.get(
        `${process.env.VUE_APP_BING_LOCATIONS_DOMAIN}/${locationName}?include=queryParse&o=json&key=${process.env.VUE_APP_BING_API_KEY}`
      );
      // Get/set entityType
      let entityType;
      fetchEntityType.then((entityResponse) => {
        if (!entityResponse || !entityResponse.data.resourceSets[0].resources[0])
          throw new Error(`There was an error validating the region's entity.`);
        else {
          entityType = entityResponse.data.resourceSets[0].resources[0].entityType;
          mapping.getPolygonLocationsForRegion(locationName, entityType);
        }
      });
    });
  },
  getPolygonLocationsForRegion(location, entityType) {
    let geoDataRequestOptions = {
      entityType: entityType,
      // getAllPolygons: true,
    };
    Microsoft.Maps.loadModule(["Microsoft.Maps.SpatialDataService", "Microsoft.Maps.SpatialMath"], function () {
      Microsoft.Maps.SpatialDataService.GeoDataAPIManager.getBoundary(
        location,
        geoDataRequestOptions,
        map,
        function (polygonCoordinateData) {
          /* Note: Assumed UI location pass */
          let regionCoords = polygonCoordinateData.results[0].Polygons[0].getLocations();
          let encodedCoords = Microsoft.Maps.PointCompression.encode(regionCoords);
          mapping.encodeCoordinates(encodedCoords);
        }
      );
    });
  },
  clearMap() {
    map.entities.remove();
  },
  drawMap: async (region) => {
    if (!region && !map) map = new Microsoft.Maps.Map("#map", {});
  },
  setMapViewAverage: () => {
    /* Note: Set averages for latitude/longitude to render map more precisely */
    let latArr = [];
    let longArr = [];
    let latAvg;
    let longAvg;
    let polygons = map.entities._primitives;
    if (!polygons) return;
    polygons.map((poly) => {
      latArr.push(poly.geometry.boundingBox.center.latitude);
      longArr.push(poly.geometry.boundingBox.center.longitude);
    });
    latAvg = latArr.reduce(function (a, b) {
      return a + b;
    }, 0);
    longAvg = longArr.reduce(function (a, b) {
      return a + b;
    }, 0);
    latAvg = latAvg / polygons.length || 0;
    longAvg = longAvg / polygons.length || 0;
    map.setView({
      mapTypeId: Microsoft.Maps.MapTypeId.road,
      center: new Microsoft.Maps.Location(Number(latAvg), Number(longAvg)),
      zoom: 8,
    });
  },
  setRegion(region) {
    activeRegion = region;
  },
  setRegionType(regionType) {
    let regionPolygonOptionsKeyMatch = Object.keys(regionPolygonOptions).find((key) => {
      return key.toLowerCase() === regionType.toLowerCase();
    });
    selectedRegionPolygonOptions = regionPolygonOptions[regionPolygonOptionsKeyMatch].options;
  },
  encodeCoordinates: async (location) => {
    let encodedLocation = !!location.hasOwnProperty("encodedString") ? location.encodedString : location;
    /* Note: After we get encoded string from Bing, send to API */
    let polygonPayload = mapping.squishPayload(encodedLocation);
    if (location.hasOwnProperty("addSub") && !location.addSub) {
      store.dispatch("updateRegionComponents", { encodedString: encodedLocation });
      await squishHTTP.subtract(polygonPayload).then((polygonSubtract) => {
        store.dispatch("updateRegionCoordinates", polygonSubtract.data?.payload);
        // console.log("STORE AFTER SUB:", store.state.regionDetails);
        mapping.convertCoordinatesToBingMapReadable(polygonSubtract.data?.payload);
      });
    } else {
      store.dispatch("updateRegionComponents", { encodedString: encodedLocation });
      await squishHTTP.add(polygonPayload).then((polygonAdd) => {
        store.dispatch("updateRegionCoordinates", polygonAdd.data?.payload);
        // console.log("STORE AFTER ADD:", store.state.regionDetails);
        mapping.convertCoordinatesToBingMapReadable(polygonAdd.data?.payload);
      });
    }
  },
  squishPayload: (polygonData) => {
    let storeBorderCoordinates = store.getters.getBorderCoordinates;
    /* Note: if there are border_coordinates in the store, set otherGeometries to polygonData */
    if (storeBorderCoordinates.length > 0) {
      return {
        RemoveTinyHoles: true,
        TinyHoleThreshold: 0.1,
        BaseGeometry: {
          Polygons: storeBorderCoordinates[0].Polygons,
        },
        OtherGeometries: [
          {
            Polygons: [
              {
                OuterRing: polygonData,
                InnerRings: [],
              },
            ],
          },
        ],
      };
    } else {
      // else (default) set polygonData as baseGeometry
      return {
        RemoveTinyHoles: true,
        TinyHoleThreshold: 0.1,
        BaseGeometry: {
          Polygons: [
            {
              OuterRing: polygonData,
              InnerRings: [],
            },
          ],
        },
        OtherGeometries: [
          {
            Polygons: [],
          },
        ],
      };
    }
  },
  decodeLocation: (encoded) => {
    return Microsoft.Maps.PointCompression.decode(encoded);
  },
  convertCoordinatesToBingMapReadable: (polygonArray, region) => {
    if (!polygonArray || polygonArray.length === 0) return;
    selectedRegionPolygonOptions = !!selectedRegionPolygonOptions ? selectedRegionPolygonOptions : {};
    /* Note: on page init (and filtering) polygonArray has no keys */
    if (!polygonArray.hasOwnProperty("Polygons")) {
      polygonArray.map((items) => {
        polygonDataIterate(items);
      });
    } else {
      /* Note: assumes we're 'building' up a new region, and map entities
         need to be destroyed, and re-drawn
      */
      if (!!activeRegion && !activeRegion.eid) {
        mapping.clearMap();
      }
      /* Note: else we could be adding a new location to an existing region */
      polygonArray?.Polygons.map((items) => {
        polygonDataIterate(items);
      });
    }
    function polygonDataIterate(items) {
      let polygon;
      let ringsArray = [];
      if (!items) return;
      Object.keys(items).map((key, index) => {
        if (!Array.isArray(items)) {
          /* Note: is an object, and assumes first element added */
          if (key === "OuterRing") {
            let decodedOuter = mapping.decodeLocation(items[key]);
            let polygonOptions = !!region
              ? regionPolygonOptions[region.region_type.toUpperCase()]?.options
              : selectedRegionPolygonOptions;
            polygon = new Microsoft.Maps.Polygon(decodedOuter, polygonOptions);
            // polygon.entity.title = !!region ? region.region_display_name : null;
            ringsArray[index] = [...decodedOuter];
            map.entities.push(polygon);
            mapping.setMapViewAverage();
          } else {
            if (!items[key][0]) return;
            let decodedInner = mapping.decodeLocation(items[key][0]);
            ringsArray[index] = [...decodedInner];
            polygon.setRings(ringsArray);
          }
        } else return;
      });
    }
  },
  drawTransparentShape: (decodedCoords) => {
    function removeDuplicates() {
      let entities = map.entities._primitives;
      let newMapArray = [];
      let uniqueMapObject = {};
      for (let i in entities) {
        let mapId = entities[i]["id"];
        uniqueMapObject[mapId] = entities[i];
      }
      // Loop to push unique object into array
      for (let i in uniqueMapObject) {
        newMapArray.push(uniqueMapObject[i]);
      }
    }
    let highlightPolygon = new Microsoft.Maps.Polygon([decodedCoords], { fillColor: "#ffffff66" });
    map.entities.push(highlightPolygon);
    highlightPolygonId = highlightPolygon.id;
    removeDuplicates();
    // console.info({ ADDED: highlightPolygon.id, "AFTER DRAW": map.entities._primitives });
  },
  removeTransparentShape: () => {
    function removeDuplicates() {
      let entities = map.entities._primitives;
      let newMapArray = [];
      let uniqueMapObject = {};
      for (let i in entities) {
        let mapId = entities[i]["id"];
        uniqueMapObject[mapId] = entities[i];
      }
      // Loop to push unique object into array
      for (let i in uniqueMapObject) {
        newMapArray.push(uniqueMapObject[i]);
      }
    }
    if (!highlightPolygonId) return;
    for (var i = map.entities.getLength() - 1; i >= 0; i--) {
      var polygon = map.entities.get(i);
      if (polygon.id === highlightPolygonId) {
        map.entities.removeAt(i);
      }
    }
    highlightPolygonId = undefined;
    removeDuplicates();
  },
  regionSearchByLocation: function (searchMapForRegions) {
    var mapClickEventHandlerId;
    let currentPushpin;
    if (!searchMapForRegions) {
      let map = new Microsoft.Maps.Map("#map", {});
      closeRegionByLocationCard();
      Microsoft.Maps.Events.removeHandler(mapClickEventHandlerId);
      for (let i = map.entities.getLength() - 1; i >= 0; i--) {
        let pushpin = map.entities.get(i);
        if (pushpin instanceof Microsoft.Maps.Pushpin) {
          map.entities.removeAt(i);
        }
      }
    } else {
      if (!map) {
        mapping.drawMap();
      }
      if (!!map && map.entities.getLength() > 0) {
        for (let i = map.entities.getLength() - 1; i >= 0; i--) {
          let polygon = map.entities.get(i);
          if (polygon instanceof Microsoft.Maps.Polygon) {
            map.entities.removeAt(i);
          }
        }
      }
      // Add click events to the map
      let map = new Microsoft.Maps.Map("#map", {});
      mapClickEventHandlerId = Microsoft.Maps.Events.addHandler(map, "click", mapClicked);
      function mapClicked(e) {
        let searchRegionHelper = document.getElementById("regionSearchCard");
        if (!!searchRegionHelper) searchRegionHelper.style.display = "none";
        let point = new Microsoft.Maps.Point(e.getX(), e.getY());
        let locTemp = e.target.tryPixelToLocation(point);
        let location = new Microsoft.Maps.Location(locTemp.latitude, locTemp.longitude);
        // Create a pushpin
        currentPushpin = new Microsoft.Maps.Pushpin(e.location);
        currentPushpin.metadata = {
          title: `Regions at ${location.latitude}, ${location.longitude}`,
          description: "Response payload",
        };
        Microsoft.Maps.Events.addHandler(currentPushpin, "click", pushpinClicked);
        map.entities.push(currentPushpin);
        pushpinClicked(currentPushpin);
      }
      function pushpinClicked(e) {
        let cards = document.querySelector(".regionByLocationContainer");
        if (!!cards) cards.remove();
        let pinCardDetails = !!e.target ? e.target.metadata : e.metadata;
        let elem;
        let titleContainer;
        let descriptionContainer;
        let closeButton;
        let mapWrapper = document.querySelector(".map-wrapper");
        elem = document.createElement("div");
        elem.className = "regionByLocationContainer";
        titleContainer = document.createElement("div");
        titleContainer.className = "regionByLocationContainerTitle";
        titleContainer.innerHTML = `${pinCardDetails.title}`;
        elem.append(titleContainer);
        descriptionContainer = document.createElement("div");
        descriptionContainer.className = "regionByLocationContainerDescription";
        descriptionContainer.innerHTML = `${pinCardDetails.description}`;
        elem.append(descriptionContainer);
        closeButton = document.createElement("button");
        closeButton.innerHTML = "Close";
        descriptionContainer.append(closeButton);
        closeButton.addEventListener("click", (event) => {
          event.stopPropagation();
          closeRegionByLocationCard();
        });
        mapWrapper.prepend(elem);
      }
    }
    function closeRegionByLocationCard() {
      let regionContainer = document.querySelector(".regionByLocationContainer");
      if (!regionContainer) return;
      regionContainer.remove();
    }
  },
  itemArrayPromise: async (array, action, key) => {
    for (const item in array) {
      await action(array[item], key);
    }
  },
};
