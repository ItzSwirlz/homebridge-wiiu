import type {
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import axios from 'axios';
import fs from 'fs';

import type { WiiUPlatform } from './platform.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class WiiUPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: WiiUPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Nintendo', // i dont think any wii u will have any other value
      )
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model');

    this.service =
      this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);


    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.exampleDisplayName,
    );

    // TODO: Is there something better we can use here?
    this.service.getCharacteristic(this.platform.Characteristic.Active).onSet(this.handleOnSetShutdown.bind(this));

    this.getSystemInfo();
    // TODO: is there a better service that is just a "toggle switch?"
    const rebootService =
      this.accessory.getService('Reboot Console') ||
      this.accessory.addService(this.platform.Service.Switch, 'Reboot Console', 'reboot-wiiu');
    rebootService.setCharacteristic(this.platform.Characteristic.Name, 'Reboot Wii U');
    rebootService.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleOnSetReboot.bind(this));

    // TODO: learn how to use plugin config
    const getTitlesService =
      this.accessory.getService('Get Titles') ||
      this.accessory.addService(this.platform.Service.Switch, 'Get Titles', 'get-titles-wiiu');
    getTitlesService.setCharacteristic(this.platform.Characteristic.Name, 'Get Titles');
    getTitlesService.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleOnGetTitles.bind(this));

    // i think this is how you do it
    const data = fs.readFileSync('./titles.json', 'utf-8');
    const jsondata = JSON.parse(data);
    JSON.parse(data, (item, index) => {
      const service = this.accessory.getService(index + '-wiiu') || this.accessory.addService(this.platform.Service.InputSource, jsondata[index], index + '-wiiu');
      service.setCharacteristic(this.platform.Characteristic.Identifier, index.toString());
      service.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
      service.setCharacteristic(this.platform.Characteristic.ConfiguredName, jsondata[item]);
    });

    setInterval(() => {
      // TODO: If the Wii U does not respond, say it is inactive.
      // If it is active and receiving responses, the only thing we can really do is
      // tell the Wii U to turn off.. so that's all we will do here]
      // this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);

      // FIXME: again: can we just get a push button for this or something?
      rebootService.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.INACTIVE);
    }, 10000);
  }

  // We can't do this in the constructor because this needs to await the response
  // (unless you can somehow)
  async getSystemInfo() {
    const serial = await axios.get('http://' + '192.168.1.195:8572' + '/serial');
    const model = await axios.get('http://' + '192.168.1.195:8572' + '/model');
    const version = await axios.get('http://' + '192.168.1.195:8572' + '/system_version');
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        serial.data as string,
      ).setCharacteristic(
        this.platform.Characteristic.Model,
        model.data as string,
      ).setCharacteristic(
        this.platform.Characteristic.FirmwareRevision,
        version.data,
      );
  }

  async handleOnSetReboot(value: CharacteristicValue) {
    this.platform.log.debug('Rebooting Wii U');
    axios.post('http://' + '192.168.1.195:8572' + '/reboot');
  }

  async handleOnGetTitles(value: CharacteristicValue) {
    this.platform.log.debug('Getting Wii U titles');
    try {
      const res = await axios.get('http://' + '192.168.1.195:8572' + '/titles', {
        responseType: 'json',
      });

      fs.writeFileSync('./titles.json', JSON.stringify(res.data, null, 2), 'utf-8');
    } catch (error) {
      console.error(error);
    }
  }

  async handleOnSetShutdown(value: CharacteristicValue) {
    this.platform.log.debug('Shutting down Wii U');
    axios.post('http://' + '192.168.1.195:8572' + '/shutdown');
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  // async getOn(): Promise<CharacteristicValue> {
  //   // implement your own code to check if the device is on
  //   const isOn = true;

  //   this.platform.log.debug("Get Characteristic On ->", isOn);

  //   // if you need to return an error to show the device as "Not Responding" in the Home app:
  //   // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

  //   return isOn;
  // }
}
