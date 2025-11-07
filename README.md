<img width="1920" height="1080" alt="hero" src="https://github.com/user-attachments/assets/395984f6-b049-4471-9975-0b94e648a25d" />


Cantox is a minimal, fast, a nd fully local start page for your browser. Organize websites into categories, pick icons, reorder with drag and drop, and back up or restore your setup with a JSON file.

## Features
- Categories: add, delete, reorder with drag-and-drop
- Websites: add, delete, grouped by category, reorder within category with drag-and-drop
- Icons: Feather Icons (via CDN) for crisp, consistent SVG icons
- Home view: collapsible category sections, two-column link layout
- Theme: one-click dark/light toggle, grayscale palette
- Config: export to JSON, import from JSON (dropzone or button)
- Reset: clear all categories, websites, and collapsed states (theme unchanged)
- Persistence: data stored in `localStorage`; no backend or dependencies

## Quick Start
1. Clone the repo:
   ```bash
   git clone https://github.com/Velintra/Cantox.git
   cd Cantox
   ```
2. Serve locally (any static server works). For Python:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000/` in your browser.



You can also open `index.html` directly, but using a local server is recommended for a smoother experience.

## Usage
### Add Categories
- Go to `Settings` → `Categories`.
- Enter a name and press `Add Category`.
- Reorder categories by dragging rows up or down.

### Add Websites
- Go to `Settings` → `Websites`.
- Enter name and URL, choose a category, click `Select Icon` and pick an icon, then press `Add Website`.
- Websites appear grouped by their category in `Existing Websites`.
- Reorder websites within a category by dragging rows.

### Home View
- `Home` shows your categories as sections (only sections with websites are displayed).
- Click the chevron to collapse/expand a section; collapsed state is remembered.
- Links open in a new tab with `noopener` for safety.

### Theme
- Use the theme toggle in the navbar to switch dark/light.
- Icons automatically render light on dark backgrounds.

### Export / Import
- Go to `Settings` → `Config`.
- Export: click `Export to JSON` to download `dashboard-config.json`.
- Import: drag a JSON file into the drop zone or click to browse, then optionally press `Import JSON`.
- Import restores categories, websites, drag-and-drop ordering, collapsed states, and theme.

### Reset
- Go to `Settings` → `Config` → `Reset Configuration`.
- Click `Reset All` to remove all categories, websites, and collapsed states (theme unchanged).
- A confirmation prompt ensures you don’t reset by accident.

## Data Model
- Category:
  ```json
  { "id": 1712345678901, "name": "Work" }
  ```
- Website:
  ```json
  { "id": 1712345678912, "name": "GitHub", "url": "https://github.com", "categoryId": 1712345678901, "icon": "github" }
  ```

## Config Schema
Exported/Imported JSON includes:
```json
{
  "categories": [
    { "id": 1712345678901, "name": "Work" }
  ],
  "websites": [
    { "id": 1712345678912, "name": "GitHub", "url": "https://github.com", "categoryId": 1712345678901, "icon": "github" }
  ],
  "theme": "light",
  "collapsedCategories": {
    "1712345678901": false
  }
}
```

Notes:
- `id` values are generated timestamps; ordering is preserved by the arrays.
- `collapsedCategories` keys are category IDs.
- Theme is `"light"` or `"dark"`.


## Tech
- Vanilla JavaScript, HTML, and CSS
- Feather Icons via CDN (`window.feather`)
- No build step; deploy anywhere that serves static files (e.g., GitHub Pages, Netlify)

## Accessibility
- Import drop zone supports drag-and-drop, click, and keyboard (Enter/Space)
- SVG icons inherit color and respect dark/light theme

## Systemd Setup (Linux)
Run Cantox automatically at boot using `systemd`. Below are two options:

### Option A: Simple Python static server
Suitable for quick setups. For production, prefer Nginx/Caddy (see Option B).

1. Place the project somewhere like `/opt/cantox`:
   ```bash
   sudo mkdir -p /opt/cantox
   sudo chown "$USER":"$USER" /opt/cantox
   cp -r . /opt/cantox
   ```
2. Create a systemd unit at `/etc/systemd/system/cantox.service`:
   ```ini
   [Unit]
   Description=Cantox static server (python http.server)
   After=network.target

   [Service]
   Type=simple
   WorkingDirectory=/opt/cantox
   ExecStart=/usr/bin/python3 -m http.server 8000
   Restart=on-failure
   User=www-data
   Group=www-data

   [Install]
   WantedBy=multi-user.target
   ```
3. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now cantox.service
   sudo systemctl status cantox.service
   ```
4. Open the firewall port (if needed):
   ```bash
   sudo ufw allow 8000/tcp
   ```
5. Access at `http://<server-ip>:8000/`.
6. View logs:
   ```bash
   journalctl -u cantox.service -f
   ```

### Option B: Nginx serving static files (recommended)
Let Nginx serve the files directly (no Python server). Nginx already runs under systemd.

1. Copy files to a web root, e.g. `/var/www/cantox`:
   ```bash
   sudo mkdir -p /var/www/cantox
   sudo cp -r . /var/www/cantox
   sudo chown -R www-data:www-data /var/www/cantox
   ```
2. Create a site config `/etc/nginx/sites-available/cantox`:
   ```nginx
   server {
     listen 80;
     server_name _;
     root /var/www/cantox;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }

     location /assets/ {
       expires 7d;
     }
   }
   ```
3. Enable the site and reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/cantox /etc/nginx/sites-enabled/cantox
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Optionally secure with HTTPS via Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your.domain
   ```

Notes
- Replace paths and ports to match your environment.
- For reverse proxy setups (e.g., Nginx → Python server), create an upstream to `127.0.0.1:8000` and proxy `location /` to it.

