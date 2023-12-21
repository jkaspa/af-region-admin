import axios from "axios";

axios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

export const regionHTTP = {
  getEnvironment: async () => {
    let environment = await axios.get(
      // `https://${process.env.VUE_APP_AZURE_REGION}/env?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`
      `http://localhost:3000/env`
    );
    if (!environment.data) {
      throw new Error("There was an error fetching the environment.");
    } else {
      return environment.data?.payload;
    }
  },
  getRegions: async () => {
    let searchPayload = {
      pagination: {
        page_size: 15,
        page_num: 1,
      },
      query: {
        is_and_comparison: true,
        filters: [
          {
            field: "eid",
            op: "gt",
            value: 0,
            nested_query: {
              is_and_comparison: true,
              filters: [
                {
                  field: "eid",
                  op: "lt",
                  value: 1000,
                },
              ],
            },
          },
        ],
      },
      order: [
        {
          field: "eid",
          dir: "desc",
        },
      ],
      only_show_latest_version: true,
    };
    // Was a search post in original project
    let regionResponse = await axios.get(
      // `https://${process.env.VUE_APP_AZURE_REGION}/unifiedSearch/?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`,
      `http://localhost:3000/regions`
      // searchPayload
    );
    if (!regionResponse?.data) {
      throw new Error("There was an error fetching the regions.");
    } else {
      return regionResponse?.data;
    }
  },
  getRegionById: async (id) => {
    let regionByEidResponse = await axios.get(
      // `https://${process.env.VUE_APP_AZURE_REGION}/eid/${eid}?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`
      `http://localhost:3000/regions/${id}`
    );
    if (!regionByEidResponse.data) {
      throw new Error("There was an error fetching the region by eid.");
    } else {
      return regionByEidResponse.data;
    }
  },
  createFutureRegion: async (region) => {
    region = {
      ...region,
    };
    let regionPayload = { regions: [region] };
    let regionResponse = await axios.post(
      // `https://${process.env.VUE_APP_AZURE_FUTURE_REGION}/create?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`,
      `http://localhost:3000/regions/`,
      regionPayload
    );
    if (!regionResponse) {
      throw new Error("There was an error creating the region.");
    } else {
      return regionResponse.data;
    }
  },
  updateFutureRegion: async (region) => {
    let regionResponse = await axios.put(
      // `https://${process.env.VUE_APP_AZURE_FUTURE_REGION}/update/${region.region_id}?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`,
      `http://localhost:3000/regions/${region.id}`,
      region
    );
    if (!regionResponse) {
      throw new Error("There was an error updating the region.");
    } else {
      return regionResponse.data;
    }
  },
};
export const squishHTTP = {
  add: async (addPolygonPayload) => {
    let addSquish = await axios.post(
      // `https://${process.env.VUE_APP_AZURE_SQUISH}/add?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`,
      addPolygonPayload
    );
    if (!addSquish) {
      throw new Error("There was an error adding the location.");
    } else {
      return addSquish;
    }
  },
  subtract: async (subtractPolygonPayload) => {
    let subtractSquish = await axios.post(
      // `https://${process.env.VUE_APP_AZURE_SQUISH}/subtract?code=${process.env.VUE_APP_AZURE_API_KEY}&clientId=${process.env.VUE_APP_CLIENT_ID}`,
      subtractPolygonPayload
    );
    if (!subtractSquish) {
      throw new Error("There was an error subtracting the location.");
    } else {
      return subtractSquish;
    }
  },
};
