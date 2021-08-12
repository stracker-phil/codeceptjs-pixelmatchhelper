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
        threshold:    0.05,                           // Optional.
        dumpIntermediateImage: true                   // Optional.
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

#### `dumpIntermediateImage`

Whether to save the intermediate images to the global output folder, after applying the bounds and ignore-boxes. This value can always be overwritten for a single comparison using the `options` object (see below).
	
This is useful for debugging your tests, but not recommended for production usage.

Defaults to `false`

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

When the _test passes_, the method returns a Promise that resolves to the comparison results. The results object contains the following attributes: 

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

Identical to `checkVisualDifferences()` but does not assert anything, i.e. this method does not trigger a failed test. It can be used, if you want to only inspect the differences between images.

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
    // Identical enough. Difference is 0.0000%
    I.say(`Identical enough. Difference is ${res.difference}%`);
} else {
    // Too different. Difference is 1.2345% - review Diff_dashboard.png for details!
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
// Take a screenshot of the entire viewport and 
// save it as output/dashboard.png.
await I.takeScreenshot("dashboard");

// Take a screenshot of the entire viewport and 
// save it as screenshots/base/dashboard.png.
await I.takeScreenshot("dashboard", "expected");

// Take a screenshot of the #menu element and 
// save it as output/dashboard-menu.png.
await I.takeScreenshot("dashboard-menu.png", "", "#menu");
```

### Options

Overview of available options:

```js
options = {
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
    },

    // Whether to dump intermediate images before comparing them.
    dumpIntermediateImage: false
}
```

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
// Compare a 800x600 area with an offset 
// of 120 (left) and 200 (top).
bounds = {
    left: 120,
    top: 200,
    width: 800,
    height: 600 
}

// Compare a 100-pixel column at the left edge of the image.
bounds = {
    left: 0,
    top: 0,
    width: 100,
    height: 99999 
}
```

#### `ignore`

List of boxes to ignore. Each box is an object that defines the following attributes: `left, top, width, height`. Dimensions behave identical as in the `bounds` box above.

Default is an empty array.

**Example:**

```js
// This configuration ignores two areas: 
// (1) the top-most 120 pixels
// (2) a 100x100 square that's 200px from the left and 200px 
//     from top corner.
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


#### `dumpIntermediateImage`

Whether to save the intermediate images to the global output folder, after applying the bounds and ignore-boxes. That way, you can see, which parts of the image are actually compared.
	
This is useful for debugging your tests, but not recommended for production usage.

Intermediate images are always saved to the output directory, and are named `<image>.expected.png` and `<image>.actual.png` 

Defaults to `false`

## Samples

Sample scenario that tests the Google search page:

```js
Scenario('Visual Test', async () => {
    I.amOnPage('https://google.com');
    
    // accept privacy policy popup.
    I.waitForElement('#L2AGLb');
    I.click('#L2AGLb');
    
    // Prepare the visual-test configuration.
    const options = {
        tolerance: 2,
        bounds: {
            left: 10,
            top: 10,
            width: 99999,
            height: 600
        }
    };
    
    // Generate the expected base image.
    I.takeScreenshot('google-page', 'expected');
    
    // After generating the screenshot/base/google-page.png file
    // You can comment out the above line. Edit that base image
    // And run the test again to see the results.
    
    // Take a snapshot of the current page to test.
    I.takeScreenshot('google-page');
    
    // Compare both images and process the results.
    const res = await I.getVisualDifferences('google-page', options);
    console.log(JSON.stringify(res));
    
    // Compare both images with an assertion.
    I.checkVisualDifferences('google-page', options);
})
```

## Notes

For accurate results, you should generate those images via CodeceptJS. For example, by using the built-in method `I.saveScreenshot()`, or the method `I.takeScreenshot()` provided by this helper.

The reason is, that every browser renders the image slightly different. Only when you generate both images (expected and actual image) using the same browser/settings, there will be no differences.

We've even seen differences between images taken by the same test setup by only changing the browser from default to headless mode.

#### What's the difference between tolerance and threshold?

* `tolerance` defines the amount of pixels that are allowed to be different between both images. When the relative count of different pixels is below the tolerance, the images are considered equal. Tolerance simply counts every pixel that is different, regardless of *how* different that pixel is.
* `threshold` is used by the pixelmatch library to determine, which pixels are actually different. By raising the threshold, you will get a lower count of different pixels. Threshold inspects the color-difference between two pixels to determine if they are different.

If tests are too sensitive, you can either increase `tolerance` (to allow a greater number of different pixels), or increase the `threshold` (to reduce the number of pixels that are different).
