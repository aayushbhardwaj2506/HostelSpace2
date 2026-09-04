/* ==========================================================================
   HostelSpace — Global Script
   Phase 1: Foundation | Phase 2: Home | Phase 3: Rooms | Phase 4: Room View

   Scope (intentionally minimal, no storage/search logic yet):
     1. Mobile navigation toggle
     2. Active navigation highlighting
     3. Scroll reveal for below-the-fold sections
     4. Stat count-up animation (Rooms page)
     5. Room View — read room type from URL, select storage locations,
        sync the floor plan with the storage directory and info panel
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initMobileNavToggle();
  highlightActiveNavLink();
  initScrollReveal();
  initCountUp();
  initRoomView();
});

/**
 * 1. Mobile navigation toggle
 * Opens/closes the nav menu on small screens and keeps ARIA state in sync.
 */
function initMobileNavToggle() {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primary-nav');

  if (!toggle || !nav) return;

  function closeMenu() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu() {
    var isOpen = nav.classList.contains('is-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener('click', toggleMenu);

  // Close the menu after a nav link is chosen (mobile UX expectation)
  var navLinks = nav.querySelectorAll('.navbar__link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close the menu on outside click
  document.addEventListener('click', function (event) {
    var isClickInsideNav = nav.contains(event.target);
    var isClickOnToggle = toggle.contains(event.target);
    if (!isClickInsideNav && !isClickOnToggle) {
      closeMenu();
    }
  });

  // Close the menu on Escape for keyboard users
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenu();
      toggle.focus();
    }
  });

  // Reset mobile menu state if the viewport grows back to desktop size
  window.addEventListener('resize', function () {
    if (window.innerWidth > 720) {
      closeMenu();
    }
  });
}

/**
 * 2. Active navigation highlighting
 * Compares each nav link's target page against the current page
 * and marks the matching link with the "is-active" class.
 */
function highlightActiveNavLink() {
  var navLinks = document.querySelectorAll('.navbar__link');
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.forEach(function (link) {
    var linkPage = link.getAttribute('href');

    if (linkPage === currentPage) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * 3. Scroll reveal
 * Adds "is-visible" to any ".reveal" or ".reveal-group" element once it
 * enters the viewport. Falls back to showing everything immediately if
 * IntersectionObserver isn't supported.
 */
function initScrollReveal() {
  var revealEls = document.querySelectorAll('.reveal, .reveal-group');
  if (!revealEls.length) return;

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach(function (el) {
    observer.observe(el);
  });
}

/**
 * 4. Stat count-up
 * Animates any element with a "data-count-to" attribute from 0 up to that
 * value once it scrolls into view. Optional "data-suffix" is appended
 * after the number (e.g. "+"). Numbers only — non-numeric stats are left
 * as static markup and simply ride the .reveal-group fade-in.
 */
function initCountUp() {
  var counters = document.querySelectorAll('[data-count-to]');
  if (!counters.length) return;

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';

    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }

    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      var current = Math.round(eased * target);
      el.textContent = current + suffix;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    window.requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCounter);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach(function (el) {
    observer.observe(el);
  });
}
/**
 * 5. Room View
 * Reads the room type from the URL, wires up the interactive floor plan,
 * and keeps the storage directory + information panel in sync with
 * whichever storage location is currently selected.
 *
 * Only the 2 AC layout is fully built. Room data is defined per type so
 * 4 AC and 6 AC can be added later just by marking them "implemented"
 * and supplying their own floor plan + location list (see
 * LOCATIONS_BY_TYPE below — this is the only place a future room type's
 * location catalog needs to be registered for the storage system to
 * pick it up automatically).
 *
 * Phase 5 adds a full storage system on top of the 2 AC layout:
 *   5.1  Fixed location catalog (unchanged from Phase 4)
 *   5.2  Persistence (localStorage load/save, safe defaults)
 *   5.3  Data access + mutation helpers (CRUD, validation)
 *   5.4  Selection state + room bootstrapping
 *   5.5  Interaction wiring (delegated click/submit/input handlers)
 *   5.6  Selecting & highlighting (room <-> directory <-> info panel sync)
 *   5.7  Rendering — Storage Directory (boxes + items)
 *   5.8  Rendering — Information Panel (view mode + inline create/rename form)
 *   5.9  Create / rename / delete actions
 *   5.10 Search
 */

/* --------------------------------------------------------------------
   5.1 Fixed location catalog
   Storage locations are fixed — users cannot create or remove them.
   -------------------------------------------------------------------- */

var ROOM_DATA = {
  '2ac': { name: '2 AC Room', capacity: '2 Students', implemented: true },
  '4ac': { name: '4 AC Room', capacity: '4 Students', implemented: false },
  '6ac': { name: '6 AC Room', capacity: '6 Students', implemented: false }
};

var LOCATIONS_2AC = [
  { id: 'cupboard-a', name: 'Cupboard A', type: 'Two-Door Cupboard', description: 'Personal wardrobe space for Bed A, with two hanging doors and internal shelves.' },
  { id: 'cupboard-b', name: 'Cupboard B', type: 'Two-Door Cupboard', description: 'Personal wardrobe space for Bed B, with two hanging doors and internal shelves.' },
  { id: 'shelf-a', name: 'Shelf A', type: 'Floating Wall Shelf', description: 'Open wall shelf above Desk A — handy for books and everyday items.' },
  { id: 'shelf-b', name: 'Shelf B', type: 'Floating Wall Shelf', description: 'Open wall shelf above Desk B — handy for books and everyday items.' },
  { id: 'under-bed-a', name: 'Under Bed A', type: 'Under-Bed Storage', description: 'Low-profile space beneath Bed A, suited to bins and out-of-season items.' },
  { id: 'under-bed-b', name: 'Under Bed B', type: 'Under-Bed Storage', description: 'Low-profile space beneath Bed B, suited to bins and out-of-season items.' },
  { id: 'window-slab', name: 'Window Slab', type: 'Window Ledge', description: 'Sill space along the window — good for small plants or everyday items.' },
  { id: 'below-window', name: 'Below Window', type: 'Floor Storage', description: 'Open floor space beneath the window, suited to bags or a storage bin.' },
  { id: 'above-cupboard-a', name: 'Above Cupboard A', type: 'Overhead Storage', description: 'Top-of-cupboard space above Cupboard A for rarely used items.' },
  { id: 'above-cupboard-b', name: 'Above Cupboard B', type: 'Overhead Storage', description: 'Top-of-cupboard space above Cupboard B for rarely used items.' }
];

/* Registry of fixed locations per room type. 4 AC / 6 AC get their own
   arrays here in Phase 6 — every storage function below reads through
   this registry, so nothing else needs to change to support them. */
var LOCATIONS_BY_TYPE = {
  '2ac': LOCATIONS_2AC
};

function getLocationsList(roomType) {
  return LOCATIONS_BY_TYPE[roomType] || [];
}

function getLocationMeta(roomType, locationId) {
  var list = getLocationsList(roomType);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === locationId) return list[i];
  }
  return null;
}

