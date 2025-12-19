# Zen Rock Paper Scissors

A minimalist, "Zen" style Rock Paper Scissors Progressive Web App (PWA).

![Zen RPS Preview](https://via.placeholder.com/800x400?text=Zen+RPS+Preview)

## Features

- **Minimalist Aesthetic**: Clean "Bright Mode" design with elegant typography and organic animations.
- **Custom Icons**: Hand-crafted SVG icons for Rock (Boulder), Paper (Folded Parchment), and Scissors (Shears).
- **Interactive**: 3-second "Zen Shake" countdown with a dedicated mystery icon.
- **PWA Ready**: Offline support, installable to home screen (manifest.json + Service Worker).
- **Responsive**: Digital Zen Garden feel on both mobile and desktop.

## How to Play

1. **Choose**: Select Rock, Paper, or Scissors from the bottom controls.
2. **Wait**: Watch the floating shake animation and countdown ("3... 2... 1...").
3. **Reveal**: See the result with a subtle background radial pulse (Gold=Win, Red=Loss, Grey=Tie).
4. **Reset**: Use the refresh icon in the header to reset your score.

## Installation

This is a static web app. You can run it locally:

1. Clone the repository.
   ```bash
   git clone https://github.com/your-username/zen-rps.git
   ```
2. Open `index.html` in your browser.
   - OR serve with a local server for PWA features:
     ```bash
     npx serve .
     ```

## License

MIT
