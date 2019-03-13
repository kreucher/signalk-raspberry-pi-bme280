/*
 * Copyright 2019 Jeremy Carter <jncarter@hotmail.com>
 *
 * Add the MIT license
 */

const BME280 = require('bme280-sensor')

// The BME280 constructor options are optional.
//
const options = {
  i2cBusNo   : 1, // defaults to 1
  i2cAddress : BME280.BME280_DEFAULT_I2C_ADDRESS() // defaults to 0x77
};

const bme280 = new BME280(options);

module.exports = function (app) {
  let timer = null
  let plugin = {}

  plugin.id = 'signalk-raspberry-pi-bme280'
  plugin.name = 'Raspberry-Pi BME280'
  plugin.description = 'BME280 temperature sensors on Raspberry-Pi'

  plugin.schema = {
    type: 'object',
    properties: {
      rate: {
        title: "Sample Rate (in seconds)",
        type: 'number',
        default: 60
      },
      path: {
        type: 'string',
        title: 'SignalK Path',
        description: 'This is used to build the path in Signal K. It will be appended to \'environment\'',
        default: 'inside.salon'
      }
    }
  }

  plugin.start = function (options) {
    
    function createDeltaMessage (temperature, humidity, pressure) {
      return {
        'context': 'vessels.' + app.selfId,
        'updates': [
          {
            'source': {
              'label': plugin.id
            },
            'timestamp': (new Date()).toISOString(),
            'values': [
              {
                'path': 'environment.' + options.path + '.temperature',
                'value': temperature
              }, {
                'path': 'environment.' + options.path + '.humidity',
                'value': humidity
              }, {
                'path': 'environment.' + options.path + '.pressure',
                'value': pressure
              }
            ]
          }
        ]
      }
    }

    // Read BME280 sensor data
    function readSensorData() {
  	  bme280.readSensorData()
          .then((data) => {
        // temperature_C, pressure_hPa, and humidity are returned by default.
        temperature = data.temperature_C + 273.15;
        pressure = data.pressure_hPa * 100;
        humidity = data.humidity;

        //console.log(`data = ${JSON.stringify(data, null, 2)}`);

        // create message
        var delta = createDeltaMessage(temperature, humidity, pressure)

        // send temperature
        app.handleMessage(plugin.id, delta)

      })
      .catch((err) => {
        console.log(`BME280 read error: ${err}`);
      });
    }

    bme280.init()
        .then(() => {
      console.log('BME280 initialization succeeded');
      readSensorData();
    })
    .catch((err) => console.error(`BME280 initialization failed: ${err} `));

    timer = setInterval(readSensorData, options.rate * 1000);
  }

  plugin.stop = function () {
    if(timer){
      clearInterval(timer);
      timeout = null;
    }
  }

  return plugin
}
