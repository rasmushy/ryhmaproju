"use strict";
const tanaan = new Date(); // aika jolla katotaan pizza paikat.
const curAika = tanaan.getHours() + ":" + tanaan.getMinutes() + ":" + tanaan.getSeconds();
const vkPaiva = tanaan.getDay() - 1 || 6;
const proxy = "https://cors-anywhere.herokuapp.com/";
const map = L.map("map").setView([60.21, 24.95], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
const hakuPainike = document.querySelector(".haku__nappi");
const hakuTxt = document.querySelector(".haku__teksti");

/* const moreInfo = document.querySelector("#summary"); */
// kustom markkerit
const vIcon = L.divIcon({className: "vihrea-ikoni"});
const pIcon = L.divIcon({className: "punainen-ikoni"});

// Asetukset paikkatiedon hakua varten (valinnainen)
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
  casesensitive: false,
};

// funktio markerien tekoon
function lisaaMarker(open, closed, teksti, info) {
  if (curAika >= open != false && curAika > closed != false) {
    L.marker([info.Latitude, info.Longitude], {icon: pIcon}, {title: info.nimi})
      .addTo(map)
      .bindPopup(teksti)
      .on("click", () => {
        document.querySelector("#Snimi").innerHTML = info?.nimi || "";
        document.querySelector("#Sosoite").innerHTML = info?.osoite || "";
        document.querySelector("#Surli").href = info?.urli || "javascript:void(0)";
      });
    /*     pizzaData[i] = pizzaData[i].push(markerO);
    console.log(pizzaData); */
  } else {
    L.marker([info.Latitude, info.Longitude], {icon: vIcon}, {title: info.nimi})
      .addTo(map)
      .bindPopup(teksti)
      .on("click", () => {
        document.querySelector("#Snimi").innerHTML = info?.nimi || "";
        document.querySelector("#Sosoite").innerHTML = info?.osoite || "";
        document.querySelector("#Surli").href = info?.urli || "javascript:void(0)";
      });
    /*     pizzaData[i] = pizzaData[i].push(markerC);
    console.log(pizzaData); */
  }
}

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

  /*   let i = 0; */
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
    /*     i += 1; */
    const teksti = `<h3 id="Snimi">${info.nimi}</h3>
    <a id="Surli" href="${info.urli}">Kotisivu</a>
    <details>
    <summary>Lisätiedot</summary>
    <h4 id="Sosoite">${info.osoite}</h4>
    <p id="Saukioloaika">${open}-${closed}</p>
    </details>`;
    lisaaMarker(open, closed, teksti, info);
  });
  console.log(jsonData.data);
}

function pizzaSearch(id) {
  for (let j in pizzaData) {
    const pizzaID = pizzaData[j].options.title;
    if (pizzaID == id) {
      pizzaData[j].openPopup();
    }
  }
}

// kun painat nappia -> tsegee onko inputboxissa mitään ja tästä syystä lähettää search toiminnon eteenpäin ja näyttää main contentin.
let pId;
hakuPainike.addEventListener("click", () => {
  pId = hakuTxt.value;
  if ((pId === "") != false) {
    return console.log("inputbox is empty");
  } else {
    pizzaSearch(pId);
    console.log("searchaan");
    console.log(pId);
  }
});

// kun painat entteriä -> sama juttu kuin ylempi.
hakuTxt.addEventListener("keyup", (e) => {
  if (e.keyCode === 13) {
    e.preventDefault();
    hakuPainike.click();
    pId = hakuTxt.value;
    if ((pId === "") != false) {
      return;
    } else {
      pizzaSearch(pId);
      console.log("searchaan");
      console.log(pId);
    }
  }
});

/* id: objData.id, */
/* pizzaData[i] = info; */
