const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

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
		expected = '',
		actual = '',
		diff = ''
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
	pathExpected = {
		expected: '',
		actual: '',
		diff: ''
	};

	/**
	 * Comparison options.
	 *
	 * @type {{tolerance: float, threshold: float}}
	 */
	options = {
		tolerance: 0,
		threshold: 0.1
	};

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
	 * Reference to the webdrive/browser helper instance.
	 *
	 * @type {Puppeteer|WebDriver|Appium|WebDriverIO|TestCafe}
	 */
	helper = null;

	/**
	 * Constructor that initializes the helper.
	 * Called internally by CodeceptJS.
	 * @param config
	 */
	constructor(config) {
		super(config);

		this.globalDir.expected = this.resolvePath(config.dirExpected);
		this.globalDir.diff = this.resolvePath(config.dirDiff);
		if (config.dirActual) {
			this.globalDir.actual = this.resolvePath(config.dirActual);
		} else {
			this.globalDir.actual = global.output_dir + '/';
		}
		this.globalDiffPrefix = config.diffPrefix ? config.diffPrefix : 'Diff_';

		if (this.helpers['Puppeteer']) {
			this.helper = this.helpers['Puppeteer'];
			this.helper._which = 'Puppeteer';
		}
		if (this.helpers['WebDriver']) {
			this.helper = this.helpers['WebDriver'];
			this.helper._which = 'WebDriver';
		}
		if (this.helpers['Appium']) {
			this.helper = this.helpers['Appium'];
			this.helper._which = 'Appium';
		}
		if (this.helpers['WebDriverIO']) {
			this.helper = this.helpers['WebDriverIO'];
			this.helper._which = 'WebDriverIO';
		}
		if (this.helpers['TestCafe']) {
			this.helper = this.helpers['TestCafe'];
			this.helper._which = 'TestCafe';
		}
		if (this.helpers['Playwright']) {
			this.helper = this.helpers['Playwright'];
			this.helper._which = 'Playwright';
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
	checkVisualDifferences(image, options) {
		return new Promise((resolve, reject) => {
			try {
				this.getVisualDifferences(image, options);
			} catch (err) {
				reject(err);
			}

			if (this.result.match) {
				resolve(this.result);
			} else {
				reject('Images are different');
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
	getVisualDifferences(image, options) {
		this._setupTest(image, options);

		const imgExpected = this._loadPngImage('expected');
		const imgActual = this._loadPngImage('actual');

		if (imgExpected.width !== imgActual.width || imgExpected.height !== imgActual.height) {
			throw new Error('Image sizes do not match');
		}
		if (!imgExpected.width) {
			throw new Error('Image is empty');
		}

		const {
			width,
			height
		} = imgExpected;
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
			{threshold: this.options.threshold}
		);

		this.result.difference = mismatchPixel / (width * height) * 100;
		this.result.match = this.result.difference <= this.options.tolerance;

		if (!result.match) {
			_savePngImage('diff', imgDiff);
		}

		return this.result;
	}

	/**
	 * Take screenshot of individual element.
	 *
	 * @param {string} name - Name of the output image.
	 * @param {string} selector - Optional. Selector of the element to
	 *        screenshot, or empty to screenshot current viewport.
	 * @param {'actual'|'expected'} which - Optional. Whether the screenshot is
	 *        the expected bas eimage, or an actual image for comparison.
	 *        Defaults to 'actual'.
	 * @returns {Promise}
	 */
	async takeScreenshot(name, selector, which) {
		if (!this.helper) {
			throw new Error(
				'Unsupported driver. This method supports: Playwright|WebDriver|Appium|Puppeteer|TestCafe');
		}

		// The output path where the screenshot is saved to.
		const outputFile = this._buildPath('expected' === which ? which : 'actual', name);

		if (selector) {
			// Screenshot a single element.
			await this.helper.waitForVisible(selector);
			const els = await this.helper._locate(selector);

			if ('TestCafe' === this.helper._which) {
				if (!await els.count) {
					throw new Error(`Element ${selector} couldn't be located`);
				}

				await this.helper.t.takeElementScreenshot(els, outputFile);
			} else {
				if (!els.length) {
					throw new Error(`Element ${selector} couldn't be located`);
				}
				const el = els[0];

				switch (this.helper._which) {
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
			this.helper.saveScreenshot('_temp.png');
			fs.renameSync(global.output_dir + '_temp.png', outputFile);
		}
	}

	/**
	 * Determines the bounding box of the given element on the current viewport.
	 *
	 * @param {string} selector - CSS|XPath|ID selector.
	 * @returns {Promise<{boundingBox: {left: *, top: *, right: *, bottom: *}}>}
	 */
	async _getBoundingBox(selector) {
		await this.helper.waitForVisible(selector);
		const els = await this.helper._locate(selector);
		let location, size;

		if ('TestCafe' === this.helper._which) {
			if (await els.count != 1) {
				throw new Error(`Element ${selector} couldn't be located or isn't unique on the page`);
			}
		} else if (!els.length) {
			throw new Error(`Element ${selector} couldn't be located`);
		}

		switch (this.helper._which) {
			case 'Puppeteer':
			case 'Playwright':
				const el = els[0];
				const box = await el.boundingBox();
				size = location = box;
				break;

			case 'WebDriver':
			case 'Appium':
				const el = els[0];
				location = await el.getLocation();
				size = await el.getSize();
				break;

			case 'WebDriverIO':
				location = await helper.browser.getLocation(selector);
				size = await helper.browser.getElementSize(selector);
				break;

			case 'TestCafe':
				return await els.boundingClientRect;
		}

		if (!size) {
			throw new Error("Cannot get element size!");
		}

		const boundingBox = {
			left: location.x,
			top: location.y,
			right: size.width + location.x,
			bottom: size.height + location.y
		};

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
	_setupTest(image, options) {
		// Reset the previous test results.
		this.result = {
			match: true,
			difference: 0
		};

		// Sanitize the comparison options.
		const newValues = {
			tolerance: 0,
			threshold: 0.1
		};

		if (options && 'object' === typeof options) {
			if ('undefined' !== typeof options.tolerance) {
				newValues.tolerance = Math.max(0, parseFloat(options.tolerance));
			}
			if ('undefined' !== typeof options.threshold) {
				newValues.threshold = Math.min(1, Math.max(0, parseFloat(options.threshold)));
			}
		}

		// Define image paths for the comparison.
		this.path.expected = this._buildPath('expected', image);
		this.path.actual = this._buildPath('actual', image);
		this.path.diff = this._buildPath('diff', image);

		this.options = newValues;
	}

	/**
	 * Builds an image path using the given image name and the specified folder.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {string} name - Filename of the image.
	 * @returns {string} Path to the image.
	 * @private
	 */
	_buildPath(which, name) {
		const path = this.path[which];

		if (!path) {
			throw new Error(`No ${which}-folder defined.`);
		}

		if ('.png' !== name.substr(0, -4)) {
			name += '.png';
		}

		if ('diff' === which) {
			name = this.globalDiffPrefix + name;
		}

		return path + name;
	}

	/**
	 * Loads the specified image and returns a PNG blob.
	 *
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @return {object} An PNG object.
	 * @private
	 */
	_loadPngImage(which) {
		const path = this.path[which];

		if (!path) {
			throw new Error(`No ${which}-image defined.`);
		}

		fs.access(path, fs.constants.F_OK, (err) => {
			if (err) {
				throw new Error(`The ${which}-image does not exist`);
			}
		});

		return PNG.sync.read(fs.readFileSync(path));
	}

	/**
	 * Saves the specified PNG image to the filesystem.
	 * .
	 * @param {string} which - The image to load (expected, actual, diff).
	 * @param {object} data - An PNG image object.
	 * @private
	 */
	_savePngImage(which, data) {
		const path = this.path[which];

		if (!path) {
			throw new Error(`No ${which}-image defined.`);
		}

		fs.access(path, fs.constants.W_OK, (err) => {
			if (err) {
				throw new Error(`Cannot save the ${which}-image to ${path}. Maybe the file is read-only.`);
			}
		});

		fs.writeFileSync(path, PNG.sync.write(data));
	}
}
