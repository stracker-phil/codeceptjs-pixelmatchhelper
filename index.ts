/// <reference path="index.d.ts" />
import { _deleteFile, _getDriver, _isFile, _mkdirp, _resolvePath, _toBool } from "./utils/common";
import fs = require('fs');
import { PNG } from 'pngjs';
import path = require('path');
import pixelmatch = require('pixelmatch');

const defaultImageType = '.png'

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
 *     tolerance: 1.5,
 *     threshold: 0.1,
 *     dumpIntermediateImage: false,
 *     captureActual: true,
 *     captureExpected: true
 *   }
 * }
 *
 * @author Philipp Stracker
 */


//@ts-ignore
class PixelmatchHelper extends Helper {
	/**
	 * Relative path to the folder that contains relevant images.
	 *
	 * @type {{expected: string, actual: string, diff: string}}
	 */
	globalDir:globalDir = {
		expected: '',
		actual: '',
		diff: ''
	};

	/**
	 * Default tolserance level for comparisons.
	 *
	 * @type {float}
	 */
	globalTolerance:number = 0;

	/**
	 * Default threshold for all comparisons.
	 *
	 * @type {float}
	 */
	globalThreshold:number = 0.05;

	/**
	 * Filename prefix for generated difference files.
	 * @type {string}
	 */
	globalDiffPrefix:string = 'Diff_';

	/**
	 * Whether to save the intermediate images to the global output folder,
	 * after applying the bounds and ignore-boxes.
	 *
	 * Useful for debugging tests, but not recommended for production usage.
	 *
	 * @type {boolean}
	 */
	globalDumpIntermediateImage:boolean|string = false;

	/**
	 * Whether to capture a new screenshot and use it as actual image, instead
	 * of loading the image from the `dirActual` folder.
	 *
	 * The new screenshot is saved to the `dirActual` folder before comparison,
	 * and will replace an existing file with the same name!
	 *
	 * @type {boolean|'missing'}
	 */
	globalCaptureActual:boolean|string = 'missing';

