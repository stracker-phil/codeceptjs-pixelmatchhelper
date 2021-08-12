# CodeceptJS pixelmatch helper

Integrates **visual regression tests** in [→ CodeceptJS](https://codecept.io/) using the [→ pixelmatch](https://github.com/mapbox/pixelmatch) library. It works with all current CodeceptJS drivers: Playwright, Webdriver, Puppeteer, Appium, TestCafe.

Two screenshots are compared for differences, using a custom tolerance. When both images are equal enough, the test passes. When there are too many differences, the test fails.

## What's special about this helper?

#### It's free!

This helper is open-source and only relies on other (free) open-source packages!

#### It's fast and private!

Comparison is done in memory on your machine by comparing pixel details. The images are not rendered into a hidden canvas, no data is sent or loaded to any web service.

#### It supports parallel execution!

This helper can be used with NodeJS Workers to enable [→ parallel testing](https://codecept.io/parallel/).

#### Multiple areas!

You can define a bounding rectangle, as well as multiple ignore-areas to only compare pixels that are relevant for the test.

#### Accurate calculation!

When using a bounding rectangle or ignore-areas, the library accurately counts relevant pixels to calculate the total difference between both images. Every pixel that's outside the bounds or inside an ignored area is not included in that calculation.

#### Great documentation!

Browse the GitHub wiki to learn everything about this library.

## Quick Guide

Install the package.  [→ Details](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/Installation)

```shell
npm install codeceptjs-pixelmatchhelper
```

Include this helper in your `codecept.json`/`codecept.conf.js` file.  [→ Details](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/Helper-Configuration)

```js
helpers: {
    PixelmatchHelper: {
        require: "codeceptjs-pixelmatchhelper"
    }
}
```

Use [→ `checkVisualDifferences()`](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/checkVisualDifferences) to compare your images.

```js
// Compares the two images to determine if they are identical.
//
// Actual image:    output/screenshot.png
// Expected image:  screenshots/base/screenshot.png
//
// Note: You need to create those two images before running the
// test. For example by using I.takeScreenshot("screenshot.png")
await I.checkVisualDifferences("screenshot.png");
```

## Methods

* [→ `I.checkVisualDifferences()`](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/checkVisualDifferences)
* [→ `I.getVisualDifferences()`](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/getVisualDifferences)
* [→ `I.takeScreenshot()`](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/takeScreenshot)

## Documentation, Samples, Notes

Browse the full package documentation inside the [→ GitHub wiki](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki)!

Found an issue? [→ Report it via GitHub!](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/issues)

Want to contribute? [→ Read our guide!](https://github.com/stracker-phil/codeceptjs-pixelmatchhelper/wiki/Contribution)

## Thanks to

* This package is inspired by `codeceptjs-resemblehelper`.
* Thanks to everyone who contributes to `pixelmatch`, it's a great library to learn from
* The entire CodeceptJS community
