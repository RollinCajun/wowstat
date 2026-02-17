const electron = require('electron');
const {app, BrowserWindow, dialog, Menu, MenuItem, Tray} = electron;
const AutoLaunch = require('auto-launch');
const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs');
// 'request' was removed (deprecated). Use 'axios' for HTTP when needed.
const axios = require('axios');
const storage = require('electron-json-storage');
const {ipcMain} = require('electron');
const child_process = require('child_process');
const {nativeImage} = require('electron');
const open = require('open');
const shortcut = require('electron-localshortcut');
const {setLocale} = require('./strings');
const puppeteer = require('puppeteer');
var strings = setLocale('en_US');


let win;
let tray = null;
let options = {};
let interval = null;
let statusRetail = null;
let statusClassic = null;
let statusClassicMoP = null;
let isNew = false;
let willQuit = false;
let usingFallback = false;


var launcher = new AutoLaunch({
	name: 'WoW Stat',
	path: process.platform === 'darwin' ? app.getAppPath() : process.execPath,
	isHidden: false
});

var createWindow = () => {
	win = new BrowserWindow({
			width: process.platform === 'darwin' ? 450 : 500,
			height: process.platform === 'darwin' ? 530 : 560,
		title: 'WoW Stat',
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});

	win.loadURL(`file://${__dirname}/index.html`);

	// Do not open DevTools by default in production; developers can set ELECTRON_DEV=1
	win.webContents.on('did-finish-load', () => {
		if (process.env.ELECTRON_DEV) {
			try {
				win.webContents.openDevTools({ mode: 'detach' });
			} catch (e) {
				console.error('Could not open DevTools:', e);
			}
		}
	});

	win.on('closed', () => {
		win = null;
	});

	win.on('close', (e) => {
		if (!willQuit) {
			win.hide();
			e.preventDefault();
		}
	});

	app.on('before-quit', () => willQuit = true);

	shortcut.register(win, 'CmdOrCtrl+H', () => {
		win.hide();
	});
};

// Provide synchronous userData path to renderer when requested
ipcMain.on('get-user-data-path', (event) => {
	try {
		event.returnValue = app.getPath('userData');
	} catch (e) {
		event.returnValue = null;
	}
});

// Handle directory selection from renderer
ipcMain.handle('select-directory', async (event) => {
	try {
		const result = await dialog.showOpenDialog(win, {
			properties: ['openFile'],
			filters: [
				{ name: 'Executable Files', extensions: ['exe'] },
				{ name: 'All Files', extensions: ['*'] }
			]
		});
		return result.filePaths && result.filePaths.length > 0 ? result.filePaths[0] : null;
	} catch (e) {
		console.error('Error selecting directory:', e);
		return null;
	}
});

// Handle update request (region change)
ipcMain.on('update', (event) => {
	console.log('Update triggered - rechecking realm status');
	changeInterval();
});

// Handle autoload toggle
ipcMain.on('autoload', (event, autoloadValue) => {
	console.debug('Autoload toggled:', autoloadValue);
	if (autoloadValue) {
		launcher.enable();
	} else {
		launcher.disable();
	}
});

// Handle notify command
ipcMain.on('notify', (event) => {
	console.log('Notify command received');
});

// Handle test notification
ipcMain.on('test-notify', (event, type) => {
	console.log('Test notification:', type);
	const testRealm = { name: 'Test Realm' };
	if (type === 'up') {
		// Use exports.notify directly for test notifications
		exports.notify(testRealm.name + ' is up', 'The WoW realm ' + testRealm.name + ' is back online');
	} else if (type === 'down') {
		exports.notify(testRealm.name + ' is down', 'The WoW realm ' + testRealm.name + ' is offline');
	}
});

