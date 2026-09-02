# MSD Social Media Report Builder

A local drag-and-drop editor for static social media reports. It runs in a browser through a small Python server and exports one portable HTML file. All CSS, JavaScript, logo, backgrounds and creative images are contained inside that file. Exported reports need no server and no internet connection.

## Start on Windows

1. Open PowerShell in this folder.
2. Run `py -m venv .venv`
3. Run `.venv\Scripts\python -m pip install -r requirements.txt`
4. Run `.venv\Scripts\python app.py`
5. Open `http://127.0.0.1:5055`

Or run `start-builder.bat`, which performs the setup when needed.

## Supported content

- Mandatory editable campaign header with MSD logo treatment
- CSV, JSON and Excel data imports
- Spreadsheet-style in-window data editing with row and column controls
- KPI cards with sum, average, count, minimum and maximum calculations
- Vertical/horizontal bars, line, area, pie and doughnut charts
- Independent chart-height control carried into the exported HTML
- Multi-image creative windows with captions
- Rich-text insight and recommendation blocks
- Optional dropdown, button and slider report controls
- Multi-target controls that can filter any combination of KPI cards and charts
- Independent source notes for every report module and every creative image
- Drag-to-add, reorder and resize modules
- Automatic masonry packing: blocks keep independent heights and fill open space beside taller blocks
- Local autosave plus project JSON save/open
- Offline single-file HTML export with every image contained in the HTML
