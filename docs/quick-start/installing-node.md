---
description: 'If you don''t like node.js, screw you (:'
---

# Installing Node

There are multiple ways to install node.js, the most recommended one being the installer provided by [https://nodejs.org](https://nodejs.org)

Alternatively, If you use Linux, you could either install it with your package manager (through NodeSource) or version managers like `nvm` or `fnm`&#x20;

We will go through all of them, except windows, because I really (really) don't want to touch it ever again.

> If you need a step-by-step tutorial on how to install Node, you shouldnt be programming.\
> \- Meow 2023

## Option #1: The official way

### Linux

Open your browser and go to [https://nodejs.org](https://nodejs.org) and download the latest LTS release (Or the latest version available).

It should download a `.tar.xz` file. If not, then you should check that the URL is correct, and if the URL is correct, then I might need to check these steps.

Then open your terminal of choice and navigate to your downloads folder. Then do `tar -xzf node-v{version_number_goes_here}-linux-x64.tar.xz`

Quick rundown of the command we ran:

* `-x`: Extract
* `-z`: Ze
* `-x`: Files

This is a good way to memorize how to extract tarballs.&#x20;

OK, after extracting the files into its own directory (Usually with the name of the file), we need to move it into a safe place (Usually `/opt/node/`, but I prefer `~/bin/`).

Move it and then add it into your path. (search it on Google)

After installing, run `node -v` if it returns:

```bash
v18.14.0 # Or the version number of the node you installed
```

Then you have node successfully installed and ready to go!

## Option #2: System Package Managers

### Ubuntu/Debian

Ubuntu and Debian have old LTS Node versions, usually these are good, but If you want the latest version (19 at the time of writing this), you might want to add NodeSource to your repository list

Use this installer provided by [https://github.com/nodesource/distributions#installation-instructions](https://github.com/nodesource/distributions#installation-instructions)

```bash
# Ubuntu (Node 19)
curl -fsSL https://deb.nodesource.com/setup_19.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

```bash
# Debian (Node 19)
curl -fsSL https://deb.nodesource.com/setup_19.x | bash - &&\
apt-get install -y nodejs
```

### Fedora

Fedora doesn't need to install any external repos as node is available through the official repos, you need to use `dnf module install`&#x20;

```bash
sudo dnf module install nodejs:19
```

### Arch or Arch-derived

The same goes for arch, the latest non LTS version is available through the official repos with `pacman`, if you prefer `yay` or `paru`, you can also use them.

```bash
# With pacman
sudo pacman -S node npm

# With paru
paru -S node npm

# With yay
yay -S node npm
```

### Other Distros

I won't cover every single distro out there, because it is really time-consuming, you should check if your distro provides Node, and if it doesn't, check [#option-3-node-version-managers](installing-node.md#option-3-node-version-managers "mention") or [#option-1-the-official-way](installing-node.md#option-1-the-official-way "mention")

## Option #3: Node Version Managers

### FNM (Fast Node Manager)

FNM is a fast (yeah, crazy I know) and intuitive way to install Node versions and manage them, the installation is pretty simple

```bash
# from schniz/fnm
curl -fsSL https://fnm.vercel.app/install | bash
```

### NVM (Node Version Manager)

NVM is also a fast and lightweight way to manage and install Node.js

Unlike FNM, NVM is a shell script, so It will run well in whatever shell you have, as long as it's POSIX Compliant

Install it with this script:

```bash
# using curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# using wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```
