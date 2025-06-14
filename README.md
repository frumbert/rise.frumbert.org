# What is it?

Source code to https://rise.frumbert.org

This is web site for showing off my Articulate Rise doodads and extensions. It's also the storage server for `long-text-entry`.

## About the website

This is a kind-of file-based CMS with a simple router, support for plain text/html/markdown/php files, and simple templates. Other than the S3 storage layer used by the long-text-entry backend, it doesn't have any external dependencies. I liked the ideas behind [grav](https://getgrav.org) or [kirby](https://getkirby.com) but they were also kinda overkill. So I spent a whole day sitting down and banging this system out. So it's raw – I mean, the router is a glorified `switch` statement. Go see for yourself.

Folders in the public folder denote headings and their order (as long as the folder contains one of the supported content types - .md, .txt, .html or .php), otherwise the folder is skipped.

```
00. Home
01. Long Text Entry
02. Something Else
```

You put resources inside the folders. Files ending in `.js` are included as scripts. Files ending in `.mjs` are included as javascript modules. Files ending in `.css` are included as stylesheets. The main content is found by looking for any file ending in `.md`, `.txt`, `.html` or `.php`. If the file starts with a number and a dot (for instance `1. main.md`) and other files follow the sequence (e.g. `2. page2.md` and `3. final-page.html`) then you get automatic pagination. `.php` files are executed, so pages can have postback functionality if needed. It's all loose enough that any extra features can just be added without trying to understand third-party code. I work under the mantra that _if it's worth doing, the do the least to begin with, and see how that goes_ .

-----

## About long-text-entry

This is primarily a long-text persisting utility for Scorm, intended to work with Articulate Rise courses. It allows both Scorm 1.2 and 2004 to persist long-text entries, and could also work without any Scorm model (e.g. published to web page only).

Scorm 2004 already has this built-in, with properties that can be read and written easily, with up to 4kilobytes of text per entry (often more depending on the LMS). We use Scorm and don't externlise anything.
Scorm 1.2 has many properties that can only be written to, not read, with 0.5 kilobytes of text per entry. We need to manage our own storage.

Being intended for use with Articulate Rise, that also has its own requirements for data storage and persistence. This tool attempts to work within these constraints.

## Concepts

The only way to store data larger than Scorm allows for is to store it elsewhere and store the reference to it. I've chosen to store data as web pages on an external server, which can be read or written and has virtually limitless storage (Amazon S3). We then make notes in the Scorm data as to how to access these web pages. With externalised data storage, other possibilities such as compiling multiple responses into a single document could be possible (e.g. PDF). To limit abuse of the server, only domains matching a bearer token are allowed to update records, and abstract urls are used (non-identifying) for reading data (difficult to guess/stumble across). A combination of the course identifier, learner and position in the Rise course uniquely/abtractly identify each entry across organisations, learners, courses and pages.

## Saving

> Text Entry -----> Store on web server -----> Get public URL -----> Store url in Scorm Interaction

## Loading

> Look up interaction -----> Read data from public URL -----> Show text entry

## LMS / User Tracking

> Look up SCO attempt -----> Locate interaction -----> Open URL to review data


In a Scorm 1.2 model, we can't lookup which interaction gets used to store the text. Rise does not use the cmi.comments field, which is a read-write CMI4096 field. We store a lookup table so we can identify interactions to store data against. This field is compressed using LZString


## Licence

License: MIT