"use strict";
const tanaan = new Date(); // aika jolla katotaan pizza paikat.
const curAika = tanaan.getHours();
let vkPaiva = tanaan.getDay() - 1 || 6;
let arr = [];
const proxy = "https://cors-anywhere.herokuapp.com/";
const map = L.map("map").setView([60.21, 24.95], 11.5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const maparticle = document.querySelector(".kartta");
const nimi = document.querySelector("#nimi");
/* const moreInfo = document.querySelector("#summary"); */

// Asetukset paikkatiedon hakua varten (valinnainen)
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

/* // kustom markkerit
const vihreaikoni = L.divIcon({className: "vihrea-ikoni"});
const punainenikoni = L.divIcon({className: "punainen-ikoni"}); */

function success(pos) {
  const crd = pos.coords;
  getPizza().catch((e) => {
    console.log("Error");
    console.log(e);
  });
  map.setView([crd.latitude, crd.longitude], 12);
  L.marker(crd.latitude, crd.longitude, "Olen tässä"); // lisätään markkeri omaan lokaatioon
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
  hakuResults(jsonData.data);
}

/// for in loopilla monen objectin sisältä otetaan datat :3333

function hakuResults(results) {
  arr = results;
  const summaryText = `
  <h3 id="nimi"></h3>
  <details>
  <summary>Lisätiedot</summary>
  <h4 id="osoite"></h4>
  <p id="aukioloaika"></p>
  <a id="urli" href="">Kotisivu</a>
  </details>`;
  /* maparticle.innerHTML = ""; // refreshaa sivun ku haetaan uudestaan. */ /* id="summary" */
  maparticle.innerHTML += `
  <details>
  <summary>Lisätiedot</summary> 
  <p id="lisatiedot"></p>
  </details>`;
  arr.forEach(function (objData) {
    // jokasen objectin osalta seuraava forloop ->
    const info = {
      nimi: objData.name.fi,
      osoite: objData.location.address.street_address,
      Latitude: objData.location.lat,
      Longitude: objData.location.lon,
      aukioloaika: objData.opening_hours.hours[vkPaiva].closes,
      aukeeoloaika: objData.opening_hours.hours[vkPaiva].opens,
      lisatiedot: objData.description.body,
      urli: objData.info_url,
    };
    L.marker([info.Latitude, info.Longitude])
      .addTo(map)
      .bindPopup(summaryText)
      .on("click", () => {
        document.querySelector("#nimi").innerHTML = info?.nimi || "Damn son?";
        document.querySelector("#osoite").innerHTML = info?.osoite || "";
        document.querySelector("#aukioloaika").innerHTML = info?.aukeeoloaika || "";
        document.querySelector("#aukioloaika").innerHTML += "-";
        document.querySelector("#aukioloaika").innerHTML += info?.aukioloaika || "";
        document.querySelector("#urli").href = objData?.info_url || "javascript:void(0)";
        document.querySelector("#lisatiedot").innerHTML = info?.lisatiedot || "";
      });
  });
}
