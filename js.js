"use strict";
const togglenappi = document.getElementById("togglenappi");
const navbarLinkit = document.getElementById("navbar-linkit");
const tanaan = new Date(); // aika jolla katotaan pizza paikat.
const curDate = tanaan.getFullYear() + "-" + (tanaan.getMonth() + 1) + "-" + tanaan.getDate();
const curAika = tanaan.getHours() + ":" + tanaan.getMinutes() + ":" + tanaan.getSeconds();
const vkPaiva = tanaan.getDay() - 1 || 6;

const apiOsoite = "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
const proxy = "https://cors-anywhere.herokuapp.com/";
const map = L.map("map").setView([60.21, 24.95], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// kustom markkerit
const vIcon = L.divIcon({className: "vihrea-ikoni"});
const pIcon = L.divIcon({className: "punainen-ikoni"});

// Kartan search bar **************************************
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
// Kartan search bar *******************************************

function success(pos) {
  const crd = pos.coords;
  getPizza(crd.latitude, crd.longitude).catch((e) => {
    console.log("Error");
    console.log(e);
  });
  map.setView([crd.latitude, crd.longitude], 15);
  L.marker([crd.latitude, crd.longitude]).addTo(map).bindPopup("Olen Tässä"); // lisätään markkeri omaan lokaatioon
}

// Funktio, joka ajetaan, jos paikkatietojen hakemisessa tapahtuu virhe
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);
// {lat: ${lahto.latitude}, lon: ${lahto.longitude}}
//  {lat: ${kohde.latitude}, lon: ${kohde.longitude}
// haetaan reitti lähtöpisteen ja kohteen avulla
function haeReitti(lahto, kohde) {
  // GraphQL haku
  const haku = `{
    plan(
      fromPlace: "Lokaatiosi::${lahto.latitude},${lahto.longitude}",
      toPlace: "Pizzeriasi::${kohde.latitude},${kohde.longitude}",
      numItineraries: 1, date: "${curDate}", time: "${curAika}")
      {
        itineraries {
          legs {
            startTime
            endTime
            mode
            duration
            distance
            legGeometry {
              points
              length
            }
          }
        }
      }
    }`;

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({query: haku}), // GraphQL haku lisätään queryyn
  };

  // lähetetään haku
  fetch(proxy + apiOsoite, fetchOptions)
    .then(function (vastaus) {
      return vastaus.json();
    })
    .then(function (tulos) {
      console.log(tulos.data.plan.itineraries[0].legs);
      const googleKoodattuReitti = tulos.data.plan.itineraries[0].legs;

      for (let i = 0; i < googleKoodattuReitti.length; i++) {
        let kulkumode = "";
        let color = "";
        switch (googleKoodattuReitti[i].mode) {
          case "WALK":
            color = "green";
            kulkumode = "Kävely";
            break;
          case "BUS":
            color = "red";
            kulkumode = "Linja-auto";
            break;
          case "RAIL":
            color = "cyan";
            kulkumode = "Juna";
            break;
          case "TRAM":
            color = "magenta";
            kulkumode = "Metro";
            break;
          default:
            color = "blue";
            kulkumode = "Raitsikka";
            break;
        }
        const startAika = new Date(googleKoodattuReitti[i].startTime);
        const endAika = new Date(googleKoodattuReitti[i].endTime);
        const reitti = googleKoodattuReitti[i].legGeometry.points;
        const reittiData = `<p>Lähtöaika: ${startAika.getHours() + ":" + startAika.getMinutes()}<br/>Päätösaika: ${
          endAika.getHours() + ":" + endAika.getMinutes()
        }</p><p>Kulkuväline: ${kulkumode} 
        <br/>Kesto (min): ${(googleKoodattuReitti[i].duration / 60).toFixed(1)} 
        <br/>Matkan pituus (km): ${(googleKoodattuReitti[i].distance / 1000).toFixed(2)}</p>`;
        const pisteObjektit = L.Polyline.fromEncoded(reitti).getLatLngs(); // fromEncoded: muutetaan Googlekoodaus Leafletin Polylineksi
        L.polyline(pisteObjektit)
          .setStyle({
            color,
          })
          .addTo(map)
          .bindPopup(reittiData);
      }
      map.fitBounds([
        [lahto.latitude, lahto.longitude],
        [kohde.latitude, kohde.longitude],
      ]);
    })
    .catch(function (e) {
      console.error(e.message);
    });
}

/* forlooppi iconin muodostamiseen (puutteelinen)
  for(let i; i < 7; i++){
    let openPizza = document.createElement("div");
    openPizza[i].className = "pizza"+[i];
  }  */

async function getPizza(originlat, originlong) {
  const pizzaUrl = "http://open-api.myhelsinki.fi/v1/places/?tags_filter=Pizza";
  const origin = {latitude: originlat, longitude: originlong};
  const response = await fetch(`${proxy}${pizzaUrl}`).catch((e) => {
    console.log("Error");
    console.log(e);
  });
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
    <a id="Sreitti" title="Navigoi itsesi perille" href="#" onclick="haeReitti({latitude: ${origin.latitude}, longitude: ${
      origin.longitude
    }},{latitude: ${info.Latitude}, longitude: ${info.Longitude}});return false;">Navigoi</a>
    </details>`;
    let marker;
    if (curAika >= open != false && curAika >= closed != true) {
      marker = L.marker([info.Latitude, info.Longitude], {icon: pIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    } else {
      marker = L.marker([info.Latitude, info.Longitude], {icon: vIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    }
  });
  /*   console.log(jsonData.data); */
}

//otsikon responsive bari
togglenappi.addEventListener("click", () => {
  navbarLinkit.classList.toggle("active");
});
