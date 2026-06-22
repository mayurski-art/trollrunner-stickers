# Printable sticker masters

High-resolution source images for the free printable gallery. Each file here is
both the **print master** (embedded into the generated PDFs) and the **card
preview** (scaled down by CSS). One file per template.

## Files expected by `assets/data/stickers.json`

| File                          | Reference                                   |
| ----------------------------- | ------------------------------------------- |
| `sidelined-red-eyes.png`      | red-eyes "SIDELINED?" troll                 |
| `sidelined-bw.png`            | black-and-white "SIDELINED?" troll          |
| `flying-troll-qr.png`         | flying buff-troll wrapped in a QR           |
| `u-mad-bro.png`               | "U MAD BRO?" $TROLL poster                  |
| `cupped-hands-qr.png`         | cupped-hands troll with the green QR        |
| `sidelined-portrait.png`      | plain "SIDELINED?" portrait                 |

## Rules

- **Resolution:** keep the long edge >= 1200px. At 300 DPI that covers a 4 in
  print; QR-bearing art should be as large as you can export so codes stay
  scannable.
- **Format:** PNG preferred (transparent edges print cleaner for die-cuts).
  JPGs work too — just update the `image` path in the manifest to match.
- **Adding a template:** drop a PNG here, append an entry to
  `assets/data/stickers.json`. No code changes needed.