var notify = (s, realm) => {
	console.log('notifying');
	var action = options[s ? 'actionUp' : 'actionDown'];
	if (action == 'notify') {
		let data = {
			body: 'The WoW realm ' + realm.name + ' is ' + (s ? 'back online' : 'offline'),
			title: realm.name + ' is ' + (s ? 'up' : 'down')
		};
		if (win) {
			win.webContents.send('notify', data);
		} else {
			exports.notify(data.title, data.body);
		}
		return;
	}

	if (action == 'launch' && options.path) {
		child_process.exec('open "' + options.path + '"', (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			console.log(`stdout: ${stdout}`);
			console.log(`stderr: ${stderr}`);
		});
	}
};

var setStatus = (s) => {
	var icon = '';
	if (s.status == false) {
		icon = '-red';
	} else {
		if (s.queue == true) {
			icon = '-yellow';
		} else {
			icon = '-green';
		}
	}
	console.log('setting icon to '+icon);
	tray.setImage(nativeImage.createFromPath(path.join(__dirname) + '/w' + icon + '@2x.png'));
};

var checkServer = () => {
	// Map regions to Blizzard URL region code
	const regionUrlMap = {
		'us': 'us',
		'eu': 'eu',
		'cn': 'cn',
		'tw': 'tw',
		'kr': 'kr'
	};

	const regionCode = regionUrlMap[options.region] || 'us';
	
	const urls = {
		retail: `https://worldofwarcraft.blizzard.com/en-us/game/status/${regionCode}`,
		classic: `https://worldofwarcraft.blizzard.com/en-us/game/status/classic1x-us`,
		mop: `https://worldofwarcraft.blizzard.com/en-us/game/status/classic-us`
	};

	console.log('Fetching realm status for all three types (Retail, Classic 1x, MoP)...');

	(async () => {
		let browser;
		try {
			browser = await puppeteer.launch({
				headless: 'new',
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-gpu',
					'--disable-software-rasterizer',
					'--no-first-run',
					'--no-default-browser-check'
				]
			});

			// Helper function to fetch one realm type
			const fetchRealmType = async (typeKey, url) => {
				try {
					const page = await browser.newPage();
					
					page.on('error', () => {});
					page.on('console', (msg) => {
						if (!msg.text().includes('GPU') && !msg.text().includes('Uncaught')) {
							console.log(`[PAGE-${typeKey}]`, msg.text());
						}
					});

					page.setDefaultNavigationTimeout(15000);
					await page.goto(url, { waitUntil: 'networkidle2' });

					await page.waitForSelector('[class*="SortTable"]', { timeout: 10000 }).catch(() => {
						console.warn(`SortTable not found for ${typeKey}, continuing anyway...`);
					});

					const realms = await page.evaluate(() => {
						const realmsData = [];
						const rows = document.querySelectorAll('[class*="SortTable-row"]');
						console.log('Found', rows.length, 'rows');

						rows.forEach((row) => {
							try {
								const iconSpan = row.querySelector('span[class*="Icon"]');
								let status = null;
								
								if (iconSpan) {
									const classList = iconSpan.className;
									if (classList.includes('checkCircleGreen')) {
										status = true;
									} else if (classList.includes('xCircleRed')) {
										status = false;
									} else {
										status = null;
									}
								}

								const cols = row.querySelectorAll('[class*="SortTable-col"]');
								if (cols.length >= 2) {
									const realmNameElement = cols[1];
									const realmName = realmNameElement.textContent.trim();

									if (realmName && status !== null) {
										realmsData.push({
											name: realmName,
											slug: realmName.toLowerCase().replace(/\s+/g, '-'),
											status: status,
											type: 'Normal',
											population: null
										});
									}
								}
							} catch (e) {
								// Skip rows that can't be parsed
							}
						});

						return realmsData;
					});

					await page.close();
					return realms;

				} catch (error) {
					console.error(`Error fetching ${typeKey} realm status:`, error);
					return [];
				}
			};

			// Fetch all three realm types in parallel
			const [realmsRetail, realmsClassic, realmsMoP] = await Promise.all([
				fetchRealmType('retail', urls.retail),
				fetchRealmType('classic', urls.classic),
				fetchRealmType('mop', urls.mop)
			]);

			await browser.close();

			usingFallback = false;
			
			// Send all three arrays to renderer
			if (win) {
				win.webContents.send('server-status', {
					retail: realmsRetail,
					classic: realmsClassic,
					mop: realmsMoP
				});
			}

			// Export all three
			exports.realms = realmsRetail;
			exports.realmsClassic = realmsClassic;
			exports.realmsClassicMoP = realmsMoP;

			console.log('Loaded realm status - Retail:', realmsRetail.length, 'Classic:', realmsClassic.length, 'MoP:', realmsMoP.length);

			// Check status for selected Retail realm
			if (options.realm && realmsRetail.length > 0) {
				for (var x in realmsRetail) {
					if (realmsRetail[x].slug == options.realm) {
						if (realmsRetail[x].status != statusRetail) {
							setStatus(realmsRetail[x]);
							if (statusRetail === false || statusRetail === true) {
								if (realmsRetail[x].status) {
									notify(true, realmsRetail[x]);
								} else {
									notify(false, realmsRetail[x]);
								}
							}
						}
						statusRetail = realmsRetail[x].status;
						break;
					}
				}
			}

			// Check status for selected Classic realm
			if (options.realmClassic && realmsClassic.length > 0) {
				for (var x in realmsClassic) {
					if (realmsClassic[x].slug == options.realmClassic) {
						if (realmsClassic[x].status != statusClassic) {
							if (statusClassic === false || statusClassic === true) {
								if (realmsClassic[x].status) {
									notify(true, realmsClassic[x]);
								} else {
									notify(false, realmsClassic[x]);
								}
							}
						}
						statusClassic = realmsClassic[x].status;
						break;
					}
				}
			}

			// Check status for selected MoP Classic realm
			if (options.realmClassicMoP && realmsMoP.length > 0) {
				for (var x in realmsMoP) {
					if (realmsMoP[x].slug == options.realmClassicMoP) {
						if (realmsMoP[x].status != statusClassicMoP) {
							if (statusClassicMoP === false || statusClassicMoP === true) {
								if (realmsMoP[x].status) {
									notify(true, realmsMoP[x]);
								} else {
									notify(false, realmsMoP[x]);
								}
							}
						}
						statusClassicMoP = realmsMoP[x].status;
						break;
					}
				}
			}

			// If no realms selected, show neutral icon
			if (!options.realm && !options.realmClassic && !options.realmClassicMoP) {
				const neutralIcon = nativeImage.createFromPath(path.join(__dirname) + '/w@2x.png');
				if (tray) tray.setImage(neutralIcon);
			}

		} catch (error) {
			console.error('Error fetching realm status:', error);
			if (browser) {
				await browser.close().catch(() => {});
			}
		}
	})();
};

