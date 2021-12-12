"use strict";
const togglenappi = document.getElementById("togglenappi");
const navbarLinkit = document.getElementById("navbar-linkit");
const navbarMap = document.querySelector(".navbar__map");
const navbarFaq = document.querySelector(".navbar__faq");
const navTitleHtml = document.querySelector(".nav-otsikko");
const leafletDivCancel = document.querySelector(".leaflet-div-wrapper");
// aika jolla katotaan pizza paikat.
const tanaan = new Date();
const curDate = tanaan.getFullYear() + "-" + (tanaan.getMonth() + 1) + "-" + tanaan.getDate();
const curAika = tanaan.getHours() + ":" + tanaan.getMinutes() + ":" + tanaan.getSeconds();
const vkPaiva = tanaan.getDay() - 1;
// reittioppaan apiosoite sekä proxyosoite
const apiOsoite = "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
const proxy = "https://cors-anywhere.herokuapp.com/";
// Luodaan kartta nimellä map
const map = L.map("map").setView([60.21, 24.95], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// kustom markkerit pizzerioille, pIcon = auki & vIcon = kiinni
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

// Layerit kartalle: searchbarille ja reitille
const pizzaLayer = new L.LayerGroup();
const reittiLayer = new L.LayerGroup();
// Sublayerit markkereitten näkymistä varten togglenapilla.
const pizzaAuki = new L.LayerGroup();
const pizzaKiinni = new L.LayerGroup();
//  ********************** Kartan searchbar STARTS *********************
const pizzaSearch = new L.Control.Search({
  textPlaceholder: "Etsi Pizzerian nimellä...",
  position: "topright",
  layer: L.featureGroup([pizzaAuki, pizzaKiinni]),
  initial: false,
  zoom: 15,
  marker: false,
});

pizzaSearch.on("search:locationfound", (e) => {
  if (pizzaLayer.hasLayer(pizzaKiinni) != true) {
    markerToggle(0);
  }
  e.layer.openPopup();
});
// ******************** Kartan searchbar ENDS ***********************

// addataan layerit kartalle lukuunottamatta kiinniolevia paikkoja.
map.addLayer(reittiLayer);
map.addLayer(pizzaLayer);
pizzaLayer.addLayer(pizzaAuki);
pizzaLayer.addLayer(pizzaKiinni);
// doubleclick zoomi disabloitu niin mapin näppäimet toimii paremmin
map.doubleClickZoom.disable();
// lisätään searhcbar
map.addControl(pizzaSearch);
// Asetukset paikkatiedon hakua varten (valinnainen)
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
};

function success(pos) {
  const crd = pos.coords;
  getPizza(crd.latitude, crd.longitude).catch((e) => {
    console.log("Error");
    console.log(e);
  });
  map.setView([crd.latitude, crd.longitude], 13);
  L.marker([crd.latitude, crd.longitude], {title: "Olet tässä"}, {label: "Olet tässä"}).addTo(pizzaLayer); // lisätään markkeri omaan lokaatioon .bindPopup(`<h3 title="Lokaatiosi">Olet Tässä</h3>`)
}

// Funktio, joka ajetaan, jos paikkatietojen hakemisessa tapahtuu virhe
function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

// Käynnistetään paikkatietojen haku
navigator.geolocation.getCurrentPosition(success, error, options);

