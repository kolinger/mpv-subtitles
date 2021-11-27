var Subtitles = function () {
	var self = this;
	// configure in subtitles.conf
	self.options = {
		'pythonBinary': 'python',
		'pythonScript': 'subtitles.py',
		'itemsPerPage': 10,
		'triggerShortcut': 'ctrl+d',
	};
	mp.options.read_options(self.options, 'subtitles');
	self.options['itemsPerPage'] = parseInt(self.options['itemsPerPage']);
	self.running = false;
	self.screenPayload = '';
	self.redrawInterval = null;
	self.screenList = [];
	self.screenListPosition = 0;
	self.subtitles = [];
	self.pageCurrent = 1;
	self.pageTotal = 1;
	self.keybindings = {
		'subtitles-up': {repeatable: true, keys: ['up']},
		'subtitles-down': {repeatable: true, keys: ['down']},
		'subtitles-left': {repeatable: true, keys: ['left']},
		'subtitles-right': {repeatable: true, keys: ['right']},
		'subtitles-open': {repeatable: false, keys: ['enter']},
		'subtitles-close': {repeatable: false, keys: ['esc']}
	};
};

Subtitles.prototype.enableLocalKeybindings = function () {
	var self = this;
	for (var alias in self.keybindings) {
		(function (alias) {
			var keybinding = self.keybindings[alias];
			var callback = function () {
				self.onKey(alias);
			};
			mp.add_forced_key_binding(keybinding.keys, alias, callback, {repeatable: keybinding.repeatable});
		})(alias);
	}
};

Subtitles.prototype.disableLocalKeybindings = function () {
	var self = this;
	for (var alias in self.keybindings) {
		mp.remove_key_binding(alias);
	}
};

Subtitles.prototype.onKey = function (alias) {
	var self = this;
	if (alias === 'subtitles-close') {
		self.stop();
	} else if (alias === 'subtitles-up') {
		if (self.screenList.length > 0) {
			self.screenListPosition--;
			if (self.screenListPosition < 0) {
				self.screenListPosition = self.screenList.length - 1;
			}
			self.drawSubtitleList();
		}
	} else if (alias === 'subtitles-down') {
		if (self.screenList.length > 0) {
			self.screenListPosition++;
			if (self.screenListPosition >= self.screenList.length) {
				self.screenListPosition = 0;
			}
			self.drawSubtitleList();
		}
	} else if (alias === 'subtitles-left') {
		if (self.subtitles.length > 0) {
			self.pageCurrent--;
			if (self.pageCurrent < 1) {
				self.pageCurrent = 1;
			} else {
				self.screenListPosition = 0;
			}
			self.drawSubtitleList();
		}
	} else if (alias === 'subtitles-right') {
		if (self.subtitles.length > 0) {
			self.pageCurrent++;
			if (self.pageCurrent > self.pageTotal) {
				self.pageCurrent = self.pageTotal;
			} else {
				self.screenListPosition = 0;
			}
			self.drawSubtitleList();
		}
	} else if (alias === 'subtitles-open') {
		if (self.screenList.length > 0) {
			self.download(self.subtitles[self.screenListPosition].id);
		}
	}
};

Subtitles.prototype.beginDrawing = function () {
	var self = this;
	self.enableLocalKeybindings();
	if (self.redrawInterval) {
		clearInterval(self.redrawInterval);
	}
	self.redrawInterval = setInterval(function () {
		self.redraw();
	}, 1000);
};

Subtitles.prototype.redraw = function () {
	var self = this;
	mp.osd_message(self.screenPayload, 60);
};

Subtitles.prototype.stopDrawing = function () {
	var self = this;
	if (self.redrawInterval) {
		clearInterval(self.redrawInterval);
	}
	mp.osd_message('', 1);
	self.running = false;
};

