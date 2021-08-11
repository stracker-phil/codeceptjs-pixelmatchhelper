const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const path = require('path');
const Helper = require('@codeceptjs/helper');

/**
 * Helper class that integrates pixelmatch into CodeceptJS for visual regression
 * tests.
 *
 * helpers: {
 *   PixelmatchHelper: {
 *     require: "codeceptjs-pixelmatchhelper",
 *     dirExpected: "./tests/screenshots/base/",
 *     dirDiff: "./tests/screenshots/diff/",
 *     dirActual: "./tests/output/", // Optional. Defaults to global.output_dir.
 *     diffPrefix: "Diff_" // Optional. Defaults to "Diff_"
 *   }
 * }
 *
 * @author Philipp Stracker
 */

class PixelmatchHelper extends Helper {
	/**
	 * Relative path to the folder that contains relevant images.
	 *
	 * @type {{expected: string, actual: string, diff: string}}
	 */
	globalDir = {
		expected: '',
		actual: '',
		diff: ''
	};

	/**
	 * Filename prefix for generated difference files.
	 * @type {string}
	 */
	globalDiffPrefix = 'Diff_';

	/**
	 * Contains the image paths for the current test.
	 *
	 * @type {{expected: string, actual: string, diff: string}}
	 */
	path = {
		expected: '',
		actual: '',
		diff: ''
	};

	/**
	 * Comparison options.
	 *
	 * @type {object}
	 */
	options = {
		// Percentage of pixels that are allowed to differ between both images.
		tolerance: 0,

		// Defines a custom comparison image name.
		compareWith: '',

		// Only compare a single HTML element. Used to calculate a bounding box.
		element: '',

		// Only used, when element is not set. Only pixels inside this box are compared.
		bounds: {
			left: 0,
			top: 0,
			width: 0,
			height: 0
		},

		// List of boxes to ignore. Each box is an object with {left, top, width, height}.
		ignore: [],

		// Arguments that are passed to the pixelmatch library.
		args: {
			threshold: 0.1,
			alpha: 0.5,
			includeAA: false,
			diffMask: false,
			aaColor: [255, 255, 0],
			diffColor: [255, 0, 0],
			diffColorAlt: null
		}
	};

	/**
	 * Name of the image to compare.
	 *
	 * @type {string}
	 */
	imageName = '';

	/**
	 * Holds comparison results.
	 *
	 * @type {{match: boolean, difference: float}}
	 */
	result = {
		match: true,
		difference: 0
	};

	/**
	 * Constructor that initializes the helper.
	 * Called internally by CodeceptJS.
	 *
	 * @param {object} config
	 */
	constructor(config) {
		super(config);

		if (config.dirExpected) {
			this.globalDir.expected = this._resolvePath(config.dirExpected);
		} else {
			this.globalDir.expected = this._resolvePath('./tests/screenshots/base/');
		}

		if (config.dirDiff) {
			this.globalDir.diff = this._resolvePath(config.dirDiff);
		} else {
			this.globalDir.diff = this._resolvePath('./tests/screenshots/diff/');
		}

		if (config.dirActual) {
			this.globalDir.actual = this._resolvePath(config.dirActual);
		} else {
			this.globalDir.actual = global.output_dir + '/';
		}

		this.globalDiffPrefix = config.diffPrefix ? config.diffPrefix : 'Diff_';
	}

