const _apiHost = window.location.origin + '/api/';

async function request(url, params, data, method = 'GET') {
  const options = {
    method,
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (params) {
    url += '?' + objectToQueryString(params);
  }

  if (method.includes('P')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    console.log(response);
    const result = await response.json();
    return result;
  } catch (error) {
    console.log(error);
  }
}

function objectToQueryString(obj) {
  return Object.keys(obj)
    .map(key => key + '=' + obj[key])
    .join('&');
}

function generateErrorResponse(message, error) {
  return {
    status: 'error',
    message,
    error,
  };
}

function get(url, params) {
  return request(_apiHost + url, params);
}

function create(url, params, data) {
  return request(_apiHost + url, params, data, 'POST');
}

function update(url, params, data) {
  return request(_apiHost + url, params, data, 'PUT');
}

function patch(url, params, data) {
  return request(_apiHost + url, params, data, 'PATCH');
}

function remove(url, params) {
  return request(_apiHost + url, params, null, 'DELETE');
}
