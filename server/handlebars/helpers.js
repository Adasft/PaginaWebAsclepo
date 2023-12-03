import Handlebars from "handlebars";
import globals, { privateGlobals } from "../globals.js";

Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("unlessEquals", function (arg1, arg2, options) {
  return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("global", function (key) {
  return globals[key];
});

Handlebars.registerHelper("pglobal", function (key) {
  return privateGlobals[key];
});
