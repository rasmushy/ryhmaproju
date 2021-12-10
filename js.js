"use strict";
const togglenappi = document.getElementById("togglenappi");
const navbarLinkit = document.getElementById("navbar-linkit");
const navbarMap = document.querySelector(".navbar__map");
const navbarFaq = document.querySelector(".navbar__faq");
const navTitleHtml = document.querySelector(".brand-title");
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

// kustom markkeritz
const pIcon = L.divIcon({
  className: "open-ikoni",
  html: "<div class='marker-open'></div>",
  iconSize: [30, 30],
  iconAnchor: [15, 40],
});
const vIcon = L.divIcon({
  className: "closed-ikoni",
  html: "<div class='marker-closed'></div>",
  iconSize: [30, 30],
  iconAnchor: [15, 40],
});

// Kartan search bar **************************************
const pizzaLayer = new L.LayerGroup(); // layeri searchbarilla löytyville elementeille
map.addLayer(pizzaLayer);

const pizzaSearch = new L.Control.Search({
  textPlaceholder: "Etsi Pizzerian nimellä...",
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
  L.marker([crd.latitude, crd.longitude], {title: "Olet tässä"}).addTo(map).bindPopup(`<p title="Lokaatiosi">Olet Tässä</p>`); // lisätään markkeri omaan lokaatioon
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
            color = "black";
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
        const reittiData = `<p>Kello on tällä hetkellä:<br/>${curAika}</p><p>Kulkuväline: ${kulkumode}<br/>Lähtöaika: ${
          startAika.getHours() + ":" + startAika.getMinutes()
        }<br/>Päätösaika: ${endAika.getHours() + ":" + endAika.getMinutes()}</p><p>Kesto (min): ${(googleKoodattuReitti[i].duration / 60).toFixed(1)} 
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
  const origin = {latitude: originlat, longitude: originlong}; // origin säästetään jotta se voidaan lähettää reittiopas functiolle
  const response = await fetch(`${proxy}${pizzaUrl}`).catch((e) => {
    console.log("Error");
    console.log(e);
  });
  const jsonData = await response.json();
  console.log(jsonData.data);
  Array.from(jsonData.data).forEach(function (objData) {
    // jokasen objectin osalta seuraava forloop ->
    // ekaksi infot markkeria varten
    const info = {
      nimi: objData.name.fi,
      osoite: objData.location.address.street_address,
      Latitude: objData.location.lat,
      Longitude: objData.location.lon,
      urli: objData.info_url,
    };
    // seuraavaksi asetetaan aukioloajat Date muotoon. vkPaiva const pitää huolen että tietää onko ma ti ke to pe jne.
    const open = new Date();
    const closed = new Date();
    open.setHours(objData.opening_hours?.hours?.[vkPaiva].opens?.split(":")[0] || "");
    open.setMinutes(objData.opening_hours?.hours?.[vkPaiva].opens?.split(":")[1] || "");
    open.setSeconds(objData.opening_hours?.hours?.[vkPaiva].opens?.split(":")[2] || "");
    // katsotaan onko sulkeutumisaika pienempi kuin alkamisaika (keskiyö)
    if ((objData.opening_hours?.hours?.[vkPaiva].closes?.split(":")[0] || "") < open.getHours()) {
      closed.setDate(tanaan.getDate() + 1); //mikäli on niin lisätään closed dayhin yksi päivä lisää.
      closed.setHours(objData.opening_hours?.hours?.[vkPaiva].closes?.split(":")[0] || "");
    } else {
      closed.setHours(objData.opening_hours?.hours?.[vkPaiva].closes?.split(":")[0] || "");
    }
    // lisätään loput aukioloajat open & closed consteihin

    closed.setMinutes(objData.opening_hours?.hours?.[vkPaiva].closes?.split(":")[1] || "");
    closed.setSeconds(objData.opening_hours?.hours?.[vkPaiva].closes?.split(":")[2] || "");
    // luodaan lista muuttujia jolla saadaan aika muotoon hh:mm.
    let aukih = open.getHours() + "";
    let aukim = open.getMinutes() + "";
    let kiinnih = closed.getHours() + "";
    let kiinnim = closed.getMinutes() + "";
    // aukiolocheck antaa paikalle ajan mikäli semmoinen löytyy, esim. 00:00 - 00:00 ei ole aukioloaika.
    let aukioloCheck = `<p id="Saukioloaika">${aukih.padStart(2, "0") + ":" + aukim.padStart(2, "0")}-${
      kiinnih.padStart(2, "0") + ":" + kiinnim.padStart(2, "0")
    }</p>`;
    // tässä if lauseke jolla aukiolocheck muuttuu mikäli aukioloaikoja ei ole saatavilla.
    if (open.getHours() == 0) {
      aukioloCheck = `<p id="Saukioloaika">Aukioloaika ei saatavilla</p>`;
    }
    // popup tekstin sisältö, tässä luodaan myös navigoi linkki sekä kotisivu linkki.
    const teksti = `<h3 id="Snimi">${info?.nimi || ""}</h3><h4 id="Sosoite" title="Siirry pizzerian kotisivuille">${info?.osoite || ""}</h4>
    ${aukioloCheck}
    <a id="Surli" href="${info?.urli || "javascript:void(0)"}">Kotisivulle</a><br/>
    <a id="Sreitti" title="Katso miten julkiset menevät paikalle.." href="#" onclick="haeReitti({latitude: ${origin.latitude}, longitude: ${
      origin.longitude
    }},{latitude: ${info.Latitude}, longitude: ${info.Longitude}});return false;">Reittihaku</a>`;
    /*     console.log(open + "<------- ohessa aika open constilla");
    console.log(closed + "<------- ohessa aika closed constilla"); */
    if ((tanaan >= open != false && tanaan < closed != false) /* || curAika < "4:00:00"  */ || open.getHours() == 0) {
      L.marker([info.Latitude, info.Longitude], {icon: pIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    } else {
      L.marker([info.Latitude, info.Longitude], {icon: vIcon, title: info.nimi}).addTo(pizzaLayer).bindPopup(teksti);
    }
  });
}

// responsive togglebuttoni
togglenappi.addEventListener("click", () => {
  navbarLinkit.classList.toggle("active");
});
//otsikon navbar listenerit sekä titleä painamalla pääset scrollaantumaan
navbarMap.addEventListener("click", () => {
  document.querySelector("#map").scrollIntoView({behavior: "smooth"});
});

navbarFaq.addEventListener("click", () => {
  document.querySelector("#infovideo").scrollIntoView({behavior: "smooth"});
});

navTitleHtml.addEventListener("click", () => {
  document.querySelector("#top").scrollIntoView({behavior: "smooth"});
});
