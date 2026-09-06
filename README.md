# reporter.io

A local report studio for data, charts, creative images and written insights. Build a scrolling report or fixed pages, reuse themes and templates, and export HTML, PDF or editable PowerPoint.

## Start locally on Windows

Double-click **start-builder.bat**, then open **http://127.0.0.1:5055**.

The launcher uses Python 3.10 or newer, prepares `.venv`, installs dependencies and Chromium for document export, and starts the local Flask server. Initial setup needs internet. Report editing, supported imports and exports run locally afterward. No account or cloud service is required.

Manual startup after setup:

```powershell
.venv\Scripts\python.exe app.py
```

Keep the server running while editing. Existing drafts from the previous app name are automatically loaded without changing their campaign content or branding.

## Use on another laptop

Clone the `main` branch, then run the launcher:

```powershell
git clone -b main https://github.com/koushikgsun/msd-social-media-report-builder.git reporter-io
cd reporter-io
.\start-builder.bat
```

The earlier MSD-branded build remains available on the `legacy-msd-builder` branch if you need to compare or recover it.

## Local testing guide

1. **Settings → Theme & fonts:** enter six-digit hex colours; choose primary/secondary fonts; assign roles to headings, KPI values, accents and chart series. Save a named preset, then Save settings. Reload to check persistence. “Also use this theme for new reports” changes the default without restyling other saved projects.
2. **Settings → Report:** choose locale, currency, decimal places, card padding and corner radius. **Workspace** contains starting zoom, canvas grid, delete confirmation and settings backup import/export.
3. **Select the header:** edit text, background colour, custom logo and background image. Test fill/contain, image position, alignment, height, title size, font roles, text colour, overlay colour/strength and decorative circle visibility.
4. **Add rich text:** bold, italic, underline, lists, alignment, blockquotes and headings remain available. Select text to apply primary/secondary font or primary/secondary/tertiary colour roles. Module appearance controls override report defaults.
5. **Canvas setup:** select a scrolling report, presentation or paged document. Presets include 16:9, 4:3, portrait, A4 and Letter, plus custom dimensions. Presentation mode enables PPTX even for portrait slides. Fixed pages support dragging, numeric position/size controls, add, duplicate, rename, reorder and delete. Review overflow notices before export.
6. **Import report:** open a `.pptx` or `.html`, read the import review, then accept. Imported native charts have their own datasets; select the chart and use **Edit module data**. Multiple series can be shown together or as one selected value field.
7. **Templates:** save a named template. Titles, paragraphs, images and data become placeholders; styles, layout and field bindings stay usable. “Keep branding” optionally retains the logo, brand label and footer. Use template creates a fresh report. Placeholder KPI counts stay zero until data is edited/imported.
8. **Save project:** downloads editable JSON with uploaded report images and fonts embedded. Open project restores it. HTML exports also retain the embedded project model and can be reimported.
9. **Export:** test standalone HTML offline, PDF, and PPTX from a presentation canvas. PPTX retains editable text, tables and supported native charts. Read the Export notes after downloading PowerPoint.

## Data and charts

- CSV, JSON, XLSX and XLSM import; Excel uses the active sheet.
- In-window grid editing and pasted tabular data.
- KPI sum, average, count, minimum and maximum.
- Vertical/horizontal bar, line, area, pie and doughnut charts; up to 20 categories displayed.
- Signed values supported in bar/line/area charts. Pie/doughnut require non-negative values. Zero datasets show an empty state.
- Multi-image galleries, captions and independent module/image source notes.
- Optional dropdown/button/slider filters targeting selected modules or all modules. HTML stays interactive; document exports capture the chosen view.

## Import and export boundaries

- **PowerPoint import is a supported-content conversion, not a pixel-perfect PowerPoint renderer.** Text formatting, headings, embedded pictures, tables, common category charts, multiple series, basic fills and positions are extracted. Group positions are flattened. Screenshot charts remain images. Complex objects, master artwork, effects, transitions, animations, unsupported/combo charts and rotation are omitted or simplified and flagged in the review. Legacy `.ppt` needs conversion to `.pptx` first.
- Imported source fonts may override report font roles inside rich text. Clear formatting or apply roles to make that text follow a new theme.
- **Own HTML:** recovers the embedded project. **Other HTML:** extracts supported headings, text, tables and embedded images into blocks. It does not execute scripts or reproduce arbitrary CSS layouts, web applications, canvas charts or remote assets. External/relative images need uploading.
- **PDF:** fixed canvases keep their page size; scrolling reports paginate to A4 with a readable stacked print layout. PDF has no interactive filters.
- **PPTX:** requires Presentation mode. Text, tables and common charts are editable, but native chart styling may differ from HTML. Header artwork and images are embedded as pictures. Some wrapping/rich-text effects are simplified. Fonts are referenced by their real family name; font embedding in PPTX is not implemented, so install fonts on the recipient's device.
- **Fonts:** system families use fallbacks. Upload WOFF2, WOFF, TTF or OTF (up to 8 files, 1 MB each) for embedded HTML/PDF rendering and portable projects. Use fonts licensed for embedding.
- **Local persistence:** drafts, preferences and named themes use browser storage. Templates and uploaded images live under `workspace_data`; exports live under `exports`. Browser storage limits can be reached with many fonts/images; the app reports this and project downloads remain available. Back up projects/settings before clearing browser data.
- Import limits: 30 MB upload, 150 MB uncompressed PPTX, 250 pages and 5,000 modules.

## Verification

```powershell
node --check static/app.js
node --check static/report.js
node --check static/theme.js
node --check static/settings.js
node --check static/features.js
.venv\Scripts\python.exe -m unittest discover -s tests -v
# With the local server running:
.venv\Scripts\python.exe tests/browser_check.py
```

Browser checks use an isolated context, leaving the user's saved draft untouched. Test artifacts go to ignored `exports/`. Checks cover imports, datasets, sanitization, template replacement, portable HTML roundtrips, overflow protection, theme persistence, fonts, rich text, header imagery, page controls and all exports. PDF pages and a native PowerPoint-rendered slide were visually inspected during implementation.