var changeInterval = () => {
	if (interval) {
		clearInterval(interval);
	}
	checkServer();
	interval = setInterval(() => {
		checkServer();
	}, options.intervalDown * 1000 * 60);
};

var showWindow = () => {
	if (win === null) {
		createWindow();
	} else {
		win.show();
	}
};

var createMenu = () => {
	return contextMenu = Menu.buildFromTemplate([
		{
			label: strings.quit,
			click: (e) => {
				app.quit();
			}
		}
	]);
};

app.on('ready', () => {
	// Disable the default application menu
	Menu.setApplicationMenu(null);

	// Ensure electron-json-storage uses the app user data path
	try {
		storage.setDataPath(app.getPath('userData'));
		console.log('storage data path set to', app.getPath('userData'));
	} catch (e) {
		console.error('Failed to set storage data path:', e);
	}

	if (process.platform === 'darwin') {

		const template = [
			{
				role: 'window',
				submenu: [
					{
						role: 'minimize'
					},
					{
						role: 'close'
					},
				]
			},
		];

		// darwin specific
		template.unshift({
			label: 'WoW Stat',
			submenu: [
				{
					role: 'about'
				},
				{
					type: 'separator'
				},
				{
					role: 'services',
					submenu: []
				},
				{
					type: 'separator'
				},
				{
					role: 'hide'
				},
				{
					role: 'hideothers'
				},
				{
					role: 'unhide'
				},
				{
					type: 'separator'
				},
				{
					role: 'quit'
				},
			]
		});
		// Window menu.
		template[1].submenu = [
			{
				label: 'Close',
				accelerator: 'CmdOrCtrl+W',
				role: 'close'
			},
			{
				label: 'Minimize',
				accelerator: 'CmdOrCtrl+M',
				role: 'minimize'
			},
			{
				label: 'Zoom',
				role: 'zoom'
			},
			{
				type: 'separator'
			},
			{
				label: 'Bring All to Front',
				role: 'front'
			}
		];
		const menu = Menu.buildFromTemplate(template);
		Menu.setApplicationMenu(menu);
	};


	var image = nativeImage.createFromPath(path.join(__dirname) + '/w@2x.png');
	tray = new Tray(image);
	tray.setToolTip('WoW Stat')
	tray.setContextMenu(createMenu());

	// Show window on any click to tray icon
	tray.on('click', function(event, bounds) {
		showWindow();
	});

	tray.on('double-click', function(event, bounds) {
		showWindow();
	});

	options = {
		region: 'us',
		intervalUp: 5,
		intervalDown: 1,
		path: process.platform == 'darwin' ? '/Applications/World of Warcraft/World of Warcraft.app': 'C:\\Program Files\\World of Warcraft\\WoW.exe',
		actionUp: 'notify',
		actionDown: 'notify',
		autoload: false,
		realm: '',
		realmClassic: '',
		realmClassicMoP: ''
	};

	changeInterval();

	storage.get('options', (error, o) => {
		if (error) throw error;
		console.log('current options', o, Object.keys(o).length);

		if (!Object.keys(o).length) {
			console.log('no options');
			isNew = true;
			storage.set('options', options, (error) => {
				if (error) throw error;
				console.log(options);
			});
		} else {
			console.log('options exist');
			options = o;
			
			// Send loaded options to UI
			if (win && options) {
				console.log('Sending loaded options to UI:', options);
				setTimeout(() => {
					if (win) win.webContents.send('load-options', options);
				}, 500);
			}
		}

		setTimeout(() => {
			// Always show window on startup so user can interact with it
			win.show();
		},10);
	});

	createWindow();

	if (process.platform === 'darwin' && app.dock) {
		app.dock.hide();
	}
/*
	setTimeout(() => {
		storage.clear(() => {
		});
	},5000);
*/
});

