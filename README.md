# Mustafa Portfolio

A simple, text-only 2×2 hero grid with project links and two text-only case study pages. It uses the system font stack and has no external dependencies.

Case study pages:
- `engine-immobilizer.html`
- `workflows.html`

## Resume

- Edit `resume.docx`.
- Export the finished document as `resume.pdf` to update the public copy.
- The Resume link in `index.html` already points to `resume.pdf`.

Replace the placeholder project copy, project URLs, and `hello@example.com` in `index.html` with your own details.

Serve the folder with a static server because the 3D model loads external assets:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
