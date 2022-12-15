export = PixelmatchHelper;
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
declare class PixelmatchHelper {
    /**
     * Constructor that initializes the helper.
     * Called internally by CodeceptJS.
     *
     * @param {object} config
     */
    constructor(config: object);
    /**
     * Relative path to the folder that contains relevant images.
     *
     * @type {{expected: string, actual: string, diff: string}}
     */
    globalDir: {
        expected: string;
        actual: string;
        diff: string;
    };
    /**
     * Default tolserance level for comparisons.
     *
     * @type {float}
     */
    globalTolerance: float;
    /**
     * Default threshold for all comparisons.
     *
     * @type {float}
     */
    globalThreshold: float;
    /**
     * Filename prefix for generated difference files.
     * @type {string}
     */
    globalDiffPrefix: string;
    /**
     * Whether to save the intermediate images to the global output folder,
     * after applying the bounds and ignore-boxes.
     *
     * Useful for debugging tests, but not recommended for production usage.
     *
     * @type {boolean}
     */
    globalDumpIntermediateImage: boolean;
    /**
     * Whether to capture a new screenshot and use it as actual image, instead
     * of loading the image from the `dirActual` folder.
     *
     * The new screenshot is saved to the `dirActual` folder before comparison,
     * and will replace an existing file with the same name!
     *
     * @type {boolean|'missing'}
     */
    globalCaptureActual: boolean | 'missing';
    /**
     * Whether to update the expected base image with a current screenshot
     * before starting the comparison.
     *
     * The new screenshot is saved to the `dirExpected` folder, and will
     * replace an existing file with the same name!
     *
     * @type {boolean|'missing'}
     */
    globalCaptureExpected: boolean | 'missing';
    /**
     * Contains the image paths for the current test.
     *
     * @type {{expected: string, actual: string, diff: string}}
     */
    path: {
        expected: string;
        actual: string;
        diff: string;
    };
    /**
     * Comparison options.
     *
     * @type {object}
     */
    options: object;
    /**
     * Name of the image to compare.
     *
     * @type {string}
     */
    imageName: string;
    /**
     * Holds comparison results.
     *
     * @type {{match: boolean, difference: float, diffImage: string, diffPixels: integer,
     *     totalPixels: integer, relevantPixels: integer}}
     */
    result: {
        match: boolean;
        difference: float;
        diffImage: string;
        diffPixels: integer;
        totalPixels: integer;
        relevantPixels: integer;
    };
    /**
     * Compares the given screenshot with the expected image. When too many
     * differences are detected, the test will fail.
     *
     * I.checkVisualDifferences('dashboard.png');
     * I.checkVisualDifferences('dashboard.png', { screenshot: true });
     *
     * @param {string} image - Name of the input image to compare.
     * @param {object} [options] - Optional options for the comparison.
     * @return {Promise}
     */
    checkVisualDifferences(image: string, options?: object): Promise<any>;
    /**
     * Compares the given screenshot with the expected image and updates the
     * class member `this.result` with details. This function does to trigger an
     * assertion but can throw an error, when the images cannot be compared.
     *
     * @param {string} image - Name of the input image to compare.
     * @param {object} [options] - Optional options for the comparison.
     * @return {{match: boolean, difference: float}} Comparison details.
     */
    getVisualDifferences(image: string, options?: object): {
        match: boolean;
        difference: float;
    };
    /**
     * Take screenshot of individual element.
     *
     * @param {string} name - Name of the output image.
     * @param {'actual'|'expected'} [which] - Optional. Whether the screenshot is
     *        the expected bas eimage, or an actual image for comparison.
     *        Defaults to 'actual'.
     * @param {string} [element] - Optional. Selector of the element to
     *        screenshot, or empty to screenshot current viewport.
     * @returns {Promise}
     */
    takeScreenshot(name: string, which?: 'actual' | 'expected', element?: string): Promise<any>;
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
    private _takeElementScreenshot;
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
    private _takeScreenshot;
    /**
     * Clears pixels in the specified image that are outside the bounding rect
     * or inside an ignored area.
     *
     * @param {PNG} png - The image to modify.
     * @return {int} Number of cleared pixels.
     * @private
     */
    private _applyBounds;
    /**
     * Determines the bounding box of the given element on the current viewport.
     *
     * @param {string} selector - CSS|XPath|ID selector.
     * @returns {Promise<{boundingBox: {left: int, top: int, right: int, bottom: int, width: int,
     *     height: int}}>}
     */
    _getBoundingBox(selector: string): Promise<{
        boundingBox: {
            left: int;
            top: int;
            right: int;
            bottom: int;
            width: int;
            height: int;
        };
    }>;
    /**
     * Captures the expected or actual image, depending on the captureFlag.
     *
     * @param {string} which - Which image to capture: 'expected', 'actual'.
     * @param {bool|string} captureFlag - Either true, false or 'missing'.
     * @private
     */
    private _maybeCaptureImage;
    /**
     * Sanitizes the given options and updates all relevant class members with
     * either the new, sanitized value, or with a default value.
     *
     * @param {string} image - Name of the image to compare.
     * @param {object|undefined} options - The new options to set.
     * @private
     */
    private _setupTest;
    /**
     * Returns the instance of the current browser driver.
     *
     * @return {Puppeteer|WebDriver|Appium|WebDriverIO|TestCafe}
     * @private
     */
    private _getDriver;
    /**
     * Recursively creates the specified directory.
     *
     * @param dir
     * @private
     */
    private _mkdirp;
    /**
     * Deletes the specified file, if it exists.
     *
     * @param {string} file - The file to delete.
     * @private
     */
    private _deleteFile;
    /**
     * Tests, if the given file exists..
     *
     * @param {string} file - The file to check.
     * @param {string} mode - Optional. Either empty, or 'read'/'write' to
     *        validate that the current user can either read or write the file.
     * @private
     */
    private _isFile;
    /**
     * Builds the absolute path to a relative folder.
     *
     * @param {string} dir - The relative folder name.
     * @returns {string}
     * @private
     */
    private _resolvePath;
    /**
     * Returns the filename of an image.
     *
     * @param {string} which - Which image to return (expected, actual, diff).
     * @param {string} suffix - Optional. A suffix to append to the filename.
     * @private
     */
    private _getFileName;
    /**
     * Builds an image path using the current image name and the specified folder.
     *
     * @param {string} which - The image to load (expected, actual, diff).
     * @param {string} suffix - Optional. A suffix to append to the filename.
     * @returns {string} Path to the image.
     * @private
     */
    private _buildPath;
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
    private _getExpectedImagePaths;
    /**
     * Loads the specified image and returns a PNG blob.
     *
     * @param {string} which - The image to load (expected, actual, diff).
     * @param {string} suffix - Optional. A suffix to append to the filename.
     * @return {object} An PNG object.
     * @private
     */
    private _loadPngImage;
    /**
     * Saves the specified PNG image to the filesystem.
     * .
     * @param {string} which - The image to load (expected, actual, diff).
     * @param {object} png - An PNG image object.
     * @param {string} suffix - Optional. A suffix to append to the filename.
     * @private
     */
    private _savePngImage;
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
    private _clearRect;
    /**
     * Casts the given value into a boolean. Several string terms are translated
     * to boolean true. If validTerms are specified, and the given value matches
     * one of those validTerms, the term is returned instead of a boolean.
     *
     * Sample:
     *
     * _toBool('yes')                 --> true
     * _toBool('n')                   --> false
     * _toBool('any')                 --> false
     * _toBool('ANY', ['any', 'all']) --> 'any'
     *
     * @param {any} value - The value to cast.
     * @param {array} validTerms - List of terms that should not be cast to a
     *         boolean but returned directly.
     * @return {bool|string} Either a boolean or a lowercase string.
     * @private
     */
    private _toBool;
}
