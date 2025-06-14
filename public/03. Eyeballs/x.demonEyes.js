window.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('demonEyes');
  el.innerHTML = "";
  new EyeSpy(el, {
    eyes: 5,
    iris: 24,
    pupil: 8,
    fg: 'yellow',
    bg: 'red',
    delay: 0,
    cssName: 'demon-eyes'
  });
  console.log('loaded');
})