'use strict';

const superagent = require('superagent');
const movies = {};

movies.getMovies = function getMovies(request, response) {
  const url = `https://api.themoviedb.org/3/search/movie/?api_key=${process.env.MOVIE_API_KEY}&query=${request.query.data}`;
  // console.log('lat/long', request.query.data.latitude);
  superagent.get(url)
    .then(data => {
      const movieSummaries = data.body.results.map(element => {
        return new Movies(element);
      });
      response.status(200).send(movieSummaries);
    });
};

function Movies(movie){
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_vote = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = movie.poster_path;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

module.exports = movies;