/* --------------------------------------------------------------------
   5.2 Persistence
   Everything lives in a single localStorage key as one JSON blob:
   Storage Boxes, Items, expanded/collapsed folder state, and the last
   room type visited. Reads/writes are wrapped in try/catch so a full
   or unavailable localStorage degrades to an in-memory-only session
   instead of breaking the page.
   -------------------------------------------------------------------- */

var STORAGE_KEY = 'hostelspace_data_v1';
var storageAvailable = isStorageAvailable();
var appData = loadAppData();

function isStorageAvailable() {
  try {
    var testKey = '__hostelspace_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

function getDefaultAppData() {
  return { version: 1, lastRoomType: '2ac', rooms: {} };
}

function loadAppData() {
  if (!storageAvailable) return getDefaultAppData();

  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultAppData();

    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.rooms) {
      return getDefaultAppData();
    }
    return parsed;
  } catch (err) {
    // Corrupt or unreadable data — start fresh rather than crash the page
    return getDefaultAppData();
  }
}

function saveAppData() {
  if (!storageAvailable) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (err) {
    // Quota exceeded or write blocked — keep working in-memory this session
  }
}

/** Ensures a room type has a bucket with every fixed location present,
 *  healing any that are missing (e.g. first visit, or a future
 *  location added to the catalog after data already existed). */
function ensureRoomBucket(roomType) {
  if (!appData.rooms[roomType]) {
    appData.rooms[roomType] = { locations: {} };
  }

  var room = appData.rooms[roomType];
  getLocationsList(roomType).forEach(function (loc) {
    if (!room.locations[loc.id]) {
      room.locations[loc.id] = { expanded: false, boxes: [] };
    }
  });

  return room;
}

function getLocationBucket(roomType, locationId) {
  var room = ensureRoomBucket(roomType);
  return room.locations[locationId] || null;
}

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* --------------------------------------------------------------------
   5.3 Data access + mutation helpers
   Every create/rename delete goes through these functions so validation
   and persistence stay in one place, no matter which UI triggered it.
   -------------------------------------------------------------------- */

