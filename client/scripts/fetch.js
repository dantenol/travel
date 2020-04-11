const _apiHost = "https://192.168.0.3/api/";

async function request(url, params, data, method = "GET") {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (params) {
    url += "?" + objectToQueryString(params);
  }

  if (method.includes("P")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(_apiHost + url, options);
    const result = await response.json();
    return result;    
  } catch (error) {
    console.log(error);
  }

}

function objectToQueryString(obj) {
  return Object.keys(obj)
    .map((key) => key + "=" + obj[key])
    .join("&");
}

function generateErrorResponse(message, error) {
  return {
    status: "error",
    message,
    error,
  };
}

function get(url, params) {
  return request(url, params);
}

function create(url, params, data) {
  return request(url, params, data, "POST");
}

function update(url, params, data) {
  return request(url, params, data, "PUT");
}

function patch(url, params, data) {
  return request(url, params, data, "PATCH");
}

function remove(url, params) {
  return request(url, params, null, "DELETE");
}
