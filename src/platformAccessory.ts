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
        'Nintendo',
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
    this.service.getCharacteristic(this.platform.Characteristic.RemoteKey).onSet(this.handleOnSetRemoteKey.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).onGet(this.handleGetTitle.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier).onSet((newValue) => {
      switch (newValue as number) {
      // For subsettings menus: they aren't exposed as separate titles so we "make them" ourselves
      case 1:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/internet');
        break;
      case 2:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/data_management');
        break;
      case 3:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/tv_remote');
        break;
      case 4:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/date_time');
        break;
      case 5:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/country');
        break;
      case 6:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/quick_start');
        break;
      case 7:
        axios.post('http://' + this.platform.config.ip + '/launch/settings/tv_connection');
        break;
      case 8:
        axios.post('http://' + this.platform.config.ip + '/vwii/launch/menu');
        break;
      case 9:
        axios.post('http://' + this.platform.config.ip + '/vwii/launch/data_manager');
        break;
      default:
        axios.post('http://' + this.platform.config.ip + '/launch/title', { title: this.titleMap.get(newValue as number) }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        break;
      }
    });

    // Get the title list every time we start up
    this.getTitles();

    // Refresh the title list
    this.titleMap = new Map<number, string>();

    let identifierId = 1;
    if (!fs.existsSync('./titles.json')) {
      fs.writeFileSync('./titles.json', '{}');
    }
    const data = fs.readFileSync('./titles.json', 'utf-8');

    // predefined endpoints. thsee are constant identifier values
    const internetSettingsService = this.accessory.getService('internetSettingsService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'Internet Settings', 'internetSettingsService-wiiu');

    internetSettingsService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    internetSettingsService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Internet Settings');
    internetSettingsService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    internetSettingsService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(internetSettingsService);
    identifierId++;

    const dataManagementService = this.accessory.getService('dataManagementService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'Data Management', 'dataManagementService-wiiu');

    dataManagementService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    dataManagementService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Data Management');
    dataManagementService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    dataManagementService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(dataManagementService);
    identifierId++;

    const tvRemoteSettingsService = this.accessory.getService('tvRemoteSettingsService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'GamePad TV Remote Settings', 'tvRemoteSettingsService-wiiu');

    tvRemoteSettingsService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    tvRemoteSettingsService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'GamePad TV Remote Settings');
    tvRemoteSettingsService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    tvRemoteSettingsService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(tvRemoteSettingsService);
    identifierId++;

    const dtSettingsService = this.accessory.getService('dtSettingsService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'Date and Time Settings', 'dtSettingsService-wiiu');

    dtSettingsService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    dtSettingsService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Date and Time Settings');
    dtSettingsService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    dtSettingsService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(dtSettingsService);
    identifierId++;

    const countrySettingsService = this.accessory.getService('countrySettingsService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'Country Settings', 'countrySettingsService-wiiu');

    countrySettingsService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    countrySettingsService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Country Settings');
    countrySettingsService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    countrySettingsService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(countrySettingsService);
    identifierId++;

    const quickStartSettingsService = this.accessory.getService('quickStartSettingsService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'Quick Start Settings', 'quickStartSettingsService-wiiu');

    quickStartSettingsService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    quickStartSettingsService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Quick Start Settings');
    quickStartSettingsService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    quickStartSettingsService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(quickStartSettingsService);
    identifierId++;

    const tvConnectionService = this.accessory.getService('tvConnectionService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'TV Connection Settings', 'tvConnectionService-wiiu');

    tvConnectionService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    tvConnectionService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'TV Connection Settings');
    tvConnectionService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    tvConnectionService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(tvConnectionService);
    identifierId++;

    const vWiiMenuService = this.accessory.getService('vWiiMenuService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'vWii Menu', 'vWiiMenuService-wiiu');

    vWiiMenuService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    vWiiMenuService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'vWii Menu');
    vWiiMenuService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    vWiiMenuService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(vWiiMenuService);
    identifierId++;

    const vWiiDataManagerService = this.accessory.getService('vWiiDataManagerService-wiiu') ||
      this.accessory.addService(this.platform.Service.InputSource, 'vWii Data Management', 'vWiiDataManagerService-wiiu');

    vWiiDataManagerService.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
    vWiiDataManagerService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'vWii Data Management');
    vWiiDataManagerService.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
    vWiiDataManagerService.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
    this.service.addLinkedService(vWiiDataManagerService);
    identifierId++;

    // end of apps that dont have title ids

    // For each title, we need to assign them an "identifeir ID" for homebridge
    JSON.parse(data, (titleId, name) => {
      // Broken titles or applications - can occur when there is no equivalent translated name.
      if (titleId !== '') {
        identifierId++;
        this.titleMap.set(identifierId, titleId);

        const service = this.accessory.getService(name + '-wiiu') ||
          this.accessory.addService(this.platform.Service.InputSource, name, name + '-wiiu');

        service.setCharacteristic(this.platform.Characteristic.Identifier, identifierId);
        service.setCharacteristic(this.platform.Characteristic.ConfiguredName, name);
        service.setCharacteristic(this.platform.Characteristic.IsConfigured, 1);
        service.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.APPLICATION);
        if(name === 'Wii U Menu') {
          service.setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HOME_SCREEN);
        }
        this.service.addLinkedService(service);
      }
    });

    const batteryService = this.accessory.getService('GamePad Battery') ||
      this.accessory.addService(this.platform.Service.Battery, 'GamePad Battery', 'wiiu-gamepad-battery');
    batteryService.setCharacteristic(this.platform.Characteristic.Name, 'GamePad Battery');
    batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel).onGet(this.handleOnGetGamePadBattery.bind(this));

    setInterval(() => {
      // If an error occurs, mark the device as offline.
      axios.get('http://' + this.platform.config.ip + '/').then((response) => {
        this.platform.log.debug('Received response from Ristretto: ' + response.data);
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.ACTIVE);
      }).catch((error) => {
        this.platform.log.error('Error requesting data from Ristretto');
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
      this.platform.log.error('Failed to get Wii U system info.');
      this.platform.log.debug(error as string);
    }
  }

  async getTitles() {
    this.platform.log.debug('Getting Wii U titles');

    try {
      const res = await axios.get('http://' + this.platform.config.ip + '/title/list', {
        responseType: 'json',
      });
      fs.writeFileSync('./titles.json', JSON.stringify(res.data, null, 2), 'utf-8');
    } catch (error) {
      this.platform.log.error('Error occurred trying to get the Wii U title list.');
    }
  }

  async handleGetTitle(): Promise<CharacteristicValue> {
    this.platform.log.debug('Getting Wii U title');
    try {
      const title = await axios.get('http://' + this.platform.config.ip + '/title/current');
      this.platform.log.debug('Received title from Ristretto: ' + title.data);

      // FIXME: the title will always exist, so find a way to do this cleaner without the || 1
      const service = this.accessory.getService(title.data + '-wiiu') ||
        this.accessory.addService(this.platform.Service.InputSource, title.data.toString(), title.data + '-wiiu');

      return service.getCharacteristic(this.platform.Characteristic.Identifier).value || 1;
    } catch (error) {
      this.platform.log.error('Couldn\'t get the current title.');
      this.platform.log.debug(error as string);
      return 0;
    }
  }

  async handleOnGetGamePadBattery(): Promise<CharacteristicValue> {
    try {
      const battery = await axios.get('http://' + this.platform.config.ip + '/gamepad/battery');

      const service = this.accessory.getService('GamePad Battery') ||
        this.accessory.addService(this.platform.Service.Battery, 'GamePad Battery', 'wiiu-gamepad-battery');

      if(battery.data === 0) {
        // TODO: Check to see if the values are correct
        // Always 0 when the GamePad is on the dock or is charging????
        // just return 'full charge on battery level'
        service.setCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.CHARGING);
        return 100;
      } else {
        service.setCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.NOT_CHARGING);
      }

      // level is up to 6
      return (battery.data / 6) * 100;
    } catch (error) {
      this.platform.log.error('Couldn\'t get GamePad battery.');
      this.platform.log.debug(error as string);
      return 0;
    }
  }

  async handleOnSetShutdown(value: CharacteristicValue) {
    if (value === this.platform.Characteristic.Active.ACTIVE) {
      return;
    }

    this.platform.log.debug('Shutting down Wii U');
    axios.post('http://' + this.platform.config.ip + '/power/shutdown').catch((error) => {
      this.platform.log.error('Failed to shutdown Wii U');
      this.platform.log.debug(error);
    });
  }

  // TODO: figure out what to assign other buttons to
  // Note that the HOME button doesn't do anything on key press
  async handleOnSetRemoteKey(value: CharacteristicValue) {
    let key = ''; // we will use this to send the specific key to press
    switch(value) {
    case this.platform.Characteristic.RemoteKey.SELECT:
      key = 'a';
      break;
    case this.platform.Characteristic.RemoteKey.BACK:
      key = 'b';
      break;
    case this.platform.Characteristic.RemoteKey.ARROW_LEFT:
      key = 'left';
      break;
    case this.platform.Characteristic.RemoteKey.ARROW_RIGHT:
      key = 'right';
      break;
    case this.platform.Characteristic.RemoteKey.ARROW_UP:
      key = 'up';
      break;
    case this.platform.Characteristic.RemoteKey.ARROW_DOWN:
      key = 'down';
      break;
    default:
      this.platform.log('Unhandled value for Remote Key: ' + value);
      break;
    }
    axios.post('http://' + this.platform.config.ip + '/remote/key/' + key).catch((error) => {
      this.platform.log.error('Error pressing remote key to Ristretto');
      this.platform.log.debug(error);
    });
  }
}
