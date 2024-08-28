import {
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
  private titleMap: Map<number, string>;

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
      );

    this.service =
      this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.platform.config.name || 'Wii U',
    );

    this.getSystemInfo();

    this.service.getCharacteristic(this.platform.Characteristic.Active).onSet(this.handleOnSetShutdown.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).onGet(this.handleGetTitle.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).onSet((newValue) => {
      axios.post('http://' + this.platform.config.ip + '/launch/title', { title: this.titleMap.get(newValue as number) }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    const getTitlesService =
      this.accessory.getService('Get Titles') ||
      this.accessory.addService(this.platform.Service.Switch, 'Get Titles', 'get-titles-wiiu');
    getTitlesService.setCharacteristic(this.platform.Characteristic.Name, 'Get Titles');
    getTitlesService.getCharacteristic(this.platform.Characteristic.On).onSet(this.handleOnGetTitles.bind(this));

    // Refresh the title list
    this.titleMap = new Map<number, string>();

    let i = 1;
    const data = fs.readFileSync('./titles.json', 'utf-8');
    const jsondata = JSON.parse(data);

    JSON.parse(data, (titleId, name) => {
      i++;
      this.titleMap.set(i, titleId);

      const service = this.accessory.getService(name + '-wiiu') ||
        this.accessory.addService(this.platform.Service.InputSource, jsondata[titleId], name + '-wiiu');

      service.setCharacteristic(this.platform.Characteristic.Identifier, i);
      service.setCharacteristic(this.platform.Characteristic.ConfiguredName, name.toString());
      service.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
      service.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
      this.service.addLinkedService(service);
    });

    setInterval(() => {
      // If an error occurs, mark the device as offline.
      axios.get('http://' + this.platform.config.ip + '/').then((response) => {
        this.platform.log.debug('Received response from Ristretto: ' + response.data);
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
      }).catch((error) => {
        this.platform.log.debug(error);
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.INACTIVE);
      });
    }, 10000);
  }

  async getSystemInfo() {
    try {
      const serial = (await axios.get('http://' + this.platform.config.ip + '/device/serial_id')).data;
      const model = (await axios.get('http://' + this.platform.config.ip + '/device/model_number')).data;
      const version = (await axios.get('http://' + this.platform.config.ip + '/device/version')).data;

      // Also ensure these are strings, for some reason it can return as undefined.
      this.accessory
        .getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(
          this.platform.Characteristic.SerialNumber,
          serial.toString(),
        ).setCharacteristic(
          this.platform.Characteristic.Model,
          model.toString(),
        ).setCharacteristic(
          this.platform.Characteristic.FirmwareRevision,
          version,
        );
    } catch (error) {
      this.platform.log('Failed to get Wii U system info.');
    }
  }

  async handleOnGetTitles(value: CharacteristicValue) {
    if(value === this.platform.Characteristic.Active.INACTIVE) {
      return;
    }

    this.platform.log.debug('Getting Wii U titles');

    try {
      const res = await axios.get('http://' + this.platform.config.ip + '/title/list', {
        responseType: 'json',
      });
      fs.writeFileSync('./titles.json', JSON.stringify(res.data, null, 2), 'utf-8');
    } catch (error) {
      this.platform.log.error('Error occurred trying to get the Wii U title list.');
    }

    // Treat this like a push button: this is more a utility than anything.
    const getTitlesService =
      this.accessory.getService('Get Titles') ||
      this.accessory.addService(this.platform.Service.Switch, 'Get Titles', 'get-titles-wiiu');
    getTitlesService.updateCharacteristic(this.platform.Characteristic.On, 0);
  }

  async handleGetTitle(): Promise<CharacteristicValue> {
    this.platform.log.debug('Getting Wii U title');
    try {
      const title = await axios.get('http://' + this.platform.config.ip + '/title/current');

      // FIXME: the title will always exist, so find a way to do this cleaner without the || 1
      const service = this.accessory.getService(title.data + '-wiiu') ||
        this.accessory.addService(this.platform.Service.InputSource, title.data.toString(), title.data + '-wiiu');

      return service.getCharacteristic(this.platform.Characteristic.Identifier).value || 1;
    } catch (error) {
      this.platform.log('Couldn\'t get the current title.');
      return 0;
    }
  }

  async handleOnSetShutdown(value: CharacteristicValue) {
    if (value === this.platform.Characteristic.Active.ACTIVE) {
      return;
    }

    this.platform.log.debug('Shutting down Wii U');
    axios.post('http://' + '192.168.1.195:8572' + '/power/shutdown').catch((error) => {
      this.platform.log.error('Failed to shutdown Wii U: ' + error);
    });
  }
}
