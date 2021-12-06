"use strict";
const tanaan = new Date(); // aika jolla katotaan pizza paikat.
const curAika = tanaan.getHours() + ":" + tanaan.getMinutes() + ":" + tanaan.getSeconds();
const vkPaiva = tanaan.getDay() - 1 || 6;
const proxy = "https://cors-anywhere.herokuapp.com/";
const map = L.map("map").setView([60.21, 24.95], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// kustom markkerit
const vIcon = L.divIcon({className: "vihrea-ikoni"});
const pIcon = L.divIcon({className: "punainen-ikoni"});
const pizzaLayer = new L.LayerGroup(); // layeri searchbarilla löytyville elementeille
map.addLayer(pizzaLayer);

const pizzaSearch = new L.Control.Search({
  position: "topright",
  layer: pizzaLayer,
  initial: false,
  zoom: 15,
  marker: false,
});

pizzaSearch.on("search:locationfound", (e) => {
  if (e.layer._popup) e.layer.openPopup();
});

map.addControl(pizzaSearch);
// Asetukset paikkatiedon hakua varten (valinnainen)
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function success(pos) {
  const crd = pos.coords;
  getPizza().catch((e) => {
    console.log("Error");
    console.log(e);
  });
  map.setView([crd.latitude, crd.longitude], 15);
  L.marker(crd.latitude, crd.longitude, "Olen tässä", {icon: pIcon}); // lisätään markkeri omaan lokaatioon
}

// Funktio, joka ajetaan, jos paikkatietojen hakemisessa tapahtuu virhe
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);

async function getPizza() {
  const pizzaUrl = "http://open-api.myhelsinki.fi/v1/places/?tags_filter=Pizza";
  const response = await fetch(`${proxy}${pizzaUrl}`);
  const jsonData = await response.json();
  Array.from(jsonData.data).forEach(function (objData) {
    // jokasen objectin osalta seuraava forloop ->
    const open = objData.opening_hours.hours[vkPaiva].opens; // tällä varmistetaan kumpi markkeri tulee mapille
    const closed = objData.opening_hours.hours[vkPaiva].closes; // verrattuna tämän hetkiseen aikaan
    const info = {
      nimi: objData.name.fi,
      osoite: objData.location.address.street_address,
      Latitude: objData.location.lat,
      Longitude: objData.location.lon,
      urli: objData.info_url,
    };
    const teksti = `<h3 id="Snimi">${info?.nimi || ""}</h3>
    <a id="Surli" href="${info?.urli || "javascript:void(0)"}">Kotisivu</a>
    <details>
    <summary>Lisätiedot</summary>
    <h4 id="Sosoite">${info?.osoite || ""}</h4>
    <p id="Saukioloaika">${open ?? ""}-${closed ?? ""}</p>
    </details>`;
    let marker;
    if (curAika >= open != false && curAika > closed != false) {
      marker = L.marker([info.Latitude, info.Longitude], {icon: pIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    } else {
      marker = L.marker(new L.latLng(info.Latitude, info.Longitude), {icon: vIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    }
  });
  /*   console.log(jsonData.data); */
}
