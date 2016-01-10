module.exports = init

var Emitter = require('events').EventEmitter
  , request = require('request')
  , parseXml = require('xml2js').parseString

function init(callback) {
  callback(null, 'plex', Plex)
}

function Plex(automait, logger, config) {
  Emitter.call(this)
  this.automait = automait
  this.logger = logger
  this.config = config
  this.players = {}
  this.config.players.forEach(function (name) {
    this.players[name] = 'unknown'
  }.bind(this))
}

Plex.prototype = Object.create(Emitter.prototype)

Plex.prototype.init = function () {
  this.startPolling()
}

Plex.prototype.getStatus = function (playerName, callback) {
  callback(null, this.players[playerName])
}

Plex.prototype.startPolling = function () {
  setInterval(function () {
    request(this.config.url + '/status/sessions', function (error, response, body) {
      if (error) {
        return this.logger.error(error)
      }
      parseXml(body, function (err, result) {
        var playingVideos = result.MediaContainer.Video
        if (!playingVideos) playingVideos = []
        Object.keys(this.players).forEach(function (name) {
          var deviceFound = false
            , currentStatus = this.players[name]

          playingVideos.forEach(function (video) {
            if (video.Player && video.Player[0].$.title === name) {
              this.players[name] = video.Player[0].$.state
              deviceFound = true
              if (currentStatus !== this.players[name]) {
                this.emit(name + ':' + this.players[name])
              }
            }
          }.bind(this))
          if (!deviceFound) {
            this.players[name] = 'stopped'
            if (currentStatus !== 'unknown' && currentStatus !== this.players[name]) {
              this.emit(name + ':' + this.players[name])
            }
          }
        }.bind(this))
      }.bind(this))
    }.bind(this))
  }.bind(this), this.config.pollInterval || 2000)
}
