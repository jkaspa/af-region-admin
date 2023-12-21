export const findIndex = (data, dataKey, element, elementKey) => {
  return data.findIndex((dataItem) => {
    let elementToSearch = elementKey ? element[elementKey] : element;
    return dataItem[dataKey] === elementToSearch;
  });
};
export const parseISOString = (isoString, previewTime) => {
  const date = new Date(isoString);
  if (previewTime) {
    const formattedDate = date.toLocaleString("en-US");
    return formattedDate;
  } else {
    let dateString = "";
    dateString = `${date.getFullYear()}/${date.getMonth()}/${date.getDate()}`;
    return dateString;
  }
};
export const isJson = (string) => {
  try {
    JSON.parse(string);
  } catch (error) {
    return false;
  }
  return true;
};
