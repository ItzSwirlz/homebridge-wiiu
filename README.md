<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
<hr class="solid">
<img src=./.github/icon.png>

</p>

<span align="center">

# Homebridge Plugin for Wii U (with Ristretto)

</span>

This is a plugin for Homebridge that exposes the Wii U (running [Ristretto](https://github.com/ItzSwirlz/Ristretto) to HomeKit. Currently, it supports:
* Powering off the console (powering on is another situation that is being worked on)
* Launching and switching games and applications (currently, not homebrew applications)

In the future, the following will be added when Ristretto has the ability to do so:
* Configuring the port Ristretto uses
* Remote Key support
* Powering On (probably via a stroopwafel plugin - more details TBD)
* Controlling video/audio settings
* Adding sensors for the battery of the GamePad or any other connected controllers

# Note
You will need a **modded Wii U** running the [**Aroma custom firmware (CFW)**](https://aroma.foryour.cafe). Nintendo never added "smart home functionality" to the Wii U, so you will need to install a plugin (Ristretto) which is basically a HTTP server that will handle all the requests between Homebridge/HomeKit and the device.

For modding your Wii U, visit the [Wii U Hacks Guide](https://wiiu.hacks.guide/#/). **DO NOT FOLLOW VIDEO GUIDES!!!!!!!** Video guides often can contain incorrect information that is not up to date. NEVER, and I mean NEVER follow a video guide. If you need support, there are resources such as the Nintendo Homebrew discord.

*Yes, modding your Wii U is safe. You will not brick your console unless you do something really ridiculous - in the modding process you will make a backup of the system's NAND. Keep in mind however, in some areas installing CFW may be illegal - make smart choices.*

*That being said, the developers of this plugin are not responsible for anything that happens to your Wii U.*

# Installation and Configuration

1) Install Ristretto. This should be straight forward if you've modded your console - just install it like any other plugin. Copy `Ristretto.wps` to `sd:/wiiu/environments/aroma/plugins`.
  - If for some reason your console has issues booting (the plugin loader aborting when starting up, or the console crashes), you can safely hold the power button to power off the console. Report the issue on Ristretto's GitHub page.

2) Get your Wii U's local IP address. You can find this if you have the ftpiiu plugin installed, or you can use other tools to recognize the device on your network.

3) Install homebridge-wiiu and set the IP in the configuration to `(your Wii U's IP address):8572`. In the future, configuring the port on Ristretto will be an option.

4) Restart homebridge and you should be good to go.

# Troubleshooting/Support
If you need help, you can email me at itzswirlz2020@outlook.com or on Discord, @ItzSwirlz.

# License
The license of this software is LGPL-3.0 or later.
