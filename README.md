Source code to https://rise.frumbert.org

## About

This is a long-text persisting utility for Scorm, intended to work with Articulate Rise courses. It allows both Scorm 1.2 and 2004 to persist long-text entries, and could also work without any Scorm model (e.g. published to web page only).

Scorm 2004 already has this built-in, with properties that can be read and written easily, with up to 4kilobytes of text per entry. We use Scorm and don't externlise anything.
Scorm 1.2 has many properties that can only be written to, not read, with 0.5 kilobytes of text per entry. We need to manage our own storage.
Web only has no server persistence model, and no learner identifier. We try to overcome these using browser storage (cookies/localStorage), and manage our own storage.

Being intended for use with Articulate Rise, that also has its own requirements for data storage and persistence. This tool attempts to work within these constraints.

## Concepts

The only way to store data larger than Scorm allows for is to store it elsewhere and store the reference to it. I've chosen to store data as web pages on an external server, which can be read or written and has virtually limitless storage. We then make notes in the Scorm data as to how to access these web pages. With externalised data storage, other possibilities such as compiling multiple responses into a single document could be possible (e.g. PDF). To limit abuse of the server, only domains matching a bearer token are allowed to update records, and abstract urls are used (non-identifying) for reading data (difficult to guess/stumble across). A combination of the course identifier, learner and position in the Rise course uniquely/abtractly identify each entry across organisations, learners, courses and pages.

## Saving

> Text Entry -----> Store on web server -----> Get public URL -----> Store url in Scorm Interaction

## Loading

> Look up interaction -----> Read data from public URL -----> Show text entry

## LMS / User Tracking

> Look up SCO attempt -----> Locate interaction -----> Examine URL to review data


In a Scorm 1.2 model, we can't lookup which interaction gets used to store the text. Rise does not use the cmi.comments field, which is a read-write CMI4096 field. We store a lookup table so we can identify interactions to store data against. This field is compressed.


## Licence

License: MIT