function normalizeName(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findBox(roomType, locationId, boxId) {
  var bucket = getLocationBucket(roomType, locationId);
  if (!bucket) return null;
  for (var i = 0; i < bucket.boxes.length; i++) {
    if (bucket.boxes[i].id === boxId) return bucket.boxes[i];
  }
  return null;
}

function findItemInBox(box, itemId) {
  if (!box) return null;
  for (var i = 0; i < box.items.length; i++) {
    if (box.items[i].id === itemId) return box.items[i];
  }
  return null;
}

function findItem(roomType, locationId, boxId, itemId) {
  return findItemInBox(findBox(roomType, locationId, boxId), itemId);
}

function createStorageBox(roomType, locationId, rawName) {
  var name = normalizeName(rawName);
  if (!name) return { error: 'Give the storage box a name.' };
  if (name.length > 40) return { error: 'Keep the name under 40 characters.' };

  var bucket = getLocationBucket(roomType, locationId);
  if (!bucket) return { error: 'That storage location is not available.' };

  var isDuplicate = bucket.boxes.some(function (box) {
    return box.name.toLowerCase() === name.toLowerCase();
  });
  if (isDuplicate) return { error: 'A storage box named "' + name + '" already exists here.' };

  var box = { id: generateId('box'), name: name, expanded: true, items: [] };
  bucket.boxes.push(box);
  bucket.expanded = true;
  saveAppData();
  return { box: box };
}

function renameStorageBox(roomType, locationId, boxId, rawName) {
  var name = normalizeName(rawName);
  if (!name) return { error: 'Give the storage box a name.' };
  if (name.length > 40) return { error: 'Keep the name under 40 characters.' };

  var bucket = getLocationBucket(roomType, locationId);
  var box = findBox(roomType, locationId, boxId);
  if (!bucket || !box) return { error: 'That storage box no longer exists.' };

  var isDuplicate = bucket.boxes.some(function (other) {
    return other.id !== boxId && other.name.toLowerCase() === name.toLowerCase();
  });
  if (isDuplicate) return { error: 'A storage box named "' + name + '" already exists here.' };

  box.name = name;
  saveAppData();
  return { box: box };
}

function deleteStorageBox(roomType, locationId, boxId) {
  var bucket = getLocationBucket(roomType, locationId);
  if (!bucket) return { error: 'That storage location is not available.' };

  var index = bucket.boxes.reduce(function (found, box, i) {
    return box.id === boxId ? i : found;
  }, -1);
  if (index === -1) return { error: 'That storage box no longer exists.' };

  bucket.boxes.splice(index, 1);
  saveAppData();
  return { success: true };
}

function addItem(roomType, locationId, boxId, rawName) {
  var name = normalizeName(rawName);
  if (!name) return { error: 'Give the item a name.' };
  if (name.length > 60) return { error: 'Keep the name under 60 characters.' };

  var box = findBox(roomType, locationId, boxId);
  if (!box) return { error: 'That storage box no longer exists.' };

  var item = { id: generateId('item'), name: name, createdAt: Date.now() };
  box.items.push(item);
  box.expanded = true;
  saveAppData();
  return { item: item };
}

function renameItem(roomType, locationId, boxId, itemId, rawName) {
  var name = normalizeName(rawName);
  if (!name) return { error: 'Give the item a name.' };
  if (name.length > 60) return { error: 'Keep the name under 60 characters.' };

  var item = findItem(roomType, locationId, boxId, itemId);
  if (!item) return { error: 'That item no longer exists.' };

  item.name = name;
  saveAppData();
  return { item: item };
}

function deleteItem(roomType, locationId, boxId, itemId) {
  var box = findBox(roomType, locationId, boxId);
  if (!box) return { error: 'That storage box no longer exists.' };

  var index = box.items.reduce(function (found, item, i) {
    return item.id === itemId ? i : found;
  }, -1);
  if (index === -1) return { error: 'That item no longer exists.' };

  box.items.splice(index, 1);
  saveAppData();
  return { success: true };
}

function getMostRecentItemInLocation(bucket) {
  var recent = null;
  bucket.boxes.forEach(function (box) {
    box.items.forEach(function (item) {
      if (!recent || item.createdAt > recent.item.createdAt) {
        recent = { item: item, boxName: box.name };
      }
    });
  });
  return recent;
}

function pluralize(word, count) {
  return count === 1 ? word : word + 's';
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* --------------------------------------------------------------------
   5.4 Selection state + room bootstrapping
   -------------------------------------------------------------------- */

var activeSelection = { roomType: null, locationId: null, boxId: null, itemId: null };

function initRoomView() {
  var wrapper = document.getElementById('roomFloorWrapper');
  if (!wrapper) return; // Not on the Room View page — nothing to do

  var type = getRoomType();
  var data = ROOM_DATA[type];

  var titleEl = document.getElementById('roomTitle');
  var badgeTextEl = document.getElementById('roomBadgeText');
  if (titleEl) titleEl.textContent = data.name;
  if (badgeTextEl) badgeTextEl.textContent = data.capacity;
  document.title = 'HostelSpace — ' + data.name;

  var floor2ac = document.getElementById('roomFloor2ac');
  var floorComingSoon = document.getElementById('roomComingSoon');
  var directory2ac = document.getElementById('directoryList2ac');
  var directoryComingSoon = document.getElementById('directoryComingSoon');
  var comingSoonType = document.getElementById('comingSoonType');

  activeSelection = { roomType: type, locationId: null, boxId: null, itemId: null };

  if (data.implemented) {
    if (floor2ac) floor2ac.hidden = false;
    if (floorComingSoon) floorComingSoon.hidden = true;
    if (directory2ac) directory2ac.hidden = false;
    if (directoryComingSoon) directoryComingSoon.hidden = true;

    ensureRoomBucket(type);
    renderAllDirectoryLocations(type);
    updateFurnitureIndicators(type);
    setupRoomInteractions();
    setupSearch();
    
    if (window.db) {
      syncFirebaseItems(type);
    }
  } else {
    if (floor2ac) floor2ac.hidden = true;
    if (floorComingSoon) floorComingSoon.hidden = false;
    if (directory2ac) directory2ac.hidden = true;
    if (directoryComingSoon) directoryComingSoon.hidden = false;
    if (comingSoonType) comingSoonType.textContent = data.name;
  }

  renderInfoPanelEmpty();
}

/** Reads and validates the "type" query param. Falls back to the last
 *  room type the user viewed (persisted), then to 2ac. */
function getRoomType() {
  var params = new URLSearchParams(window.location.search);
  var requested = (params.get('type') || '').toLowerCase();

  if (ROOM_DATA.hasOwnProperty(requested)) {
    appData.lastRoomType = requested;
    saveAppData();
    return requested;
  }

  if (ROOM_DATA.hasOwnProperty(appData.lastRoomType)) {
    return appData.lastRoomType;
  }

  return '2ac';
}

/* --------------------------------------------------------------------
   5.5 Interaction wiring
   Storage Boxes and Items are created/removed at runtime, so their
   controls can't be wired individually at load time like the fixed
   furniture hotspots were in Phase 4. Everything below uses delegated
   listeners on stable containers instead, each wired once.
   -------------------------------------------------------------------- */

function setupRoomInteractions() {
  var floorSurface = document.querySelector('.room-floor__surface');
  var directoryPanel = document.querySelector('.directory-panel');
  var infoPanel = document.getElementById('infoPanel');

  if (floorSurface && !floorSurface.dataset.wired) {
    floorSurface.addEventListener('click', handleFloorClick);
    floorSurface.dataset.wired = 'true';
  }

  if (directoryPanel && !directoryPanel.dataset.wired) {
    directoryPanel.addEventListener('click', handleDirectoryClick);
    directoryPanel.dataset.wired = 'true';
  }

  if (infoPanel && !infoPanel.dataset.wired) {
    infoPanel.addEventListener('click', handleInfoPanelClick);
    infoPanel.addEventListener('submit', handleInfoFormSubmit);
    infoPanel.addEventListener('input', handleInfoFormInput);
    infoPanel.addEventListener('keydown', handleInfoFormKeydown);
    infoPanel.dataset.wired = 'true';
  }
}

function handleFloorClick(event) {
  var trigger = event.target.closest('.rf-interactive[data-location-id]');
  if (!trigger) return;
  expandLocationFolder(activeSelection.roomType, trigger.dataset.locationId);
  selectLocation(trigger.dataset.locationId);
}

function handleDirectoryClick(event) {
  var locationToggle = event.target.closest('.directory-item__toggle');
  if (locationToggle) {
    toggleLocationFolder(activeSelection.roomType, locationToggle.dataset.locationId);
    selectLocation(locationToggle.dataset.locationId);
    return;
  }

  var boxToggle = event.target.closest('[data-action="select-box"]');
  if (boxToggle) {
    selectBox(boxToggle.dataset.locationId, boxToggle.dataset.boxId);
    return;
  }

  var itemRow = event.target.closest('[data-action="select-item"]');
  if (itemRow) {
    selectItem(itemRow.dataset.locationId, itemRow.dataset.boxId, itemRow.dataset.itemId);
  }
}

function handleInfoPanelClick(event) {
  var actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  switch (actionEl.dataset.action) {
    case 'add-box': showInfoForm({ mode: 'add-box' }); break;
    case 'add-item': showInfoForm({ mode: 'add-item' }); break;
    case 'rename-box': showInfoForm({ mode: 'rename-box' }); break;
    case 'rename-item': showInfoForm({ mode: 'rename-item' }); break;
    case 'delete-box': handleDeleteBox(); break;
    case 'delete-item': handleDeleteItem(); break;
    case 'form-cancel': renderInfoPanelView(); break;
    default: break;
  }
}

function handleInfoFormSubmit(event) {
  if (!event.target.classList.contains('info-form')) return;
  event.preventDefault();
  handleFormSave();
}

function handleInfoFormInput(event) {
  if (event.target.id !== 'infoFormInput') return;
  event.target.classList.remove('has-error');
  var errorEl = document.querySelector('.info-form__error');
  if (errorEl) errorEl.hidden = true;
}

function handleInfoFormKeydown(event) {
  if (event.key === 'Escape' && event.target.id === 'infoFormInput') {
    renderInfoPanelView();
  }
}

/* --------------------------------------------------------------------
   5.6 Selecting & highlighting
   One selection state drives the room floor, the directory, and the
   information panel together, so all three always agree.
   -------------------------------------------------------------------- */

function selectLocation(locationId) {
  var meta = getLocationMeta(activeSelection.roomType, locationId);
  if (!meta) return;

  activeSelection.locationId = locationId;
  activeSelection.boxId = null;
  activeSelection.itemId = null;

  highlightSelection();
  renderInfoPanelView();
}

function selectBox(locationId, boxId) {
  toggleStorageBox(locationId, boxId);

  activeSelection.locationId = locationId;
  activeSelection.boxId = boxId;
  activeSelection.itemId = null;

  highlightSelection();
  renderInfoPanelView();
}

function selectItem(locationId, boxId, itemId) {
  activeSelection.locationId = locationId;
  activeSelection.boxId = boxId;
  activeSelection.itemId = itemId;

  highlightSelection();
  renderInfoPanelView();
}

function highlightSelection() {
  document.querySelectorAll('.is-selected').forEach(function (el) {
    el.classList.remove('is-selected');
    if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', 'false');
  });

  if (!activeSelection.locationId) return;

  document.querySelectorAll('[data-location-id="' + activeSelection.locationId + '"]').forEach(function (el) {
    if (el.classList.contains('rf-interactive') || el.classList.contains('directory-item__toggle')) {
      el.classList.add('is-selected');
      if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', 'true');
    }
  });

  pulseFurniture(activeSelection.locationId);

  if (activeSelection.boxId) {
    var boxToggle = document.querySelector('.storage-box__toggle[data-box-id="' + activeSelection.boxId + '"]');
    if (boxToggle && !activeSelection.itemId) boxToggle.classList.add('is-selected');
  }

  if (activeSelection.itemId) {
    var itemRow = document.querySelector('.item-row[data-item-id="' + activeSelection.itemId + '"]');
    if (itemRow) {
      itemRow.classList.add('is-selected');
      itemRow.setAttribute('aria-pressed', 'true');
    }
  }
}

/** Brief highlight pulse so re-selecting (or landing on, via search)
 *  a piece of furniture reads as a deliberate action. */
function pulseFurniture(locationId) {
  var hotspot = document.querySelector('.rf-interactive[data-location-id="' + locationId + '"]');
  if (!hotspot) return;

  hotspot.classList.remove('is-pulsing');
  void hotspot.offsetWidth; // restart the animation even on repeat selection
  hotspot.classList.add('is-pulsing');
  window.setTimeout(function () {
    hotspot.classList.remove('is-pulsing');
  }, 600);
}

function expandLocationFolder(roomType, locationId) {
  var bucket = getLocationBucket(roomType, locationId);
  if (!bucket || bucket.expanded) return;
  bucket.expanded = true;
  saveAppData();
  syncLocationFolderDOM(locationId, true);
}

function toggleLocationFolder(roomType, locationId) {
  var bucket = getLocationBucket(roomType, locationId);
  if (!bucket) return;
  bucket.expanded = !bucket.expanded;
  saveAppData();
  syncLocationFolderDOM(locationId, bucket.expanded);
}

function syncLocationFolderDOM(locationId, isExpanded) {
  var toggle = document.querySelector('.directory-item__toggle[data-location-id="' + locationId + '"]');
  var panel = document.getElementById('folder-' + locationId);
  if (toggle) toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  if (panel) panel.hidden = !isExpanded;
}

function toggleStorageBox(locationId, boxId) {
  var box = findBox(activeSelection.roomType, locationId, boxId);
  if (!box) return;

  box.expanded = !box.expanded;
  saveAppData();

  var toggle = document.querySelector('.storage-box__toggle[data-box-id="' + boxId + '"]');
  var panel = document.getElementById('items-' + boxId);
  if (toggle) toggle.setAttribute('aria-expanded', box.expanded ? 'true' : 'false');
  if (panel) panel.hidden = !box.expanded;
}

function updateFurnitureIndicators(roomType) {
  getLocationsList(roomType).forEach(function (loc) {
    var bucket = getLocationBucket(roomType, loc.id);
    var hasContent = !!(bucket && bucket.boxes.length);
    var hotspot = document.querySelector('.rf-interactive[data-location-id="' + loc.id + '"]');
    if (hotspot) hotspot.classList.toggle('has-content', hasContent);
  });
}

/* --------------------------------------------------------------------
   5.6.5 Firebase Sync
   -------------------------------------------------------------------- */
function syncFirebaseItems(roomType) {
  if (!window.db) return;

  window.db.collection("items").onSnapshot(function (snapshot) {
    var firebaseItems = [];
    snapshot.forEach(function (doc) {
      var data = doc.data();
      data.id = doc.id;
      firebaseItems.push(data);
    });

    var byLocation = {};
    firebaseItems.forEach(function (item) {
      var locId = item.locationId || 'shelf-a';
      if (!byLocation[locId]) byLocation[locId] = [];
      byLocation[locId].push(item);
    });

    getLocationsList(roomType).forEach(function (loc) {
      var bucket = getLocationBucket(roomType, loc.id);
      if (!bucket) return;

      // Filter out old AI box if it exists
      bucket.boxes = bucket.boxes.filter(function (box) {
        return box.id !== 'box_ai_suggestions';
      });

      if (byLocation[loc.id] && byLocation[loc.id].length > 0) {
        var aiBox = {
          id: 'box_ai_suggestions',
          name: '✨ AI Scanned Items',
          expanded: true,
          items: byLocation[loc.id].map(function (fbItem) {
            return {
              id: fbItem.id,
              name: fbItem.name,
              createdAt: fbItem.timestamp ? fbItem.timestamp.toMillis() : Date.now()
            };
          })
        };
        bucket.boxes.unshift(aiBox);
        bucket.expanded = true;
      }
    });

    renderAllDirectoryLocations(roomType);
    updateFurnitureIndicators(roomType);
    if (activeSelection.locationId) {
      renderInfoPanelView();
    }
  }, function(error) {
    console.error("Error fetching Firebase items:", error);
  });
}

/* --------------------------------------------------------------------
   5.7 Rendering — Storage Directory
   -------------------------------------------------------------------- */

function renderAllDirectoryLocations(roomType) {
  getLocationsList(roomType).forEach(function (loc) {
    renderDirectoryLocation(roomType, loc.id);
  });
}

function renderDirectoryLocation(roomType, locationId) {
  var bucket = getLocationBucket(roomType, locationId);
  var panel = document.getElementById('folder-' + locationId);
  var toggle = document.querySelector('.directory-item__toggle[data-location-id="' + locationId + '"]');
  if (!panel || !bucket) return;

  if (toggle) toggle.setAttribute('aria-expanded', bucket.expanded ? 'true' : 'false');
  panel.hidden = !bucket.expanded;

  if (!bucket.boxes.length) {
    panel.innerHTML = '<p class="directory-item__empty">Create your first storage box.</p>';
    return;
  }

  var html = '<div class="storage-box-list">';
  bucket.boxes.forEach(function (box) {
    html += buildStorageBoxHTML(locationId, box);
  });
  html += '</div>';
  panel.innerHTML = html;
}

function buildStorageBoxHTML(locationId, box) {
  var itemsPanelId = 'items-' + box.id;
  var isBoxSelected = activeSelection.locationId === locationId &&
    activeSelection.boxId === box.id && !activeSelection.itemId;

  var html = '<div class="storage-box" data-box-id="' + box.id + '">';

  html += '<button type="button" class="storage-box__toggle' + (isBoxSelected ? ' is-selected' : '') + '" ' +
    'data-action="select-box" data-location-id="' + locationId + '" data-box-id="' + box.id + '" ' +
    'aria-expanded="' + (box.expanded ? 'true' : 'false') + '" aria-controls="' + itemsPanelId + '">' +
    '<svg class="storage-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>' +
    '<span class="storage-box__label">' + escapeHTML(box.name) + '</span>' +
    '<span class="storage-box__count">' + box.items.length + '</span>' +
    '<svg class="storage-box__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
    '</button>';

  html += '<div class="storage-box__panel" id="' + itemsPanelId + '"' + (box.expanded ? '' : ' hidden') + '>';

  if (!box.items.length) {
    html += '<p class="item-list__empty">No items stored yet.</p>';
  } else {
    html += '<ul class="item-list">';
    box.items.forEach(function (item) {
      var isItemSelected = activeSelection.itemId === item.id;
      html += '<li><button type="button" class="item-row' + (isItemSelected ? ' is-selected' : '') + '" ' +
        'data-action="select-item" data-location-id="' + locationId + '" data-box-id="' + box.id + '" data-item-id="' + item.id + '" ' +
        'aria-pressed="' + (isItemSelected ? 'true' : 'false') + '">' +
        escapeHTML(item.name) +
        '</button></li>';
    });
    html += '</ul>';
  }

  html += '</div></div>';
  return html;
}

/* --------------------------------------------------------------------
   5.8 Rendering — Information Panel
   Three view states depending on how deep the current selection goes
   (location / storage box / item), plus a shared inline form used for
   every create and rename action instead of a separate modal.
   -------------------------------------------------------------------- */

function renderInfoPanelEmpty() {
  var panel = document.getElementById('infoPanel');
  if (!panel) return;

  panel.innerHTML =
    '<div class="info-panel__empty">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 21s7-7.58 7-12A7 7 0 0 0 5 9c0 4.42 7 12 7 12Z"/>' +
    '<circle cx="12" cy="9" r="2.6"/>' +
    '</svg>' +
    '<p>Select a storage location from the room or directory.</p>' +
    '</div>';
}

function renderInfoPanelView() {
  var panel = document.getElementById('infoPanel');
  if (!panel) return;

  if (!activeSelection.locationId) {
    renderInfoPanelEmpty();
    return;
  }

  var roomType = activeSelection.roomType;
  var meta = getLocationMeta(roomType, activeSelection.locationId);
  var bucket = getLocationBucket(roomType, activeSelection.locationId);
  if (!meta || !bucket) {
    renderInfoPanelEmpty();
    return;
  }

  if (activeSelection.itemId) {
    renderInfoPanelItemView(meta, bucket);
  } else if (activeSelection.boxId) {
    renderInfoPanelBoxView(meta, bucket);
  } else {
    renderInfoPanelLocationView(meta, bucket);
  }
}

function renderInfoPanelLocationView(meta, bucket) {
  var panel = document.getElementById('infoPanel');
  var itemTotal = bucket.boxes.reduce(function (sum, box) { return sum + box.items.length; }, 0);
  var recent = getMostRecentItemInLocation(bucket);

  var html = '<div class="info-panel__content">' +
    '<p class="info-panel__breadcrumb"><span class="is-current">' + escapeHTML(meta.name) + '</span></p>' +
    '<div class="info-panel__text">' +
    '<p class="eyebrow">' + escapeHTML(meta.type) + '</p>' +
    '<h2 class="info-panel__title">' + escapeHTML(meta.name) + '</h2>' +
    '<p class="info-panel__description">' + meta.description + '</p>' +
    '<div class="info-panel__stats">' +
    '<div class="info-panel__stat"><span class="info-panel__stat-value">' + bucket.boxes.length + '</span><span class="info-panel__stat-label">' + pluralize('Storage Box', bucket.boxes.length) + '</span></div>' +
    '<div class="info-panel__stat"><span class="info-panel__stat-value">' + itemTotal + '</span><span class="info-panel__stat-label">' + pluralize('Item', itemTotal) + '</span></div>' +
    '</div>' +
    (recent ? '<p class="info-panel__recent">Recently added: <strong>' + escapeHTML(recent.item.name) + '</strong> in ' + escapeHTML(recent.boxName) + '</p>' : '') +
    '</div>' +
    '<div class="info-panel__actions">' +
    '<button type="button" class="btn btn--primary" data-action="add-box">Add Storage Box</button>' +
    '</div>' +
    '</div>';

  panel.innerHTML = html;
}

function renderInfoPanelBoxView(meta, bucket) {
  var panel = document.getElementById('infoPanel');
  var box = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
  if (!box) { selectLocation(activeSelection.locationId); return; }

  var html = '<div class="info-panel__content">' +
    '<p class="info-panel__breadcrumb">' + escapeHTML(meta.name) +
    ' <span aria-hidden="true">&rsaquo;</span> <span class="is-current">' + escapeHTML(box.name) + '</span></p>' +
    '<div class="info-panel__text">' +
    '<p class="eyebrow">Storage Box</p>' +
    '<h2 class="info-panel__title">' + escapeHTML(box.name) + '</h2>' +
    '<p class="info-panel__description">Inside ' + escapeHTML(meta.name) + '.</p>' +
    '<div class="info-panel__stats">' +
    '<div class="info-panel__stat"><span class="info-panel__stat-value">' + box.items.length + '</span><span class="info-panel__stat-label">' + pluralize('Item', box.items.length) + '</span></div>' +
    '</div>' +
    '</div>' +
    '<div class="info-panel__actions">' +
    '<button type="button" class="btn btn--primary" data-action="add-item">Add Item</button>' +
    '<button type="button" class="btn btn--secondary" data-action="rename-box">Rename</button>' +
    '<button type="button" class="btn btn--danger" data-action="delete-box">Delete</button>' +
    '</div>' +
    '</div>';

  panel.innerHTML = html;
}

function renderInfoPanelItemView(meta, bucket) {
  var panel = document.getElementById('infoPanel');
  var box = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
  var item = box ? findItemInBox(box, activeSelection.itemId) : null;
  if (!box || !item) { selectLocation(activeSelection.locationId); return; }

  var html = '<div class="info-panel__content">' +
    '<p class="info-panel__breadcrumb">' + escapeHTML(meta.name) +
    ' <span aria-hidden="true">&rsaquo;</span> ' + escapeHTML(box.name) +
    ' <span aria-hidden="true">&rsaquo;</span> <span class="is-current">' + escapeHTML(item.name) + '</span></p>' +
    '<div class="info-panel__text">' +
    '<p class="eyebrow">Item</p>' +
    '<h2 class="info-panel__title">' + escapeHTML(item.name) + '</h2>' +
    '<p class="info-panel__description">Stored inside ' + escapeHTML(box.name) + ', ' + escapeHTML(meta.name) + '.</p>' +
    '</div>' +
    '<div class="info-panel__actions">' +
    '<button type="button" class="btn btn--primary" data-action="add-item">Add Item</button>' +
    '<button type="button" class="btn btn--secondary" data-action="rename-item">Rename</button>' +
    '<button type="button" class="btn btn--danger" data-action="delete-item">Delete</button>' +
    '</div>' +
    '</div>';

  panel.innerHTML = html;
}

function showInfoForm(config) {
  var panel = document.getElementById('infoPanel');
  if (!panel) return;

  var label = '';
  var currentValue = '';
  var placeholder = '';

  if (config.mode === 'add-box') {
    var locMeta = getLocationMeta(activeSelection.roomType, activeSelection.locationId);
    label = 'New storage box in ' + (locMeta ? locMeta.name : 'this location');
    placeholder = 'e.g. Documents, Electronics, Clothes';
  } else if (config.mode === 'add-item') {
    var targetBox = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
    label = 'New item in ' + (targetBox ? targetBox.name : 'this box');
    placeholder = 'e.g. Passport, Laptop Charger';
  } else if (config.mode === 'rename-box') {
    var boxToRename = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
    label = 'Rename storage box';
    currentValue = boxToRename ? boxToRename.name : '';
  } else if (config.mode === 'rename-item') {
    var itemBox = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
    var itemToRename = itemBox ? findItemInBox(itemBox, activeSelection.itemId) : null;
    label = 'Rename item';
    currentValue = itemToRename ? itemToRename.name : '';
  }

  panel.innerHTML =
    '<form class="info-form" data-mode="' + config.mode + '">' +
    '<label class="info-form__label" for="infoFormInput">' + escapeHTML(label) + '</label>' +
    '<div class="info-form__row">' +
    '<input type="text" id="infoFormInput" class="info-form__input" value="' + escapeHTML(currentValue) + '" placeholder="' + escapeHTML(placeholder) + '" maxlength="60" autocomplete="off">' +
    '<div class="info-form__actions">' +
    '<button type="submit" class="btn btn--primary btn--sm">Save</button>' +
    '<button type="button" class="btn btn--secondary btn--sm" data-action="form-cancel">Cancel</button>' +
    '</div>' +
    '</div>' +
    '<p class="info-form__error" hidden></p>' +
    '</form>';

  var input = document.getElementById('infoFormInput');
  if (input) {
    input.focus();
    input.select();
  }
}

function showFormError(message) {
  var input = document.getElementById('infoFormInput');
  var errorEl = document.querySelector('.info-form__error');
  if (input) input.classList.add('has-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  if (input) input.focus();
}

function handleFormSave() {
  var form = document.querySelector('.info-form');
  var input = document.getElementById('infoFormInput');
  if (!form || !input) return;

  var mode = form.dataset.mode;
  var value = input.value;
  var result;

  if (mode === 'add-box') {
    result = createStorageBox(activeSelection.roomType, activeSelection.locationId, value);
    if (!result.error) {
      activeSelection.boxId = result.box.id;
      activeSelection.itemId = null;
    }
  } else if (mode === 'rename-box') {
    result = renameStorageBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId, value);
  } else if (mode === 'add-item') {
    result = addItem(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId, value);
    if (!result.error) {
      activeSelection.itemId = result.item.id;
    }
  } else if (mode === 'rename-item') {
    result = renameItem(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId, activeSelection.itemId, value);
  }

  if (!result || result.error) {
    showFormError(result ? result.error : 'Something went wrong. Please try again.');
    return;
  }

  renderDirectoryLocation(activeSelection.roomType, activeSelection.locationId);
  updateFurnitureIndicators(activeSelection.roomType);
  highlightSelection();
  renderInfoPanelView();
}

/* --------------------------------------------------------------------
   5.9 Delete actions
   -------------------------------------------------------------------- */

function handleDeleteBox() {
  var box = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
  if (!box) return;

  var itemCount = box.items.length;
  var message = 'Delete "' + box.name + '"' +
    (itemCount ? ' and its ' + itemCount + ' item' + (itemCount === 1 ? '' : 's') : '') +
    '? This cannot be undone.';
  if (!window.confirm(message)) return;

  deleteStorageBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
  activeSelection.boxId = null;
  activeSelection.itemId = null;

  renderDirectoryLocation(activeSelection.roomType, activeSelection.locationId);
  updateFurnitureIndicators(activeSelection.roomType);
  highlightSelection();
  renderInfoPanelView();
}

function handleDeleteItem() {
  var box = findBox(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId);
  var item = box ? findItemInBox(box, activeSelection.itemId) : null;
  if (!item) return;

  if (!window.confirm('Delete "' + item.name + '"?')) return;

  deleteItem(activeSelection.roomType, activeSelection.locationId, activeSelection.boxId, activeSelection.itemId);
  activeSelection.itemId = null;

  renderDirectoryLocation(activeSelection.roomType, activeSelection.locationId);
  updateFurnitureIndicators(activeSelection.roomType);
  highlightSelection();
  renderInfoPanelView();
}

/* --------------------------------------------------------------------
   5.10 Search
   Searches Storage Box names and Item names in the current room and
   updates results live as the person types. Choosing a result opens
   its full path (location -> box -> item) and highlights it in place.
   -------------------------------------------------------------------- */

function setupSearch() {
  var input = document.getElementById('belongingSearch');
  var resultsBox = document.getElementById('searchResults');
  if (!input || !resultsBox || input.dataset.wired) return;

  input.addEventListener('input', function () {
    handleSearchInput(input.value);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      input.value = '';
      closeSearchResults();
      input.blur();
    }
  });

  document.addEventListener('click', function (event) {
    var withinSearch = event.target.closest && event.target.closest('.room-search');
    if (!withinSearch) closeSearchResults();
  });

  input.dataset.wired = 'true';
}

function handleSearchInput(rawQuery) {
  var query = normalizeName(rawQuery);
  var input = document.getElementById('belongingSearch');

  if (!query) {
    closeSearchResults();
    return;
  }

  var matches = searchAll(activeSelection.roomType, query);
  renderSearchResults(matches, query);
  if (input) input.setAttribute('aria-expanded', 'true');
}

function closeSearchResults() {
  var resultsBox = document.getElementById('searchResults');
  var input = document.getElementById('belongingSearch');
  if (resultsBox) {
    resultsBox.hidden = true;
    resultsBox.innerHTML = '';
  }
  if (input) input.setAttribute('aria-expanded', 'false');
}

function searchAll(roomType, query) {
  var lowerQuery = query.toLowerCase();
  var results = [];

  getLocationsList(roomType).forEach(function (loc) {
    var bucket = getLocationBucket(roomType, loc.id);
    if (!bucket) return;

    bucket.boxes.forEach(function (box) {
      if (box.name.toLowerCase().indexOf(lowerQuery) !== -1) {
        results.push({
          type: 'box', locationId: loc.id, locationName: loc.name,
          boxId: box.id, boxName: box.name, name: box.name
        });
      }

      box.items.forEach(function (item) {
        if (item.name.toLowerCase().indexOf(lowerQuery) !== -1) {
          results.push({
            type: 'item', locationId: loc.id, locationName: loc.name,
            boxId: box.id, boxName: box.name, itemId: item.id, name: item.name
          });
        }
      });
    });
  });

  return results;
}

function highlightMatch(name, query) {
  var index = name.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return escapeHTML(name);

  var before = name.slice(0, index);
  var match = name.slice(index, index + query.length);
  var after = name.slice(index + query.length);
  return escapeHTML(before) + '<mark>' + escapeHTML(match) + '</mark>' + escapeHTML(after);
}

function renderSearchResults(matches, query) {
  var resultsBox = document.getElementById('searchResults');
  if (!resultsBox) return;

  if (!matches.length) {
    resultsBox.innerHTML = '<p class="search-results__empty">No matching item found.</p>';
    resultsBox.hidden = false;
    return;
  }

  var html = '';
  matches.forEach(function (match, index) {
    var path = match.type === 'item' ? match.locationName + ' \u203a ' + match.boxName : match.locationName;

    html += '<button type="button" class="search-result" data-index="' + index + '">' +
      '<span class="search-result__name"><span class="search-result__type">' +
      (match.type === 'item' ? 'Item' : 'Box') + '</span>' + highlightMatch(match.name, query) + '</span>' +
      '<span class="search-result__path">' + escapeHTML(path) + '</span>' +
      '</button>';
  });

  resultsBox.innerHTML = html;
  resultsBox.hidden = false;

  resultsBox.querySelectorAll('.search-result').forEach(function (btn) {
    var match = matches[Number(btn.dataset.index)];
    btn.addEventListener('click', function () {
      goToSearchResult(match);
    });
  });
}

function goToSearchResult(match) {
  expandLocationFolder(activeSelection.roomType, match.locationId);

  if (match.boxId) {
    var box = findBox(activeSelection.roomType, match.locationId, match.boxId);
    if (box && !box.expanded) {
      box.expanded = true;
      saveAppData();
    }
  }

  renderDirectoryLocation(activeSelection.roomType, match.locationId);

  if (match.type === 'item') {
    selectItem(match.locationId, match.boxId, match.itemId);
    flashSearchHit(match.itemId);
  } else {
    selectBoxDirect(match.locationId, match.boxId);
  }

  closeSearchResults();
  var input = document.getElementById('belongingSearch');
  if (input) input.value = '';

  var floorWrapper = document.getElementById('roomFloorWrapper');
  if (floorWrapper && floorWrapper.scrollIntoView) {
    floorWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/** Selects a box without re-toggling its expanded state (used by search,
 *  which has already force-expanded the box explicitly). */
function selectBoxDirect(locationId, boxId) {
  activeSelection.locationId = locationId;
  activeSelection.boxId = boxId;
  activeSelection.itemId = null;
  highlightSelection();
  renderInfoPanelView();
}

function flashSearchHit(itemId) {
  var row = document.querySelector('.item-row[data-item-id="' + itemId + '"]');
  if (!row) return;
  row.classList.remove('is-search-hit');
  void row.offsetWidth;
  row.classList.add('is-search-hit');
}