// haetaan reitti lähtö- ja kohde kordinaattien avulla
function haeReitti(lahto, kohde) {
  // poistetaan kartalta reitti mikäli semmoinen siellä on jo.
  reittiLayer.clearLayers();
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
            }
          }
          startTime
          endTime
          duration
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
      const reittiDivi = tulos.data.plan.itineraries[0];
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

        // aika on epoch muodossa niin muutetaan se
        const startAika = new Date(googleKoodattuReitti[i].startTime);
        const endAika = new Date(googleKoodattuReitti[i].endTime);
        let lahtoH = tanaan.getHours() + "";
        let lahtoM = tanaan.getMinutes() + "";
        let startH = startAika.getHours() + "";
        let startM = startAika.getMinutes() + "";
        let endH = endAika.getHours() + "";
        let endM = endAika.getMinutes() + "";
        // tiedot reitin popuppiin
        const reittiData = `<p>Kello on tällä hetkellä:<br/>${
          lahtoH.padStart(2, "0") + ":" + lahtoM.padStart(2, "0")
        }</p><p>Kulkuväline: ${kulkumode}<br/>Reittiaika: ${startH.padStart(2, "0") + ":" + startM.padStart(2, "0")}-${
          endH.padStart(2, "0") + ":" + endM.padStart(2, "0")
        }</p><p>Kesto (min): ${(googleKoodattuReitti[i].duration / 60).toFixed(1)} 
        <br/>Matkan pituus (km): ${(googleKoodattuReitti[i].distance / 1000).toFixed(2)}</p>`;
        // Otetaan graphql:sta googlereitti
        const reitti = googleKoodattuReitti[i].legGeometry.points;
        const pisteObjektit = L.Polyline.fromEncoded(reitti).getLatLngs(); // fromEncoded: muutetaan Googlekoodaus Leafletin Polylineksi
        L.polyline(pisteObjektit)
          .setStyle({
            color,
          })
          .addTo(reittiLayer) // addataan se reittilayerille
          .bindPopup(reittiData); // lisätään popuppiin tiedot
      }

      // Lisätään erillinen divi reittitiedoilla navigoinnin yhteydessä.
      const reitinAlkuaika = new Date(reittiDivi.startTime);
      const reitinLoppuaika = new Date(reittiDivi.endTime);
      let totalH = reitinAlkuaika.getHours() + "";
      let totalM = reitinAlkuaika.getMinutes() + "";
      let totalEndH = reitinLoppuaika.getHours() + "";
      let totalEndM = reitinLoppuaika.getMinutes() + "";
      const textDivi = `<p>Matkustusaika julkisilla pizzeriaan: ${(reittiDivi.duration / 60).toFixed(
        1
      )} (min).</p><p>Haettu reitti kartalle lähtee: ${totalH.padStart(2, "0") + ":" + totalM.padStart(2, "0")}</p><p>Olisit perillä kello: ${
        totalEndH.padStart(2, "0") + ":" + totalEndM.padStart(2, "0")
      }</p>`;
      // divi omaa onclick ominaisuuden jossa se kutsuu markerToggle function antamalla vaihtoehdon 3..
      const cancelDivi = `<a class="leaflet-div-sulku" href="#" title="Sulje reittitiedot" onclick="markerToggle(3);return false;"></a>`;
      leafletDivCancel.innerHTML = cancelDivi;
      // divi on hidden joten täytyy se asettaa näkyväksi
      leafletDivCancel.setAttribute("style", "visibility: visible");
      // lisätään vielä teksti divi ->
      const divi = document.createElement("div");
      divi.className = "leaflet-div-popup";
      divi.innerHTML = textDivi;
      leafletDivCancel.append(divi);
      // ja zoomi siten että nähdään koko reitti..
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
  const jsonData = await response.json(); // käydään läpi apista saadut tiedot.
  // jokasen objectin osalta seuraava forloop ->
  Array.from(jsonData.data).forEach(function (objData) {
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
    // tarkistetaan myös onko vkPaiva sunnuntai, jos on niin laitetaan sen arvoksi 0.
    let matiketopelasu = vkPaiva;
    if (matiketopelasu < 0) {
      matiketopelasu = 0;
    }
    open.setHours(objData.opening_hours?.hours?.[matiketopelasu]?.opens?.split(":")[0] ?? "");
    open.setMinutes(objData.opening_hours?.hours?.[matiketopelasu]?.opens?.split(":")[1] ?? "");
    open.setSeconds(objData.opening_hours?.hours?.[matiketopelasu]?.opens?.split(":")[2] ?? "");
    // katsotaan onko sulkeutumisaika pienempi kuin alkamisaika (keskiyö)
    if ((objData.opening_hours?.hours?.[matiketopelasu].closes?.split(":")[0] ?? "") < open.getHours()) {
      closed.setDate(tanaan.getDate() + 1); //mikäli on niin lisätään closed dayhin yksi päivä lisää.
      closed.setHours(objData.opening_hours?.hours?.[matiketopelasu]?.closes?.split(":")[0] ?? "");
    } else {
      closed.setHours(objData.opening_hours?.hours?.[matiketopelasu]?.closes?.split(":")[0] ?? "");
    }
    // lisätään loput aukioloajat open & closed consteihin
    closed.setMinutes(objData.opening_hours?.hours?.[matiketopelasu]?.closes?.split(":")[1] ?? "");
    closed.setSeconds(objData.opening_hours?.hours?.[matiketopelasu]?.closes?.split(":")[2] ?? "");
    // luodaan lista muuttujia jolla saadaan aika muotoon hh:mm.
    let aukih = open.getHours() + "";
    let aukim = open.getMinutes() + "";
    let kiinnih = closed.getHours() + "";
    let kiinnim = closed.getMinutes() + "";
    // aukiolocheck antaa paikalle ajan mikäli semmoinen löytyy, esim. 00:00 - 00:00 ei ole aukioloaika.
    let aukioloCheck = `<p id="Saukioloaika">Aukioloaika tänään: ${aukih.padStart(2, "0") + ":" + aukim.padStart(2, "0")}-${
      kiinnih.padStart(2, "0") + ":" + kiinnim.padStart(2, "0")
    }</p>`;
    // tässä if lauseke jolla aukiolocheck muuttuu mikäli aukioloaikoja ei ole saatavilla.
    if (open.getHours() == 0) {
      aukioloCheck = `<p id="Saukioloaika">Aukioloaika ei saatavilla</p>`;
    }
    // popup tekstin sisältö, tässä luodaan myös navigoi linkki sekä kotisivu linkki.
    const teksti = `<div class="pizzatop__bar"><h3 id="Snimi">${info?.nimi || ""}</h3><h4 id="Sosoite">${info?.osoite || ""}</h4>
    ${aukioloCheck}</div><div class="pizzabot__bar">
    <a id="Surli" title="Siirry pizzerian kotisivuille" href="${info?.urli || "javascript:void(0)"}">Kotisivulle</a><br/>
    <a id="Sreitti" title="Katso miten julkiset menevät paikalle.." href="#" onclick="haeReitti({latitude: ${origin.latitude}, longitude: ${
      origin.longitude
    }},{latitude: ${info.Latitude}, longitude: ${info.Longitude}});return false;">Reittihaku</a></div>`;
    // Lisätään markkerit kartalle riippuen siitä onko ne kiinni vai ei.. Mikäli aikaa ei löydy lisätään ne aukiolevian erikoismaininnalla
    if (tanaan >= open != false && tanaan < closed != false /* || open.getHours() == 0 */) {
      L.marker([info.Latitude, info.Longitude], {icon: pIcon, title: info.nimi}).addTo(pizzaAuki).bindPopup(teksti);
    } else {
      L.marker([info.Latitude, info.Longitude], {icon: vIcon, title: info.nimi}).addTo(pizzaKiinni).bindPopup(teksti);
    }
  });
  // poistetaan kiinni olevat pizzeriat kartalta
  markerToggle(1);
}

