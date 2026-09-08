# CS1410 Encapsulation — Three-State Scroll Status

Main file:

    encapsulation.qmd

Stylesheet:

    style.css

Render:

    quarto render encapsulation.qmd

Scroll status for long slides:
- top: `↓ Top of slide`
- middle: `↕ More content`
- bottom: `✓ End of slide`
- no cue is shown when the slide does not actually overflow

The status listener only watches `.slide-scroll` and does not control Reveal.js navigation.
