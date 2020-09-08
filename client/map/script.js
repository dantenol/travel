let infos = {};
let list, editing, currentDestination, isSharing, isMobile, swipeStart;

let drawerVisible = true;

function changeText(id, text) {
  document.getElementById(id).innerHTML = text;
}

function changeTextClass(className, text) {
  const els = document.getElementsByClassName(className);
  let i = 0;
  while (i < els.length) {
    els[i].innerHTML = text;
    i++;
  }
}

function changeDisplay(id, display) {
  document.getElementById(id).style.display = display;
}

function loadGooglePics(urls) {
  const container = document.getElementById('pictures');
  const credits = document.getElementById('credits');
  container.innerHTML = '';
  credits.innerHTML = '';
  let i = 0;
  while (i < urls.length) {
    const img = document.createElement('img');
    img.src = urls[i];
    container.appendChild(img);
    i += 1;
  }
  const credit = document.createTextNode('do Google');
  credits.appendChild(credit);
}

function findCountry(array) {
  let i = 0;
  while (i < array.length) {
    if (array[i].types.includes('country')) {
      return array[i].long_name;
    }
    i++;
  }
}

function findCity(code, data) {
  const addresses = code.match(/(<span.+?\/span>)/gi);
  const idx = addresses.findIndex(
    e => e.includes('locality') || e.includes('region'),
  );
  if (idx >= 0) {
    const local = />(.+?)</g.exec(addresses[idx]);
    return local[1];
  } else {
    let i = 0;
    while (i < data.length) {
      if (
        data[i].types.includes('locality') ||
        data[i].types.includes('administrative_area_level_2')
      ) {
        return data[i].long_name;
      }
      i++;
    }
  }
}

async function addPlace() {
  const address = place.address_components;
  infos.coords = {
    ...place.coords,
  };
  infos.photoURLs = [...place.photoURLs];
  if (address.length < 2) {
    return alert('Local inválido. Especifique mais.');
  }
  infos.country = findCountry(address);
  infos.place = findCity(place.adr_address, address);
  if (!infos.place) {
    return alert('Local inválido. Especifique mais.');
  }
  changeDisplay('addPlace', 'none');
  document.getElementById('autocomplete').value = '';
  const placeData = await create(
    'lists/' + list.id + '/destinations',
    {
      access_token: localStorage.access_token,
    },
    {
      ...infos,
    },
  );
  selectPlace(placeData);
  const photos = await retrievePermanentPhotoUrls(placeData.photoURLs);
  reloadList();
  await update(
    'lists/' + list.id + '/destinations/' + placeData.id,
    {
      access_token: localStorage.access_token,
    },
    {
      photoURLs: photos,
    },
  );
}

async function retrievePermanentPhotoUrls(urls) {
  console.log(urls);
  const permanentURLs = await request(
    'https://m27e170alf.execute-api.sa-east-1.amazonaws.com/dev/map/loadPhotos',
    null,
    {
      photoURLs: urls,
    },
    'POST',
  );
  return permanentURLs.body.processedUrls;
}

document.addEventListener('DOMContentLoaded', onLoad);

function onLoad() {
  isMobile = window.screen.width < 600;
  const query = getUrlParams();
  if (query.invite || localStorage.inviteId) {
    answerInvite(query.invite);
  } else if (query.list) {
    loadSharedList(query.list);
  } else {
    loadLists();
  }
}

async function loadLists() {
  const data = await get('users/' + localStorage.userId, {
    access_token: localStorage.access_token,
    filter: '{"include": {"lists": ["destinations", "users"]}}',
  });

  if (!data.id) {
    localStorage.clear();
    window.location.href = "/"
    return alert('Erro ao acessar a lista!');
  }

  const emptyListText = (document.querySelector('#noList p').innerHTML =
    data.fullName + ', você ainda não tem nenhuma lista.');
  if (!data.lists.length) {
    setAsideComponemt('noList');
  } else {
    setAsideComponemt('selectList');
    displayLists(data.lists);
  }
}

function newList() {
  setAsideComponemt('createList');
}

async function createList() {
  const listName = document.getElementsByName('listName')[0].value;
  const data = await create(
    'users/' + localStorage.userId + '/lists',
    {
      access_token: localStorage.access_token,
    },
    {
      name: listName,
    },
  );
  selectList(data);
  changeDisplay('createList', 'none');
  return false;
}

function displayLists(data) {
  const div = document.getElementById('listsContainer');
  div.innerHTML = '';
  let i = 0;
  while (i < data.length) {
    const btn = document.createElement('button');
    const listData = data[i];
    btn.innerHTML = data[i].name;
    btn.onclick = () => selectList(listData);
    div.appendChild(btn);
    i++;
  }
  const btn = document.createElement('button');
  btn.innerHTML = '+ nova lista';
  btn.classList.add('add');
  btn.onclick = newList;
  div.appendChild(btn);
}

