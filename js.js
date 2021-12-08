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
const vIcon = L.divIcon({
  className: "open-ikoni",
  html: "<div class='marker-open'></div><i class='material-icons'>open</i>",
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});
const pIcon = L.divIcon({
  className: "closed-ikoni",
  html: "<div class='marker-closed'></div><i class='material-icons'>closed</i>",
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

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
      // valitaan värit reitille ja kulkuvälineet tiedoksi käyttäjälle
      for (let i = 0; i < googleKoodattuReitti.length; i++) {
        let kulkumode = "";
        let color = "";
        switch (googleKoodattuReitti[i].mode) {
          case "WALK":
            color = "green";
            kulkumode = "Kävely";
            break;
          case "BUS":
            color = "blue";
            kulkumode = "Linja-auto";
            break;
          case "RAIL":
            color = "red";
            kulkumode = "Juna";
            break;
          case "TRAM":
            color = "magenta";
            kulkumode = "Raitsikka";
            break;
          case "SUBWAY":
            color = "orange";
            kulkumode = "Metro";
            break;
          case "BICYCLE":
            color = "green";
            kulkumode = "Fillari";
            break;
          case "FERRY":
            color = "pink";
            kulkumode = "Lautta";
            break;
          default:
            color = "black";
            kulkumode = "Muu";
            break;
        }
        const startAika = new Date(googleKoodattuReitti[i].startTime); // aika on epoch muodossa niin muutetaan se
        const endAika = new Date(googleKoodattuReitti[i].endTime); // aika on epoch muodossa niin muutetaan se
        // tiedot reitin popuppiin
        const reittiData = `<p>Lähtöaika: ${startAika.getHours() + ":" + startAika.getMinutes()}<br/>Päätösaika: ${
          endAika.getHours() + ":" + endAika.getMinutes()
        }</p><p>Kulkuväline: ${kulkumode} 
        <br/>Kesto (min): ${(googleKoodattuReitti[i].duration / 60).toFixed(1)} 
        <br/>Matkan pituus (km): ${(googleKoodattuReitti[i].distance / 1000).toFixed(2)}</p>`;
        const reitti = googleKoodattuReitti[i].legGeometry.points;
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

async function getPizza(originlat, originlong) {
  const pizzaUrl = "http://open-api.myhelsinki.fi/v1/places/?tags_filter=Pizza";
  const origin = {latitude: originlat, longitude: originlong};
  const response = await fetch(`${proxy}${pizzaUrl}`).catch((e) => {
    console.log("Error");
    console.log(e);
  });
  const jsonData = await response.json();
  console.log(jsonData.data);
  Array.from(jsonData.data).forEach(function (objData) {
    // jokasen objectin osalta seuraava forloop ->
    /*    let aukiolo = new Date(); */
    /* let [hours, minutes, seconds] =  */
    /* let [tunti, minuutti, sekuntti] =  */
    /*   aukiolo.getHours(hours);
    aukiolo.getMinutes(minutes);
    aukiolo.getSeconds(seconds); */
    // tällä varmistetaan kumpi markkeri tulee mapille     /*  objData.opening_hours.hours[vkPaiva].opens */
    const open = objData.opening_hours.hours[vkPaiva].opens;
    // verrattuna tämän hetkiseen aikaan     /* objData.opening_hours.hours[vkPaiva].closes */
    const closed = objData.opening_hours.hours[vkPaiva].closes;
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
    if (curAika >= open != false && curAika >= closed != true) {
      L.marker([info.Latitude, info.Longitude], {icon: pIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    } else {
      L.marker([info.Latitude, info.Longitude], {icon: vIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    }
  });
}

//otsikon responsive bari
togglenappi.addEventListener("click", () => {
  navbarLinkit.classList.toggle("active");
});