app.on('window-all-closed', () => {
	//app.quit();
});

app.on('activate', () => {
	if (win === null) {
		createWindow();
	}
});

exports.selectDirectory = (fn) => {
	var res = dialog.showOpenDialog(win, {
		properties: ['openFile', 'openDirectory']
	});
	fn(res ? res[0] : null);
}

exports.setAutoload = (fn) => {
	launcher.enable();
}

exports.notify = (title, message, fn) => {
	notifier.notify({
		title: title,
		message: message,
		icon: path.join(__dirname, 'w@2x.png'),
		sound: true,
		contentImage: void 0,
		wait: false
	}, (err, response) => {
		console.log('Notification shown:', title);
	});

	if (fn) {
		notifier.on('click', (notifierObject, options) => {
			fn();
		});
	}
}

exports.hide = () => {
	win.hide();
}

exports.autoload = (on) => {
	if (on) {
		launcher.enable();
	} else {
		launcher.disable();
	}
};

exports.update = () => {
	changeInterval();
};

exports.options = (o) => {
	if (o) {
		options = o;
	}
	return options;
};

exports.realms = [];
exports.realmsClassic = [];
exports.realmsClassicMoP = [];

exports.strings = strings;
exports.setLocale = (loc) => {
	strings = setLocale(loc);
	tray.setContextMenu(createMenu());
	return exports.strings = strings;
};

exports.isNew = isNew;