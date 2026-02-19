const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const path = require("path");
const { pathToFileURL } = require("url");

const config = getDefaultConfig(__dirname);

const globalCssPath = path.resolve(__dirname, "global.css");
module.exports = withNativeWind(config, { input: globalCssPath });
