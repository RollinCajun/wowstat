const electron = require('electron');
const {remote, ipcRenderer} = electron;
const storage = require('electron-json-storage');

// Set storage data path using IPC to get userData path from main process
try {
	const userDataPath = ipcRenderer.sendSync('get-user-data-path');
	if (userDataPath) {
		storage.setDataPath(userDataPath);
		console.log('Renderer storage path set to:', userDataPath);
	}
} catch (e) {
	console.error('Failed to set renderer storage path:', e);
}

let mainProcess;
let strings;

// Try to get mainProcess from remote (older Electron) and fall back safely
try {
	if (remote && remote.require) {
		mainProcess = remote.require('./main');
		strings = mainProcess.setLocale(navigator.language);
	} else {
		throw new Error('remote unavailable');
	}
} catch (e) {
	console.error('Failed to load remote module:', e);
	// Fallback to local strings and a minimal mainProcess shim to avoid runtime errors
	const { setLocale } = require('./strings');
	strings = setLocale(navigator.language || 'en_US');
	mainProcess = {
		setLocale: (loc) => strings,
		options: () => ({ region: 'us', intervalUp: 5, intervalDown: 1, path: process.platform == 'darwin' ? '/Applications/World of Warcraft/World of Warcraft.app' : 'C:\\Program Files\\World of Warcraft\\WoW.exe', actionUp: 'notify', actionDown: 'notify', autoload: false }),
		realms: [],
		isNew: false,
		selectDirectory: (cb) => { if (ipcRenderer && ipcRenderer.invoke) { ipcRenderer.invoke('select-directory').then(res => cb(res)).catch(() => cb(null)); } else { cb(null); } },
		update: () => { if (ipcRenderer) ipcRenderer.send('update'); },
		autoload: (val) => { if (ipcRenderer) ipcRenderer.send('autoload', val); },
		notify: () => { if (ipcRenderer) ipcRenderer.send('notify'); }
	};
}

angular
	.module('wowstat', [])
	.run(($rootScope) => {
		$rootScope.loaded = true;
	})
	.controller('main', ($scope, $http) => {
		$scope.platform = process.platform;
		$scope.strings = strings;
		$scope.regions = [
			{name: strings.realms.us, value: 'us'},
			{name: strings.realms.eu, value: 'eu'},
			{name: strings.realms.cn, value: 'cn'},
			{name: strings.realms.tw, value: 'tw'},
			{name: strings.realms.kr, value: 'kr'}
		];
		$scope.realms = [];
		$scope.realmsClassic = [];
		$scope.realmsClassicMoP = [];
		$scope.selectPath = () => {
			mainProcess.selectDirectory((res) => {
				if (!res) {
					return;
				}
				$scope.$apply(($scope) => {
					$scope.options.path = res;
				});
			});
		};

		$scope.testNotification = (type) => {
			console.log('Testing notification:', type);
			ipcRenderer.send('test-notify', type);
		};

		$scope.options = mainProcess.options();
		$scope.realms = mainProcess.realms || [];
		$scope.realmsClassic = mainProcess.realmsClassic || [];
		$scope.realmsClassicMoP = mainProcess.realmsClassicMoP || [];

		// Load saved options from storage
		storage.get('options', (error, savedOptions) => {
			if (error) {
				console.error('Error loading options:', error);
				return;
			}
			
			if (savedOptions && Object.keys(savedOptions).length > 0) {
				console.log('Loaded saved options into UI:', savedOptions);
				$scope.$apply(() => {
					$scope.options = savedOptions;
				});
			}
		});

		// Listen for options loaded from main process
		ipcRenderer.on('load-options', (event, opts) => {
			console.log('Received options from main process:', opts);
			$scope.$apply(() => {
				$scope.options = opts;
			});
		});

		ipcRenderer.on('server-status', (event, arg) => {
			$scope.$apply(($scope) => {
				$scope.realms = arg.retail || [];
				$scope.realmsClassic = arg.classic || [];
				$scope.realmsClassicMoP = arg.mop || [];
			});

			console.log('Realm status received - Retail:', arg.retail ? arg.retail.length : 0, 'Classic:', arg.classic ? arg.classic.length : 0, 'MoP:', arg.mop ? arg.mop.length : 0);
		});

		$scope.$watch('options', (newval, oldval) => {
			console.debug('options changed', $scope.options);
			if (oldval.region != newval.region) {
				mainProcess.update();
			}
			// Immediately check realm status when realm selection changes
			if (oldval.realm != newval.realm || oldval.realmClassic != newval.realmClassic || oldval.realmClassicMoP != newval.realmClassicMoP) {
				mainProcess.update();
			}
			if (oldval.autoload != newval.autoload) {
				mainProcess.autoload(newval.autoload);
			}
			//mainProcess.options($scope.options);

			storage.set('options', $scope.options, (error) => {
				if (error) throw error;
			});
		}, true);

		storage.get('realms', (error, realms) => {
			if (error) throw error;

			if (!Object.keys(realms).length) {
				$scope.$apply(($scope) => {
					$scope.realms = realms;
					if ($scope.options.realm) {
					}
				});
			}

			$scope.$watch('realms', (oldval, newval) => {
				console.debug('realms changed', $scope.realms);
				storage.set('realms', $scope.realms, (error) => {
					if (error) throw error;
				});
			});

			//loadRealms();
		});

		ipcRenderer.on('notify', (event, arg) => {
			notify(arg.title, arg.body)
		});

		var notify = (title, body) => {
			if (process.platform == 'darwin') {
				new Notification(title, {
					body: body
				});
			} else {
				mainProcess.notify(title, body);
			}
		};

		if (!mainProcess.isNew) {
			notify('WoW Stat', 'Is now running');
		}
	});