function selectList(data) {
  list = data;
  if (isMobile) {
    hideDrawer();
  }
  changeDisplay('search', 'flex');

  changeTextClass('listName', data.name);
  if (data.users) {
    changeTextClass('listOwner', data.users[0].fullName);
  }
  if (!data.destinations || !data.destinations.length) {
    setAsideComponemt('emptyList');
  } else if (infos.country) {
    setAsideComponemt('selected');
    buildMarkers(data.destinations);
  } else {
    const firstDestination = data.destinations[0];
    const latLng = new google.maps.LatLng(
      firstDestination.coords.lat,
      firstDestination.coords.lng,
    );
    listDestinations();
    setAsideComponemt('noClick');
    map.panTo(latLng);
    buildMarkers(data.destinations);
  }

  if (data.createdBy === localStorage.userId) {
    changeDisplay('adminOptions', 'initial');
    const div = document.getElementById('sharedWith');
    data.users.forEach(usr => {
      if (usr.id !== localStorage.userId) {
        const email = document.createElement('div');
        email.classList.add('shareEmail');
        const p = document.createElement('p');
        p.innerHTML = usr.email;
        const deleteIcon = document.createElement('button');
        const close = document.createElement('img');
        close.src = '../assets/icons/close.svg';
        deleteIcon.onclick = () => deleteUsr(usr.id);
        deleteIcon.appendChild(close);
        email.appendChild(p);
        email.appendChild(deleteIcon);
        div.appendChild(email);
      }
    });
  }
  if (isSharing) {
    changeDisplay('createAccount', 'block');
    changeDisplay('viewLists', 'none');
  } else if (!isSharing && data.createdBy !== localStorage.userId) {
    changeDisplay('guestOptions', 'initial');
  }
}

function selectPlace(data) {
  currentDestination = data;
  const latLng = new google.maps.LatLng(data.coords.lat, data.coords.lng);
  const removeButton = document.getElementById('removePlace');
  map.panTo(latLng);
  map.setZoom(15);
  setAsideComponemt('selected');
  changeText('name', data.place);
  changeText('country', data.country);
  if (!data.customPics) {
    loadGooglePics(data.photoURLs);
  }
  const options = ['hotels', 'places', 'others'];

  let i = 0;
  while (i < 3) {
    const type = options[i];
    document.querySelector('.' + type + ' .linksContainer').innerHTML = '';
    if (isSharing) {
      document.querySelector('.' + type + ' .addLinks').style.display = 'none';
    }
    if (data[type].length > 0) {
      data[type].forEach(link => {
        addLink(link, type);
      });
      document.querySelector('.' + type + ' .addLinks').innerHTML = 'Editar';
    } else {
      document.querySelector('.' + type + ' .addLinks').innerHTML = 'Adicionar';
    }
    loadSearchButton(data.place, type);
    i++;
  }

  removeButton.onclick = () => removePlace(data.id);
  buildMarkers(list);
  if (isMobile) {
    toggleDrawer();
  }
}

function loadSearchButton(location, type) {
  const elem = document.querySelector('.' + type + ' .webSearch');
  const encodedLocation = encodeURIComponent(location);
  let url;
  switch (type) {
    case "hotels":
      url =
        'https://www.google.com/travel/hotels/' + encodedLocation;
      break;
    case "others":
      url = 'https://www.google.com/search?q=dicas+' + encodedLocation;
    break
    default:
      break;
  }
  console.log(url);
  elem.href = url;
}

function showLinksDialog(type) {
  editing = type;
  const saveButton = document.querySelector('#modalContainer .save');
  saveButton.classList.add(type);
  changeDisplay('modal', 'flex');
  document.getElementById('linkList').innerHTML = '';
  currentDestination[type].forEach(link => {
    addLink(link, 'dialog');
  });
}

async function removePlace(id) {
  await remove('lists/' + list.id + '/destinations/' + id, {
    access_token: localStorage.access_token,
  });
  infos = {};
  closeDestination();
  reloadList();
}

async function reloadList() {
  const newList = await get('lists/' + list.id, {
    access_token: localStorage.access_token,
    filter: '{"include": ["destinations", "users"]}',
  });
  list = newList;
  clearMarkers();
  selectList(list);
}

function listDestinations() {
  const div = document.getElementById('placesList');
  div.innerHTML = '';
  for (const key in list.destinations) {
    if (list.destinations.hasOwnProperty(key)) {
      const element = list.destinations[key];
      const place = document.createElement('li');
      const link = document.createElement('a');
      link.onclick = () => selectPlace(element);
      link.innerHTML = element.place + ', ' + element.country;
      place.appendChild(link);
      div.appendChild(place);
    }
  }
}