// Toggle functio eri napeille.
function markerToggle(x) {
  if (x == 1) {
    pizzaLayer.removeLayer(pizzaKiinni);
    document.querySelector("#leaflet-toggle-nappi").setAttribute("onclick", "markerToggle(0);return false;");
  } else if (x == 0) {
    pizzaLayer.addLayer(pizzaKiinni);
    document.querySelector("#leaflet-toggle-nappi").setAttribute("onclick", "markerToggle(1);return false;");
  } else if (x == 3) {
    leafletDivCancel.setAttribute("style", "visibility: hidden");
  }
}

// responsive togglebuttoni
togglenappi.addEventListener("click", () => {
  navbarLinkit.classList.toggle("active");
});
//otsikon navbar listenerit sekä titleä painamalla pääset scrollaantumaan
navbarMap.addEventListener("click", () => {
  document.querySelector("#top").scrollIntoView({behavior: "smooth"});
});
//otsikon navbar listenerit sekä titleä painamalla pääset scrollaantumaan
navbarFaq.addEventListener("click", () => {
  document.querySelector(".infoheader").scrollIntoView({behavior: "smooth"});
});
//otsikon navbar listenerit sekä titleä painamalla pääset scrollaantumaan
navTitleHtml.addEventListener("click", () => {
  document.querySelector("#top").scrollIntoView({behavior: "smooth"});
});
