# CodeceptJS pixelmatch helper

Integrates visual regression tests in [CodeceptJS](https://codecept.io/) using the [pixelmatch](https://github.com/mapbox/pixelmatch) library.

## Installation

## Usage

First, include this helper in your `codecept.json`/`codecept.conf.js` file. For example:

```js
...
helpers: {
  PixelmatchHelper: {
    require: "codeceptjs-pixelmatchhelper"
  }
}
...
```

After this, the helper provides three new methods via the `I` actor:

```js
// Takes a screenshot of the current page. 
await this.takeScreenshot("screenshot.png");

// Compares the current screenshot.png with the expected base image. Fails, if the images do not match.
await this.checkVisualDifferences("screenshot.png");

// Compares the current screenshot.png with the expected base image and returns the result instead of failing the test.
const result = await this.getVisualDifferences("screenshot.png");
```

More details on possible parameters and usage of those methods is below.

----

## Helper configuration

The only required option is the `require` value, which is always `"codeceptjs-pixelmatchhelper"`. The other configuration values are optional. Here is a full list of supported items:

```js
helpers: {
  PixelmatchHelper: {
    require: "codeceptjs-pixelmatchhelper",   // Mandatory and static!
    dirExpected: "./tests/screenshots/base/", // Optional but recommended.
    dirDiff: "./tests/screenshots/diff/",     // Optional but recommended.
    dirActual: "./tests/output/",             // Optional.
    diffPrefix: "Diff_"                       // Optional.
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

Defaults to `"./tests/screenshots/base/"`

#### `diffPrefix`

You can define a custom prefix for diff-images with this option.

Defaults to `"Diff_"`

----

## Methods

#### `checkVisualDifferences(imageName, options)`

Compares the specified current image with an expected base image. If both images match, the test passes. If there are (too many) differences, the test fails.

For the test, there must be an image with the specified name inside the `dirActual` folder (usually `output/`) and `dirExpected` folder (usually `screenshots/base/`). Both images can be generated using the `takeScreenshot()` method (below).

`imageName`

Name of an existing image. The `.png` extension is optional.

`options`

##### Samples

```js
```

#### `getVisualDifferences(imageName, options)`

`imageName`

`options`

##### Samples

```js
```

#### `takeScreenshot(imageName, which, element)`

Takes a screenshot of the current viewport and saves it as a PNG image in the defined path (usually `tests/output` or `tests/screenshots/base`)

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
