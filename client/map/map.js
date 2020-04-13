let autocomplete, map, place;
let markers = [];

function buildMarkers(data) {
  let i = 0;
  let marker;
  while (i < data.length) {
    let pin = list.markerIcon;
    if (data[i].visited) {
      pin += "_done";
    }

    var icon = {
      url: "../assets/markers/" + pin + ".png",
      scaledSize: new google.maps.Size(45, 45),
    };

    marker = new google.maps.Marker({
      map: map,
      position: new google.maps.LatLng(data[i].coords.lat, data[i].coords.lng),
      animation: google.maps.Animation.DROP,
      icon: icon,
    });

    markers.push(marker);
    google.maps.event.addListener(
      marker,
      "click",
      (function (marker, i) {
        return function () {
          selectPlace(data[i]);
        };
      })(marker, i)
    );
    i++;
  }
}

function clearMarkers() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 3,
    minZoom: 2,
    disableDefaultUI: true,
  });

  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById("autocomplete"),
    {
      types: ["(regions)"],
    }
  );

  map.addListener("drag", function () {
    changeDisplay("addPlace", "none");
    place = null;
  });

  autocomplete.addListener("place_changed", function () {
    place = autocomplete.getPlace();
    place.photoURLs = [];
    place.coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    for (const key in place.photos) {
      place.photoURLs.push(place.photos[key].getUrl());
    }
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(15); // Why 17? Because it looks good.
    }
    changeDisplay("addPlace", "flex");
  });
}
