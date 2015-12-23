/*
 * Copyright (C) 2004 Baron Schwartz <baron at sequent dot org>
 * Modified by Jonathan Gotti aka malko <jgotti at jgotti dot org>
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by the
 * Free Software Foundation, version 2.1.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more
 * details.
 */
/* jshint laxbreak:true*/
!(function (factory) {
	if ( typeof define === 'function' && define.amd ) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory;
	} else {
		factory();
	}
}(function(){
	"use strict";
	var parseFunctions = {};
	var parseRegexes = [];
	var formatFunctions = {};
	var charFormatters = {
		d: function(date) { return stringLeftPad(date.getDate(), 2, '0'); },
		D: function(date) { return Date.dayNames[date.getDay()].substring(0, 3); },
		j: function(date) { return date.getDate(); },
		l: function(date) { return Date.dayNames[date.getDay()]; },
		S: function(date) { return date.getSuffix(); },
		w: function(date) { return date.getDay(); },
		z: function(date) { return date.getDayOfYear(); },
		W: function(date) { return date.getWeekOfYear(); },
		F: function(date) { return Date.monthNames[date.getMonth()]; },
		m: function(date) { return stringLeftPad(date.getMonth() + 1, 2, '0'); },
		M: function(date) { return Date.monthNames[date.getMonth()].substring(0, 3); },
		n: function(date) { return (date.getMonth() + 1); },
		t: function(date) { return date.getDaysInMonth(); },
		L: function(date) { return (date.isLeapYear() ? 1 : 0); },
		Y: function(date) { return date.getFullYear(); },
		y: function(date) { return ('' + date.getFullYear()).substring(2, 4); },
		a: function(date) { return (date.getHours() < 12 ? 'am' : 'pm'); },
		A: function(date) { return (date.getHours() < 12 ? 'AM' : 'PM'); },
		g: function(date) { return ((date.getHours() %12) ? date.getHours() % 12 : 12); },
		G: function(date) { return date.getHours(); },
		h: function(date) { return stringLeftPad((date.getHours() %12) ? date.getHours() % 12 : 12, 2, '0'); },
		H: function(date) { return stringLeftPad(date.getHours(), 2, '0'); },
		i: function(date) { return stringLeftPad(date.getMinutes(), 2, '0'); },
		s: function(date) { return stringLeftPad(date.getSeconds(), 2, '0'); },
		O: function(date) { return date.getGMTOffset(); },
		T: function(date) { return date.getTimezone(); },
		Z: function(date) { return (date.getTimezoneOffset() * -60); }
	};

	Date.prototype.dateFormat = function(format) {
		formatFunctions[format]  || createNewFormat(format);
		return formatFunctions[format](this);
	};

	function createNewFormat(format) {
		var formatters = [];
		var special = false;
		var ch = '';
		for (var i = 0; i < format.length; ++i) {
			ch = format.charAt(i);
			if (!special && ch === "\\") {
				special = true;
			} else if (special) {
				special = false;
				formatters.push(stringEscape(ch));
			} else {
				formatters.push(charFormatters[ch] || stringEscape(ch));
			}
		}
		formatFunctions[format] = getFormatter(formatters);
	}

	function getFormatter(formatters) {
		return function(date) {
			var res = [];
			for (var i=0, l=formatters.length; i < l; i++) {
				res.push(typeof formatters[i] === 'string' ? formatters[i] : formatters[i](date));
			}
			return res.join('');
		};
	}

	Date.parseDate = function(input, format) {
		parseFunctions[format] || createParser(format);
		return parseFunctions[format](input);
	};

	function getParser(format, regexNum, assigns) {
		return function(input){
			var d = new Date();
			var results = input.match(parseRegexes[regexNum]);
			if (results && results.length > 0) {
				results.y = d.getFullYear();
				results.m = d.getMonth();
				results.d = d.getDate();
				results.h = -1;
				results.i = -1;
				results.s = -1;
				for ( var i = 0, l = assigns.length; i < l; i++) {
					assigns[i](results);
				}
				if (results.y > 0 && results.m >= 0 && results.d > 0 && results.h >= 0 && results.i >= 0 && results.s >= 0){
					return new Date(results.y, results.m, results.d, results.h, results.i, results.s);
				} else if (results.y > 0 && results.m >= 0 && results.d > 0 && results.h >= 0 && results.i >= 0) {
					return new Date(results.y, results.m, results.d, results.h, results.i);
				} else if (results.y > 0 && results.m >= 0 && results.d > 0 && results.h >= 0) {
					return new Date(results.y, results.m, results.d, results.h);
				} else if (results.y > 0 && results.m >= 0 && results.d > 0) {
					return new Date(results.y, results.m, results.d);
				} else if (results.y > 0 && results.m >= 0) {
					return new Date(results.y, results.m);
				} else if (results.y > 0) {
					return new Date(results.y);
				}
			}
			return null;
		};
	}

	function createParser(format) {
		var regexNum = parseRegexes.length;
		var currentGroup = 1;
		var regex = "";
		var special = false;
		var ch = '';
		var assigns=[];
		var obj;
		for (var i = 0; i < format.length; ++i) {
			ch = format.charAt(i);
			if (!special && ch === "\\") {
				special = true;
			} else if (special) {
				special = false;
				regex += stringEscape(ch);
			} else {
				obj = formatCodeToRegex(ch, currentGroup);
				currentGroup += obj.g;
				regex += obj.s;
				if (obj.g && obj.a) {
					assigns.push(obj.a);
				}
			}
		}

		parseRegexes[regexNum] = new RegExp("^" + regex + "$");
		parseFunctions[format] = getParser(format, regexNum, assigns);
	}

	function formatCodeToRegex(character, currentGroup) {
		switch (character) {
		case "D":
			return {g:0,
			s:"(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)"};
		case "j":
		case "d":
			return {g:1,
				a: function(results){ results.d = parseInt(results[currentGroup], 10);},
				s:"(\\d{1,2})"
			};
		case "l":
			return {g:0,
				s:"(?:" + Date.dayNames.join("|") + ")"};
		case "S":
			return {g:0,
				s:"(?:st|nd|rd|th)"};
		case "w":
			return {g:0,
				s:"\\d"};
		case "z":
			return {g:0,
				s:"(?:\\d{1,3})"};
		case "W":
			return {g:0,
				s:"(?:\\d{2})"};
		case "F":
			return {g:1,
				a: function(results) { results.m = parseInt(Date.monthNumbers[results[currentGroup].substring(0, 3)], 10);},
				s:"(" + Date.monthNames.join("|") + ")"};
		case "M":
			return {g:1,
				a: function(results) { results.m = parseInt(Date.monthNumbers[results[currentGroup]], 10);},
				s:"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"};
		case "n":
		case "m":
			return {g:1,
				a: function(results) { results.m = parseInt(results[currentGroup], 10) - 1;},
				s:"(\\d{1,2})"};
		case "t":
			return {g:0,
				s:"\\d{1,2}"};
		case "L":
			return {g:0,
				s:"(?:1|0)"};
		case "Y":
			return {g:1,
				a: function(results) { results.y = parseInt(results[currentGroup], 10);},
				s:"(\\d{4})"};
		case "y":
			return {g:1,
				a: function(results) {
					var ty = parseInt(results[currentGroup], 10);
					results.y = ty > Date.y2kYear ? 1900 + ty : 2000 + ty;
				},
				s:"(\\d{1,2})"};
		case "a":
			return {g:1,
				a: function(results) {
					if (results[currentGroup] === 'am') {
						if (results.h == 12) { results.h = 0; }
					} else {
						if (results.h < 12) { results.h += 12; }
					}
				},
				s:"(am|pm)"};
		case "A":
			return {g:1,
				a: function(results){
					if (results[currentGroup] === 'AM') {
						if (results.h == 12) { results.h = 0; }
					} else {
						if (results.h < 12) { results.h += 12; }
					}
				},
				s:"(AM|PM)"};
		case "g":
		case "G":
		case "h":
		case "H":
			return {g:1,
				a: function(results) {results.h = parseInt(results[currentGroup], 10);},
				s:"(\\d{1,2})"};
		case "i":
			return {g:1,
				a: function(results) {results.i = parseInt(results[currentGroup], 10);},
				s:"(\\d{2})"};
		case "s":
			return {g:1,
				a: function(results) {results.s = parseInt(results[currentGroup], 10);},
				s:"(\\d{2})"};
		case "O":
			return {g:0,
				s:"[+-]\\d{4}"};
		case "T":
			return {g:0,
				s:"[A-Z]{3}"};
		case "Z":
			return {g:0,
				s:"[+-]\\d{1,5}"};
		default:
			return {g:0,
				s:stringEscape(character)};
		 }
	}

	Date.prototype.getTimezone = function() {
		return this.toString().replace(
			/^.*? ([A-Z]{3}) [0-9]{4}.*$/, "$1").replace(
			/^.*?\(([A-Z])[a-z]+ ([A-Z])[a-z]+ ([A-Z])[a-z]+\)$/, "$1$2$3");
	};

	Date.prototype.getGMTOffset = function() {
		var absOffset = Math.abs(this.getTimezoneOffset());
		return (this.getTimezoneOffset() > 0 ? "-" : "+")
			+ stringLeftPad(Math.floor(absOffset / 60), 2, "0")
			+ stringLeftPad(absOffset % 60, 2, "0");
	};

	Date.prototype.getDayOfYear = function() {
		var num = 0;
		Date.daysInMonth[1] = this.isLeapYear() ? 29 : 28;
		for (var i = 0; i < this.getMonth(); ++i) {
			num += Date.daysInMonth[i];
		}
		return num + this.getDate() - 1;
	};

	Date.prototype.getWeekOfYear = function() {
		// Skip to Thursday of this week
		var now = this.getDayOfYear() + (4 - this.getDay());
		// Find the first Thursday of the year
		var jan1 = new Date(this.getFullYear(), 0, 1);
		var then = (7 - jan1.getDay() + 4);
		return stringLeftPad(((now - then) / 7) + 1, 2, "0");
	};

	Date.prototype.isLeapYear = function() {
		var year = this.getFullYear();
		return !!((year & 3) === 0 && (year % 100 || (year % 400 === 0 && year)));
	};

	Date.prototype.getFirstDayOfMonth = function() {
		var day = (this.getDay() - (this.getDate() - 1)) % 7;
		return (day < 0) ? (day + 7) : day;
	};

	Date.prototype.getLastDayOfMonth = function() {
		var day = (this.getDay() + (Date.daysInMonth[this.getMonth()] - this.getDate())) % 7;
		return (day < 0) ? (day + 7) : day;
	};

	Date.prototype.getDaysInMonth = function() {
		Date.daysInMonth[1] = this.isLeapYear() ? 29 : 28;
		return Date.daysInMonth[this.getMonth()];
	};

	Date.prototype.getSuffix = function() {
		switch (this.getDate()) {
			case 1:
			case 21:
			case 31:
				return "st";
			case 2:
			case 22:
				return "nd";
			case 3:
			case 23:
				return "rd";
			default:
				return "th";
		}
	};

	function stringEscape(string) {
		return string.replace(/('|\\)/g, "\\$1");
	}

	function stringLeftPad(val, size, ch) {
		var result = "" + val;
		ch = ("" + ch) || " ";
		while (result.length < size) {
			result = ch + result;
		}
		return result;
	}

	Date.daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
	Date.monthNames =
		["January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"];
	Date.dayNames =
		["Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"];
	Date.y2kYear = 50;
	Date.monthNumbers = {
		Jan:0,
		Feb:1,
		Mar:2,
		Apr:3,
		May:4,
		Jun:5,
		Jul:6,
		Aug:7,
		Sep:8,
		Oct:9,
		Nov:10,
		Dec:11};
	Date.patterns = {
		ISO8601LongPattern:"Y-m-d H:i:s",
		ISO8601ShortPattern:"Y-m-d",
		ShortDatePattern: "n/j/Y",
		LongDatePattern: "l, F d, Y",
		FullDateTimePattern: "l, F d, Y g:i:s A",
		MonthDayPattern: "F d",
		ShortTimePattern: "g:i A",
		LongTimePattern: "g:i:s A",
		SortableDateTimePattern: "Y-m-d\\TH:i:s",
		UniversalSortableDateTimePattern: "Y-m-d H:i:sO",
		YearMonthPattern: "F, Y"};
}));
