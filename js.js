"use strict";
const tanaan = new Date(); // aika jolla katotaan pizza paikat.
let vkPaiva = tanaan.getDay();
let curAika = tanaan.getHours() + ":" + tanaan.getMinutes() + ":" + tanaan.getSeconds();

const proxy = "https://cors-anywhere.herokuapp.com/";
const distance = 10;
const distanceunit = "km";
const map = L.map("map").setView([60.21, 24.95], 11.5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
const maparticle = document.querySelector("#map article");
const nimi = document.querySelector("#nimi");
const osoite = document.querySelector("#osoite");
const aukioloaika = document.querySelector("#aukioloaika");
const lisatiedot = document.querySelector("#lisatiedot");

// Asetukset paikkatiedon hakua varten (valinnainen)
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

// kustom markkerit
const vihreaikoni = L.divIcon({className: "vihrea-ikoni"});
const punainenikoni = L.divIcon({className: "punainen-ikoni"});

function success(pos) {
  const crd = pos.coords;
  getPizza().catch((e) => {
    console.log("Error");
    console.log(e);
  });
  map.setView([crd.latitude, crd.longitude], 12);
  /*   lisaaMarker(crd.latitude, crd.longitude, "Olen tässä", punainenikoni); // lisätään markkeri omaan lokaatioon */
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
  console.log(jsonData.data);
  hakuResults(jsonData);
}

/// for in loopilla monen objectin sisältä otetaan datat :3333

function hakuResults(results) {
  maparticle.innerHTML = ""; // refreshaa sivun ku haetaan uudestaan.
  maparticle.innerHTML += `
  <h3 id="nimi"></h3>
  <h4 id="osoite"></h4>
  <p id="aukioloaika"></p>
  <p id="lisatiedot"></p>`;
  results.forEach(function (objData) {
    // jokasen objectin osalta seuraava forloop ->
    const info = {
      nimi: objData.name.fi,
      osoite: objData.location.address.street.address,
      Latitude: objData.location.lat,
      Longitude: objData.location.lon,
      aukioloaika: objData.opening_hours.hours,
      lisatiedot: objData.description.body,
    };
    L.marker([info.Latitude, info.Longitude], {icon: vihreaikoni})
      .addTo(map)
      .bindPopup(info.nimi)
      .on("click", () => {
        nimi.innerHTML = info?.nimi || "";
        osoite.innerHTML = info?.osoite || "";
        aukioloaika.innerHTML = info?.aukioloaika || "";
        lisatiedot.innerHTML = info?.lisatiedot || "";
      });
  });
}
