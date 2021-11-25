"use strict";

const map = L.map("map").setView([60.21, 24.95], 11.5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

async function getPizza() {
  const pizzaUrl = "http://open-api.myhelsinki.fi/v1/places/?tags_filter=Pizza";
  try {
    fetch(pizzaUrl, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
      },
      /*       data: JSON.stringify({
        name: "Luigi Pizzeria"
      }) */
    })
      .then((response) => response.json())
      .then((jsonData) => {
        const results = jsonData;
        console.log(results);
      });
  } catch (e) {
    console.log(e);
  }
}

getPizza();
