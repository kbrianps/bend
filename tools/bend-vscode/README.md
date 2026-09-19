# Bend 2 for VS Code

`bend` colors Bend 2, underlines what the checker reports, and formats
through `bend2-fmt-lsp`, the formatting-only language server in
`tools/bend-fmt-lsp`.

## Install and run

Node.js 22 or newer is required.

```sh
npm install
npm run build
ln -s "$PWD" ~/.vscode/extensions/bend
```

Reload the window and a `.bend` file is colored.

## The checker

On a save, the extension runs `bend <file> -o <tmp>.js` and underlines
the line the error names, with the reason, the context and the def as
its message. `-o` emits instead of running, so a `main` with effects
stays put, and a file with no `main` answers "no main to run" once it
has checked. A file that leaves goals open (`?TODO`) has each of them
marked instead.

bend stops at its first error, so one error shows at a time, and it
reads the file on disk, so an unsaved buffer keeps the last verdict.
`Bend: Check File` runs the check by hand, and `bend.check.enable`
turns it off.

## The formatter

Formatting needs the server, which the extension looks for in three
places, in order: the `bend.formatter.path` setting, the sibling
`tools/bend-fmt-lsp/dist/server.js` checkout, and `bend2-fmt-lsp` on the
PATH. With none of them the extension still colors and checks, and says
so in its `Bend` output channel. To format on save, in `settings.json`:

```json
"[bend]": { "editor.formatOnSave": true }
```

## Settings

- `bend.check.enable`: check a file on a save. Default: true.
- `bend.check.path`: the `bend` binary. Empty: the PATH, then
  `~/.bend/bin/bend`.
- `bend.formatter.path`: `bend2-fmt-lsp`, or its `server.js`.

## The grammar

`syntaxes/bend.tmLanguage.json` carries the scopes of
`bend2/docs/bend.sublime-syntax`, the syntax the papers' code blocks use,
so both color Bend the same way. It parts from it in three places, all
additions: `~` is an operator (the template sigil), `.|.`, `.^.` and
`.&.` are one operator each rather than a dot and a bit symbol, and a
`0x` hash (the package imports) is a number.
