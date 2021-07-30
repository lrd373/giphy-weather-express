var express = require('express');
require('dotenv').config()
var router = express.Router();
const fetch = require('node-fetch');
const async = require('async');
const { body, validationResult } = require('express-validator');
const unescape = require('../unescape');

const openWeatherAPI = process.env.OPEN_WEATHER_API_KEY;
const giphyAPI = process.env.GIPHY_API_KEY;


// POST -- CITY and/or UNITS SPECIFIED
router.post('/:city/:units', 
  body('cityName')
    .matches(/^[À-ÿa-zA-Z]+(?:[\s-][À-ÿa-zA-Z]+)*$/)
    .escape(),

  // Replace escaped HTML entities with characters
  unescape('&#38;', '&'),
  unescape('&#x26;', '&'),
  unescape('&amp;', '&'),  
  unescape('&#34;', '"'),
  unescape('&ldquo;', '"'),
  unescape('&rdquo;', '"'),
  unescape('&#8220; ', '"'),
  unescape('&#8221;', '"'),  
  unescape('&#39;', "'"),
  unescape('&#x27;', "'"),
  unescape('&lsquo;', "'"),
  unescape('&rsquo;', "'"),
  unescape('&#8216;', "'"),
  unescape('&#8217;', "'"),

  (req, res, next) => {
    console.log(req.body);
    let cityName = req.body.cityName;
    if (!cityName) { cityName = req.params.city; }
    
    let units = req.body.units;
    if (!units) { units = req.params.units; }

    res.redirect(`/${cityName}/${units}`);
  }    
);

// GET page WITH city and units specified
router.get('/:city/:units', (req, res, next) => {
    let city = req.params.city;
    let units = req.params.units;

    async.waterfall([
        function(callback) {
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${openWeatherAPI}`, {mode: "cors"})
            .then(response => response.json())
            .then(responseJSON => callback(null, responseJSON));
        },
        function(weatherJSON, callback) {
            let cityName = weatherJSON.name;
            let temp = Math.round(weatherJSON.main.temp);
            let description = weatherJSON.weather[0].description;
            let searchDescription = description;

            if (description.includes("clouds")) {
                searchDescription = "clouds";
            }
            if (description.includes("rain")) {
                searchDescription = "rain";
            }
            if (description.includes("sunny")) {
                searchDescription = "sunny";
            }
        
            fetch(`https://api.giphy.com/v1/gifs/translate?api_key=${giphyAPI}&s=${searchDescription}`, {mode: 'cors'})
            .then(response => response.json())
            .then(responseJSON => {
               if (!responseJSON.data.images) {
                   res.redirect(`/${cityName}/${units}`);
                }
               else {
                   callback(null, { 
                       weatherObj: {
                           city: cityName, 
                           temp: temp, 
                           units: units, 
                           description: description
                        }, 
                        gifObj: {
                            src: responseJSON.data.images.original.url, 
                            alt: description
                        }
                    });
                }
            });
        }
    ], (err, results) => {
        if (err) { return next(err); }
        
        res.render('index', { weatherObj: results.weatherObj, gifObj: results.gifObj });
    });
});

/* GET page WITHOUT city or units specified */
router.get('/', function(req, res, next) {
    res.redirect('/New+York+City/imperial');
});

module.exports = router;