# CodeceptJS pixelmatch helper

This package is inspired by `codeceptjs-resemblehelper`.

Integrates **visual regression tests** in [CodeceptJS](https://codecept.io/) using the [pixelmatch](https://github.com/mapbox/pixelmatch) library. It works with all current CodeceptJS drivers: Playwright, Webdriver, Puppeteer, Appium, TestCafe.

Two screenshots are compared for differences, using a custom tolerance. When both images are equal enough, the test passes. When there are too many differences, the test fails.

## Installation

**npm**
```shell
npm install codeceptjs-pixelmatchhelper
```

**yarn**
```shell
yarn add codeceptjs-pixelmatchhelper
```

## Usage

First, include this helper in your `codecept.json`/`codecept.conf.js` file. For example:

```js
helpers: {
  PixelmatchHelper: {
    require: "codeceptjs-pixelmatchhelper"
  }
}
```

After this, the helper provides three new methods via the `I` actor:

```js
// Takes a screenshot of the current page. 
await I.takeScreenshot("screenshot.png");

// Compares the current screenshot.png with the expected base image. Fails, if
// the images do not match.
await I.checkVisualDifferences("screenshot.png");

// Compares the current screenshot.png with the expected base image and returns
// the result instead of failing the test.
const result = await I.getVisualDifferences("screenshot.png");
```

More details on possible parameters and usage of those methods is below.

----

## Helper configuration

The only required option is the `require` value, which is always `"codeceptjs-pixelmatchhelper"`. The other configuration values are optional. Here is a full list of supported items:

```js
helpers: {
    PixelmatchHelper: {
        require:      "codeceptjs-pixelmatchhelper",  // Mandatory and static!
        dirExpected:  "./tests/screenshots/base/",    // Optional but recommended.
        dirDiff:      "./tests/screenshots/diff/",    // Optional but recommended.
        dirActual:    "./tests/output/",              // Optional.
        diffPrefix:   "Diff_",                        // Optional.
        tolerance:    2.5,                            // Optional.
        threshold:    0.1                             // Optional.
    }
}
```

#### `dirExpected`

Folder that contains the expected base images. Those base images are usually generated once from a stable website/app and are rarely updated.

Defaults to `"./tests/screenshots/base/"`

#### `dirDiff`

Folder that receives the diff-images for all comparison where the matching fails. The diff-folder is an output folder; any files in this folder can potentially be overwritten. Only failed tests generate a diff-image.

Defaults to `"./tests/screenshots/diff/"`

#### `dirActual`

Folder that holds the actual screenshots that should be tested against an expected base images. The actual screenshot are usually generated fresh for every test.

Defaults to `global.output_dir`

#### `diffPrefix`

You can define a custom prefix for diff-images with this option.

Defaults to `"Diff_"`

#### `tolerance`

The default tolerance for all comparisons. This value can always be overwritten for a single comparison using the `options` object (see below). The tolerance can be a float value between 0 and 100.

Defaults to `0`

#### `threshold`

The default threshold for all comparisons. This value can always be overwritten for a single comparison using the `options` object (see below). The tolerance can be a float value between 0 and 1.

Defaults to `0.1`


----

## Methods

#### `checkVisualDifferences(imageName, options)`

Compares the specified current image with an expected base image. If both images match, the test passes. If there are (too many) differences, the test fails.

> For the test, there must be an image with the specified name inside the `dirActual` folder (usually `output/`) and `dirExpected` folder (usually `screenshots/base/`). Both images can be generated using the [`takeScreenshot()`](#takescreenshotimagename-which-element) method.

##### Parameters

`imageName`

Name of an existing image. The `.png` extension is optional. An image with that filename must exist inside the `dirActual` folder, and the `dirExpected` folder.

`options`

Comparison options. See below for a full list of all options and the default values.

##### Returns

When the test passes, the method returns a Promise that resolves to the comparison results. The results object contains the following attributes: 

* `match` (boolean) - Always true.
* `diffImage` (string) - Always empty.
* `diffPixels` (int) - Absolute count of different pixels.
* `totalPixels` (int) - Absolute count of all pixels inside the image.
* `relevantPixels` (int) - Absolute count of pixels, that are not ignored and inside the bounds-area.
* `difference` (float) - Relative difference between both images. The percentage is calculated from the `diffPixels` and `relevantPixels` values.

##### Samples

```js
// Simple test.
await I.checkVisualDifferences("dashboard");
I.say(`Dashboard looks good!`);

// Use return values (only present, when the test passes).
await I.checkVisualDifferences("dashboard");
I.say(`Dashboard looks good!`);
```

#### `getVisualDifferences(imageName, options)`

##### Parameters

`imageName`

Name of an existing image. The `.png` extension is optional.

`options`

Comparison options. See below for a full list of all options and the default values.

##### Returns

Always returns a Promise that resolves to the comparison results. The results object contains the following attributes: 

* `match` (boolean) - Whether the differences are within the allowed tolerance level.
* `diffImage` (string) - Filename of the diff-file.
* `diffPixels` (int) - Absolute count of different pixels.
* `totalPixels` (int) - Absolute count of all pixels inside the image.
* `relevantPixels` (int) - Absolute count of pixels, that are not ignored and inside the bounds-area.
* `difference` (float) - Relative difference between both images. The percentage is calculated from the `diffPixels` and `relevantPixels` values.

##### Samples

```js
const res = await I.getVisualDifferences("dashboard");

if (res.match) {
    I.say(`Identical enough. Difference is ${res.difference}%`);
} else {
    I.say(`Too different. Difference is ${res.difference}% - review ${res.diffImage} for details!`);
}
```

#### `takeScreenshot(imageName, which, element)`

Takes a screenshot of the current viewport and saves it as a PNG image in the defined path (usually `tests/output` or `tests/screenshots/base`)

##### Parameters

`imageName`

Filename of the generated screenshot. If a file with the given name exists, it will be overwritten. The `.png` extension is optional.

`which`

Optional. Define the type of the screenshot. Possible values are `actual` and `expected`.

Default is `"actual"`

`element`

Optional. Take a screenshot of a single element on the page, instead of the entire viewport.

Default is `null`, which clips the entire viewport.

##### Samples

```js
// Take a screenshot of the entire viewport and save it as output/dashboard.png.
await I.takeScreenshot("dashboard");

// Take a screenshot of the entire viewport and save it as screenshots/base/dashboard.png.
await I.takeScreenshot("dashboard", "expected");

// Take a screenshot of the #menu element and save it as output/dashboard-menu.png.
await I.takeScreenshot("dashboard-menu.png", "", "#menu");
```

### Options

#### `tolerance`

Percentage of pixels that are allowed to differ between both images.
Default is `0`

#### `compareWith`

Defines a custom comparison image name.
Default is empty.

#### `element`

Only compare a single HTML element. Used to calculate a bounding box.
Default is empty.

#### `bounds`

Only used, when element is not set. Only pixels inside this box are compared.

Tip: Dimensions are automatically retrained inside the image - if your ignore-box is wider or taller than the image, the box is internally resized to match your image. For example, it's possible to set the `width` to something really big to ensure the entire image-width is covered.

```js
bounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
}
```

#### `ignore`

List of boxes to ignore. Each box is an object that defines the following attributes: `left, top, width, height`. Dimensions behave identical as in the `bounds` box above.

Default is an empty array.

**Example:**

```js
// This configuration ignores two areas: 
// (1) the top-most 120 pixels
// (2) a 100x100 square that's 200px from the left and 200px from top corner.
ignore = {
	{left: 0,   top: 0,   width: 99999, height: 120},
	{left: 200, top: 200, width: 100,   height: 100}
}
```

#### `args`

Arguments that are passed to the pixelmatch library. All args are optional, you only need to overwrite only the options which you want to customize.

All options that are currently supported by [pixelmatch](https://github.com/mapbox/pixelmatch#api):

```js
args = {
    threshold: 0.1,
    alpha: 0.5,
    includeAA: false,
    aaColor: [255, 255, 0],
    diffColor: [255, 0, 0],
    diffColorAlt: null,
    diffMask: false
}
```

* `threshold` (float) - Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0.1 by default.

* `alpha` (float) - Blending factor of unchanged pixels in the diff output. Ranges from 0 for pure white to 1 for original brightness. 0.1 by default.

* `includeAA` (boolean) - If true, disables detecting and ignoring anti-aliased pixels. false by default.

* `aaColor` (RGB-array) - The color of anti-aliased pixels in the diff output in [R, G, B] format. [255, 255, 0] by default.

* `diffColor` (RGB-array) - The color of differing pixels in the diff output in [R, G, B] format. [255, 0, 0] by default.

* `diffColorAlt` (RGB-array) - An alternative color to use for dark on light differences to differentiate between "added" and "removed" parts. If not provided, all differing pixels use the color specified by diffColor. null by default.

* `diffMask` (boolean) - Draw the diff over a transparent background (a mask), rather than over the original image. Will not draw anti-aliased pixels (if detected).

## Notes

This helper can only compare PNG images. 

For accurate results, you should generate those images via codeception. For example with `I.takeScreenshot()` from this helper, or built-in method `I.saveScreenshot()`.

The reason is, that every browser renders the image slightly different. Only when you generate both images (expected and actual image) using the same browser/settings, there will be no differences.

We've even seen differences between images taken by the same test setup by only changing the browser from default to headless mode.
