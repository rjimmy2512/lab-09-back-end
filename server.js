'use strict';

//Load Environtment Variable from the .env
require('dotenv').config();

//Declare Application Dependancies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

//Application Setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

//Database Connection Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => {throw err;});


//API routes
app.get('/location', getLocation);
app.get('/weather', weatherHandler);
app.get('/events', parseEventData);
app.get('/trails', getTrails);
app.get('/movies', getMovies);
app.get('/yelp', showResto);


app.get('*', (request, response) => {
  response.status(404).send('This route does not exist');
});

//Get info from a user
Location.fetchLocation = (request, response) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;
    superagent.get(url)
      .then(data => {
        const geoData = data.body;
        const location = (new Location(request.query.data, geoData));
        let SQL = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING *';
        let values = [request.query.data, location.formatted_query, location.latitude, location.longitude];
        return client.query(SQL, values);
      })
      .then (results => {
        response.status(200).send(results.rows[0]);
      });
  }
  catch (error) {
    //some function or error message
    errorHandler('So sorry, something went wrong', request, response);
  }
};

//API routes

// Location handler

function getLocation(request, response) {
  const SQL = `SELECT * FROM locations WHERE search_query='${request.query.data}'`;
  client.query(SQL)
    .then( result => {
      if (result.rowCount > 0) {
        console.log('Location data from SQL');
        response.status(200).send(result.rows[0]);
      }
      else {
        Location.fetchLocation(request, response);
      }
    })
    .catch( error => errorHandler(error));
}

//Weather handler
function weatherHandler(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const weatherSummaries = data.body.daily.data.map(day => {
        return new Weather(day);
      });
      response.status(200).send(weatherSummaries);
    })
    .catch(() => {
      errorHandler('Something went wrong', request, response);
    });
}

// Trails handler

function getTrails(request, response) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&key=${process.env.TRAILS_API_KEY}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const trailsSummaries = data.body.trails.map(element => {
        return new Trails(element);
      });
      response.status(200).send(trailsSummaries);
    })
    .catch(() => {
      errorHandler('Something went wrong', request, response);
    });
}

// Movie Handler

function getMovies(request, response) {
  const url = `https://api.themoviedb.org/3/search/movie/?api_key=${process.env.MOVIE_API_KEY}&query=${request.query.data}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const movieSummaries = data.body.results.map(element => {
        return new Movies(element);
      });
      response.status(200).send(movieSummaries);
    })
    .catch(() => {
      errorHandler('Something went wrong', request, response);
    });
}

// Events Handler

const events = {};

events.getEventsData = function(location) {
  const url = `https://www.eventbriteapi.com/v3/events/search?token=${process.env.EVENTBRITE_API_KEY}&location.address=${location}`;
  return superagent.get(url)
    .then( data => parseEventData(data.body) );
};

// Helpers
function parseEventData(data) {
  try {
    const events = data.events.map(eventData => {
      const event = new Event(eventData);
      return event;
    });
    return Promise.resolve(events);
  } catch(e) {
    return Promise.reject(e);
  }
}

// Yelp Handler

function showResto(request, response) {
  const url = `https://api.yelp.com/v3/businesses/search?location=${location}&term=restaurants&Authorization=Bearer${process.env.YELP_API_KEY}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const restoSummaries = data.body.results.map(element => {
        return new Resto(element);
      });
      response.status(200).send(restoSummaries);
    })
    .catch(() => {
      errorHandler('Something went wrong', request, response);
    });
}



// error handler
function errorHandler(error, request, response) {
  response.status(500).send(error);
}

//Helper Functions

//Location constructor
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

//Weather constructor
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

// Event constructor
function Event(event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toString().slice(0, 15);
  this.summary = event.summary;
}

// Trails constructor
function Trails(trail){
  this.name = trail.name;
  this.location = trail.location;
  this.length = trail.length;
  this.stars = trail.stars;
  this.star_votes = trail.starVotes;
  this.summary = trail.summary;
  this.trail_url = trail.url;
  this.conditions = trail.conditionStatus;
  this.condition_date = trail.conditionDate.slice(0, 10);
  this.condition_time = trail.conditionDate.slice(11);
}

// Movies constructor
function Movies(movie){
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_vote = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = movie.poster_path;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

// Yelp constructor
function Resto(resto){
  this.name = resto.name;
  this.image_url = resto.image_url;
  this.price = resto.price;
  this.rating = resto.rating;
  this.url = resto.url;
}

// Connect to DB and Start the Web Server
client.connect()
  .then( () => {
    app.listen(PORT, () => {
      console.log('Server up on', PORT);
    });
  })
  .catch(err => {
    throw `PG Startup Error: ${err.message}`;
  });