	/**
	 * Compares the given screenshot with the expected image. When too many
	 * differences are detected, the test will fail.
	 *
	 * I.checkVisualDifferences('dashboard.png');
	 * I.checkVisualDifferences('dashboard.png', { screenshot: true });
	 *
	 * @param {string} image - Name of the input image to compare.
	 * @param {object} options - Optional options for the comparison.
	 * @return {Promise}
	 */
	checkVisualDifferences(image, options) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.getVisualDifferences(image, options);
			} catch (err) {
				reject(err);
			}

			if (this.result.match) {
				resolve(this.result);
			} else {
				const diffImage = this._getFileName('diff');
				reject(`Images are different by ${this.result.difference}%, which is above the allowed tolerance of ${this.options.tolerance}% - differences are displayed in '${diffImage}'`);
			}
		});
	}

	/**
	 * Compares the given screenshot with the expected image and updates the
	 * class member `this.result` with details. This function does to trigger an
	 * assertion but can throw an error, when the images cannot be compared.
	 *
	 * @param {string} image - Name of the input image to compare.
	 * @param {object} options - Optional options for the comparison.
	 * @return {{match: boolean, difference: float}} Comparison details.
	 */
	async getVisualDifferences(image, options) {
		await this._setupTest(image, options);

		this.debug(`Check differences in ${image} ...`);

		let imgExpected = this._loadPngImage('expected');
		let imgActual = this._loadPngImage('actual');

		if (imgExpected.width !== imgActual.width || imgExpected.height !== imgActual.height) {
			throw new Error('Image sizes do not match');
		}
		if (!imgExpected.width) {
			throw new Error('Image is empty');
		}

		const width = imgExpected.width;
		const height = imgExpected.height;
		const useBounds = this.options.bounds.left
			|| this.options.bounds.top
			|| this.options.bounds.width
			|| this.options.bounds.height;

		// Apply a bounding box to only compare a section of the image.
		if (useBounds) {
			this.debug(`Apply bounds to image ...`);
			const box = {
				x0: 0,
				x1: this.options.bounds.left,
				x2: this.options.bounds.left + this.options.bounds.width,
				x3: imgExpected.width,
				y0: 0,
				y1: this.options.bounds.top,
				y2: this.options.bounds.top + this.options.bounds.height,
				y3: imgExpected.height
			};

			this._clearRect(imgExpected, box.x0, box.y0, box.x1, box.y3);
			this._clearRect(imgExpected, box.x1, box.y0, box.x3, box.y1);
			this._clearRect(imgExpected, box.x1, box.y2, box.x3, box.y3);
			this._clearRect(imgExpected, box.x2, box.y1, box.x3, box.y2);

			this._clearRect(imgActual, box.x0, box.y0, box.x1, box.y3);
			this._clearRect(imgActual, box.x1, box.y0, box.x3, box.y1);
			this._clearRect(imgActual, box.x1, box.y2, box.x3, box.y3);
			this._clearRect(imgActual, box.x2, box.y1, box.x3, box.y2);
			this.debug(`Bounds applied ...`);
		}

		// Clear areas that are ignored.
		for (let i = 0; i < this.options.ignore.length; i++) {
			const box = this.options.ignore[i];
			this._clearRect(
				imgExpected,
				box.left,
				box.top,
				box.left + box.width,
				box.top + box.height
			);
			this._clearRect(
				imgActual,
				box.left,
				box.top,
				box.left + box.width,
				box.top + box.height
			);
		}

		const imgDiff = new PNG({
			width,
			height
		});

		const mismatchPixel = pixelmatch(
			imgExpected.data,
			imgActual.data,
			imgDiff.data,
			width,
			height,
			this.options.args
		);

		this.result.difference = mismatchPixel / (width * height) * 100;
		this.result.difference = parseFloat(this.result.difference.toFixed(4));
		this.result.match = this.result.difference <= this.options.tolerance;

		if (!this.result.match) {
			this._savePngImage('diff', imgDiff);
		}

		return this.result;
	}

	/**
	 * Take screenshot of individual element.
	 *
	 * @param {string} name - Name of the output image.
	 * @param {'actual'|'expected'} which - Optional. Whether the screenshot is
	 *        the expected bas eimage, or an actual image for comparison.
	 *        Defaults to 'actual'.
	 * @param {string} element - Optional. Selector of the element to
	 *        screenshot, or empty to screenshot current viewport.
	 * @returns {Promise}
	 */
	async takeScreenshot(name, which, element) {
		const driver = this._getDriver();

		await this._setupTest(name);

		// The output path where the screenshot is saved to.
		const outputFile = this._buildPath('expected' === which ? which : 'actual');

		if (element) {
			// Screenshot a single element.
			await driver.waitForVisible(element);
			const els = await driver._locate(element);

			if ('TestCafe' === driver._which) {
				if (!await els.count) {
					throw new Error(`Element ${element} couldn't be located`);
				}

				await driver.t.takeElementScreenshot(els, outputFile);
			} else {
				if (!els.length) {
					throw new Error(`Element ${element} couldn't be located`);
				}
				const el = els[0];

				switch (driver._which) {
					case 'Playwright':
					case 'Puppeteer':
						await el.screenshot({path: outputFile});
						break;

					case 'WebDriver':
					case 'Appium':
						await el.saveScreenshot(outputFile);
						break;
				}
			}
		} else {
			// Screenshot the current viewport.
			driver.saveScreenshot('_temp.png');
			fs.renameSync(global.output_dir + '_temp.png', outputFile);
		}
	}

	/**
	 * Determines the bounding box of the given element on the current viewport.
	 *
	 * @param {string} selector - CSS|XPath|ID selector.
	 * @returns {Promise<{boundingBox: {left: int, top: int, right: int, bottom: int, width: int,
	 *     height: int}}>}
	 */
	async _getBoundingBox(selector) {
		const driver = this._getDriver();

		await driver.waitForVisible(selector);
		const els = await driver._locate(selector);
		let location, size;

		if ('TestCafe' === driver._which) {
			if (await els.count != 1) {
				throw new Error(`Element ${selector} couldn't be located or isn't unique on the page`);
			}
		} else if (!els.length) {
			throw new Error(`Element ${selector} couldn't be located`);
		}

		const density = parseInt(await driver.executeScript(() => {
			return window.devicePixelRatio;
		})) || 1;

		switch (driver._which) {
			case 'Puppeteer':
			case 'Playwright': {
				const el = els[0];
				const box = await el.boundingBox();
				size = location = box;
			}
				break;

			case 'WebDriver':
			case 'Appium': {
				const el = els[0];
				location = await el.getLocation();
				size = await el.getSize();
			}
				break;

			case 'WebDriverIO':
				location = await driver.browser.getLocation(selector);
				size = await driver.browser.getElementSize(selector);
				break;

			case 'TestCafe': {
				const box = await els.boundingClientRect;
				location = {
					x: box.left,
					y: box.top
				};
				size = {
					width: box.width,
					height: box.height
				};
			}
		}

		if (!size) {
			throw new Error('Cannot get element size!');
		}

		const boundingBox = {
			left: density * location.x,
			top: density * location.y,
			right: density * (size.width + location.x),
			bottom: density * (size.height + location.y),
			width: density * size.width,
			height: density * size.height
		};

		this.debugSection(`Bounding box of ${selector}:`, JSON.stringify(boundingBox));

		return boundingBox;
	}

	/**
	 * Sanitizes the given options and updates all relevant class members with
	 * either the new, sanitized value, or with a default value.
	 *
	 * @param {string} image - Name of the image to compare.
	 * @param {object|undefined} options - The new options to set.
	 * @private
	 */
	async _setupTest(image, options) {
		// Set the name of the current image.
		this.imageName = image;

		// Reset the previous test results.
		this.result = {
			match: true,
			difference: 0
		};

		// Define the default options.
		const newValues = {
			tolerance: 0,
			compareWith: '',
			bounds: {
				left: 0,
				top: 0,
				width: 0,
				height: 0
			},
			ignore: [],
			args: {
				threshold: 0.1,
				alpha: 0.5,
				includeAA: false,
				diffMask: false,
				aaColor: [255, 255, 0],
				diffColor: [255, 0, 0],
				diffColorAlt: null
			}
		};

		if (options && 'object' === typeof options) {
			// Sanitize the allowed tolerance [percent].
			if ('undefined' !== typeof options.tolerance) {
				newValues.tolerance = Math.max(0, parseFloat(options.tolerance));
			}

			// Maybe define a custom filename for the expected image file.
			if ('undefined' !== typeof options.compareWith) {
				newValues.compareWith = options.compareWith;
			}

			// Set bounding box, either via element selector or a rectangle.
			if (options.element) {
				const bounds = await this._getBoundingBox(options.element);
				newValues.bounds.left = bounds.left;
				newValues.bounds.top = bounds.top;
				newValues.bounds.width = bounds.width;
				newValues.bounds.height = bounds.height;
			} else if (options.bounds && 'object' === typeof options.bounds) {
				newValues.bounds.left = parseInt(options.bounds.left);
				newValues.bounds.top = parseInt(options.bounds.top);
				newValues.bounds.width = parseInt(options.bounds.width);
				newValues.bounds.height = parseInt(options.bounds.height);
			}

			// Sanitize ignored regions.
			if (options.ignore) {
				for (let i = 0; i < options.ignore.length; i++) {
					const item = options.ignore[i];

					if (
						'object' === typeof item
						&& 'undefined' !== typeof item.left
						&& 'undefined' !== typeof item.top
						&& 'undefined' !== typeof item.width
						&& 'undefined' !== typeof item.height
					) {
						newValues.ignore.push({
							left: parseInt(item.left),
							top: parseInt(item.top),
							width: parseInt(item.width),
							height: parseInt(item.height)
						});
					}
				}
			}

			// Add pixelmatch arguments.
			if (options.args && 'object' === typeof options.args) {
				for (const key in options.args) {
					if (!options.args.hasOwnProperty(key)) {
						continue;
					}
					newValues.args[key] = options.args[key];
				}
			}
		}

		this.options = newValues;

		// Prepare paths for the current operation.
		this.path.expected = this._buildPath('expected');
		this.path.actual = this._buildPath('actual');
		this.path.diff = this._buildPath('diff');
	}

	/**
	 * Returns the instance of the current browser driver.
	 *
	 * @return {Puppeteer|WebDriver|Appium|WebDriverIO|TestCafe}
	 * @private
	 */
	_getDriver() {
		let driver = null;

		if (this.helpers['Puppeteer']) {
			driver = this.helpers['Puppeteer'];
			driver._which = 'Puppeteer';
		} else if (this.helpers['WebDriver']) {
			driver = this.helpers['WebDriver'];
			driver._which = 'WebDriver';
		} else if (this.helpers['Appium']) {
			driver = this.helpers['Appium'];
			driver._which = 'Appium';
		} else if (this.helpers['WebDriverIO']) {
			driver = this.helpers['WebDriverIO'];
			driver._which = 'WebDriverIO';
		} else if (this.helpers['TestCafe']) {
			driver = this.helpers['TestCafe'];
			driver._which = 'TestCafe';
		} else if (this.helpers['Playwright']) {
			driver = this.helpers['Playwright'];
			driver._which = 'Playwright';
		} else {
			throw new Error(
				'Unsupported driver. The pixelmatch helper supports [Playwright|WebDriver|Appium|Puppeteer|TestCafe]');
		}

		return driver;
	}

	/**
	 * Builds the absolute path to a relative folder path.
	 *
	 * @param {string} dir - The relative folder name.
	 * @returns {string}
	 * @private
	 */
	_resolvePath(dir) {
		if (!path.isAbsolute(dir)) {
			return path.resolve(global.codecept_dir, dir) + '/';
		}
		return dir;
	}

	/**
	 * Returns the filename of an image.
	 *
	 * @param {string} which - Which image to return (expected, actual, diff).
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @private
	 */
	_getFileName(which, suffix) {
		let filename;

		// Define a custom filename for the expected image.
		if ('expected' === which && this.options.compareWith) {
			filename = this.options.compareWith;
		} else {
			filename = this.imageName;
		}

		if ('.png' !== filename.substr(-4)) {
			filename += '.png';
		}

		if ('diff' === which) {
			filename = this.globalDiffPrefix + filename;
		}

		if (suffix) {
			suffix = '.' + suffix.replace(/(^\.+|\.+$)/g, '') + '.png';
			filename = filename.substr(0, filename.length - 4) + suffix;
		}

		return filename;
	}

	/**
	 * Builds an image path using the current image name and the specified folder.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @returns {string} Path to the image.
	 * @private
	 */
	_buildPath(which, suffix) {
		const path = this.globalDir[which];

		if (!path) {
			throw new Error(`No ${which}-folder defined.`);
		}

		return path + this._getFileName(which, suffix);
	}

	/**
	 * Loads the specified image and returns a PNG blob.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @return {object} An PNG object.
	 * @private
	 */
	_loadPngImage(which, suffix) {
		const path = this._buildPath(which, suffix);

		if (!path) {
			throw new Error(`No ${which}-image defined.`);
		}

		this.debug(`Load image from ${path} ...`);

		fs.access(path, fs.constants.F_OK, (err) => {
			if (err) {
				throw new Error(`The ${which}-image does not exist at "${path}"`);
			}
		});

		const data = fs.readFileSync(path);
		return PNG.sync.read(data);
	}

	/**
	 * Saves the specified PNG image to the filesystem.
	 * .
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {object} png - An PNG image object.
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @private
	 */
	_savePngImage(which, png, suffix) {
		const path = this._buildPath(which, suffix);

		if (!path) {
			throw new Error(`No ${which}-image defined.`);
		}

		this.debug(`Save image to ${path} ...`);

		fs.access(path, fs.constants.F_OK | fs.constants.W_OK, (err) => {
			console.log('FILE CHECK', path);
			console.log('FILE ERR', err.code, err.message);

			if (err && err.code !== 'ENOENT') {
				throw new Error(`Cannot save the ${which}-image to ${path}. Maybe the file is read-only.`);
			}
		});

		const data = PNG.sync.write(png);
		fs.writeFileSync(path, data);
	}

	/**
	 * Clears a rectangular area inside the given PNG image object. The change
	 * is only applied in-memory and does not affect the saved image.
	 *
	 * @param {object} png - The PNG object.
	 * @param {int} x0
	 * @param {int} y0
	 * @param {int} x1
	 * @param {int} y1
	 * @private
	 */
	_clearRect(png, x0, y0, x1, y1) {
		x0 = parseInt(x0);
		y0 = parseInt(y0);
		x1 = parseInt(x1);
		y1 = parseInt(y1);

		if (x1 < x0) {
			const xt = x1;
			x1 = x0;
			x0 = xt;
		}
		if (y1 < y0) {
			const yt = y1;
			y1 = y0;
			y0 = yt;
		}

		if (x0 < 0) {
			x0 = 0;
		}
		if (y0 < 0) {
			y0 = 0;
		}
		if (x1 > png.width) {
			x1 = png.width;
		}
		if (y1 > png.height) {
			y1 = png.height;
		}

		if (x0 === x1 || y0 === y1) {
			return;
		}

		this.debug(`Clear Rect ${x0}/${y0} - ${x1}/${y1}`);
		const numBytes = 4 + (x1 - x0);

		for (let y = y0; y < y1; y++) {
			const startAt = 4 * (png.width * y);
			png.data.fill(0, startAt, startAt + numBytes);
		}
	}
}

module.exports = PixelmatchHelper;
