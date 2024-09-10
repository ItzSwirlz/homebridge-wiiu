import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import axios from 'axios';

import { WiiUPlatformAccessory } from './platformAccessory.js';
import { PLUGIN_NAME } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class WiiUPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);
    this.log.debug('Using IP: ' + config.ip);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  async configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    accessory.category = this.api.hap.Categories.TELEVISION;
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    // use the device serial
    let serial = '';
    axios.get('http://' + this.config.ip + '/device/serial_id').then((response) => {
      serial = response.statusText;
    }).catch((error) => {
      this.log.error('Couldn\'t get the serial.');
      this.log.debug(error);
      return; // device is offline
    });
    const uuid = this.api.hap.uuid.generate(serial);

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid,
    );

    if (existingAccessory) {
      // the accessory already exists
      this.log.info(
        'Restoring existing accessory from cache:',
        existingAccessory.displayName,
      );

      // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
      existingAccessory.category = this.api.hap.Categories.TELEVISION;
      this.api.updatePlatformAccessories([existingAccessory]);

      // create the accessory handler for the restored accessory
      // this is imported from `platformAccessory.ts`
      new WiiUPlatformAccessory(this, existingAccessory);

      // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
      // remove platform accessories when no longer present
      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', this.config.name);

      // create a new accessory
      const accessory = new this.api.platformAccessory(
        this.config.name || 'Wii U',
        uuid,
      );

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      accessory.category = this.api.hap.Categories.TELEVISION;
      accessory.UUID = serial;

      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new WiiUPlatformAccessory(this, accessory);

      this.api.publishExternalAccessories(PLUGIN_NAME, [accessory]);
    }
  }
}
