INJANDA TRADING — online shop (Supabase edition)

1) ONE-TIME DATABASE SETUP
   Supabase dashboard -> SQL Editor -> New query -> paste supabase-setup.sql -> Run.
   (config.js already contains your project URL and anon key.)

2) RUN
   Open this folder in VS Code, install "Live Server", right-click index.html ->
   "Open with Live Server".  Any device that opens the site shares the same data.
   On the first visit the catalogue products are written to Supabase automatically.

3) ADMIN
   Click the faint dot after "All rights reserved." in the footer (or press Ctrl+Shift+A),
   log in with username 123 / password 123, then change it in Settings.

4) YOUR OWN PRODUCTS
   Admin > Products > "Delete all products" removes the catalogue items,
   "+ Add product" creates yours (upload photos from your computer — stored in Supabase Storage).
   Price 0 = "Request a quote".  Blank stock = not tracked.

Files: index.html, style.css, app.js (shop), admin.js (back office), data.js (starter
catalogue), config.js (Supabase keys), supabase-setup.sql, img/ (catalogue photos),
img-data.js (backup copy of photos, loaded only if a file in img/ is missing).
