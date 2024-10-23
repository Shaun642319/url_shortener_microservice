require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('node:dns')

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const UrlSchema = new mongoose.Schema({
  original_url: {type: String, required: true, unique: true},
  short_url: {type: Number, required: true, unique: true}
});

const urlModel = mongoose.model('Url', UrlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/', bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get('/api/shorturl/:short', (req, res) => {
  let short_url = parseInt(req.params.short);
  urlModel.findOne({short_url: short_url}).then(
    foundUrl => {
      if (foundUrl) {
        res.redirect(foundUrl.original_url);
      } else{
        res.json({
          message: 'this url does not exist!'
        })
      }
    }
  )
})

app.post('/api/shorturl', (req, res) => {
  const inputUrl = req.body.url;

  try{
    let urlObj = new URL(inputUrl);

    dns.lookup(urlObj.hostname, (err, address, family) => {
      if(!address){
        res.json({error: 'invalid url'})
      } else {
        let original_url = urlObj.href;

        urlModel.findOne({original_url: original_url}).then(
          (foundUrl) => {
            if(foundUrl){
              res.json({
                original_url: foundUrl.original_url,
                short_url: foundUrl.short_url
              })
            } else {
              let short_url = 1

              urlModel.find({})
                      .sort({short_url: -1}).limit(1).then(
                        latestUrl => {
                          if(latestUrl.length > 0)  {
                            short_url = latestUrl[0].short_url + 1;
                          }

                          let resObj = {
                            original_url: original_url,
                            short_url: short_url
                          }

                          let newUrl = new urlModel(resObj);
                          newUrl.save();
                          res.json(resObj);
                        }
                      )
            }
          }
        )
      }
    })
  }
  catch{
    res.json({
      error: 'invalid url'
    })
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
