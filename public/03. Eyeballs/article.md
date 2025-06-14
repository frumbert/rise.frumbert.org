
## Ever feel like you're being watched?

Here's a fun one. The Eyespy recreates the classic xEyes in a tiny script that keeps a look out for your cursor. When the pointer moves, they watch. When the pointer stops, they go to sleep again.

Eyespy is a drop-in Powerup for Rise, where the eyes live in the header bar. You can download it [here](files/eyespy.rise.js).

It can also be a self-contained javascript that you can use on any page (with a few more configuration options), available [with this link](eyespy.js).

To initialise EyeSpy, tell it where you'd like to put the eyes, and optionally supply one or more configuration options

```js
  let el = document.querySelector('header h1');

  // set up with defaults:
  // new EyeSpy(el);

  // Set up with custom properties (defaults shown here)
  new EyeSpy(el, {
    eyes: 2,
    iris: 16,
    pupil: 4,
    edge: 'black',
    fg: 'navy',
    bg: 'white',
    delay: 5000, // set to 0 to disable snooze
    cssName: 'eyespy'
  });
```

### Custom properties

Using the following initialisation code:

```js
new EyeSpy(document.getElementById('demonEyes'), {
    eyes: 5,
    iris: 24,
    pupil: 8,
    fg: 'yellow',
    bg: 'red',
    delay: 0,
    cssName: 'demon-eyes'
  });
```

and a bit of layout

```css
#exampleContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
}

#demonEyes {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  gap: 24px;
}
```

you get these:

<div id="exampleContainer">
  <div id="demonEyes">inside div</div>
</div>

