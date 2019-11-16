'use strict';

const superagent = require('superagent');
const resto = {};

resto.getResto = function showResto(request, response) {
  const url = `https://api.yelp.com/v3/businesses/search?location=${location}&term=restaurants&Authorization=Bearer${process.env.YELP_API_KEY}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const restoSummaries = data.body.results.map(element => {
        return new Resto(element);
      });
      response.status(200).send(restoSummaries);
    });
};


function Resto(resto){
  this.name = resto.name;
  this.image_url = resto.image_url;
  this.price = resto.price;
  this.rating = resto.rating;
  this.url = resto.url;
}

module.exports = resto;