function closeDestination() {
  listDestinations();
  setAsideComponemt('noClick');
}

function viewLists() {
  clearMarkers();
  setAsideComponemt('selectList');
}

async function changeIcon(icon) {
  const data = await patch(
    'lists/' + list.id,
    {
      access_token: localStorage.access_token,
    },
    {
      markerIcon: icon,
    },
  );
  list.markerIcon = data.markerIcon;
  clearMarkers();
  console.log(list);
  buildMarkers(list.destinations);
}

async function deleteList() {
  const sure = confirm(
    'Tem certeza que deseja excluir essa lista? Essa ação não poderá ser desfeita.',
  );
  if (!sure) {
    return;
  }

  await remove('users/' + localStorage.userId + '/lists/' + list.id, {
    access_token: localStorage.access_token,
  });

  clearMarkers();
  loadLists();
}

function closeModal() {
  editing = null;
  document.querySelector('#links textarea').value = '';
  changeDisplay('modal', 'none');
}

document
  .querySelector('#links textarea')
  .addEventListener('keyup', linksListener);
document
  .querySelector('#links textarea')
  .addEventListener('paste', linksListener);

async function linksListener() {
  const value = document.querySelector('#links textarea').value;
  const lines = value.split('\n').slice(0, -1);
  const URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,16}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  if (lines.length > 0) {
    let i = 0;
    while (i < lines.length) {
      if (URLRegex.test(lines[i])) {
        const link = await processLink(lines[i]);
        addLink(link, 'dialog');
      } else if (lines[i].match(/\w/g)) {
        addLink({text: lines[i]}, 'dialog');
      }
      i++;
    }
    document.querySelector('#links textarea').value = '';
  }
}

async function processLink(url) {
  const list = document.getElementById('linkList');
  let p = document.createElement('p');
  p.innerHTML = 'carregando...';
  list.appendChild(p);
  const data = {};

  try {
    const pageInfo = await request(
      'https://m27e170alf.execute-api.sa-east-1.amazonaws.com/dev/links/load',
      null,
      {
        url,
      },
      'POST',
    );
    p.remove();
    data.url = pageInfo.body.url;
    data.text = pageInfo.body.text;
  } catch (error) {
    console.log(error);
    p.remove();
    data.url = url;
    data.text = url;
  }
  return data;
}

async function addLink(data, place) {
  let list;
  let p = document.createElement('p');

  switch (place) {
    case 'dialog':
      list = document.getElementById('linkList');
      break;
    case 'hotels':
      list = document.querySelector('.hotels .linksContainer');
      break;
    case 'places':
      list = document.querySelector('.places .linksContainer');
      break;
    case 'others':
      list = document.querySelector('.others .linksContainer');
      break;
    default:
      return false;
  }

  if (data.url) {
    const link = document.createElement('a');
    link.href = data.url;
    link.innerHTML = data.text;
    link.setAttribute('target', '_blank');
    p.appendChild(link);
  } else {
    p.innerHTML = data.text;
  }

  if (place === 'dialog') {
    const text = p;
    p = document.createElement('div');
    p.classList.add('modalUrl');
    const deleteIcon = document.createElement('button');
    const trash = document.createElement('img');
    trash.src = '../assets/icons/bin-grey.svg';
    deleteIcon.onclick = () => deleteLink(data.text.trim());
    deleteIcon.appendChild(trash);
    p.appendChild(text);
    p.appendChild(deleteIcon);
  }
  list.appendChild(p);
}

async function updateLinks() {
  const links = document.querySelectorAll('#linkList p');
  const urls = [];
  let i = 0;
  while (i < links.length) {
    const link = {};
    link.text = links[i].innerText;
    if (links[i].children[0] && links[i].children[0].tagName === 'A') {
      link.url = links[i].children[0].href;
    }

    urls.push(link);
    i++;
  }
  console.log(urls);

  const data = await update(
    'lists/' + list.id + '/destinations/' + currentDestination.id,
    {
      access_token: localStorage.access_token,
    },
    {
      [editing]: urls,
    },
  );

  console.log(data);
  if (data.id) {
    currentDestination = data;
    document.querySelector('.' + editing + ' .addLinks').innerHTML = 'Editar';
    document.querySelector('.' + editing + ' .linksContainer').innerHTML = '';
    data[editing].forEach(link => {
      addLink(link, editing);
    });
  }
  closeModal();
}

function deleteLink(url) {
  const links = document.querySelectorAll('#linkList div');
  const urls = [];
  let i = 0;
  while (i < links.length) {
    urls.push(links[i].innerText.trim());
    i++;
  }

  console.log(url, urls);
  const curr = links[urls.indexOf(url)];
  console.log(curr);
  curr.remove();
}