Subtitles.prototype.search = function () {
	var self = this;
	var path = mp.get_property('path');
	if (!path) {
		self.stop();
		mp.osd_message('Subtitles: play something first', 3);
		return;
	}
	var command = [self.options['pythonBinary'], self.options['pythonScript'], 'search', path];
	var result = mp.command_native({
		name: "subprocess",
		playback_only: false,
		capture_stdout: true,
		capture_stderr: true,
		args: command,
	});
	if (result.status !== 0) {
		mp.msg.fatal(
			'Command failed with unexpected exit code: ' + result.status +
			', stdout: ' + result.stdout + ', stderr: ' + result.stderr
		);
		self.onError();
	} else {
		try {
			var items = JSON.parse(result.stdout);
			if (items.length === 0) {
				self.stop();
				mp.osd_message('Subtitles: no subtitles found', 3);
			} else {
				self.subtitles = [];
				for (var index = 0; index < items.length; index++) {
					var item = items[index];
					item.name = (index + 1) + '. ' + item.name;
					self.subtitles.push(item);
				}
				self.pageCurrent = 1;
				self.pageTotal = Math.ceil(self.subtitles.length / self.options['itemsPerPage']);
				self.screenListPosition = 0;
				self.drawSubtitleList();
			}
		} catch (e) {
			mp.msg.fatal(e.toString());
			self.onError();
		}
	}
};

Subtitles.prototype.drawSubtitleList = function () {
	var self = this;
	var list = [];
	var begin = (self.pageCurrent - 1) * 10;
	for (var index = begin; index < self.subtitles.length; index++) {
		var item = self.subtitles[index];
		list.push(item.name);
		if (list.length >= self.options['itemsPerPage']) {
			break;
		}
	}
	self.screenList = list;
	var prefix = 'Subtitles: ' + self.pageCurrent + ' of ' + self.pageTotal + '\n';
	self.screenPayload = prefix + self.buildListMessage(self.screenList, self.screenListPosition);

	self.redraw();
};

Subtitles.prototype.download = function (subtitleId) {
	var self = this;
	self.screenPayload = 'Subtitles: downloading...';
	self.redraw();
	var command = [
		self.options['pythonBinary'], self.options['pythonScript'],
		'download', mp.get_property('path'), subtitleId
	];
	var result = mp.command_native({
		name: "subprocess",
		playback_only: false,
		capture_stdout: true,
		capture_stderr: true,
		args: command,
	});
	if (result.status !== 0) {
		mp.msg.fatal(
			'Command failed with unexpected exit code: ' + result.status +
			', stdout: ' + result.stdout + ', stderr: ' + result.stderr
		);
		self.onError();
	} else {
		try {
			var payload = JSON.parse(result.stdout);
			if (payload.status === 'not-found') {
				self.onError('Subtitles: not found - try others');
			} else {
				mp.set_property('sub-auto', 'fuzzy');
				mp.commandv('rescan_external_files');
				self.stop();
				mp.osd_message('Subtitles: success', 3);
			}
		} catch (e) {
			mp.msg.fatal(e.toString());
			self.onError();
		}
	}
};

Subtitles.prototype.onError = function (message) {
	var self = this;
	self.stop();
	if (!message) {
		message = 'Subtitles: error, see log for details';
	}
	mp.osd_message(message, 10);
};

Subtitles.prototype.buildListMessage = function (rows, activeIndex) {
	var self = this;
	var message = '';
	for (var index = 0; index < rows.length; index++) {
		var row = rows[index];
		index = parseInt(index);
		if (index === activeIndex) {
			row = '>> ' + row;
		}
		message += row + '\n';
	}
	return message;
};

Subtitles.prototype.run = function () {
	var self = this;
	if (self.running) {
		return;
	}
	self.screenPayload = 'Subtitles: searching...';
	self.redraw();
	self.beginDrawing();
	self.search();
};

Subtitles.prototype.stop = function () {
	var self = this;
	self.stopDrawing();
	self.disableLocalKeybindings();
};

var subtitles = new Subtitles();
mp.add_key_binding(subtitles.options['triggerShortcut'], 'subtitles', function () {
	subtitles.run();
});