	/**
	 * Whether to update the expected base image with a current screenshot
	 * before starting the comparison.
	 *
	 * The new screenshot is saved to the `dirExpected` folder, and will
	 * replace an existing file with the same name!
	 *
	 * @type {boolean|'missing'}
	 */
	globalCaptureExpected:boolean|string = 'missing';

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
			aaColor: [128, 128, 128],
			diffColor: [255, 0, 0],
			diffColorAlt: null
		},

		// Whether to dump intermediate images before comparing them.
		dumpIntermediateImage: false,

		// Whether to take a screenshot for the actual image before comparison.
		captureActual: 'missing',

		// Whether to take a screenshot for the expected image before comparison.
		captureExpected: 'missing'
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
	 * @type {{match: boolean, difference: float, diffImage: string, diffPixels: integer,
	 *     totalPixels: integer, relevantPixels: integer}}
	 */
	result: comparisonResults = {
		match: true,
		difference: 0,
		diffImage: '',
		diffPixels: 0,
		totalPixels: 0,
		relevantPixels: 0,
		variation: '',
		variations: []
	};

	/**
	 * Constructor that initializes the helper.
	 * Called internally by CodeceptJS.
	 *
	 * @param {object} config
	 */
	constructor(config) {
		super(config);

		this.globalDir.expected = config.dirExpected ? _resolvePath(config.dirExpected) : _resolvePath('./tests/screenshots/base/');

		if ('undefined' !== typeof config.dirDiff) {
			if (config.dirDiff) {
				this.globalDir.diff = _resolvePath(config.dirDiff);
			} else {
				this.globalDir.diff = false;
			}
		} else {
			this.globalDir.diff = _resolvePath('./tests/screenshots/diff/');
		}

		if (config.dirActual) {
			this.globalDir.actual = _resolvePath(config.dirActual);
		} else {
			this.globalDir.actual = global.output_dir + '/';
		}

		this.globalDir.output = global.output_dir + '/';

		if ('undefined' !== typeof config.tolerance) {
			this.globalTolerance = Math.min(100, Math.max(0, parseFloat(config.tolerance)));
		}

		if ('undefined' !== typeof config.threshold) {
			this.globalThreshold = Math.min(1, Math.max(0, parseFloat(config.threshold)));
		}

		this.globalDiffPrefix = config.diffPrefix ? config.diffPrefix : 'Diff_';
		this.globalDumpIntermediateImage = _toBool(config.dumpIntermediateImage);

		if ('undefined' !== typeof config.captureActual) {
			this.globalCaptureActual = _toBool(config.captureActual, ['missing']);
		}
		if ('undefined' !== typeof config.captureExpected) {
			this.globalCaptureExpected = _toBool(config.captureExpected, ['missing']);
		}
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
	checkVisualDifferences(image, options?) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.getVisualDifferences(image, options);
			} catch (err) {
				reject(err);
			}

			const res = this.result;
			console.log(`Difference: ${res.difference}% | ${res.diffPixels} / ${res.relevantPixels} pixels`);

			if (res.match) {
				resolve(res);
			} else {
				const msg:Array<String> = [];
				msg.push(`Images are different by ${res.difference}%`);

				if (res.diffImage) {
					msg.push(`differences are displayed in '${res.diffImage}'`);
				}

				reject(msg.join(' - '));
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
	async getVisualDifferences(image, options?) {
		await this._setupTest(image, options);
		const opts = this.options;
		const res = this.result;

		console.log(`Check differences in ${image} ...`);

		await this._maybeCaptureImage('actual', opts.captureActual);
		await this._maybeCaptureImage('expected', opts.captureExpected);

		const expectedImages = this._getExpectedImagePaths();
		if (!expectedImages.length) {
			throw new Error('No expected base image found');
		}

		const imgActual = this._loadPngImage('actual');
		if (!imgActual.height) {
			throw new Error('Current screenshot is empty (zero height)');
		}

		const width = imgActual.width;
		const height = imgActual.height;
		const totalPixels = width * height;
		const ignoredPixels = this._applyBounds(imgActual);
		const results:Array<any> = [];
		let bestIndex = 0;
		let bestDifference = totalPixels;
		let bestImgDiff;

		const imgDiff = new PNG({
			width,
			height
		});

		if (opts.dumpIntermediateImage) {
			this._savePngImage('output', imgActual, 'actual');
		}

		// Compare the actual image with every base image in the list.
		for (let i = 0; i < expectedImages.length; i++) {
			const imgPath = expectedImages[i];
			const imgExpected = this._loadPngImage(imgPath);

			if (imgExpected.width !== imgActual.width || imgExpected.height !== imgActual.height) {
				throw new Error('Image sizes do not match');
			}

			this._applyBounds(imgExpected);
			if (opts.dumpIntermediateImage) {
				this._savePngImage('output', imgExpected, 'expected.' + (i ? i : ''));
			}

			results[i] = {};
			results[i].diffPixels = pixelmatch(
				imgExpected.data,
				imgActual.data,
				imgDiff.data,
				width,
				height,
				opts.args
			);

			results[i].totalPixels = totalPixels;
			results[i].relevantPixels = totalPixels - ignoredPixels;
			const difference = 100 * results[i].diffPixels / results[i].relevantPixels;

			results[i].difference = parseFloat(difference.toFixed(4));
			results[i].match = results[i].difference <= opts.tolerance;

			if (-1 !== imgPath.indexOf('~')) {
				results[i].variation = imgPath.replace(/\.png$|^.*~/g, '');
			} else {
				results[i].variation = '';
			}

			if (!results[i].match && this.globalDir.diff) {
				results[i].diffImage = this._getFileName('diff', i);
			} else {
				results[i].diffImage = '';
			}

			// Keep track of the best match.
			if (results[i].diffPixels < bestDifference) {
				// Remember the serialized PNG, because the imgDiff object is
				// a reference that might be updated before the loop ends.
				bestImgDiff = PNG.sync.write(imgDiff);
				bestDifference = results[i].diffPixels;
				bestIndex = i;
			}
		}

		// Use the best match as return value.
		for (const key in res) {
			if (!res.hasOwnProperty(key)) {
				continue;
			}
			res[key] = results[bestIndex][key];
		}

		// Add the dynamic property `variations` that lists all comparisons.
		res.variations = results;

		// Only create a diff-image of the best-matching variation.
		if (!res.match) {
			this._savePngImage('diff', bestImgDiff, res.variation);
		}

		return res;
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
	async takeScreenshot(name, which?, element?) {
		await this._setupTest(name);

		if (element) {
			await this._takeElementScreenshot(name, which, element);
		} else {
			await this._takeScreenshot(name, which);
		}
	}

	/**
	 * Sanitizes the given options and updates all relevant class members with
	 * either the new, sanitized value, or with a default value.
	 *
	 * @param {string} image - Name of the image to compare.
	 * @param {object|undefined} options - The new options to set.
	 * @private
	 */
	async _setupTest(image, options?) {
		// Set the name of the current image.
		this.imageName = image.replace(/(~.+)?\.png$/, '');

		// Reset the previous test results.
		this.result = {
			match: true,
			difference: 0,
			diffImage: '',
			diffPixels: 0,
			totalPixels: 0,
			relevantPixels: 0,
			variation: '',
			variations: []
		};

		// Define the default options.
		const newValues = {
			tolerance: this.globalTolerance,
			compareWith: '',
			element: '',
			bounds: {
				left: 0,
				top: 0,
				width: 0,
				height: 0
			},
			ignore: [],
			args: {
				threshold: this.globalThreshold,
				alpha: 0.5,
				includeAA: false,
				diffMask: false,
				aaColor: [128, 128, 128],
				diffColor: [255, 0, 0],
				diffColorAlt: null
			},
			dumpIntermediateImage: this.globalDumpIntermediateImage,
			captureActual: this.globalCaptureActual,
			captureExpected: this.globalCaptureExpected
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
				newValues.element = options.element;
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

			// Debug: Dump intermediate images.
			if ('undefined' !== typeof options.dumpIntermediateImage) {
				newValues.dumpIntermediateImage = _toBool(options.dumpIntermediateImage);
			}

			// Capture screenshots before comparison?
			if ('undefined' !== typeof options.captureActual) {
				newValues.captureActual = _toBool(options.captureActual, ['missing']);
			}
			if ('undefined' !== typeof options.captureExpected) {
				newValues.captureExpected = _toBool(options.captureExpected, ['missing']);
			}
		}

		//@ts-ignore
		this.options = newValues;

		// Prepare paths for the current operation.
		this.path.expected = this._buildPath('expected');
		this.path.actual = this._buildPath('actual');

		// Diff-image generation might be disabled.
		if (this.globalDir.diff) {
			this.path.diff = this._buildPath('diff');
		}
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
	 * @return {int} Number of cleared pixels.
	 * @private
	 */
    _clearRect(png, x0, y0, x1, y1) {
		let count = 0;
		x0 = Math.min(png.width, Math.max(0, parseInt(x0)));
		x1 = Math.min(png.width, Math.max(0, parseInt(x1)));
		y0 = Math.min(png.height, Math.max(0, parseInt(y0)));
		y1 = Math.min(png.height, Math.max(0, parseInt(y1)));

		if (x0 === x1 || y0 === y1) {
			return 0;
		}

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

		const numBytes = 4 + (x1 - x0);

		for (let y = y0; y < y1; y++) {
			for (let x = x0; x < x1; x++) {
				const k = 4 * (x + png.width * y);

				if (png.data[k + 3] > 0) {
					count++;
				}

				png.data.fill(0, k, k + 4);
			}
		}
		//@ts-ignore
		this.debug(`Clear Rect ${x0}/${y0} - ${x1}/${y1} | ${count} pixels cleared`);

		// Return the real number of cleared pixels.
		return count;
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
			if ('diff' === which) {
				// Diff generation can be disabled by setting the path to
				// false/empty. This is not an error.
				return;
			} else {
				throw new Error(`No ${which}-image defined.`);
			}
		}

		//@ts-ignore
		this.debug(`Save image to ${path} ...`);

		if (_isFile(path) && !_isFile(path, 'write')) {
			throw new Error(`Cannot save the ${which}-image to ${path}. Maybe the file is read-only.`);
		}

		let data;

		if (png instanceof PNG) {
			data = PNG.sync.write(png);
		} else if (png instanceof Buffer) {
			data = png;
		}

		if (data && data instanceof Buffer) {
			fs.writeFileSync(path, data);
		}
	}

    	/**
	 * Loads the specified image and returns a PNG blob.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @return {object} An PNG object.
	 * @private
	 */
	_loadPngImage(which, suffix?) {
		const path = this._buildPath(which, suffix);

		if (!path) {
			throw new Error(`No ${which}-image defined.`);
		}

		//@ts-ignore
		this.debug(`Load image from ${path} ...`);

		if (!_isFile(path, 'read')) {
			throw new Error(`The ${which}-image does not exist at "${path}"`);
		}

		const data = fs.readFileSync(path);
		return PNG.sync.read(data);
	}

    	/**
	 * Returns a list of absolute image paths of base images for the comparison.
	 * All files in the returned list exist in the filesystem.
	 *
	 * Naming convention:
	 *
	 * Files that contain a trailing "~<num>" suffix are considered part of the
	 * matching list.
	 *
	 * For example:
	 *
	 * image: "google-home"
	 * files:
	 *        "google-home.png"     # exact match
	 *        "google-home~1.png"   # variation
	 *        "google-home~83.png"  # variation
	 *
	 * @return {string[]}
	 * @private
	 */
	_getExpectedImagePaths() {
		const list:Array<String> = [];
		const fullPath = this._buildPath('expected');
		const dir = path.dirname(fullPath);
		const file = path.basename(fullPath);
		const re = new RegExp('^' + file.replace(defaultImageType, `(:?~.+)?\\${defaultImageType}`) + '$');

		_mkdirp(dir);

		fs.readdirSync(dir).map(fn => {
			if (fn.match(re)) {
				list.push(`${dir}/${fn}`);
			}
		});

		return list;
	}

    	/**
	 * Builds an image path using the current image name and the specified folder.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {string} suffix - Optional. A suffix to append to the filename.
	 * @returns {string} Path to the image.
	 * @private
	 */
	_buildPath(which, suffix?) {
		let fullPath;
		const dir = this.globalDir[which];

		if (!dir) {
			if ('diff' === which) {
				// Diff image generation is disabled.
				return '';
			}

			if (path.isAbsolute(which) && _isFile(which)) {
				fullPath = which;
			} else {
				throw new Error(`No ${which}-folder defined.`);
			}
		} else {
			fullPath = dir + this._getFileName(which, suffix);
			_mkdirp(path.dirname(fullPath));
		}

		return fullPath;
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

		if (defaultImageType !== filename.substr(-4)) {
			filename += defaultImageType;
		}

		if ('diff' === which) {
			const parts = filename.split(/[\/\\]/);
			parts[parts.length - 1] = this.globalDiffPrefix + parts[parts.length - 1];
			filename = parts.join(path.sep);
		}

		if (suffix) {
			suffix = '.' + suffix.toString().replace(/(^\.+|\.+$)/g, '') + defaultImageType;
			filename = filename.substr(0, filename.length - 4) + suffix;
		}

		return filename;
	}

    	/**
	 * Takes a screenshot of the entire viewport and saves it as either an
	 * actual image, or an expected base-image.
	 *
	 * @param {string} name - Name of the output image.
	 * @param {'actual'|'expected'} which - Optional. Whether the screenshot is
	 *        the expected bas eimage, or an actual image for comparison.
	 *        Defaults to 'actual'.
	 * @param {string} element - Optional. Selector of the element to
	 *        screenshot, or empty to screenshot current viewport.
	 * @private
	 */
	async _takeElementScreenshot(name, which, element) {
		const driver = _getDriver();

		// The output path where the screenshot is saved to.
		const outputFile = this._buildPath('expected' === which ? which : 'actual');

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
	}

    	/**
	 * Takes a screenshot of the entire viewport and saves it as either an
	 * actual image, or an expected base-image.
	 *
	 * @param {string} name - Name of the output image.
	 * @param {'actual'|'expected'} which - Optional. Whether the screenshot is
	 *        the expected bas eimage, or an actual image for comparison.
	 *        Defaults to 'actual'.
	 * @private
	 */
	async _takeScreenshot(name, which) {
		const driver = _getDriver();

		// The output path where the screenshot is saved to.
		const outputFile = this._buildPath('expected' === which ? which : 'actual');

		// We need a dynamic temp-name here: When the helper is used with
		// the `run-workers` option, multiple workers might access a temp
		// file at the same time.
		const uid = Math.random().toString(36).slice(-5);
		const tempName = `~${uid}.temp`;

		// Screenshot the current viewport into a temp file.
		await driver.saveScreenshot(tempName);
		_deleteFile(outputFile);

		// Move the temp file to the correct folder and rename the file.
		fs.renameSync(global.output_dir + '/' + tempName, outputFile);
		_deleteFile(global.output_dir + '/' + tempName);
	}

    	/**
	 * Clears pixels in the specified image that are outside the bounding rect
	 * or inside an ignored area.
	 *
	 * @param {PNG} png - The image to modify.
	 * @return {int} Number of cleared pixels.
	 * @private
	 */
	_applyBounds(png) {
		const opts = this.options;
		let cleared = 0;

		const useBounds = opts.bounds.left
			|| opts.bounds.top
			|| opts.bounds.width
			|| opts.bounds.height;


		// Apply a bounding box to only compare a section of the image.
		if (useBounds) {
			//@ts-ignore
			this.debug(`Apply bounds to image ...`);
			const box = {
				x0: 0,
				x1: opts.bounds.left,
				x2: opts.bounds.left + opts.bounds.width,
				x3: png.width,
				y0: 0,
				y1: opts.bounds.top,
				y2: opts.bounds.top + opts.bounds.height,
				y3: png.height
			};

			cleared += this._clearRect(png, box.x0, box.y0, box.x1, box.y3);
			cleared += this._clearRect(png, box.x1, box.y0, box.x3, box.y1);
			cleared += this._clearRect(png, box.x1, box.y2, box.x3, box.y3);
			cleared += this._clearRect(png, box.x2, box.y1, box.x3, box.y2);
		}

		// Clear areas that are ignored.
		for (let i = 0; i < opts.ignore.length; i++) {
			cleared += this._clearRect(
				png,
				opts.ignore[i]['left'],
				opts.ignore[i]['top'],
				opts.ignore[i]['left'] + opts.ignore[i]['width'],
				opts.ignore[i]['top'] + opts.ignore[i]['height']
			);
		}

		return cleared;
	}

	/**
	 * Determines the bounding box of the given element on the current viewport.
	 *
	 * @param {string} selector - CSS|XPath|ID selector.
	 * @returns {Promise<{boundingBox: {left: int, top: int, right: int, bottom: int, width: int,
	 *     height: int}}>}
	 */
	async _getBoundingBox(selector) {
		const driver = _getDriver();

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

		//@ts-ignore
		this.debugSection(`Bounding box of ${selector}:`, JSON.stringify(boundingBox));

		return boundingBox;
	}

	/**
	 * Captures the expected or actual image, depending on the captureFlag.
	 *
	 * @param {string} which - Which image to capture: 'expected', 'actual'.
	 * @param {bool|string} captureFlag - Either true, false or 'missing'.
	 * @private
	 */
	async _maybeCaptureImage(which, captureFlag) {
		if (false === captureFlag) {
			return;
		}

		if ('missing' === captureFlag) {
			const path = this._buildPath(which);

			if (_isFile(path, 'read')) {
				// Not missing: Exact image match.
				return;
			}
			if ('expected' === which && this._getExpectedImagePaths().length) {
				// Not missing: Expected image variation(s) found.
				return;
			}
		}

		await this._takeScreenshot(this.imageName, which);
	}

}

module.exports = PixelmatchHelper;