async function share() {
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  const email = document.getElementsByName('inviteEmail')[0].value;
  if (!emailRegex.test(email)) {
    return alert('Oops, parece que você inseriu o email errado.');
  }
  const data = await create(
    'invites',
    {
      access_token: localStorage.access_token,
    },
    {
      email,
      listId: list.id,
      listName: list.name,
    },
  );

  console.log(data);
  if (data.id) {
    alert('Convite enviado com sucesso!');
    document.getElementsByName('inviteEmail')[0].value = '';
    return;
  } else {
    alert('Oops, algo deu errado ao enviar o convite');
  }
}

function getUrlParams() {
  const search = window.location.search;
  const hashes = search.slice(search.indexOf('?') + 1).split('&');
  const params = {};
  hashes.map(hash => {
    const [key, val] = hash.split('=');
    params[key] = decodeURIComponent(val);
  });
  return params;
}

async function answerInvite(id) {
  const invite = await get('invites/' + id, {
    access_token: localStorage.access_token,
  });

  console.log(invite);
  if (invite.error && invite.error.statusCode === 401) {
    alert('Você precisa estar logado(a) para responder o convite.');
    localStorage.setItem('inviteId', id);
    window.location.href = '/';
    return;
  } else if (invite.error && invite.error.statusCode === 404) {
    clearQuery();
    loadLists();
    return alert('Convite inválido ou expirado.');
  }

  const accept = confirm('Deseja acompanhar a lista ' + invite.listName + '?');

  const res = await update(
    'invites/' + id + '/answer',
    {
      access_token: localStorage.access_token,
    },
    {
      id,
      answer: accept,
    },
  );

  console.log(res);
  clearQuery();
  loadLists();
  localStorage.removeItem('inviteId');
}

function clearQuery() {
  history.replaceState &&
    history.replaceState(
      null,
      '',
      location.pathname +
        location.search.replace(/[\?&].+/, '').replace(/^&/, '?'),
    );
}

async function unlinkList() {
  const sure = confirm('Tem certeza que não quer mais acompanhar essa lista?');
  if (!sure) return;

  await remove('users/' + localStorage.userId + '/lists/rel/' + list.id, {
    access_token: localStorage.access_token,
  });

  loadLists();
}

async function shareUrl() {
  if (!list.isPublic) {
    const res = await patch(
      'lists/' + list.id,
      {
        access_token: localStorage.access_token,
      },
      {
        isPublic: true,
      },
    );
  }
  const newUrl = window.location.origin + '/map?list=' + list.id;
  console.log(newUrl);
  if (navigator.share) {
    navigator
      .share({
        title: list.name,
        text: 'Confira minha lista de destinos no Vamos Fugir!',
        url: newUrl,
      })
      .then(() => console.log('Successful share'))
      .catch(error => console.log('Error sharing', error));
  } else {
    const el = (document.getElementsByName('shareUrl')[0].value = newUrl);
    el.select();
    document.execCommand('copy');
    alert('Link copiado!');
  }
}

async function loadSharedList(id) {
  isSharing = true;
  const data = await get('lists/public/' + id, {});

  selectList(data);
  console.log(data);
}

async function logout() {
  await create(
    'usres/logout',
    {
      access_token: localStorage.access_token,
    },
    {},
  );

  localStorage.clear();
  window.location.href = '/';
}

function hideDrawer() {
  drawerVisible = false;
  document.getElementsByTagName('aside')[0].classList.add('down');
  changeDisplay('search', 'flex');
}

function showDrawer() {
  drawerVisible = true;
  document.getElementsByTagName('aside')[0].classList.remove('down');
  changeDisplay('search', 'none');
}

function toggleDrawer() {
  if (drawerVisible) {
    hideDrawer();
  } else {
    showDrawer();
  }
}

document.getElementById('swiper').ontouchstart = e => {
  swipeStart = e.touches[0].pageY;
  document.getElementById('swiper').classList.add('focus');
  e.preventDefault();
};

document.getElementById('swiper').ontouchend = e => {
  const end = e.changedTouches[0].pageY;
  document.getElementById('swiper').classList.remove('focus');
  document.getElementsByTagName('aside')[0].style.top = '';
  console.log(swipeStart, end);
  if (end >= swipeStart && drawerVisible) {
    hideDrawer();
  } else if (end <= swipeStart && !drawerVisible) {
    showDrawer();
  }
};

document.getElementById('swiper').ontouchmove = e => {
  const pos = e.touches[0].pageY;
  console.log(pos);
  document.getElementsByTagName('aside')[0].style.top = pos + 'px';
};

function setAsideComponemt(id) {
  const elems = document.querySelector('aside').children;
  let i = 1;

  while (i < elems.length) {
    const elem = elems[i];
    if (elem.id === id) {
      elem.style.display = 'flex';
    } else {
      elem.style.display = 'none';
    }
    i++;
  }
}
